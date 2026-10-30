/* Scripts clássicos compartilham apenas este namespace. Funcionam até em file://. */
window.Aurora = window.Aurora || {};
Aurora.WIDTH = 720;
Aurora.HEIGHT = 760;
Aurora.MISSIONS = [{
  id: 'aurora', name: 'Operação Aurora', region: 'Vale Aurora · Itália', landscape: 'farmland', briefing: 'Neutralize os depósitos no vale agrícola e sobreviva até a extração.', duration: 75, requiredTargets: 4,
  targetTimes: [3, 15, 27, 39, 51, 61],
  targetPositions: [180, 510, 290, 560, 150, 390],
  enemyInterval: 2.4, obstacleInterval: 10
}, {
  id: 'apeninos', name: 'Passagem dos Apeninos', region: 'Apeninos · Itália', landscape: 'mountains',
  briefing: 'Atravesse o vale montanhoso e neutralize cinco depósitos ao longo da ferrovia. Bf 109 nas patrulhas; Me 262 fazem passagens rápidas anunciadas!',
  duration: 90, requiredTargets: 5,
  targetTimes: [3, 14, 25, 36, 47, 58, 70], targetPositions: [220, 470, 320, 510, 190, 420, 300],
  enemyInterval: 2.1, obstacleInterval: 9, patrols: ['bf109', 'bf109', 'scout'], jets: true
}];
Aurora.ENEMIES = { bf109: {model:'bf109',name:'Bf 109G-10',hp:2,speed:145,score:140,radius:20,fireInterval:1.8}, me262: {model:'me262',name:'Me 262A-1a',hp:4,speed:340,score:350,radius:25,fireInterval:.38,jet:true}, scout: { model: 'fw190a8', name: 'Fw 190A-8', hp: 2, speed: 125, score: 100, radius: 22, fireInterval: 2.1 } };
Aurora.PLAYER = { speed: 260, boostSpeed: 420, fireInterval: .14, radius: 19, damage: 1 };
Aurora.clamp = (n, min, max) => Math.max(min, Math.min(max, n));
