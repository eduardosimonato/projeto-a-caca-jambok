const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/config.js'),'utf8').replace('window.Aurora = window.Aurora || {};','var Aurora = {};'),context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8'),context);
function setup(){
  const keys=new Set();const input={clear:()=>keys.clear(),has:(...codes)=>codes.some(c=>keys.has(c)),axes:()=>({x:0,y:0})};
  const audio={unlock(){},shoot(){},hit(){},explosion(){},collect(){},finish(){}};
  const game=new context.Aurora.Game(input,audio,{},()=>.5);game.start();return {game,keys,input};
}
test('Movimento diagonal normalizado e limites da área de voo',()=>{
  const {game,input}=setup();input.axes=()=>({x:Math.SQRT1_2,y:-Math.SQRT1_2});
  const {x,y}=game.player;game.update(1/60);assert.ok(Math.abs(Math.hypot(game.player.x-x,game.player.y-y)-260/60)<.001);
  game.player.x=674;game.player.y=86;game.update(1/60);assert.equal(game.player.x,675);assert.equal(game.player.y,85);
});
test('Aceleração aumenta movimento e consumo de combustível',()=>{
  const a=setup(),b=setup();a.input.axes=b.input.axes=()=>({x:1,y:0});b.keys.add('ShiftLeft');
  a.game.update(.1);b.game.update(.1);assert.ok(b.game.player.x>a.game.player.x);assert.ok(b.game.player.fuel<a.game.player.fuel);
});
test('Pausa congela missão e limpa teclas; retomada funciona',()=>{
  const {game,keys}=setup();keys.add('Space');game.pause();game.update(1);assert.equal(game.elapsed,0);assert.equal(keys.size,0);game.pause();game.update(.1);assert.equal(game.elapsed,.1);
});
test('Tiros destroem alvo, contam objetivo e concedem pontos uma única vez',()=>{
  const {game}=setup();game.targets.push({x:200,y:200,hp:1,dead:false});
  game.bullets.push({x:200,y:210,vx:0,vy:-650,owner:'player'});game.update(1/60);
  assert.equal(game.destroyed,1);assert.equal(game.score,350);assert.equal(game.targets.length,0);assert.equal(game.pickups.length,1);
  game.update(1/60);assert.equal(game.score,350);
});
test('Tiros inimigos causam dano e invulnerabilidade temporária evita dano acumulado',()=>{
  const {game}=setup();for(let i=0;i<2;i++)game.bullets.push({x:360,y:625,vx:0,vy:0,owner:'enemy'});
  game.update(1/60);assert.equal(game.player.hp,88);assert.equal(game.bullets.length,0);
});
test('Suprimentos recuperam vida e combustível sem exceder 100',()=>{
  const {game}=setup();game.player.hp=98;game.pickups.push({x:360,y:625});game.update(1/60);assert.equal(game.player.hp,100);assert.equal(game.player.fuel,100);assert.equal(game.pickups.length,0);
});
test('Vitória exige tempo e quatro alvos; bônus não se repete',()=>{
  const {game}=setup();game.destroyed=4;game.update(.1);assert.equal(game.state,'playing');game.elapsed=74.99;game.update(1/60);assert.equal(game.state,'won');const score=game.score;game.update(1);assert.equal(game.score,score);
});
test('Derrotas por objetivo incompleto, vida e combustível',()=>{
  const a=setup().game;a.elapsed=74.99;a.update(1/60);assert.equal(a.state,'lost');
  const b=setup().game;b.damage(100);assert.equal(b.state,'lost');
  const c=setup().game;c.player.fuel=.001;c.update(1/60);assert.equal(c.state,'lost');
});
test('Reinício restaura recursos, pontuação, cronômetro e entidades',()=>{
  const {game}=setup();game.score=1000;game.destroyed=5;game.player.hp=5;game.enemies.push({});game.finish(false,'');game.start();assert.equal(game.score,0);assert.equal(game.player.hp,100);assert.equal(game.elapsed,0);assert.equal(game.destroyed,0);assert.equal(game.enemies.length,0);assert.equal(game.state,'playing');
});
test('Simulação completa mantém entidades limitadas e cria as seis oportunidades',()=>{
  const {game,keys}=setup();keys.add('Space');for(let i=0;i<4502&&game.state==='playing';i++){game.player.invincible=10;game.update(1/60);assert.ok(game.bullets.length<200);}
  assert.equal(game.spawnIndex,6);assert.ok(['won','lost'].includes(game.state));
});


test('Campanha avança somente com vitória e preserva pontos sem duplicar bônus',()=>{
 const {game}=setup();assert.equal(game.nextMission(),false);game.score=1234;game.player.hp=50;game.player.fuel=12;
 game.finish(true,'ok');const checkpoint=game.score;assert.equal(game.nextMission(),true);assert.equal(game.missionIndex,1);assert.equal(game.mission.id,'apeninos');assert.equal(game.score,checkpoint);assert.equal(game.player.hp,100);assert.equal(game.player.fuel,100);assert.equal(game.elapsed,0);assert.equal(game.destroyed,0);assert.equal(game.hasNextMission,false);assert.equal(game.nextMission(),false);
 game.score+=200;game.finish(false,'lost');game.start();assert.equal(game.missionIndex,1);assert.equal(game.score,checkpoint);
 game.destroyed=5;game.elapsed=90;game.update(1/60);assert.equal(game.state,'won');assert.equal(game.nextMission(),false);
 game.restartCampaign();assert.equal(game.missionIndex,0);assert.equal(game.score,0);assert.equal(game.state,'playing');
});
test('Missão 2 cria as sete oportunidades e termina no prazo configurado',()=>{
 const {game}=setup();game.finish(true,'ok');game.nextMission();let targets=0,last=0;
 for(let i=0;i<5402&&game.state==='playing';i++){game.player.invincible=2;game.player.fuel=100;game.update(1/60);if(game.spawnIndex>last){targets++;last=game.spawnIndex;}}
 assert.equal(targets,7);assert.equal(game.state,'lost');assert.ok(game.elapsed>=90);
});

test('Missão 1 não recebe Messerschmitt; missão 2 mistura Bf 109 e Fw 190',()=>{
 const {game}=setup();game.enemyTimer=0;game.update(.01);assert.equal(game.enemies[0].model,'fw190a8');assert.equal(game.pendingJet,null);
 game.missionIndex=1;game.mission=context.Aurora.MISSIONS[1];game.start();game.enemyTimer=0;game.update(.01);assert.equal(game.enemies[0].model,'bf109');
 game.random=()=>.99;game.enemyTimer=0;game.update(.01);assert.equal(game.enemies[1].model,'fw190a8');
});
test('Me 262 avisa, respeita pausa, faz passagem rápida e dispara para a frente',()=>{
 const {game}=setup();game.missionIndex=1;game.mission=context.Aurora.MISSIONS[1];game.start();game.jetTimer=0;game.update(.01);
 assert.ok(game.pendingJet);assert.ok(!game.enemies.some(e=>e.jet));const delay=game.pendingJet.delay;
 game.pause();game.update(1);assert.equal(game.pendingJet.delay,delay);game.pause();
 for(let i=0;i<110;i++)game.update(1/60);const jet=game.enemies.find(e=>e.jet);assert.ok(jet);assert.equal(game.pendingJet,null);assert.ok(jet.speed>context.Aurora.ENEMIES.bf109.speed*2);
 const x=jet.x;jet.y=100;jet.fireTimer=0;game.update(1/60);assert.equal(jet.x,x);const bullet=game.bullets.find(b=>b.weapon==='mk108');assert.ok(bullet);assert.equal(bullet.vx,0);assert.equal(bullet.damage,18);
 game.player.invincible=100;for(let i=0;i<180;i++)game.update(1/60);assert.ok(!game.enemies.includes(jet));assert.ok(game.jetTimer>0);
 game.start();assert.equal(game.pendingJet,null);assert.equal(game.jetTimer,10);
});
