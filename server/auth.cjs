'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const token=()=>crypto.randomBytes(32).toString('base64url');
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function createAuth({dataDir,origin,googleClientId='',googleClientSecret='',googleFactory,now=Date.now}){
 const secure=new URL(origin).protocol==='https:',file=path.join(dataDir,'users.json');
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 const users=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
 const sessions=new Map(),limits=new Map();let hashes=0;
 const save=()=>{const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(users),{mode:0o600});fs.renameSync(temp,file);};
 const publicUser=u=>u?{id:u.id,name:u.name,provider:u.provider}:null;
 function session(req,res,create=true){const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sid='))?.slice(4),key=raw?digest(raw):null;let value=sessions.get(key);if(value&&value.expires<=now()){sessions.delete(key);value=null;}
  if(!value&&create){if(sessions.size>=10000)throw Object.assign(new Error('Tente novamente mais tarde.'),{status:503});const id=token();value={key:digest(id),csrf:token(),expires:now()+30*60*1000,userId:null};sessions.set(value.key,value);cookie(res,id,1800);}
  return value;
 }
 function cookie(res,id,age){res.setHeader('Set-Cookie',`sid=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure?'; Secure':''}`);}
 function login(req,res,s,u){sessions.delete(s.key);const id=token(),next={key:digest(id),csrf:token(),expires:now()+8*3600000,userId:u.id};sessions.set(next.key,next);cookie(res,id,8*3600);return next;}
 const error=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const redirect=(res,url)=>{res.writeHead(303,{Location:url,'Cache-Control':'no-store'});res.end();};
 async function body(req){if(!(req.headers['content-type']||'').startsWith('application/json'))error(415,'Formato inválido.');let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>4096)error(413,'Pedido grande demais.');}try{return JSON.parse(data);}catch{error(400,'Pedido inválido.');}}
 function rate(req){const ip=req.socket.remoteAddress||'local',entry=limits.get(ip)||{count:0,until:now()+60000};if(entry.until<=now()){entry.count=0;entry.until=now()+60000;}entry.count++;limits.set(ip,entry);if(entry.count>12)error(429,'Muitas tentativas. Aguarde um minuto.');}
 async function hash(password,salt){if(hashes>=4)error(503,'Servidor ocupado. Tente novamente.');hashes++;try{return (await scrypt(password,salt,32,{N:65536,r:8,p:2,maxmem:128*1024*1024})).toString('hex');}finally{hashes--;}}
 function credentials(b){if(typeof b.username!=='string'||!/^[a-zA-Z0-9_.-]{3,24}$/.test(b.username))error(400,'Use um usuário de 3 a 24 letras, números, ponto, hífen ou sublinhado.');if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)error(400,'A senha precisa ter de 12 a 128 caracteres.');return b.username.toLowerCase();}
 function csrf(req,s){if(req.headers.origin!==origin||!equal(req.headers['x-csrf-token'],s.csrf))error(403,'Sessão inválida. Recarregue a página.');}
 const googleEnabled=Boolean(googleClientId&&googleClientSecret);
 const google=()=>googleFactory?googleFactory():new (require('google-auth-library').OAuth2Client)(googleClientId,googleClientSecret,origin+'/auth/google/callback');
 async function handle(req,res,url){if(!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/auth/'))return false;
  try{
   // Lazy cleanup keeps expired credentials bounded without a background timer.
   for(const [key,s] of sessions)if(s.expires<=now())sessions.delete(key);
   for(const [key,l] of limits)if(l.until<=now())limits.delete(key);
   const s=session(req,res);
   if(req.method==='GET'&&url.pathname==='/api/session'){json(res,200,{user:publicUser(users.find(u=>u.id===s.userId)),csrf:s.csrf,googleEnabled});return true;}
   if(req.method==='GET'&&url.pathname==='/auth/google'){
    if(!googleEnabled){redirect(res,'/login.html?error=google-disabled');return true;}rate(req);
    const client=google(),state=token(),nonce=token(),verifier=token();s.oauth={state,nonce,verifier,expires:now()+5*60000};
    redirect(res,client.generateAuthUrl({scope:['openid','profile','email'],state,nonce,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}));return true;
   }
   if(req.method==='GET'&&url.pathname==='/auth/google/callback'){
    const flow=s.oauth;delete s.oauth;
    if(!googleEnabled||!flow||flow.expires<now()||!equal(url.searchParams.get('state'),flow.state)||url.searchParams.has('error')||!url.searchParams.get('code')){redirect(res,'/login.html?error=google');return true;}
    try{const client=google(),{tokens}=await client.getToken({code:url.searchParams.get('code'),codeVerifier:flow.verifier});const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:googleClientId}),payload=ticket.getPayload();
     if(!payload||!payload.sub||!equal(payload.nonce,flow.nonce))throw new Error('Invalid identity');
     // Identity is Google's stable subject, never an unverified email match.
     let u=users.find(u=>u.provider==='google'&&u.subject===payload.sub);if(!u){u={id:crypto.randomUUID(),provider:'google',subject:payload.sub,name:String(payload.name||'Piloto Google').slice(0,80)};users.push(u);save();}login(req,res,s,u);redirect(res,'/');
    }catch{redirect(res,'/login.html?error=google');}return true;
   }
   if(req.method!=='POST')error(404,'Recurso não encontrado.');csrf(req,s);const b=await body(req);
   if(url.pathname==='/api/logout'){sessions.delete(s.key);cookie(res,'',0);json(res,200,{ok:true});return true;}
   if(!['/api/register','/api/login','/api/recover','/api/password'].includes(url.pathname))error(404,'Recurso não encontrado.');rate(req);
   if(url.pathname==='/api/password'){
    const u=users.find(u=>u.id===s.userId);if(!u||u.provider!=='local')error(401,'Entre com uma conta local.');credentials({username:u.username,password:b.password});if(typeof b.currentPassword!=='string'||b.currentPassword.length>128||!equal(await hash(b.currentPassword,u.salt),u.hash))error(400,'Senha atual incorreta.');
    const salt=token(),value=await hash(b.password,salt);u.salt=salt;u.hash=value;save();for(const [key,other] of sessions)if(other.userId===u.id)sessions.delete(key);const next=login(req,res,s,u);json(res,200,{user:publicUser(u),csrf:next.csrf});return true;
   }
   const username=credentials(b);
   if(url.pathname==='/api/register'){
    const salt=token(),value=await hash(b.password,salt);if(users.some(u=>u.username===username))error(409,'Esse usuário já está cadastrado.');const recovery=token(),u={id:crypto.randomUUID(),provider:'local',username,name:b.username,salt,hash:value,recovery:digest(recovery)};users.push(u);save();const next=login(req,res,s,u);json(res,201,{user:publicUser(u),csrf:next.csrf,recoveryCode:recovery});return true;
   }
   const u=users.find(u=>u.provider==='local'&&u.username===username);
   if(url.pathname==='/api/recover'){
    if(typeof b.recoveryCode!=='string'||!u||!equal(digest(b.recoveryCode),u.recovery))error(400,'Usuário ou código inválido.');const salt=token(),value=await hash(b.password,salt);
    // Recheck after asynchronous hashing so recovery codes cannot be reused concurrently.
    if(!equal(digest(b.recoveryCode),u.recovery))error(400,'Código já utilizado.');const recovery=token();u.hash=value;u.salt=salt;u.recovery=digest(recovery);save();for(const [key,other] of sessions)if(other.userId===u.id)sessions.delete(key);const next=login(req,res,s,u);json(res,200,{user:publicUser(u),csrf:next.csrf,recoveryCode:recovery});return true;
   }
   const computed=await hash(b.password,u?.salt||'unregistered-user-dummy-salt');if(!u||!equal(computed,u.hash))error(401,'Usuário ou senha incorretos.');const next=login(req,res,s,u);json(res,200,{user:publicUser(u),csrf:next.csrf});
  }catch(e){json(res,e.status||500,{error:e.status?e.message:'Não foi possível concluir. Tente novamente.'});}
  return true;
 }
 return {handle,authenticated:req=>{const s=session(req,null,false);return Boolean(s?.userId&&users.some(u=>u.id===s.userId));}};
}
module.exports={createAuth};
