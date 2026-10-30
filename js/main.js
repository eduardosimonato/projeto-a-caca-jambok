(() => {
  const $=id=>document.getElementById(id),canvas=$('game');
  const audio=new Aurora.Audio();
  audio.onStatus=text=>{$('sound-status').textContent=text;};
  let game,noticeRemaining=0;
  const input=new Aurora.Input(()=>game?.pause());
  let renderer;
  try { renderer=new Aurora.Renderer(canvas); }
  catch(error){
    $('screen-tag').textContent='GRÁFICOS 3D INDISPONÍVEIS';
    $('screen-title').textContent='Não foi possível abrir o voo 3D.';
    $('screen-copy').textContent=error.message;
    $('start').disabled=true;
    $('screen-hint').textContent='Abra a versão 2D pelo link no rodapé ou tente outro navegador.';
    return;
  }
  const overlay=$('overlay'),start=$('start'),pause=$('pause');
  function focusGame(){canvas.focus({preventScroll:true});}
  game=new Aurora.Game(input,audio,{
    notice(text){$('notice').textContent=text;noticeRemaining=3.5;},
    change(current,reason){
      const playing=current.state==='playing',paused=current.state==='paused';
      audio.setFlight(playing, false);
      $('mission-name').textContent=`${current.missionIndex+1}/2 · ${current.mission.name}`;
      $('mission-description').textContent=current.mission.briefing;
      $('map-mission').textContent=`MISSÃO ${current.missionIndex+1} / ${current.mission.region.toUpperCase()}`;
      $('mission-note').textContent=`${current.mission.targetTimes.length} alvos disponíveis · destrua ${current.mission.requiredTargets}. Vida e combustível são reabastecidos entre missões.`;
      overlay.classList.toggle('hidden',playing);pause.disabled=!playing&&!paused;
      pause.textContent=paused?'Continuar · P':'Pausar · P';
      $('flight-state').textContent=playing?'EM MISSÃO':paused?'VOO PAUSADO':'MISSÃO ENCERRADA';
      $('notice').textContent='';noticeRemaining=0;
      if(playing){focusGame();return;}
      $('brief-stats').hidden=true;
      if(paused){$('screen-tag').textContent='RESPIRE. REORGANIZE.';$('screen-title').textContent='Voo em pausa.';$('screen-copy').textContent='A missão espera por você. Continue quando estiver pronto.';start.textContent='Continuar missão ↗';$('screen-hint').textContent='P ou Esc também retorna ao voo';}
      else {const won=current.state==='won';$('screen-tag').textContent=won?'MISSÃO CUMPRIDA':'FIM DO VOO';$('screen-title').textContent=won?'Caminho aberto.':'Todo piloto aprende.';$('screen-copy').textContent=reason;start.textContent=won?(current.hasNextMission?'Seguir para missão 2 ↗':'Recomeçar campanha ↗'):'Tentar esta missão ↗';if(won){$('screen-title').textContent=current.hasNextMission?'Rumo aos Apeninos.':'Campanha concluída!';$('screen-copy').textContent=current.hasNextMission?`Missão 1 concluída. ${Aurora.MISSIONS[current.missionIndex+1].briefing} Avião reparado e reabastecido na próxima decolagem.`:'As duas missões foram cumpridas. Senta a Pua!';}$('screen-hint').textContent=`${String(current.score).padStart(6,'0')} pontos · ${current.destroyed} alvos · ${Math.min(current.mission.duration,Math.floor(current.elapsed))} s de voo`;$('announcement').textContent=`${won?'Vitória':'Fim de partida'}. ${reason} ${current.score} pontos.`;}
      start.focus({preventScroll:true});
    }
  });
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    if(game.state==='playing')game.pause();
    game.state='graphics-lost';
    audio.setFlight(false);
    $('screen-copy').textContent='A conexão com os gráficos foi interrompida. Recarregue a página para reiniciar.';
    start.disabled=true;pause.disabled=true;
  });
  start.addEventListener('click',()=>{if(game.state==='paused')game.pause();else if(game.state==='won'){if(game.hasNextMission)game.nextMission();else game.restartCampaign();}else game.start();});
  pause.addEventListener('click',()=>game.pause());
  $('sound').addEventListener('click',()=>{audio.setEnabled(!audio.enabled);$('sound').textContent=`Som: ${audio.enabled?'ligado':'desligado'}`;$('sound').setAttribute('aria-pressed',String(audio.enabled));if(game.state==='playing')focusGame();});
  $('volume').addEventListener('input',()=>{audio.setVolume(Number($('volume').value)/100);$('volume-value').textContent=`${$('volume').value}%`;});
  function autoPause(){input.clear();if(game.state==='playing')game.pause();}
  window.addEventListener('blur',autoPause);
  document.addEventListener('inspectionopen',autoPause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
  function hud(){
    $('score').textContent=String(game.score).padStart(6,'0');
    $('health').value=game.player.hp;$('health-value').textContent=`${Math.ceil(game.player.hp)}%`;
    $('fuel').value=game.player.fuel;$('fuel-value').textContent=`${Math.ceil(game.player.fuel)}%`;
    $('targets').textContent=`${game.destroyed} / ${game.mission.requiredTargets}`;
    $('time').textContent=`${Math.max(0,Math.ceil(game.mission.duration-game.elapsed))} s`;
    $('mission-progress').style.width=`${Math.min(100,game.elapsed/game.mission.duration*100)}%`;
  }
  // Passo fixo: as regras não dependem da taxa de atualização da tela.
  let previous=0,accumulator=0;
  function frame(now){
    const delta=previous?Math.min((now-previous)/1000,.1):0;previous=now;
    if(game.state==='playing'){accumulator+=delta;while(accumulator>=1/60){game.update(1/60);accumulator-=1/60;}noticeRemaining-=delta;if(noticeRemaining<=0)$('notice').textContent='';}else accumulator=0;
    audio.setFlight(game.state==='playing',game.state==='playing'&&game.boosting);
    if(game.state!=='graphics-lost')renderer.draw(game);
    hud();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

