// Blur/opacity morph adapted from Magic UI Morphing Text (MIT).
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.contact-method').forEach(row=>{
 const button=row.querySelector('button'),link=row.querySelector('a'),[before,after]=row.querySelectorAll('.contact-transition span');let frame=0,timer=0;
 function morph(reveal){cancelAnimationFrame(frame);clearTimeout(timer);const hadFocus=row.contains(document.activeElement);row.dataset.animating='true';before.textContent=reveal?button.textContent:link.textContent;after.textContent=reveal?link.textContent:button.textContent;const start=performance.now();
 function finish(){delete row.dataset.animating;button.hidden=reveal;link.hidden=!reveal;if(hadFocus)(reveal?link:button).focus({preventScroll:true});if(reveal)timer=setTimeout(()=>morph(false),15000)}
 function tick(now){const f=Math.min(1,(now-start)/1000);if(f===1){finish();return}after.style.filter=`blur(${Math.min(8/Math.max(f,.001)-8,100)}px)`;after.style.opacity=Math.pow(f,.4);before.style.filter=`blur(${Math.min(8/Math.max(1-f,.001)-8,100)}px)`;before.style.opacity=Math.pow(1-f,.4);frame=requestAnimationFrame(tick)}
 if(reduced.matches)finish();else frame=requestAnimationFrame(tick)
 }
 button.addEventListener('click',()=>morph(true));
});
