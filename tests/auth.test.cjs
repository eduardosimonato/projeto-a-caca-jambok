const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createServer}=require('../server.cjs');
async function fixture(t,options={}){const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'aurora-auth-'));const origin='http://localhost:4180';const server=createServer({dataDir,origin,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(dataDir,{recursive:true,force:true});});const base=`http://127.0.0.1:${server.address().port}`;
 function client(){let cookie='',csrf='';return {async call(route,data,extra={}){const r=await fetch(base+route,{method:data?'POST':'GET',redirect:'manual',headers:{Cookie:cookie,...(data?{'Content-Type':'application/json',Origin:origin,'X-CSRF-Token':csrf}:{}),...extra},body:data?JSON.stringify(data):undefined});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];let body;const text=await r.text();try{body=JSON.parse(text);}catch{body=text;}if(body?.csrf)csrf=body.csrf;return {status:r.status,body,headers:r.headers};}};}
 return {client,dataDir};}
test('Cadastro, sessão, senha, recuperação única e logout são reais e protegem o jogo',async t=>{
 const {client,dataDir}=await fixture(t),a=client(),b=client();assert.equal((await a.call('/')).status,303);assert.equal((await a.call('/js/main.js')).status,303);
 assert.equal((await a.call('/api/session')).body.user,null);
 assert.equal((await a.call('/api/register',{username:'teste',password:'123456789012'},{Origin:'https://evil.example'})).status,403);
 const created=await a.call('/api/register',{username:'piloto_teste',password:'Uma-senha-longa-123'});assert.equal(created.status,201);assert.match(created.headers.get('set-cookie'),/HttpOnly.*SameSite=Lax/);const code=created.body.recoveryCode;assert.ok(code);
 const disk=fs.readFileSync(path.join(dataDir,'users.json'),'utf8');assert.ok(!disk.includes('Uma-senha-longa-123'));assert.ok(!disk.includes(code));assert.equal((await a.call('/')).status,200);
 for(const route of ['/data/users.json','/server/auth.cjs','/package.json','/.env'])assert.equal((await a.call(route)).status,404);
 await b.call('/api/session');assert.equal((await b.call('/api/login',{username:'piloto_teste',password:'Senha-incorreta-123'})).status,401);assert.equal((await b.call('/api/login',{username:'PILOTO_TESTE',password:'Uma-senha-longa-123'})).status,200);
 assert.equal((await a.call('/api/password',{currentPassword:'Uma-senha-longa-123',password:'Outra-senha-longa-456'})).status,200);assert.equal((await b.call('/api/session')).body.user,null);
 const recovered=await b.call('/api/recover',{username:'piloto_teste',password:'Senha-recuperada-789',recoveryCode:code});assert.equal(recovered.status,200);assert.notEqual(recovered.body.recoveryCode,code);assert.equal((await a.call('/api/session')).body.user,null);
 assert.equal((await a.call('/api/recover',{username:'piloto_teste',password:'Tentativa-antiga-789',recoveryCode:code})).status,400);
 assert.equal((await b.call('/api/logout',{})).status,200);assert.equal((await b.call('/')).status,303);
});
test('Google exige configuração, state, nonce e verificação do token no servidor',async t=>{
 let flow,verified=false,badNonce=false;
 const {client}=await fixture(t,{googleClientId:'client-test',googleClientSecret:'secret-test',googleFactory:()=>({generateAuthUrl(args){flow=args;return 'https://accounts.google.com/o/oauth2/v2/auth?state='+args.state;},async getToken(args){assert.ok(args.codeVerifier);return {tokens:{id_token:'test-token'}};},async verifyIdToken(args){assert.equal(args.audience,'client-test');assert.equal(args.idToken,'test-token');verified=true;return {getPayload:()=>({sub:'stable-user-id',name:'Piloto Google',nonce:badNonce?'incorrect':flow.nonce})};}})});
 const c=client();assert.equal((await c.call('/api/session')).body.googleEnabled,true);await c.call('/auth/google');assert.equal((await c.call('/auth/google/callback?code=test&state=wrong')).headers.get('location'),'/login.html?error=google');assert.equal(verified,false);
 await c.call('/auth/google');badNonce=true;assert.equal((await c.call('/auth/google/callback?code=test&state='+flow.state)).headers.get('location'),'/login.html?error=google');assert.equal((await c.call('/api/session')).body.user,null);
 badNonce=false;await c.call('/auth/google');assert.equal((await c.call('/auth/google/callback?code=test&state='+flow.state)).headers.get('location'),'/');assert.equal((await c.call('/api/session')).body.user.provider,'google');
});
test('Sessões expiram e tentativas repetidas são limitadas',async t=>{
 let clock=Date.now();const {client}=await fixture(t,{now:()=>clock}),c=client();await c.call('/api/session');assert.equal((await c.call('/auth/google')).headers.get('location'),'/login.html?error=google-disabled');await c.call('/api/register',{username:'expira',password:'Senha-longa-1234'});clock+=9*3600000;assert.equal((await c.call('/api/session')).body.user,null);
 for(let i=0;i<12;i++)await c.call('/api/login',{username:'x',password:'x'});assert.equal((await c.call('/api/login',{username:'x',password:'x'})).status,429);
});
