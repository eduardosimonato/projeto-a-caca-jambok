/* Motor e metralhadoras usam gravações locais; alertas e impactos são efeitos de apoio.
   Fontes, licença e limitações históricas: CREDITOS.html. */
Aurora.Audio = class {
  constructor() {this.enabled=false;this.volume=.65;this.context=null;this.flight=false;this.boost=false;this.buffers=null;this.loading=null;this.onStatus=()=>{};}
  unlock() {
    if(!this.enabled)return;
    try {
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context){this.onStatus('Áudio indisponível');return;}
      if(!this.context){
        const c=this.context=new Context();this.master=c.createGain();this.master.gain.value=this.volume;
        this.bus=c.createDynamicsCompressor();this.bus.threshold.value=-16;this.bus.knee.value=18;this.bus.ratio.value=4;this.bus.attack.value=.004;this.bus.release.value=.2;
        this.bus.connect(this.master);this.master.connect(c.destination);
        this.noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=this.noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      }
      this.context.resume().catch(()=>this.onStatus('Clique em Som para tentar novamente'));this.applyVolume();this.loadSamples();
    }catch {this.onStatus('Não foi possível iniciar o áudio');}
  }
  loadSamples(){
    if(this.loading)return this.loading;
    this.onStatus('Preparando gravações…');
    this.loading=(async()=>{
      const decode=async key=>{const text=atob(AuroraMedia[key]);const data=Uint8Array.from(text,c=>c.charCodeAt(0));return this.context.decodeAudioData(data.buffer);};
      const [engine,gun]=await Promise.all([decode('engine'),decode('gun')]);this.buffers={engine,gun};
      this.engineGain=this.context.createGain();this.engineGain.gain.value=0;
      const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=5500;
      this.engine=this.context.createBufferSource();this.engine.buffer=engine;this.engine.loop=true;this.engine.connect(filter);filter.connect(this.engineGain);this.engineGain.connect(this.bus);this.engine.start();
      this.setFlight(this.flight,this.boost,true);this.onStatus('Motor e rajadas: áudio gravado');
    })().catch(()=>{this.onStatus('Falha ao carregar gravações');this.loading=null;});
    return this.loading;
  }
  setEnabled(value){this.enabled=value;if(value)this.unlock();this.applyVolume();}
  setVolume(value){if(Number.isFinite(value))this.volume=Math.max(0,Math.min(1,value));this.applyVolume();}
  applyVolume(){if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.03);}
  setFlight(active,boost=false,force=false){
    if(!force&&active===this.flight&&boost===this.boost)return;this.flight=active;this.boost=boost;if(!this.engineGain)return;
    const now=this.context.currentTime;this.engineGain.gain.setTargetAtTime(active?(boost?.67:.51):0,now,.1);this.engine.playbackRate.setTargetAtTime(boost?1.12:1,now,.32);
  }
  get ready(){return this.enabled&&this.context&&this.bus;}
  voice(source,duration,volume,when,filter=null){
    const gain=this.context.createGain();gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.003);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    if(filter){source.connect(filter);filter.connect(gain);}else source.connect(gain);gain.connect(this.bus);
    source.onended=()=>{source.disconnect();filter?.disconnect();gain.disconnect();};source.start(when);source.stop(when+duration+.015);
  }
  tone(frequency,end,duration,volume,when,type='sine'){
    const source=this.context.createOscillator();source.type=type;source.frequency.setValueAtTime(frequency,when);source.frequency.exponentialRampToValueAtTime(end,when+duration);this.voice(source,duration,volume,when);
  }
  noise(duration,volume,cutoff,when){const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter();source.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.6;this.voice(source,duration,volume,when,filter);}
  shoot(){
    if(!this.ready||!this.buffers)return;const source=this.context.createBufferSource();source.buffer=this.buffers.gun;source.playbackRate.value=.98+Math.random()*.04;this.voice(source,this.buffers.gun.duration,.7,this.context.currentTime);
  }
  hit(){if(!this.ready)return;const now=this.context.currentTime;this.noise(.24,.42,1600,now);this.tone(115,43,.2,.24,now);}
  explosion(){if(!this.ready)return;const now=this.context.currentTime;this.noise(.16,.4,2300,now);this.noise(.9,.6,500,now);this.tone(85,28,.7,.4,now);}
  collect(){if(!this.ready)return;const now=this.context.currentTime;this.tone(950,950,.075,.07,now);this.tone(950,950,.075,.07,now+.14);}
  finish(won){if(!this.ready)return;const now=this.context.currentTime;this.tone(won?750:350,won?750:200,.25,.1,now);}
};
