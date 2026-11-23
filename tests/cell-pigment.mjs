import assert from "node:assert/strict";
import { pigment, mixPigments, splitPigment } from "../src/components/ui/cell-pigment.ts";

const red = pigment([252, 94, 84], 10000);
const cyan = pigment([127, 219, 247], 2500);
const yellow = pigment([251, 208, 93], 4900);
const firstMix = mixPigments(red, cyan);
assert.deepEqual(firstMix.color, [227, 119, 117]);
assert.equal(firstMix.mass, 12500);
const secondMix = mixPigments(firstMix, yellow);
const [restoredMix, restoredYellow] = splitPigment(secondMix);
assert.deepEqual(restoredMix, firstMix);
assert.deepEqual(restoredYellow, yellow);
assert.deepEqual(splitPigment(restoredMix), [red, cyan]);
assert.deepEqual(mixPigments(restoredMix, restoredYellow).color, secondMix.color);
assert.deepEqual(mixPigments(...splitPigment(restoredMix)).color, firstMix.color);

for (const color of [[136, 105, 252], [39, 198, 153], [251, 130, 192], [207, 229, 55], [127, 219, 247], [252, 94, 84], [252, 144, 55], [251, 208, 93]]) {
  const original = pigment(color, 10000);
  const daughters = splitPigment(original, 3);
  assert.notDeepEqual(daughters[0].color, daughters[1].color);
  assert.equal(daughters[0].mass + daughters[1].mass, original.mass);
  assert.deepEqual(mixPigments(...daughters).color, original.color);
  for (const daughter of daughters) {
    assert.ok(daughter.color.every(channel => channel >= 0 && channel <= 255));
    assert.deepEqual(mixPigments(...splitPigment(daughter, 5)).color, daughter.color);
  }
}

const depth = value => value.sources ? 1 + Math.max(...value.sources.map(depth)) : 0;
const nodes = value => 1 + (value.sources ? value.sources.reduce((sum, child) => sum + nodes(child), 0) : 0);
let repeated = red;
for (let i = 0; i < 100; i++) repeated = mixPigments(repeated, repeated);
assert.equal(depth(repeated), 8);
assert.equal(nodes(repeated), 511);
assert.deepEqual(splitPigment(repeated)[0].color, red.color);
assert.ok(Number.isFinite(repeated.mass));
console.log("Pigment history: nested unequal mixtures, recursive division, preserved ratios, palette decomposition and bounded memory passed");
