import assert from 'node:assert/strict';
import { membraneOutline, membraneRadius } from '../src/components/ui/cell-contour.ts';

function curves(path) {
  const tokens = path.match(/[MCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const result = [];
  let point, start;
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    if (command === 'M') point = start = [Number(tokens[i++]), Number(tokens[i++])];
    else if (command === 'C') {
      const points = [point];
      for (let j = 0; j < 3; j++) points.push([Number(tokens[i++]), Number(tokens[i++])]);
      result.push(points); point = points[3];
    } else if (command === 'Z') {
      assert.ok(Math.hypot(point[0] - start[0], point[1] - start[1]) < .002, 'Closure must not add a straight seam');
    } else assert.fail('Unexpected path command ' + command);
  }
  return result;
}
function sample(path) {
  return curves(path).flatMap(points => Array.from({ length: 7 }, (_, index) => {
    const t = index / 6, s = 1 - t, weights = [s ** 3, 3 * s * s * t, 3 * s * t * t, t ** 3];
    return [0, 1].map(axis => points.reduce((sum, p, i) => sum + p[axis] * weights[i], 0));
  }));
}
function separation(a, b) {
  return Math.max(...a.map(p => Math.min(...b.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])))));
}
const single = membraneOutline(10, 20, 40, 10, 20, 0);
assert.equal(single, membraneOutline(10, 20, 40, 10, 20, 8));
assert.equal(single, membraneOutline(10, 20, 0, 10, 20, 40));
for (const [x, y] of sample(single)) {
  const angle = Math.atan2(y - 20, x - 10);
  assert.ok(Math.abs(Math.hypot(x - 10, y - 20) - 40 * membraneRadius(angle)) < .025, 'Static organic radius must be preserved');
}
for (const [ar, br] of [[40, 40], [50, 20], [12, 46], [50, .01]]) {
  for (const angle of [0, .7, 1.9, 3.1, 4.4, 5.5]) {
    for (let step = 0; step <= 30; step++) {
      const d = (ar + br) * 1.12 * step / 30;
        const path = membraneOutline(0, 0, ar, d * Math.cos(angle), d * Math.sin(angle), br);
        assert.ok(!/NaN|Infinity| L /.test(path));
        assert.ok(curves(path).length > 0);
        assert.equal(path, membraneOutline(0, 0, ar, d * Math.cos(angle), d * Math.sin(angle), br));
    }
    const d = ar + br;
    const before = sample(membraneOutline(0, 0, ar, (d - .02) * Math.cos(angle), (d - .02) * Math.sin(angle), br));
    const after = sample(membraneOutline(0, 0, ar, (d + .02) * Math.cos(angle), (d + .02) * Math.sin(angle), br));
    assert.ok(Math.max(separation(before, after), separation(after, before)) < 1.2, 'No contour jump around separation');
  }
}
assert.equal((membraneOutline(0, 0, 40, 100, 0, 40).match(/ Z/g) ?? []).length, 2);
const joined = membraneOutline(0, 0, 40, 55, 0, 40);
assert.equal((joined.match(/ Z/g) ?? []).length, 1);
const segments = curves(joined);
for (let i = 0; i < segments.length; i++) {
  const a = segments[i], b = segments[(i + 1) % segments.length];
  const x = [a[3][0] - a[2][0], a[3][1] - a[2][1]], y = [b[1][0] - b[0][0], b[1][1] - b[0][1]];
  assert.ok((x[0] * y[0] + x[1] * y[1]) / Math.hypot(...x) / Math.hypot(...y) > .999, 'Smooth tangent joins');
}
console.log('Organic contours: finite deterministic cubics, exact resting radius, containment, narrow neck and separation passed');
