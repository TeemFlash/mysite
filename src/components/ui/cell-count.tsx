import { memo, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import "./cell-count.css";
import { useCellMotion, cellBounds, cellColor, cellPigment, membraneRadius, type Cell } from "./cell-motion";

import { mixPigments, splitPigment } from "./cell-pigment";

// Adapted from Cell Count by Louis Studios: original membrane and nucleus rendering.
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nucleusSprite(rgb: [number, number, number], size: number, seed: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const rnd = mulberry(seed);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - half) / half, dy = (y + 0.5 - half) / half;
      const angle = Math.atan2(dy, dx);
      const r = Math.sqrt(dx * dx + dy * dy) / (1 + .08*Math.sin(angle*3+seed));
      let a = 1 - smooth(0.6, 1.0, r);
      const edge = a * (1 - a) * 4;
      a = clamp01(a + (rnd() - 0.5) * 0.85 * edge);
      const lift = 0.08 * Math.max(0, 1 - (r * r) / 0.36);
      const o = (y * size + x) * 4;
      img.data[o] = rgb[0] + (255 - rgb[0]) * lift;
      img.data[o + 1] = rgb[1] + (255 - rgb[1]) * lift;
      img.data[o + 2] = rgb[2] + (255 - rgb[2]) * lift;
      img.data[o + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function haloSprite(fill: string, rimCol: string, size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const random = mulberry(82);
  const cytoplasm=g.createRadialGradient(size*.4,size*.4,0,size*.5,size*.5,size*.48);
  cytoplasm.addColorStop(0,'rgba(247,248,246,.65)');
  cytoplasm.addColorStop(.8,fill);cytoplasm.addColorStop(1,'rgba(159,174,165,.18)');
  g.fillStyle=cytoplasm;g.fillRect(0,0,size,size);
  for(let i=0;i<100;i++) {
    g.fillStyle=i%4?'rgba(103,119,111,.11)':'rgba(255,255,255,.6)';
    g.beginPath();g.ellipse(random()*size,random()*size,1+random()*2,.7+random(),random()*6,0,Math.PI*2);g.fill();
  }
  const material=c.toDataURL();
  g.beginPath();
  for (let i=0;i<=160;i++) {
    const angle=i/160*Math.PI*2;
    const r=size*.43*membraneRadius(angle);
    const x=size/2+Math.cos(angle)*r, y=size/2+Math.sin(angle)*r;
    if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
  }
  g.closePath();
  g.globalCompositeOperation='destination-in';g.fillStyle='#fff';g.fill();
  g.globalCompositeOperation='source-over';g.strokeStyle=rimCol;g.lineWidth=1.5;g.stroke();
  return { membrane:c.toDataURL(), material };
}

const INITIAL: Cell[] = [[50, 50, 100], [22, 20, 86], [78, 20, 96], [22, 80, 86], [78, 80, 96]]
  .map(([x, y, size], index) => ({ id: index + 1, generation: 0, size, x, y, fromX: x, fromY: y }));
const COLORS = ["#8869FC", "#27C699", "#FB82C0", "#CFE537", "#7FDBF7", "#FC5E54", "#FC9037", "#FBD05D"];
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)) as [number, number, number];

const CellButton = memo(function CellButton({ cell, sprite, membrane, ru }: {
  cell: Cell; sprite: string; membrane: string; ru: boolean;
}) {
  const button=useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const node=button.current;
    if(!node || cell.birth===undefined || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const parent=node.parentElement!;
    node.style.translate=`${(cell.fromX-cell.x)*parent.clientWidth/100}px ${(cell.fromY-cell.y)*parent.clientHeight/100}px`;
    if(cell.id===cell.birth) {
      node.style.transformOrigin='0 0';node.style.scale=String(cell.fromSize!/cell.size);
      node.querySelector<HTMLElement>('.cell-nucleus')!.style.backgroundColor='rgb('+cell.fromColor!.join(',')+')';
    } else node.style.opacity='0';
  }, [cell]);
  return <button ref={button} type="button" className="living-cell" data-cell-id={cell.id}
    aria-label={ru ? "Разделить клетку" : "Divide cell"}
    title={ru ? "Нажмите для деления; перетащите или используйте стрелки для перемещения" : "Click to divide; drag or use arrow keys to move"}
    style={{ left: `${cell.x}%`, top: `${cell.y}%`, width: cell.size, aspectRatio: "1" }}>
    <img src={membrane} alt="" draggable={false} />
    <span className="cell-nucleus" aria-hidden="true" style={{ maskImage: `url("${sprite}")`, color: `rgb(${cellColor(cell).join(",")})` }} />
  </button>;
});

export function CellCount({ active, ru }: { active: boolean; ru: boolean }) {
  const [cells, setCells] = useState<Cell[]>(INITIAL);
  const [sprites, setSprites] = useState<{ membrane: string; material: string; nuclei: string[] }>();
  const nextId = useRef(6);
  const field = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; cellId: number; x: number; y: number; moved: boolean } | null>(null);
  const bodies = useCellMotion(field, cells, active, drag, sprites, (a,b,x,y) => {
    const id=nextId.current++;
    setCells(current => {
      const parent=current.find(c=>c.id===a);
      const second=current.find(c=>c.id===b);
      if(!parent || !second)return current;
      return [...current.filter(c=>c.id!==a&&c.id!==b), {id,generation:parent.generation,outside:parent.outside || second.outside,size:Math.min(120,Math.hypot(parent.size,second.size)),texture:parent.texture??(parent.id-1)%8,x,y,fromX:x,fromY:y,pigment:mixPigments(cellPigment(parent),cellPigment(second))}];
    });
  });
  const suppressClick = useRef(false);
  const pendingMove = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const moveFrame = useRef(0);
  function flushMove() {
    cancelAnimationFrame(moveFrame.current);
    moveFrame.current = 0;
    const pending = pendingMove.current;
    pendingMove.current = null;
    if (pending) moveBy(pending.id, pending.dx, pending.dy);
  }
  useEffect(() => {
    return () => {
      cancelAnimationFrame(moveFrame.current);
      moveFrame.current = 0;
      pendingMove.current = null;
      drag.current = null;
    };
  }, [active]);
  function moveBy(id: number, dx: number, dy: number) {
    const node = field.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setCells(current => current.map(cell => {
      if (cell.id !== id) return cell;
      const live = bodies.current.get(id);
      const position = live?.source === cell ? live : cell;
      const radius = cell.size / 2;
      const bounds = cellBounds(rect, cell.size, true);
      const px = Math.max(bounds.left, Math.min(bounds.right, position.x * rect.width / 100 + dx));
      const py = Math.max(bounds.top, Math.min(bounds.bottom, position.y * rect.height / 100 + dy));
      const outside = px < radius || px > rect.width-radius || py < radius || py > rect.height-radius;
      const x = px / rect.width * 100, y = py / rect.height * 100;
      if(live) { live.node.style.translate=""; live.node.style.opacity=""; live.node.style.scale=""; }
      bodies.current.delete(id);
      return { ...cell, x, y, outside, fromX: x, fromY: y, birth: undefined };
    }));
  }
  useEffect(() => {
    if (!active) return;
    function keepInBounds() {
      const node = field.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setCells(current => current.map(cell => {
        const bounds = cellBounds(rect, cell.size, cell.outside);
        const live = bodies.current.get(cell.id);
        const position = live?.source === cell ? live : cell;
        const x = Math.max(bounds.left, Math.min(bounds.right, position.x * rect.width / 100)) / rect.width * 100;
        const y = Math.max(bounds.top, Math.min(bounds.bottom, position.y * rect.height / 100)) / rect.height * 100;
        if (Math.abs(x-position.x) < .01 && Math.abs(y-position.y) < .01) return cell;
        return { ...cell, x, y, fromX: x, fromY: y, birth: undefined };
      }));
    }
    keepInBounds();
    const observer = new ResizeObserver(keepInBounds);
    observer.observe(field.current!);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [active]);
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || !(event.target as Element).closest("[data-cell-id]")) return;
    event.preventDefault();
    (event.target as HTMLElement).closest<HTMLButtonElement>("[data-cell-id]")!.focus({ preventScroll: true });
    suppressClick.current = false;
    drag.current = { cellId: Number((event.target as Element).closest("[data-cell-id]")!.getAttribute("data-cell-id")), id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    (event.target as Element).closest("[data-cell-id]")!.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < 5) return;
    current.moved = true;
    suppressClick.current = true;
    const pending = pendingMove.current;
    pendingMove.current = { id: current.cellId, dx: (pending?.dx ?? 0) + dx, dy: (pending?.dy ?? 0) + dy };
    if (!moveFrame.current) moveFrame.current = requestAnimationFrame(flushMove);
    current.x = event.clientX;
    current.y = event.clientY;
  }
  useEffect(() => {
    if (!active || sprites) return;
    setSprites({ ...haloSprite("rgba(222,229,223,.36)", "rgba(135,153,141,.42)", 160),
      nuclei: COLORS.map((color, i) => nucleusSprite(rgb(color), 96, 11+i*7).toDataURL()) });
  }, [active, sprites]);
  function divide(id: number) {
    if (!active || !field.current) return;
    const stored = cells.find(item => item.id === id);
    if (!stored) return;
    const live = bodies.current.get(id);
    const cell = live?.source === stored ? { ...stored, x: live.x, y: live.y } : stored;
    const rect = field.current.getBoundingClientRect();
    const { width, height } = rect;
    const generation = cell.generation + 1;
    const size = Math.max(56, cell.size * .92);
    const radius = size / 2;
    const bounds = cellBounds(rect, size, cell.outside);
    const others = cells.filter(item => item.id !== id);
    const firstId = nextId.current;
    nextId.current += 2;
    const angle = Math.random() * Math.PI * 2;
    const distance = radius * (1.1 + Math.random() * .4);
    const components = splitPigment(cellPigment(cell), cell.id);
    const daughters = [-1, 1].map((side, index) => {
      const targetX = cell.x * width / 100 + side * Math.cos(angle) * distance;
      const targetY = cell.y * height / 100 + side * Math.sin(angle) * distance;
      return {
        id: firstId + index, generation, size, outside: cell.outside, pigment: components[index], fromColor: cellColor(cell), fromSize: cell.size, birth: firstId, texture: cell.texture??(cell.id-1)%8,
        x: Math.max(bounds.left, Math.min(bounds.right, targetX)) / width * 100,
        y: Math.max(bounds.top, Math.min(bounds.bottom, targetY)) / height * 100,
        fromX: cell.x, fromY: cell.y,
      };
    });
    // Cells remain ordered by creation; retire the oldest before adding daughters.
    setCells([...others.slice(-98), ...daughters]);
  }
  return <div ref={field} className="light-cells" hidden={!active} data-count={cells.length}
    onPointerDown={startDrag} onPointerMove={moveDrag}
    onPointerUp={() => { flushMove(); drag.current = null; }}
    onPointerCancel={() => { flushMove(); drag.current = null; suppressClick.current = true; }}
    onLostPointerCapture={() => { flushMove(); drag.current = null; }}
    onClick={event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-cell-id]");
      if (button) divide(Number(button.dataset.cellId));
    }}
    onClickCapture={event => {
      if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
      suppressClick.current = false;
    }}
    onKeyDown={event => {
      const direction = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
      if (direction) { event.preventDefault(); moveBy(Number((event.target as HTMLElement).closest<HTMLButtonElement>("[data-cell-id]")?.dataset.cellId), direction[0], direction[1]); }
    }}>

    {sprites && cells.map(cell => <CellButton key={cell.id} cell={cell} ru={ru}
      membrane={sprites.membrane} sprite={sprites.nuclei[cell.texture??(cell.id - 1) % sprites.nuclei.length]}
      />)}
  </div>;
}
