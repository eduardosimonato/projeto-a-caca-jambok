// Explicit visual regression fixture, never loaded by the game entry point.
Aurora.Game=class extends Aurora.Game {
 constructor(...args){super(...args);this.missionIndex=1;this.mission=Aurora.MISSIONS[1];}
 start(){super.start();this.player.x=675;this.player.y=625;this.player.invincible=0;this.enemyTimer=999;this.input.axes=()=>({x:1,y:0});}
};
