// One-time depth reveal; each card gently avoids the pointer independently.
const tunnel=document.querySelector('.about-tunnel'),stage=tunnel.querySelector('.tunnel-stage'),cards=[...tunnel.querySelectorAll('.tunnel-card')],reduce=matchMedia('(prefers-reduced-motion: reduce)'),desktop=matchMedia('(min-width:901px)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
const positions=[[-.30,-.23],[.30,-.23],[-.30,.16],[.30,.16],[-.23,.37],[.23,.37]];
const offsets=cards.map(()=>({x:0,y:0,tx:0,ty:0}));
let frame=0,inView=false,revealed=false,progress=0,last=0,width=0,height=0;
function draw(){
 if(reduce.matches||!desktop.matches)return;
 cards.forEach((card,i)=>{
  const x=positions[i][0]*width+offsets[i].x,y=positions[i][1]*height+offsets[i].y;
  card.style.transform=`translate3d(calc(-50% + ${x}px),calc(-50% + ${y}px),${-220+progress*250}px) rotateZ(${(i%2?1:-1)*(1-progress)*3}deg)`;
  card.style.opacity=.72+progress*.28;
 });
}
function tick(now){
 frame=0;
 if(!inView||document.hidden||reduce.matches||!desktop.matches)return;
 const dt=Math.min((now-last)/1000,.05),ease=1-Math.exp(-9*dt);last=now;
 if(revealed){progress+=(1-progress)*(1-Math.exp(-6*dt));if(1-progress<.001)progress=1}
 let moving=false;
 offsets.forEach(o=>{o.x+=(o.tx-o.x)*ease;o.y+=(o.ty-o.y)*ease;if(Math.abs(o.tx-o.x)+Math.abs(o.ty-o.y)>.05)moving=true});
 draw();
 if((revealed&&progress<1)||moving)frame=requestAnimationFrame(tick);
}
function schedule(){if(!frame&&inView&&!document.hidden&&!reduce.matches&&desktop.matches){last=performance.now();frame=requestAnimationFrame(tick)}}
function resetPointer(){offsets.forEach(o=>{o.tx=o.ty=0});schedule()}
function measure(){
 width=stage.clientWidth;height=stage.clientHeight;
 cards.forEach(card=>card.style.width=Math.max(220,Math.min(270,width*.245))+'px');
 const rect=stage.getBoundingClientRect();
 if(rect.height&&rect.top<innerHeight*.4&&rect.bottom>0)revealed=true;
 if(reduce.matches||!desktop.matches){if(inView)revealed=true;progress=revealed?1:0;offsets.forEach(o=>{o.x=o.y=o.tx=o.ty=0})}
 draw();schedule();
}
window.addEventListener('scroll',()=>{
 if(!revealed&&stage.getBoundingClientRect().top<innerHeight*.4){revealed=true;schedule()}
 resetPointer();
},{passive:true});
new ResizeObserver(measure).observe(stage);
new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;if(inView)measure();else{cancelAnimationFrame(frame);frame=0;offsets.forEach(o=>{o.x=o.y=o.tx=o.ty=0})}}).observe(stage);
stage.addEventListener('pointermove',event=>{
 if(!fine.matches||!desktop.matches||reduce.matches||event.pointerType==='touch')return;
 const rect=stage.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top;
 offsets.forEach((o,i)=>{
  // Use resting centers, so moving away cannot repeatedly reverse the force.
  const cx=width*(.5+positions[i][0]),cy=height*(.5+positions[i][1]);
  let dx=cx-px,dy=cy-py;const distance=Math.hypot(dx,dy),radius=180;
  if(distance<radius){if(distance<1){dx=0;dy=-1}const length=Math.hypot(dx,dy),force=38*Math.pow(1-distance/radius,2);o.tx=dx/length*force;o.ty=dy/length*force}
  else o.tx=o.ty=0;
 });schedule();
});
stage.addEventListener('pointerleave',resetPointer);
[reduce,desktop,fine].forEach(m=>m.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;resetPointer();measure()}));
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;resetPointer();if(!document.hidden)measure()});
measure();
