
// Pure helpers, lifted out and executed by tests/murmuration-wordmark.test.mjs.

/** Small seeded PRNG (mulberry32). */
export function mmwRandom(seed) {
  let a = (seed >>> 0) || 1
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Divergence-free current at (x, y) in unit space at time t: the curl of a
 * sum of travelling waves. Returns [vx, vy]. Being a curl, it never piles birds
 * into a point or tears holes in the flock; it only folds it.
 */
export function mmwCurl(x, y, t) {
  // psi = sin(1.7x + t) cos(1.3y - 0.6t) + 0.6 sin(2.9y + 1.1x - 0.8t) + 0.35 cos(4.3x - 3.7y + 1.3t)
  const a = 1.7 * x + t
  const b = 1.3 * y - 0.6 * t
  const c = 2.9 * y + 1.1 * x - 0.8 * t
  const d = 4.3 * x - 3.7 * y + 1.3 * t
  const dpdx = 1.7 * Math.cos(a) * Math.cos(b) + 0.6 * 1.1 * Math.cos(c) - 0.35 * 4.3 * Math.sin(d)
  const dpdy = -1.3 * Math.sin(a) * Math.sin(b) + 0.6 * 2.9 * Math.cos(c) + 0.35 * 3.7 * Math.sin(d)
  return [dpdy, -dpdx]
}

/** The flock's wandering centre in unit space ([-1, 1] across the width). */
export function mmwCentre(t) {
  return [0.42 * Math.sin(t * 0.21) + 0.12 * Math.sin(t * 0.53 + 1), 0.16 * Math.sin(t * 0.33 + 2) - 0.08]
}

/** Smoothstep. */
export function mmwEase(k) {
  const x = k < 0 ? 0 : k > 1 ? 1 : k
  return x * x * (3 - 2 * x)
}

/**
 * Pair every bird with a target point. Targets are reused round-robin when
 * there are fewer points than birds, and the pairing is shuffled so the word
 * fills in from everywhere at once rather than letter by letter.
 */
export function mmwAssign(birds, points, seed) {
  const out = new Int32Array(birds)
  if (points <= 0) return out.fill(-1)
  const order = new Int32Array(points)
  for (let i = 0; i < points; i++) order[i] = i
  const rand = mmwRandom(seed)
  for (let i = points - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = order[i]
    order[i] = order[j]
    order[j] = tmp
  }
  for (let i = 0; i < birds; i++) out[i] = order[i % points]
  return out
}
// Native adaptation of the user-supplied Murmuration Wordmark. Original in vendor/.
const root=document.querySelector('#intro-name');
const canvas=document.createElement('canvas');canvas.id='name-flock';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
const ctx=canvas.getContext('2d');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let w=1,h=1,dpr=1,n=0,raf=0,visible=false,reduced=false;
let px,py,vx,vy,depth,phase,target,tx,ty;
let textMask=null,softTextMask=null,solidAlpha=0;
let rect={left:0,top:0},screenW=1,screenH=1;
let hx=-1e5,hy=-1e5,last=performance.now(),clock=0;
const colors={ink:'#282d2b'},opts={current:{flyFor:1.1,interactive:true}};
const rand=mmwRandom(11);
function active(){return ctx&&visible&&!document.hidden&&!motion.matches&&document.body.dataset.state==='scene'&&n>0}
function layout(){
 const r=root.getBoundingClientRect();if(!r.width||!r.height)return;
 w=Math.round(r.width);h=Math.round(r.height);dpr=Math.min(devicePixelRatio||1,1.5);screenW=innerWidth;screenH=innerHeight;canvas.width=Math.round(screenW*dpr);canvas.height=Math.round(screenH*dpr);rect=r;
 const m=document.createElement('canvas');m.width=w;m.height=h;const mc=m.getContext('2d',{willReadFrequently:true});
 const style=getComputedStyle(root),size=parseFloat(style.fontSize),line=parseFloat(style.lineHeight);
 mc.font=`${style.fontWeight} ${size}px ${style.fontFamily}`;mc.textBaseline='top';colors.ink=getComputedStyle(document.documentElement).getPropertyValue('--text').trim()||'#282d2b';mc.fillStyle=colors.ink;
 // Sample the same compact tracking as the real heading, without canvas letterSpacing dependency.
 for(const [i,word] of ['Temirlan','Zhumakpayev'].entries()){
  let x=0;for(const char of word){mc.fillText(char,x,i*line);x+=mc.measureText(char).width+parseFloat(style.letterSpacing);}
 }
 textMask=m;hx=hy=-1e5;
 // Cache the softened glyphs once; no live blur/filter in the animation loop.
 softTextMask=document.createElement('canvas');softTextMask.width=w;softTextMask.height=h;
 const soft=softTextMask.getContext('2d');soft.filter='blur(1.2px)';soft.drawImage(m,0,0);
 const pixels=mc.getImageData(0,0,w,h).data,points=[];
 const step=w<500?1.35:1.7;
 for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step)if(pixels[(Math.floor(y)*w+Math.floor(x))*4+3]>160)points.push([x,y]);
 tx=Float32Array.from(points,p=>p[0]);ty=Float32Array.from(points,p=>p[1]);n=Math.min(points.length,innerWidth<600?1000:2600);
 target=mmwAssign(n,points.length,23);px=new Float32Array(n);py=new Float32Array(n);vx=new Float32Array(n);vy=new Float32Array(n);depth=new Float32Array(n);phase=new Float32Array(n);
 for(let i=0;i<n;i++){px[i]=w*(.2+rand()*.6);py[i]=h*(.2+rand()*.6);depth[i]=.55+rand()*.45;phase[i]=rand()*Math.PI*2;}
 root.classList.add('murmuration-ready');sync();
}
const frame=(now)=>{
      raf = 0
      if (!active()) return
      if (!visible) {
        last = now
        return
      }
      // Reduced motion: the flock is drawn but never moves.
      const dt = reduced ? 0 : Math.min(0.05, (now - last) / 1000)
      last = now
      clock += dt
      const o = opts.current
      const fly = Math.max(1, o.flyFor)
      // Repeat every five minutes of visible animation time, with a soft release first.
      const tc=clock<300?clock:(clock-300)%300-3.2
      const pull=tc<0?1-mmwEase((tc+1.6)/1.6):mmwEase((tc-fly)/2.4)
      const envelope=tc<0?1-mmwEase((tc+3.2)/1.6):1

      rect=root.getBoundingClientRect();
      const u = Math.min(w, h)
      const cen = mmwCentre(clock)
      const cxp = w / 2 + cen[0] * w * 0.5
      const cyp = h * 0.42 + cen[1] * h
      const t = clock * 0.35
      const hawk = o.interactive && hx > -1e4
      const hawkR = u * 0.16

      for (let i = 0; i < n; i++) {
        let x = px[i]
        let y = py[i]
        let ax = 0
        let ay = 0
        // Free flight: the current folds the flock, the centre holds it together.
        const free = 1 - pull
        if(free > .001){
        const fx = (x - w / 2) / u
        const fy = (y - h / 2) / u
        const cv = mmwCurl(fx * 2.2 + depth[i] * 0.25, fy * 2.2, t)
        ax += cv[0] * 420 * free
        ay += cv[1] * 420 * free
        const dxC = cxp - x
        const dyC = (cyp - y) * 1.6
        const dC = Math.hypot(dxC, dyC) / u
        const hold = dC < 0.14 ? 0.15 : 0.15 + (dC - 0.14) * 6
        ax += dxC * hold * 2.2 * free
        ay += dyC * hold * 1.6 * free
        }
        // Formation: spring to the bird's point in the word.
        const ti = target[i]
        if (pull > 0 && ti >= 0) {
          ax += (tx[ti] - x) * 9 * pull - vx[i] * 3.2 * pull
          ay += (ty[ti] - y) * 9 * pull - vy[i] * 3.2 * pull
        }
        // The hawk: a hard shove away inside its radius.
        if (hawk) {
          const dx = x - hx
          const dy = y - hy
          const d2 = dx * dx + dy * dy
          if (d2 < hawkR * hawkR) {
            const d = Math.sqrt(d2) + 0.01
            const f = (1 - d / hawkR) * 5200
            ax += (dx / d) * f
            ay += (dy / d) * f
          }
        }
        let nvx = (vx[i] + ax * dt) * (1 - 1.1 * dt)
        let nvy = (vy[i] + ay * dt) * (1 - 1.1 * dt)
        const sp = Math.hypot(nvx, nvy)
        const cap = 520 + 380 * pull
        if (sp > cap) {
          nvx = (nvx / sp) * cap
          nvy = (nvy / sp) * cap
        }
        vx[i] = nvx
        vy[i] = nvy
        px[i] = x + nvx * dt
        py[i] = y + nvy * dt
        phase[i] += dt * (9 + sp * 0.02)
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, rect.left*dpr, rect.top*dpr)
      // Blend into a cached solid glyph mask instead of adding thousands of birds.
      const overText=hawk&&hx>=-20&&hx<=w+20&&hy>=-20&&hy<=h+20;
      const formationAlpha=tc<0?envelope:mmwEase((tc-fly-2.4)/2.4);
      const targetSolid=overText?0:formationAlpha;
      solidAlpha+=(targetSolid-solidAlpha)*(1-Math.exp(-dt*4));
      if(tc<0)solidAlpha=Math.min(solidAlpha,envelope);
      const morph=mmwEase(solidAlpha);
      if(textMask&&solidAlpha>.001){
        const sharpen=mmwEase((solidAlpha-.25)/.75);
        ctx.globalAlpha=solidAlpha*(1-sharpen);ctx.drawImage(softTextMask,0,0);
        ctx.globalAlpha=solidAlpha*sharpen;ctx.drawImage(textMask,0,0);
      }
      // One batched path keeps free flight inexpensive.
      for (let pass = 0; pass < 1; pass++) {
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const near = depth[i] > 0.78

          const s = (1.1 + depth[i] * 1.2) * (1 - 0.48 * pull)
          const sp = Math.hypot(vx[i], vy[i]) + 0.001
          const dx = sp < .02 ? 1 : vx[i] / sp
          const dy = sp < .02 ? 0 : vy[i] / sp
          const flap = (0.55 + 0.45 * Math.sin(phase[i]))*(1-morph)
          const ti=target[i];
          const bx = px[i]+(tx[ti]-px[i])*morph
          const by = py[i]+(ty[ti]-py[i])*morph
          // A "v": two wings swept back from the body, opening and closing.
          const wx = -dx * s
          const wy = -dy * s
          const nx = -dy * s * flap
          const ny = dx * s * flap
          ctx.moveTo(bx + wx + nx, by + wy + ny)
          ctx.lineTo(bx, by)
          ctx.lineTo(bx + wx - nx, by + wy - ny)
        }
        ctx.strokeStyle = colors.ink
        ctx.globalAlpha = .9*(1-morph)
        ctx.lineWidth = 1.35+1.4*Math.sin(Math.PI*solidAlpha)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      const formation=pull>.98?'formed':'flying';
      if(root.dataset.formation!==formation)root.dataset.formation=formation;
      raf = requestAnimationFrame(frame)
    }


function sync(){cancelAnimationFrame(raf);raf=0;root.classList.toggle('murmuration-active',active());canvas.classList.toggle('is-active',active());last=performance.now();if(active())raf=requestAnimationFrame(frame)}
window.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=root.getBoundingClientRect();hx=e.clientX-r.left;hy=e.clientY-r.top;if(hx < -100||hx > w+100||hy < -100||hy > h+100)hx=hy=-1e5});
document.documentElement.addEventListener('pointerleave',()=>{hx=hy=-1e5});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()}).observe(root);
new ResizeObserver(layout).observe(root);
new MutationObserver(()=>{if(document.body.dataset.state==='scene')layout();else sync()}).observe(document.body,{attributes:true,attributeFilter:['data-state']});
document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
document.fonts.ready.then(layout);

// Share the existing morph state without another animation loop or pixel readback.
export function nameAttachment(){return active()?mmwEase(solidAlpha):1}
