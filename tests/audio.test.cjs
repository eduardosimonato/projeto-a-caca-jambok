const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(supported = true) {
  const sources = [], contexts = [];
  const param = () => ({ value: 0, events: [],
    setValueAtTime(v,t){this.events.push([v,t]);},
    linearRampToValueAtTime(v,t){this.events.push([v,t]);},
    exponentialRampToValueAtTime(v,t){assert.ok(v>0);this.events.push([v,t]);},
    setTargetAtTime(v,t){this.events.push([v,t]);}
  });
  const node = () => ({connect(){},disconnect(){this.disconnected=true;}});
  class Context {
    constructor(){this.currentTime=10;this.sampleRate=48000;this.destination=node();contexts.push(this);}
    resume(){return Promise.resolve();}
    createGain(){return {...node(),gain:param()};}
    createBiquadFilter(){return {...node(),frequency:param(),Q:param()};}
    createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
    createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
    createOscillator(){const s={...node(),frequency:param(),start(t){this.started=t;},stop(t){this.stopped=t;}};sources.push(s);return s;}
    decodeAudioData(){return Promise.resolve({duration:.36});}
    createBufferSource(){const s=this.createOscillator();s.playbackRate=param();return s;}
  }
  const ctx=vm.createContext({Aurora:{},AuroraMedia:{engine:'AA==',gun:'AA=='},atob:s=>Buffer.from(s,'base64').toString('binary'),window:supported?{AudioContext:Context}:{}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/audio.js'),'utf8'),ctx);
  return {audio:new ctx.Aurora.Audio(),sources,contexts};
}
test('Som desligado não cria contexto; alternar reutiliza motor e controla ganho',async()=>{
  const {audio,contexts,sources}=setup();audio.shoot();audio.unlock();assert.equal(contexts.length,0);
  audio.setEnabled(true);await audio.loading;assert.equal(contexts.length,1);assert.equal(sources.length,1);
  audio.setEnabled(false);assert.equal(audio.master.gain.events.at(-1)[0],0);
  audio.setEnabled(true);await audio.loading;assert.equal(contexts.length,1);assert.equal(sources.length,1);
  audio.setVolume(.4);assert.equal(audio.master.gain.events.at(-1)[0],.4);
  audio.setVolume(5);assert.equal(audio.volume,1);
});
test('Motor segue voo, aceleração e pausa sem reagendar a cada quadro',async()=>{
  const {audio}=setup();audio.setFlight(true);audio.setEnabled(true);await audio.loading;
  assert.ok(audio.engineGain.gain.events.at(-1)[0]>0);
  const count=audio.engineGain.gain.events.length;audio.setFlight(true);assert.equal(audio.engineGain.gain.events.length,count);
  audio.setFlight(true,true);assert.equal(audio.engine.playbackRate.events.at(-1)[0],1.12);
  audio.setFlight(false);assert.equal(audio.engineGain.gain.events.at(-1)[0],0);
});
test('Efeitos em camadas são finitos e liberam nós ao terminar',async()=>{
  const {audio,sources}=setup();audio.setEnabled(true);await audio.loading;
  audio.shoot();audio.hit();audio.explosion();audio.collect();audio.finish(true);audio.finish(false);
  assert.equal(sources.length,11);
  for(const source of sources.slice(1)){assert.ok(source.stopped>source.started);source.onended();assert.equal(source.disconnected,true);}
  audio.setEnabled(false);audio.explosion();assert.equal(sources.length,11);
});
test('Navegador sem Web Audio continua sem lançar erro',async()=>{
  const {audio}=setup(false);audio.setEnabled(true);await audio.loading;audio.shoot();audio.hit();audio.explosion();audio.collect();audio.finish(false);audio.setFlight(true);assert.equal(audio.context,null);
});

