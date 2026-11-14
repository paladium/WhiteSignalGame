import type { ArchiveId } from '../systems/progress';

// Small line drawings for Field Notes, one per discovery. 24×24, stroke only.
const paths: Record<ArchiveId, string> = {
  berth: 'M3 17h18M3 17v-6h18v6M5 11V8h5v3M3 17v2M21 17v2',
  photograph: 'M3 5h18v14H3zM7 15v-3M10 15v-4M13 15v-3M16 15v-4M7 17l12-1',
  thermos: 'M9 3h6v3H9zM8 6h8v14H8zM8 10h8',
  service: 'M6 3h9l3 3v15H6zM9 9h6M9 12h6M9 15h4',
  boot: 'M9 4c3 0 4 3 4 6s-1 5-3 5-3-3-3-6 1-5 2-5zM10 17c2 0 3 1 3 2s-1 2-3 2-2-1-2-2 0-2 2-2',
  cassette: 'M3 6h18v12H3zM8 11a1.5 1.5 0 1 0 0 .1M16 11a1.5 1.5 0 1 0 0 .1M7 18l2-3h6l2 3',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  letter: 'M3 6h18v12H3zM3 6l9 7 9-7',
  tag: 'M4 8h12l4 4-4 4H4zM7 12h5',
  tally: 'M6 5v14M10 5v14M14 5v14M4 15l14-6',
  sled: 'M4 15h14l3-3M6 15v-4h10v4M7 11V8h3v3M11 11V8h3v3',
  chairs: 'M5 12h4v7M5 12V6M9 19v-7M13 12h4v7M13 12V6M17 19v-7',
  roll: 'M5 4h14v16H5zM8 8h8M8 11h8M8 14h5M14 14l3 3',
};

export function pictogram(id: ArchiveId) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'pictogram');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[id]);
  svg.append(path);
  return svg;
}
