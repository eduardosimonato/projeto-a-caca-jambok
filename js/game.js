Aurora.Game = class {
  constructor(input, audio, callbacks = {}, random = Math.random) {
    this.input=input;this.audio=audio;this.callbacks=callbacks;this.random=random;
    this.missionIndex=0;this.checkpointScore=0;this.mission=Aurora.MISSIONS[0];this.reset();this.state='ready';
  }
  reset() {
    this.player={x:360,y:625,hp:100,fuel:100,invincible:0};
    this.enemies=[];this.targets=[];this.obstacles=[];this.bullets=[];this.pickups=[];this.particles=[];
    this.elapsed=0;this.scroll=0;this.score=this.checkpointScore;this.destroyed=0;this.spawnIndex=0;
    this.jetTimer=10;this.pendingJet=null;this.enemyTimer=2;this.obstacleTimer=8;this.fireTimer=0;this.bank=0;this.boosting=false;this.lowFuelWarned=false;
  }
  start() {this.reset();this.input.clear();this.state='playing';this.audio.unlock();this.callbacks.change?.(this);}
  get hasNextMission(){return this.missionIndex<Aurora.MISSIONS.length-1;}
  nextMission(){
    if(this.state!=='won'||!this.hasNextMission)return false;
    this.checkpointScore=this.score;this.missionIndex++;this.mission=Aurora.MISSIONS[this.missionIndex];this.start();return true;
  }
  restartCampaign(){this.missionIndex=0;this.checkpointScore=0;this.mission=Aurora.MISSIONS[0];this.start();}
  pause() {if(this.state!=='playing'&&this.state!=='paused')return;this.state=this.state==='playing'?'paused':'playing';this.input.clear();this.callbacks.change?.(this);}
  finish(won, reason) {
    if(this.state!=='playing')return;
    this.state=won?'won':'lost';if(won)this.score+=500+Math.round(this.player.hp*5);
    this.input.clear();this.audio.finish(won);this.callbacks.change?.(this,reason);
  }
  notify(text) {this.callbacks.notice?.(text);}
  burst(x,y,color='#edc778',amount=14) {
    for(let i=0;i<amount;i++){const a=this.random()*Math.PI*2,s=35+this.random()*110,life=.3+this.random()*.4;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,maxLife:life,color,size:2+this.random()*5});}
  }
  damage(amount) {
    if(this.player.invincible>0)return;
    this.player.hp=Math.max(0,this.player.hp-amount);this.player.invincible=1.1;this.audio.hit();this.burst(this.player.x,this.player.y,'#ef9f72');
    if(this.player.hp===0)this.finish(false,'Seu avião sofreu danos demais. Tente manobrar enquanto dispara.');
  }
  collides(a,b,radius) {return Math.hypot(a.x-b.x,a.y-b.y)<radius;}
  update(dt) {
    if(this.state!=='playing')return;
    const p=this.player,m=this.mission;
    this.elapsed+=dt;p.invincible=Math.max(0,p.invincible-dt);
    this.boosting=this.input.has('ShiftLeft','ShiftRight');
    p.fuel=Math.max(0,p.fuel-dt*(this.boosting?1.45:.65));
    if(p.fuel<=0){this.finish(false,'O combustível acabou. Use a aceleração em intervalos curtos e recolha suprimentos.');return;}
    if(p.fuel<20&&!this.lowFuelWarned){this.notify('Combustível baixo! Poupe a aceleração.');this.lowFuelWarned=true;}
    const axis=this.input.axes(),speed=this.boosting?Aurora.PLAYER.boostSpeed:Aurora.PLAYER.speed;
    this.bank=axis.x;p.x=Aurora.clamp(p.x+axis.x*speed*dt,45,675);p.y=Aurora.clamp(p.y+axis.y*speed*dt,85,710);
    const scrollSpeed=this.boosting?100:62;this.scroll+=scrollSpeed*dt;
    this.fireTimer-=dt;
    if(this.input.has('Space')&&this.fireTimer<=0){for(const side of [-1,1])this.bullets.push({x:p.x+side*22,y:p.y-14,vx:0,vy:-650,owner:'player',dead:false});this.fireTimer=Aurora.PLAYER.fireInterval;this.audio.shoot();}
    if(this.spawnIndex<m.targetTimes.length && this.elapsed>=m.targetTimes[this.spawnIndex]) {
      this.targets.push({x:m.targetPositions[this.spawnIndex],y:-60,hp:6,dead:false});this.spawnIndex++;this.notify('Alvo terrestre à frente · alinhe e dispare');
    }
    this.enemyTimer-=dt;
    if(this.enemyTimer<=0){const types=m.patrols||['scout'],def=Aurora.ENEMIES[types[Math.min(types.length-1,Math.floor(this.random()*types.length))]];this.enemies.push({...def,x:70+this.random()*580,y:-60,phase:this.random()*6.28,fireTimer:1.2,dead:false});this.enemyTimer=Math.max(1.1,m.enemyInterval-this.elapsed*.013);}
    if(m.jets){
      if(this.pendingJet){this.pendingJet.delay-=dt;if(this.pendingJet.delay<=0){this.enemies.push({...Aurora.ENEMIES.me262,x:this.pendingJet.x,y:-100,phase:0,fireTimer:.45,dead:false});this.pendingJet=null;this.jetTimer=14+this.random()*8;}}
      else {this.jetTimer-=dt;if(this.jetTimer<=0){const x=100+this.random()*520;this.pendingJet={x,delay:1.8};this.notify(`Me 262 chegando pela ${x<260?'esquerda':x>460?'direita':'faixa central'}! Saia da faixa marcada.`);}}
    }
    this.obstacleTimer-=dt;
    if(this.obstacleTimer<=0){this.obstacles.push({x:65+this.random()*590,y:-80,dead:false});this.obstacleTimer=m.obstacleInterval;}
    for(const target of this.targets)target.y+=scrollSpeed*dt;
    for(const obstacle of this.obstacles){obstacle.y+=scrollSpeed*dt;if(this.collides(p,obstacle,42)){obstacle.dead=true;this.damage(18);}}
    for(const enemy of this.enemies) {
      enemy.y+=(enemy.speed+(this.boosting?25:0))*dt;if(!enemy.jet)enemy.x=Aurora.clamp(enemy.x+Math.sin(this.elapsed*2+enemy.phase)*(enemy.model==='bf109'?60:45)*dt,35,685);enemy.fireTimer-=dt;
      if(enemy.fireTimer<=0 && enemy.y>20 && enemy.y<p.y-35){const dx=enemy.jet?0:p.x-enemy.x,dy=enemy.jet?1:p.y-enemy.y,length=Math.hypot(dx,dy)||1,speed=enemy.jet?390:195;this.bullets.push({x:enemy.x,y:enemy.y+22,vx:dx/length*speed,vy:dy/length*speed,owner:'enemy',weapon:enemy.jet?'mk108':enemy.model==='bf109'?'bf109':'mg131',damage:enemy.jet?18:12,dead:false});enemy.fireTimer=enemy.fireInterval;}
      if(this.collides(p,enemy,38)){enemy.dead=true;this.burst(enemy.x,enemy.y);this.damage(25);}
    }
    for(const bullet of this.bullets) {
      bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;
      if(bullet.owner==='enemy'){if(this.collides(p,bullet,22)){bullet.dead=true;this.damage(bullet.damage||12);}continue;}
      // Tiros atingem também alvos no solo: uma simplificação intencional de arcade.
      for(const target of [...this.enemies,...this.targets]) {
        if(target.dead||!this.collides(bullet,target,target.radius||34))continue;
        bullet.dead=true;target.hp-=Aurora.PLAYER.damage;this.burst(bullet.x,bullet.y,'#f5e3a2',3);
        if(target.hp<=0){target.dead=true;this.audio.explosion();this.burst(target.x,target.y);if(target.radius){this.score+=target.score;if(this.random()<.25)this.pickups.push({x:target.x,y:target.y,dead:false});}else{this.score+=350;this.destroyed++;this.pickups.push({x:target.x,y:target.y,dead:false});this.notify(this.destroyed>=m.requiredTargets?'Objetivo cumprido! Sobreviva até a extração.':`Alvo destruído · ${this.destroyed} de ${m.requiredTargets}`);}}
        break;
      }
    }
    for(const pickup of this.pickups){pickup.y+=scrollSpeed*dt;if(this.collides(p,pickup,34)){pickup.dead=true;p.fuel=Math.min(100,p.fuel+15);p.hp=Math.min(100,p.hp+8);this.audio.collect();this.notify('Suprimentos: +15 combustível / +8 integridade');}}
    for(const particle of this.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;}
    for(const key of ['enemies','targets','obstacles','bullets','pickups'])this[key]=this[key].filter(item=>!item.dead&&item.y<850&&item.y>-150&&item.x>-100&&item.x<820);
    this.particles=this.particles.filter(particle=>particle.life>0);
    if(this.state==='playing'&&this.elapsed>=m.duration)this.finish(this.destroyed>=m.requiredTargets,this.destroyed>=m.requiredTargets?'Passagem liberada. Sua esquadrilha pode seguir em frente.':`Você voltou, mas destruiu ${this.destroyed} de ${m.requiredTargets} alvos necessários. Priorize as miras amarelas.`);
  }
};

