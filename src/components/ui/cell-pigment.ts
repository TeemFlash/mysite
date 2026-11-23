export type RGB = [number, number, number];
export type Pigment = { color: RGB; mass: number; sources?: [Pigment, Pigment] };

export const pigment = (color: RGB, mass = 1): Pigment => ({ color, mass });

function recentSources(value: Pigment, levels: number): Pigment {
  if (!value.sources) return value;
  if (!levels) return pigment(value.color, value.mass);
  return { ...value, sources: [recentSources(value.sources[0], levels - 1), recentSources(value.sources[1], levels - 1)] };
}

export function mixPigments(a: Pigment, b: Pigment): Pigment {
  const mass = a.mass + b.mass;
  const weight = mass ? a.mass / mass : .5;
  const color = a.color.map((channel, i) => Math.round(channel * weight + b.color[i] * (1 - weight))) as RGB;
  // shortcut: retain eight fusion generations; increase only if deeper undo becomes necessary.
  return { color, mass, sources: [recentSources(a, 7), recentSources(b, 7)] };
}

export function splitPigment(value: Pigment, seed = 0): [Pigment, Pigment] {
  if (value.sources) return value.sources;
  // Unmixed colors use symmetric components, so equal pigment amounts restore the parent.
  const offset = value.color.map((channel, i) => Math.floor(Math.min(55, channel * .65, (255 - channel) * .65)) * (Math.sin(seed * 2.4 + i * 2.1) < 0 ? -1 : 1));
  const colors = [-1, 1].map(side => value.color.map((channel, i) => channel + side * offset[i]) as RGB);
  return [pigment(colors[0], value.mass / 2), pigment(colors[1], value.mass / 2)];
}
