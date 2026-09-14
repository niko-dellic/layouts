/** Surface identity stays in app state; display colors follow the current panel theme. */
export const surfaces = [
  { name: 'Green', color: '#91bfa9' },
  { name: 'Orange', color: '#dfa776' },
  { name: 'Blue', color: '#95adc8' },
  { name: 'Purple', color: '#c9a7c0' },
];

export const swatchBackground = (color: string) =>
  `color-mix(in srgb, ${color} 65%, var(--layouts-panel))`;

export function surfaceColors(color: string, panel: string) {
  // Demo palettes use six-digit hex values, as do the layouts theme presets.
  const channels = (hex: string) =>
    [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const base = channels(color);
  const background = channels(panel);
  const top = base.map((channel, index) => channel * 0.65 + background[index]! * 0.35);
  const shade = (factor: number) =>
    `rgb(${top.map((channel) => Math.round(channel * factor)).join(', ')})`;
  return { top: shade(1), front: shade(0.72), side: shade(0.86), edge: shade(0.58) };
}
