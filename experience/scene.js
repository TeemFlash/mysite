import {createTrail} from './trail.js';
const body=document.body,shell=document.querySelector('#player-shell'),record=document.querySelector('.record'),desk=document.querySelector('.desk'),scene=document.querySelector('#heart-scene'),play=document.querySelector('#record-control'),audio=document.querySelector('#track'),canvas=document.querySelector('#lightning-trail');
const mq=matchMedia('(prefers-reduced-motion: reduce)');let state='intro',lang='en',effects=true,holding=false,rotation=0,last=0,spinFrame=0,speed=0,transitionToken=0,localURL=null;
const trail=createTrail(canvas);
const messages={ru:{again:'Вступление',effects:'Эффекты',leftHint:'Зажми ЛКМ и двигай мышью',file:'Открыть аудиофайл'},en:{again:'Replay intro',effects:'Effects',leftHint:'Hold left click and move',file:'Open audio file'}};
function status(text){document.querySelector('#music-status').textContent=text}
function updatePlayback(){const running=!audio.paused;play.setAttribute('aria-label',state==='intro'?(lang==='ru'?'Начать вступление':'Start introduction'):(lang==='ru'?(running?'Приостановить музыку':'Включить музыку'):(running?'Pause music':'Play music')));play.setAttribute('aria-pressed',running);if(state==='scene')speed=running?35:0;desk.classList.toggle('playing',state==='accelerating'||running);if(speed)spin()}
function spin(now=performance.now()){if(spinFrame)return;last=now;const frame=t=>{spinFrame=0;const dt=Math.min((t-last)/1000,.05);last=t;if(!mq.matches){rotation+=speed*dt;record.style.transform=`rotate(${rotation}deg)`}if(speed&&!document.hidden&&!mq.matches)spinFrame=requestAnimationFrame(frame)};if(speed&&!mq.matches)spinFrame=requestAnimationFrame(frame)}
function bounds(){const width=Math.min(innerWidth*.76,780,innerHeight);return {width:innerWidth<=760?innerWidth*.84:width,height:(innerWidth<=760?innerWidth*.84:width)/(1147/890)}}
function dock(){const r=bounds(),mobile=innerWidth<=760,target=mobile?150:220,scale=target/r.width;const heroHeight=Math.max(innerHeight,innerHeight<=500?900:(mobile?620:650));const x=innerWidth-target-(mobile?32:60),y=heroHeight-r.height*scale-45;shell.style.transform=`translate(${x-innerWidth*.5}px,${y-innerHeight*(mobile?.43:.44)}px) scale(${scale}) rotate(-8deg)`;return shell.style.transform}
async function enter(){if(state!=='intro')return;const token=++transitionToken;state='accelerating';body.dataset.state=state;play.disabled=true;desk.classList.add('playing');speed=mq.matches?0:1300;spin();playAudio();const duration=mq.matches?0:1100;await new Promise(r=>setTimeout(r,duration));if(token!==transitionToken)return;const before=getComputedStyle(shell).transform;shell.classList.add('docked');const after=dock();scene.hidden=false;document.querySelectorAll('.scene-controls,.interaction-hints,.music-info').forEach(e=>e.hidden=false);const anim=shell.animate([{transform:before},{transform:after}],{duration:mq.matches?0:850,easing:'cubic-bezier(.22,.75,.15,1)',fill:'none'});if(!mq.matches)scene.animate([{opacity:0},{opacity:1}],{duration:850,fill:'none'});await anim.finished;if(token!==transitionToken)return;state='scene';body.dataset.state=state;play.disabled=false;updatePlayback();fadeMusic();document.querySelector('#announcer').textContent=lang==='ru'?'Сцена открыта. Зажми ЛКМ для следа молнии.':'Scene open. Hold left click for lightning.'}
async function playAudio(){resetFade();prepareAudio();audio.volume=1;try{if(!localURL)audio.currentTime=Number(audio.dataset.start)||0;await audio.play();if(state==='scene')fadeMusic();status(localURL?(lang==='ru'?'Локальный аудиофайл':'Local audio file'):(lang==='ru'?'Ознакомительный фрагмент / Apple Music':'Preview / Apple Music'))}catch{status(lang==='ru'?'Нажми на проигрыватель ещё раз или открой аудиофайл.':'Press the record player again or open an audio file.')}updatePlayback()}
play.addEventListener('click',()=>{if(state==='intro')enter();else if(state==='scene'){if(audio.paused)playAudio();else audio.pause()}});
audio.addEventListener('play',updatePlayback);audio.addEventListener('pause',updatePlayback);audio.addEventListener('ended',()=>{updatePlayback();status(lang==='ru'?'Фрагмент закончился · Нажми проигрыватель для повтора':'Preview ended · Press the record player to replay')});audio.addEventListener('error',()=>{status(lang==='ru'?'Музыка недоступна. Открой аудиофайл.':'Music unavailable. Open an audio file.');updatePlayback()});
const interactive=e=>e.target.closest('button,a,input,label');
document.querySelector('#playground').addEventListener('pointerdown',e=>{if(state!=='scene'||!effects||interactive(e))return;if(e.button===0){holding=true;if(!mq.matches)trail.add(e.clientX,e.clientY)}});
window.addEventListener('pointermove',e=>{if(holding&&(e.buttons&1)&&state==='scene'&&effects&&!mq.matches)trail.add(e.clientX,e.clientY);else if(!(e.buttons&1)){holding=false;trail.end()}});
window.addEventListener('pointerup',()=>{holding=false;trail.end()});window.addEventListener('pointercancel',()=>{holding=false;trail.end()});window.addEventListener('blur',()=>{holding=false;trail.clear()});
window.addEventListener('resize',()=>{trail.resize();if(state==='scene')dock()});mq.addEventListener('change',()=>{trail.clear();if(mq.matches){cancelAnimationFrame(spinFrame);spinFrame=0}else spin()});document.addEventListener('visibilitychange',()=>{if(document.hidden){trail.clear();holding=false;cancelAnimationFrame(spinFrame);spinFrame=0}else spin()});
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;document.documentElement.lang=lang;document.querySelectorAll('[data-t]').forEach(e=>e.textContent=messages[lang][e.dataset.t]);document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.lang===lang));document.querySelector('#reset-intro')?.setAttribute('aria-label',lang==='ru'?'Повторить вступление':'Replay intro')}));
document.querySelector('#audio-file').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;if(localURL)URL.revokeObjectURL(localURL);localURL=URL.createObjectURL(file);audio.src=localURL;playAudio()});

const work=document.querySelector('#work'),projectDialog=document.querySelector('#project-dialog');
const projectEnglish={selected:'Projects',demo:'Illustrative projects',rhythm:'A closer look at rhythm',signal:'Signal visualization',synthetic:'Synthetic signal',pulseDesc:'Complex data. A clearer picture.',pulseCat:'Interface / Biotechnology',motionDesc:'When code starts moving.',atlasDesc:'Room for bigger ideas.'};
const projectRussian=Object.fromEntries([...work.querySelectorAll('[data-i18n]')].map(e=>[e.dataset.i18n,e.textContent]));
function projectLanguage(){work.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=(lang==='en'?projectEnglish:projectRussian)[e.dataset.i18n]||e.textContent);document.querySelector('#project-note').textContent=lang==='ru'?'Пример оформления. Реальные данные проекта добавим позже.':'Presentation example. Real project details will be added later.';work.querySelectorAll('[data-project]').forEach(e=>e.setAttribute('aria-label',(lang==='ru'?'Открыть пример ':'Open example ')+e.querySelector('h3').textContent));}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',projectLanguage));
work.querySelectorAll('[data-project]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('#project-title').textContent=b.querySelector('h3').textContent;projectLanguage();projectDialog.showModal()}));document.querySelector('#close-project').addEventListener('click',()=>projectDialog.close());

document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('[data-copy=bio]').textContent=lang==='ru'?'Интерес к биоинженерии':'Interested in bioengineering';document.querySelector('[data-copy=projects]').textContent=lang==='ru'?'Проекты':'Projects';document.querySelector('[data-copy=contact]').textContent=lang==='ru'?'Связаться':'Contact';document.querySelector('[data-copy=contactHeading]').textContent=lang==='ru'?'Связаться со мной':'Contact me';requestAnimationFrame(()=>moveHighlight(activeNavigation));}));



let fadeTimer=0,audioContext=null,audioGain=null;
function resetFade(){
  clearInterval(fadeTimer);fadeTimer=0;
  if(audioGain){audioGain.gain.cancelScheduledValues(audioContext.currentTime);audioGain.gain.setValueAtTime(1,audioContext.currentTime)}
}
function prepareAudio(){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!audioContext&&Context){
    audioContext=new Context();
    audioGain=audioContext.createGain();
    audioContext.createMediaElementSource(audio).connect(audioGain);
    audioGain.connect(audioContext.destination);
  }
  if(audioContext?.state==='suspended')audioContext.resume().catch(()=>{});
}
function fadeMusic(){
  // Start only once playback has actually begun, including after a slow load.
  if(audio.paused||audio.readyState<3)return;
  clearInterval(fadeTimer);
  const duration=3,start=performance.now(),initial=audioGain?audioGain.gain.value:audio.volume;
  if(audioGain){
    const now=audioContext.currentTime,curve=new Float32Array(121);
    for(let i=0;i<curve.length;i++){const t=i/(curve.length-1);curve[i]=initial*(1-t*t*(3-2*t))}
    audioGain.gain.cancelScheduledValues(now);
    audioGain.gain.setValueCurveAtTime(curve,now,duration);
  }
  fadeTimer=setInterval(()=>{
    const t=Math.min(1,(performance.now()-start)/(duration*1000));
    if(!audioGain)audio.volume=initial*(1-t*t*(3-2*t));
    if(t===1){clearInterval(fadeTimer);fadeTimer=0;audio.pause()}
  },25);
}
projectLanguage();updatePlayback();

// Untitled UI button-border visual treatment; local shared-selection animation.
const navigation=document.querySelector('.hero-navigation'),highlight=navigation.querySelector('.nav-highlight');
let activeNavigation=navigation.querySelector('a');
function moveHighlight(link){if(!link)return;const r=link.getBoundingClientRect(),n=navigation.getBoundingClientRect();highlight.style.width=r.width+'px';highlight.style.transform=`translateX(${r.left-n.left-5}px)`;}
function selectNavigation(link){activeNavigation=link;navigation.querySelectorAll('a').forEach(a=>{if(a===link)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});moveHighlight(link)}
navigation.querySelectorAll('a').forEach(a=>{a.addEventListener('pointerenter',()=>moveHighlight(a));a.addEventListener('focus',()=>moveHighlight(a));a.addEventListener('click',()=>selectNavigation(a))});navigation.addEventListener('pointerleave',()=>moveHighlight(activeNavigation));navigation.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!navigation.contains(document.activeElement))moveHighlight(activeNavigation)}));window.addEventListener('resize',()=>moveHighlight(activeNavigation));new ResizeObserver(()=>moveHighlight(activeNavigation)).observe(navigation);selectNavigation(activeNavigation);

function accessibilityLanguage(){
  const ru=lang==='ru';
  updatePlayback();
  document.querySelector('.hero-navigation').setAttribute('aria-label',ru?'Разделы сайта':'Explore');
  document.querySelector('.language-controls').setAttribute('aria-label',ru?'Язык':'Language');
  document.querySelector('#close-project').setAttribute('aria-label',ru?'Закрыть проект':'Close project');
  document.querySelector('.player-photo').alt=ru?'Виниловый проигрыватель':'Vinyl record player';
}
document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',accessibilityLanguage));
accessibilityLanguage();
