type Point = [number, number];
type Arc = { x: number; y: number; r: number; start: number; end: number; from: number; to: number };
const TAU = Math.PI * 2;
export const membraneRadius = (angle: number) => 1 + .045 * Math.sin(angle * 3) + .025 * Math.cos(angle * 5);
const radiusDerivative = (angle: number) => .135 * Math.cos(angle * 3) - .125 * Math.sin(angle * 5);
const format = (p: Point) => `${p[0].toFixed(4)} ${p[1].toFixed(4)}`;
const normalize = (angle: number) => (angle % TAU + TAU) % TAU;
function point(x: number, y: number, r: number, angle: number): Point {
  const radius = r * membraneRadius(angle);
  return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
}
function tangent(r: number, angle: number): Point {
  const radius = r * membraneRadius(angle), derivative = r * radiusDerivative(angle);
  return [Math.cos(angle) * derivative - Math.sin(angle) * radius,
    Math.sin(angle) * derivative + Math.cos(angle) * radius];
}
function arcPath(arc: Arc) {
  const steps = Math.ceil((arc.end - arc.start) / (Math.PI / 12));
  const step = (arc.end - arc.start) / steps;
  let path = '';
  for (let i = 0; i < steps; i++) {
    const start = arc.start + i * step, end = start + step;
    const a = point(arc.x, arc.y, arc.r, start), b = point(arc.x, arc.y, arc.r, end);
    const da = tangent(arc.r, start), db = tangent(arc.r, end);
    path += ` C ${format([a[0] + da[0] * step / 3, a[1] + da[1] * step / 3])} ${format([b[0] - db[0] * step / 3, b[1] - db[1] * step / 3])} ${format(b)}`;
  }
  return path;
}
function single(x: number, y: number, r: number) {
  return r > 0 ? `M ${format(point(x, y, r, 0))}${arcPath({ x, y, r, start: 0, end: TAU, from: 0, to: 0 })} Z` : '';
}
function distance(p: Point, x: number, y: number, r: number) {
  return Math.hypot(p[0] - x, p[1] - y) - r * membraneRadius(Math.atan2(p[1] - y, p[0] - x));
}

export function membraneOutline(ax: number, ay: number, ar: number, bx: number, by: number, br: number): string {
  if (ar <= 0) return single(bx, by, br);
  if (br <= 0) return single(ax, ay, ar);
  const gap = Math.hypot(bx - ax, by - ay), largerA = ar >= br;
  const contained = () => largerA ? single(ax, ay, ar) : single(bx, by, br);
  const detached = () => `${single(ax, ay, ar)} ${single(bx, by, br)}`;
  if (gap < 1e-8 || gap + Math.min(ar, br) * 1.07 <= Math.max(ar, br) * .93) return contained();
  if (gap >= (ar + br) * 1.07) return detached();
  const axis = Math.atan2(by - ay, bx - ax);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (gap * gap + ar * ar - br * br) / (2 * gap * ar))));
  const angles = Array.from({ length: 65 }, (_, i) => i / 64 * TAU);
  angles.push(normalize(axis - alpha), normalize(axis + alpha));
  angles.sort((a, b) => a - b);
  const evaluate = (angle: number) => distance(point(ax, ay, ar, angle), bx, by, br);
  const roots: { a: number; b: number; p: Point }[] = [];
  // Refine actual boundary crossings, never cast rays through a narrow two-lobed interior.
  let previous = evaluate(angles[0]);
  for (let i = 1; i < angles.length; i++) {
    const value = evaluate(angles[i]);
    if ((previous < 0) !== (value < 0)) {
      let lo = angles[i - 1], hi = angles[i];
      for (let j = 0; j < 14; j++) {
        const middle = (lo + hi) / 2;
        if ((evaluate(middle) < 0) === (previous < 0)) lo = middle; else hi = middle;
      }
      const angle = (lo + hi) / 2, p = point(ax, ay, ar, angle);
      roots.push({ a: angle, b: normalize(Math.atan2(p[1] - by, p[0] - bx)), p });
    }
    previous = value;
  }
  if (roots.length < 2) {
    return distance([ax, ay], bx, by, br) < 0 || distance([bx, by], ax, ay, ar) < 0 ? contained() : detached();
  }
  const arcs: Arc[] = [];
  for (const side of ['a', 'b'] as const) {
    const x = side === 'a' ? ax : bx, y = side === 'a' ? ay : by, r = side === 'a' ? ar : br;
    const order = roots.map((root, id) => ({ angle: root[side], id })).sort((a, b) => a.angle - b.angle);
    for (let i = 0; i < order.length; i++) {
      const current = order[i], next = order[(i + 1) % order.length];
      const start = current.angle, end = next.angle + (i + 1 === order.length ? TAU : 0);
      const middle = point(x, y, r, (start + end) / 2);
      if (distance(middle, side === 'a' ? bx : ax, side === 'a' ? by : ay, side === 'a' ? br : ar) <= 0) continue;
      const chord = Math.hypot(roots[current.id].p[0] - roots[next.id].p[0], roots[current.id].p[1] - roots[next.id].p[1]);
      const trim = Math.min(.22, (end - start) * .15, chord / Math.min(ar, br) * .18);
      arcs.push({ x, y, r, start: start + trim, end: end - trim, from: current.id, to: next.id });
    }
  }
  if (!arcs.length) return contained();
  const ordered = [arcs[0]];
  while (ordered.length < arcs.length) {
    const next = arcs.find(arc => arc.from === ordered[ordered.length - 1].to && !ordered.includes(arc));
    if (!next) break;
    ordered.push(next);
  }
  let path = `M ${format(point(ordered[0].x, ordered[0].y, ordered[0].r, ordered[0].start))}`;
  for (let i = 0; i < ordered.length; i++) {
    const arc = ordered[i], next = ordered[(i + 1) % ordered.length];
    path += arcPath(arc);
    const a = point(arc.x, arc.y, arc.r, arc.end), b = point(next.x, next.y, next.r, next.start);
    const da = tangent(arc.r, arc.end), db = tangent(next.r, next.start);
    const handle = Math.min(Math.hypot(b[0] - a[0], b[1] - a[1]) * .45, Math.min(ar, br) * .35);
    const ca: Point = [a[0] + da[0] / Math.hypot(...da) * handle, a[1] + da[1] / Math.hypot(...da) * handle];
    const cb: Point = [b[0] - db[0] / Math.hypot(...db) * handle, b[1] - db[1] / Math.hypot(...db) * handle];
    path += ` C ${format(ca)} ${format(cb)} ${format(b)}`;
  }
  return path + ' Z';
}
