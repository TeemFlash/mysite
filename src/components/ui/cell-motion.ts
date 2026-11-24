import { useEffect, useRef, type RefObject } from "react";
import { pigment, type Pigment } from "./cell-pigment";
import { membraneOutline } from "./cell-contour";
export { membraneRadius } from "./cell-contour";

export type Cell = { id: number; generation: number; size: number; x: number; y: number; fromX: number; fromY: number; pigment?: Pigment; fromColor?: [number, number, number]; fromSize?: number; birth?: number; texture?: number };
const CELL_COLORS: [number, number, number][] = [[136,105,252],[39,198,153],[251,130,192],[207,229,55],[127,219,247],[252,94,84],[252,144,55],[251,208,93]];
export const cellColor = (cell: Cell) => cell.pigment?.color ?? CELL_COLORS[(cell.id-1)%CELL_COLORS.length];
export const cellPigment = (cell: Cell) => cell.pigment ?? pigment(cellColor(cell),cell.size**2);
export function mixedColor(a: Cell, b: Cell): [number, number, number] {
  const massA=cellPigment(a).mass, massB=cellPigment(b).mass;
  const weight=massA+massB ? massA/(massA+massB) : .5;
  return cellColor(a).map((value,i)=>Math.round(value*weight+cellColor(b)[i]*(1-weight))) as [number,number,number];
}
type Body = { source: Cell; x: number; y: number; vx: number; vy: number; age: number; node: HTMLElement; settle?: { x:number; v:number } };
type Merge = { a: number; b: number; elapsed: number; ax: number; ay: number; bx: number; by: number };



// This envelope clips the textured nucleus masks after they touch.
function liquidOutline(ax: number, ay: number, ar: number, bx: number, by: number, br: number, blend: number) {
  const cx=(ax*ar+bx*br)/(ar+br), cy=(ay*ar+by*br)/(ar+br);
  const reach=Math.hypot(ax-bx,ay-by)+(ar+br)+blend;
  const points: string[]=[];
  for(let i=0;i<80;i++) {
    const angle=i/80*Math.PI*2, dx=Math.cos(angle), dy=Math.sin(angle);
    let lo=0,hi=reach;
    for(let j=0;j<11;j++) {
      const r=(lo+hi)/2, x=cx+dx*r,y=cy+dy*r;
      const da=Math.hypot(x-ax,y-ay)-ar;
      const db=Math.hypot(x-bx,y-by)-br;
      const h=Math.max(blend-Math.abs(da-db),0)/blend;
      const distance=Math.min(da,db)-h*h*blend*.25;
      if(distance<0)lo=r;else hi=r;
    }
    points.push(`${(cx+dx*(lo+hi)/2).toFixed(2)} ${(cy+dy*(lo+hi)/2).toFixed(2)}`);
  }
  return `M ${points.join(' L ')} Z`;
}
function restore(node: HTMLElement) {
  node.style.opacity=''; node.style.scale=''; node.style.transformOrigin=''; node.style.removeProperty('--fusion'); node.style.removeProperty('--core-fusion');
  const nucleus=node.querySelector<HTMLElement>('.cell-nucleus');
  if(nucleus) { nucleus.style.transform=''; nucleus.style.removeProperty('background-color'); }
}

type Geometry = { ax:number; ay:number; bx:number; by:number; x:number; y:number; size:number; color:[number,number,number] };

type Material = { material: string; nuclei: string[] };

function createMorph(root: HTMLElement, gradientId: string, sprites: Material) {
    const bridge = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bridge.classList.add('cell-fusion');bridge.setAttribute('aria-hidden','true');
    const neck = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    neck.classList.add('cell-membrane');
    const secondNeck = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    secondNeck.classList.add('cell-membrane');secondNeck.style.opacity='0';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = gradientId; gradient.setAttribute('gradientUnits','userSpaceOnUse');
    const stops = [0,1].map(offset => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg','stop');
      stop.setAttribute('offset',String(offset)); gradient.append(stop); return stop;
    });
    const material = document.createElementNS('http://www.w3.org/2000/svg','pattern');
    material.id=gradientId+'-surface';material.setAttribute('patternUnits','userSpaceOnUse');
    const texture = document.createElementNS('http://www.w3.org/2000/svg','image');
    texture.setAttribute('href',sprites.material);texture.setAttribute('preserveAspectRatio','none');
    material.append(texture);neck.style.fill='url(#'+material.id+')';
    const secondMaterial=material.cloneNode(true) as SVGPatternElement;
    secondMaterial.id=gradientId+'-surface-b';
    secondNeck.style.fill='url(#'+secondMaterial.id+')';
    const mask = document.createElementNS('http://www.w3.org/2000/svg','mask');
    mask.id=gradientId+'-texture';mask.setAttribute('maskUnits','userSpaceOnUse');mask.style.maskType='alpha';
    const nuclei=[0,1].map(()=>document.createElementNS('http://www.w3.org/2000/svg','image'));
    nuclei.forEach(nucleus=>nucleus.setAttribute('preserveAspectRatio','none'));
    mask.append(...nuclei);
    defs.append(gradient,material,secondMaterial,mask);
    const core = document.createElementNS('http://www.w3.org/2000/svg','path');
    core.classList.add('cell-fused-core'); core.style.fill='url(#'+gradientId+')';
    core.setAttribute('mask','url(#'+mask.id+')');
    bridge.append(defs,neck,secondNeck,core);root.append(bridge);
    let detachedAt: number | undefined;
    return {
      draw(a:Body,b:Body,geometry:Geometry,t:number,rect:DOMRect,release?:number) {
        const {x,y,size:combined}=geometry;
        const ease=t*t*(3-2*t);
        a.x=geometry.ax+(x-geometry.ax)*ease; a.y=geometry.ay+(y-geometry.ay)*ease;
        b.x=geometry.bx+(x-geometry.bx)*ease; b.y=geometry.by+(y-geometry.by)*ease;
        if(release!==undefined) {
          const separate=release*release*(3-2*release);
          a.x=geometry.ax+(a.source.x-geometry.ax)*separate;a.y=geometry.ay+(a.source.y-geometry.ay)*separate;
          b.x=geometry.bx+(b.source.x-geometry.bx)*separate;b.y=geometry.by+(b.source.y-geometry.by)*separate;
        }
        a.node.style.transformOrigin='0 0';
        a.node.style.scale=String(1+(combined/a.source.size-1)*ease);
        const surface=release!==undefined?(release<1?1:0):(t>0&&t<1?1:0);
        a.node.style.setProperty('--fusion',String(surface));
        b.node.style.setProperty('--fusion',String(release!==undefined?surface:t>0?1:0));
        // Both grain masks travel into the shared nucleus before the captured texture resolves.
        const target=geometry.color;
        const sourceA=cellColor(a.source), sourceB=cellColor(b.source);
        const capture=Math.max(0,Math.min(1,(t-.08)/.72));
        const pull=capture*capture*(3-2*capture);
        const mix=Math.max(0,Math.min(1,(t-.5)/.4));
        const tint=mix*mix*(3-2*mix);
        const overlay=surface;
        a.node.style.setProperty('--core-fusion',String(overlay));
        b.node.style.setProperty('--core-fusion',String(release!==undefined?surface:t>0?1:0));
        a.node.querySelector<HTMLElement>('.cell-nucleus')!.style.backgroundColor='rgb('+sourceA.map((v,i)=>v+(target[i]-v)*tint).join(',')+')';
        const cx=x*rect.width/100-combined*.01, cy=y*rect.height/100+combined*.005;
        const nax=(release===undefined?geometry.ax:a.x)*rect.width/100-a.source.size*.01;
        const nay=(release===undefined?geometry.ay:a.y)*rect.height/100+a.source.size*.005;
        const nbx=(release===undefined?geometry.bx:b.x)*rect.width/100-b.source.size*.01;
        const nby=(release===undefined?geometry.by:b.y)*rect.height/100+b.source.size*.005;
        const dx=nbx-nax,dy=nby-nay,len=Math.hypot(dx,dy)||1;
        const cax=nax+(cx-nax)*pull, cay=nay+(cy-nay)*pull;
        const cbx=nbx+(cx-nbx)*pull, cby=nby+(cy-nby)*pull;
        const settle=Math.max(0,(capture-.4)/.6);
        const sizeA=a.source.size+(combined-a.source.size)*settle;
        const sizeB=b.source.size+(combined-b.source.size)*settle;
        const stretch=1+.18*Math.sin(Math.PI*capture);
        const ra=sizeA*.25*stretch, rb=sizeB*.25*stretch;
        const absorption=Math.max(0,(capture-.65)/.35);
        // Reuse the actual grain masks throughout capture, including both endpoints.
        [a,b].forEach((body,i)=>{
          const size=i?sizeB:sizeA, px=i?cbx:cax, py=i?cby:cay;
          nuclei[i].setAttribute('href',sprites.nuclei[body.source.texture??(body.source.id-1)%8]);
          nuclei[i].setAttribute('x',String(px-size*.2));nuclei[i].setAttribute('y',String(py-size*.215));
          nuclei[i].setAttribute('width',String(size*.4));nuclei[i].setAttribute('height',String(size*.43));
          const ux=dx===0&&dy===0?1:dx/len,uy=dy/len;
          const xx=ux*ux*stretch+uy*uy/stretch,xy=ux*uy*(stretch-1/stretch),yy=uy*uy*stretch+ux*ux/stretch;
          nuclei[i].setAttribute('transform',`matrix(${xx} ${xy} ${xy} ${yy} ${px-xx*px-xy*py} ${py-xy*px-yy*py})`);
        });
        nuclei[1].style.opacity=String(1-absorption*absorption*(3-2*absorption));
        mask.setAttribute('x',String(Math.min(cax-ra,cbx-rb)));mask.setAttribute('y',String(Math.min(cay-ra,cby-rb)));
        mask.setAttribute('width',String(Math.max(cax+ra,cbx+rb)-Math.min(cax-ra,cbx-rb)));
        mask.setAttribute('height',String(Math.max(cay+ra,cby+rb)-Math.min(cay-ra,cby-rb)));
        const distance=Math.hypot(cax-cbx,cay-cby);
        const disk=(px:number,py:number,r:number)=>`M ${px-r} ${py} a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`;
        core.setAttribute('d',distance>ra+rb
          ? disk(cax,cay,ra)+disk(cbx,cby,rb)
          : liquidOutline(cax,cay,ra,cbx,cby,rb,Math.max(.01,Math.min(ra,rb)*.5*(1-settle))));
        // At separation each grain mask must finish in its own pigment, not a partial mixture.
        const spread=Math.min(1,t/.12), blend=spread*spread*(3-2*spread);
        const edgeA=Math.min(ra,distance*.45)*(1-blend)-ra*blend;
        const edgeB=Math.min(rb,distance*.45)*(1-blend)-rb*blend;
        gradient.setAttribute('x1',String(cax+dx/len*edgeA));gradient.setAttribute('y1',String(cay+dy/len*edgeA));
        gradient.setAttribute('x2',String(cbx-dx/len*edgeB));gradient.setAttribute('y2',String(cby-dy/len*edgeB));
        [sourceA,sourceB].forEach((color,i)=>stops[i].setAttribute('stop-color','rgb('+color.map((v,j)=>v+(target[j]-v)*tint).join(',')+')'));
        core.style.opacity=String(overlay*.72);
        core.setAttribute('data-stage',distance>ra+rb?'approach':capture<1?'join':'settle');
        bridge.setAttribute('data-progress',t.toFixed(4));
        const ax=a.x*rect.width/100, ay=a.y*rect.height/100, bx=b.x*rect.width/100, by=b.y*rect.height/100;
        const ar=(a.source.size+(combined-a.source.size)*ease)*.43;
        const br=b.source.size*.43*(1-ease);
        const outline=membraneOutline(ax,ay,ar,bx,by,br);
        const separate=release!==undefined&&outline.indexOf('M ',1)!==-1;
        neck.setAttribute('d',separate?membraneOutline(ax,ay,ar,ax,ay,0):outline);
        secondNeck.setAttribute('d',separate?membraneOutline(bx,by,br,bx,by,0):'');
        const left=Math.min(ax-ar/.86,bx-br/.86),top=Math.min(ay-ar/.86,by-br/.86);
        const width=Math.max(ax+ar/.86,bx+br/.86)-left,height=Math.max(ay+ar/.86,by+br/.86)-top;
        if(release===undefined)detachedAt=undefined;
        if(separate&&detachedAt===undefined)detachedAt=release;
        const materialProgress=detachedAt===undefined?0:Math.min(1,((release??0)-detachedAt)/(1-detachedAt||1));
        const materialEase=materialProgress*materialProgress*(3-2*materialProgress);
        // The shared cytoplasm separates with the lobes instead of changing texture in one frame.
        [material,secondMaterial].forEach((pattern,i)=>{
          const radius=i?br:ar,px=i?bx:ax,py=i?by:ay;
          const w=width+(radius/.43-width)*materialEase,h=height+(radius/.43-height)*materialEase;
          pattern.setAttribute('x',String(left+(px-radius/.86-left)*materialEase));
          pattern.setAttribute('y',String(top+(py-radius/.86-top)*materialEase));
          pattern.setAttribute('width',String(w));pattern.setAttribute('height',String(h));
          pattern.firstElementChild!.setAttribute('width',String(w));pattern.firstElementChild!.setAttribute('height',String(h));
        });
        neck.style.strokeWidth=String((a.source.size+(combined-a.source.size)*ease)*1.5/160);
        secondNeck.style.strokeWidth=String(b.source.size*1.5/160);
        neck.style.opacity=String(surface);secondNeck.style.opacity=String(separate?surface:0);
        bridge.setAttribute('data-phase',release===undefined?'morph':'release');
        bridge.setAttribute('data-release',String(release??0));
        bridge.style.opacity='1';

      },
      hide() { bridge.style.opacity='0'; },
      remove() { bridge.remove(); },
    };
}

export function useCellMotion(field: RefObject<HTMLDivElement | null>, cells: Cell[], active: boolean,
  dragged: RefObject<{ cellId: number } | null>, sprites: Material | undefined, merge: (a: number, b: number, x: number, y: number) => void) {
  const bodies = useRef(new Map<number, Body>());
  const born = useRef(new Set<number>());
  const wakeMotion = useRef<() => void>(() => {});
  const latest = useRef({ cells, merge });
  useEffect(() => {
    latest.current = { cells, merge };
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for(const cell of cells)if(cell.birth!==undefined)born.current.add(cell.birth);
    }
    wakeMotion.current();
  }, [cells, merge]);
  useEffect(() => {
    const root = field.current;
    if (!root || !active || !sprites) return;
    for (const body of bodies.current.values()) { restore(body.node); }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, visible = true;
    let joining: Merge | null = null;
    const morph=createMorph(root,'cell-core-mixture',sprites);
    const splits=new Map<number,{a:number;b:number;elapsed:number;geometry:Geometry;morph:ReturnType<typeof createMorph>}>();

    function schedule() {
      if (!frame && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
    }
    function tick(now: number) {
      frame = 0;
      if (!visible || document.hidden || reduced.matches) { last = 0; return; }
      if (last && now-last < 1000/60-.5) { schedule(); return; }
      const dt = last ? Math.min(.05, (now-last)/1000) : 0;
      last = now;
      const rect = root!.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const current = latest.current.cells;
      const ids = new Set(current.map(c => c.id));
      const changedPair = joining && current.some(cell => (cell.id===joining!.a || cell.id===joining!.b) && bodies.current.get(cell.id)?.source !== cell);
      for (const id of bodies.current.keys()) if (!ids.has(id)) bodies.current.delete(id);
      for (const cell of current) {
        let body = bodies.current.get(cell.id);
        if (!body || body.source !== cell) {
          const node = root!.querySelector<HTMLElement>(`[data-cell-id="${cell.id}"]`);
          if (!node) continue;
          node.style.translate = ''; restore(node);
          body = { source: cell, x: cell.x, y: cell.y, vx: Math.cos(cell.id*2.4)*5, vy: Math.sin(cell.id*2.4)*5, age: 0, node };
          bodies.current.set(cell.id, body);
        }
      }
      const birthIds=new Set(current.flatMap(cell=>cell.birth===undefined?[]:[cell.birth]));
      for(const id of born.current)if(!birthIds.has(id))born.current.delete(id);
      for(const cell of current) {
        if(cell.birth===undefined || born.current.has(cell.birth))continue;
        const pair=current.filter(other=>other.birth===cell.birth);
        born.current.add(cell.birth);
        if(pair.length!==2 || reduced.matches)continue;
        const [a,b]=pair;
        if(!bodies.current.has(a.id)||!bodies.current.has(b.id))continue;
        // Reverse fusion first; then close the neck before handing off to free drift.
        const gap=Math.hypot((b.x-a.x)*rect.width/100,(b.y-a.y)*rect.height/100);
        const contact=Math.min(1,(a.size+b.size)*.36/(gap||1));
        splits.set(cell.birth,{a:a.id,b:b.id,elapsed:0,morph:createMorph(root!,'cell-core-'+cell.birth,sprites!),geometry:{
          ax:a.fromX+(a.x-a.fromX)*contact,ay:a.fromY+(a.y-a.fromY)*contact,
          bx:b.fromX+(b.x-b.fromX)*contact,by:b.fromY+(b.y-b.fromY)*contact,
          x:a.fromX,y:a.fromY,size:a.fromSize!,color:a.fromColor!,
        }});
      }
      const list = [...bodies.current.values()];
      if (joining && (!ids.has(joining.a) || !ids.has(joining.b) || dragged.current?.cellId===joining.a || dragged.current?.cellId===joining.b || changedPair)) {
        for (const id of [joining.a, joining.b]) { const body=bodies.current.get(id); if(body)restore(body.node); }
        joining = null;
      }
      const splitting=new Set([...splits.values()].flatMap(pair=>[pair.a,pair.b]));
      for (const body of list) {
        const radius=body.source.size/2;
        body.age += dt;
        const viewportY=rect.top+body.y*rect.height/100;
        if(viewportY < -radius || viewportY > innerHeight+radius)continue;
        if (splitting.has(body.source.id) || dragged.current?.cellId === body.source.id || joining?.a === body.source.id || joining?.b === body.source.id) continue;
        if(body.settle) {
          const spring=body.settle;
          spring.v+=(-100*spring.x-10*spring.v)*dt;spring.x+=spring.v*dt;
          body.node.style.transformOrigin='0 0';body.node.style.scale=`${1+spring.x} ${1/(1+spring.x)}`;
          if(Math.abs(spring.x)<.001&&Math.abs(spring.v)<.01) {body.settle=undefined;body.node.style.scale='';body.node.style.transformOrigin='';}
        }
        body.vx += (Math.sin(now*.00043+body.source.id)*6+(Math.random()-.5)*35-body.vx*.22)*dt;
        body.vy += (Math.cos(now*.00051+body.source.id*1.7)*6+(Math.random()-.5)*35-body.vy*.22)*dt;
        const x = body.x*rect.width/100;
        const y = body.y*rect.height/100;
        if (x < radius+8) body.vx = Math.abs(body.vx);
        if (x > rect.width-radius-8) body.vx = -Math.abs(body.vx);
        if (y < radius+8) body.vy = Math.abs(body.vy);
        if (y > rect.height-radius-8) body.vy = -Math.abs(body.vy);
        body.x = Math.max(radius, Math.min(rect.width-radius, x+body.vx*dt))/rect.width*100;
        body.y = Math.max(radius, Math.min(rect.height-radius, y+body.vy*dt))/rect.height*100;
      }
      if (!joining) {
        outer: for (let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++) {
          const a=list[i], b=list[j];
          // Let daughters separate before they can merge again.
          if (a.age<2.5 || b.age<2.5 || splitting.has(a.source.id) || splitting.has(b.source.id) || dragged.current?.cellId===a.source.id || dragged.current?.cellId===b.source.id) continue;
          const screenY=rect.top+a.y*rect.height/100;
          if(screenY < -a.source.size || screenY > innerHeight+a.source.size)continue;
          if (Math.hypot((a.x-b.x)*rect.width/100,(a.y-b.y)*rect.height/100)<(a.source.size+b.source.size)*.38) {
            joining={a:a.source.id,b:b.source.id,elapsed:0,ax:a.x,ay:a.y,bx:b.x,by:b.y};
            break outer;
          }
        }
      }
      if (joining) {
        joining.elapsed += dt;
        const t=Math.min(1,joining.elapsed/1.6);
        const a=bodies.current.get(joining.a)!, b=bodies.current.get(joining.b)!;
        const weight=a.source.size**2/(a.source.size**2+b.source.size**2);
        const combined=Math.min(120,Math.hypot(a.source.size,b.source.size));
        const centerX=(joining.ax*weight+joining.bx*(1-weight))*rect.width/100;
        const centerY=(joining.ay*weight+joining.by*(1-weight))*rect.height/100;
        const x=Math.max(combined/2,Math.min(rect.width-combined/2,centerX))/rect.width*100;
        const y=Math.max(combined/2,Math.min(rect.height-combined/2,centerY))/rect.height*100;
        morph.draw(a,b,{...joining,x,y,size:combined,color:mixedColor(a.source,b.source)},t,rect);
        if(t===1) { latest.current.merge(joining.a,joining.b,x,y); joining=null; }
      }
      if(!joining)morph.hide();
      for(const [id,split] of splits) {
        const a=bodies.current.get(split.a),b=bodies.current.get(split.b);
        if(!a || !b || a.source.birth!==id || b.source.birth!==id || dragged.current?.cellId===split.a || dragged.current?.cellId===split.b) {
          if(a)restore(a.node);if(b)restore(b.node);
          split.morph.remove();splits.delete(id);continue;
        }
        split.elapsed+=dt;
        const t=Math.max(0,1-split.elapsed/1.6);
        const release=split.elapsed>=1.6?Math.min(1,(split.elapsed-1.6)/.6):undefined;
        split.morph.draw(a,b,split.geometry,t,rect,release);
        if(release===1) {
          const dx=(b.x-a.x)*rect.width/100,dy=(b.y-a.y)*rect.height/100;
          const speed=16/(Math.hypot(dx,dy)||1);
          a.vx=-dx*speed;a.vy=-dy*speed;b.vx=dx*speed;b.vy=dy*speed;
          a.age=b.age=0;a.settle={x:0,v:.55};b.settle={x:0,v:-.55};
          restore(a.node);restore(b.node);split.morph.remove();splits.delete(id);
        }
      }
      for (const body of list) {
        body.node.style.translate=`${(body.x-body.source.x)*rect.width/100}px ${(body.y-body.source.y)*rect.height/100}px`;
      }
      visible=!list.length || list.some(body=>{const y=rect.top+body.y*rect.height/100;return y+body.source.size>0&&y-body.source.size<innerHeight;});
      if(!visible)last=0;
      schedule();
    }
    function wake() {
      const changed=(id:number)=>{
        const source=latest.current.cells.find(cell=>cell.id===id);
        return !source || source!==bodies.current.get(id)?.source;
      };
      const show=(id:number)=>{const node=root!.querySelector<HTMLElement>(`[data-cell-id="${id}"]`);if(node)restore(node);};
      // Input can interrupt a morph under reduced motion, when tick cannot release its hidden sprites.
      for(const [id,split] of splits)if(changed(split.a)||changed(split.b)) {
        show(split.a);show(split.b);split.morph.remove();splits.delete(id);
      }
      if(joining&&(changed(joining.a)||changed(joining.b))) {
        show(joining.a);show(joining.b);joining=null;morph.hide();
      }
      visible=true;
      if(document.hidden || reduced.matches) {
        cancelAnimationFrame(frame);frame=0;last=0;
        return;
      }
      // Preserve the running clock: drag/scroll updates must not restart every frame at dt=0.
      schedule();
    }
    wakeMotion.current=wake;
    window.addEventListener('scroll',wake,{passive:true});
    window.addEventListener('resize',wake);
    document.addEventListener('visibilitychange',wake);
    reduced.addEventListener('change',wake);
    schedule();
    return () => { wakeMotion.current=()=>{}; cancelAnimationFrame(frame); for(const body of bodies.current.values())restore(body.node); morph.remove(); for(const split of splits.values())split.morph.remove(); window.removeEventListener('scroll',wake); window.removeEventListener('resize',wake); document.removeEventListener('visibilitychange',wake); reduced.removeEventListener('change',wake); };
  }, [active, field, dragged, sprites]);
  return bodies;
}
