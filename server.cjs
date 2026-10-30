'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createAuth}=require('./server/auth.cjs');
function createServer(options={}){
 const root=__dirname,port=Number(options.port||process.env.PORT||4180),origin=options.origin||process.env.APP_ORIGIN||`http://localhost:${port}`;
 const configured=new URL(origin);if(!['http:','https:'].includes(configured.protocol)||configured.origin!==origin||configured.pathname!=='/'||configured.search||configured.hash)throw new Error('APP_ORIGIN precisa ser apenas a origem, sem caminho.');
 if(configured.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(configured.hostname))throw new Error('Use HTTPS para uma origem pública.');
 const auth=createAuth({dataDir:options.dataDir||path.join(root,'data'),origin,...options,googleClientId:options.googleClientId??process.env.GOOGLE_CLIENT_ID,googleClientSecret:options.googleClientSecret??process.env.GOOGLE_CLIENT_SECRET});
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8'};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try{const url=new URL(req.url,origin);if(await auth.handle(req,res,url))return;
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   let name=decodeURIComponent(url.pathname).replace(/^\//,'');if(!name)name='index.html';
   const allowed=['index.html','login.html','cenarios.html','CREDITOS.html','styles.css','auth.css'].includes(name)||/^(js|vendor|assets)\/[a-zA-Z0-9_./-]+$/.test(name);
   const target=path.resolve(root,name);if(!allowed||!target.startsWith(root+path.sep)||name.split('/').some(part=>part.startsWith('.'))||!mime[path.extname(target)]){res.writeHead(404);res.end('Não encontrado');return;}
   if(['index.html','cenarios.html','js/main.js','js/game.js'].includes(name)&&!auth.authenticated(req)){res.writeHead(303,{Location:'/login.html'});res.end();return;}
   const stat=await fs.promises.stat(target);if(!stat.isFile())throw new Error();res.writeHead(200,{'Content-Type':mime[path.extname(target)]});if(req.method==='HEAD'){res.end();return;}fs.createReadStream(target).pipe(res);
  }catch{if(!res.headersSent)res.writeHead(404);res.end('Não encontrado');}
 });
}
if(require.main===module){const port=Number(process.env.PORT||4180);createServer({port}).listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Jogo com login: ${process.env.APP_ORIGIN||`http://localhost:${port}`}`));}
module.exports={createServer};
