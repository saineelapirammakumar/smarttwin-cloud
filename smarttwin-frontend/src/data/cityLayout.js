// Map geometry. ILLUSTRATIVE and simplified: not survey-accurate.
// 1) Tamil Nadu outline as [lng, lat] points, projected into a 420x540 SVG.
const OUTLINE = [[80.34, 13.5], [80.32, 13.05], [80.2, 12.62], [79.95, 12.2], [79.83, 11.93], [79.78, 11.5], [79.84, 10.95], [79.85, 10.75], [79.87, 10.3], [79.45, 10.3], [79.15, 10.2], [79.0, 9.75], [79.1, 9.4], [79.3, 9.28], [78.95, 9.22], [78.7, 9.15], [78.2, 8.8], [78.12, 8.45], [77.55, 8.08], [77.3, 8.3], [77.22, 8.65], [77.3, 9.1], [77.25, 9.55], [77.1, 9.95], [77.05, 10.25], [76.9, 10.4], [76.78, 10.65], [76.65, 10.82], [76.6, 11.1], [76.45, 11.3], [76.25, 11.5], [76.7, 11.78], [77.05, 11.95], [77.5, 11.95], [77.8, 12.15], [77.85, 12.45], [77.72, 12.8], [78.0, 12.88], [78.25, 12.72], [78.4, 12.8], [78.55, 13.0], [78.75, 13.2], [79.2, 13.2], [79.6, 13.4], [80.0, 13.55]];
export const project = (lat, lng) => [(lng - 76.0) * 91.3, (13.8 - lat) * 91.5];
export const TN_PATH = 'M' + OUTLINE.map(([lng, lat]) => project(lat, lng).map((n) => n.toFixed(1)).join(',')).join('L') + 'Z';
export const LABEL_LEFT = ['chennai', 'coimbatore', 'tirunelveli', 'erode', 'dindigul']; // labels drawn left of the dot
// 2) Schematic city zone layout (viewBox 600x330): six slots filled in order NW, N, NE, SW, S, SE.
export const SLOTS = [
  '30,32 205,28 208,160 34,165', '228,28 398,32 394,165 230,160', '420,30 572,34 570,162 424,165',
  '34,186 208,182 204,298 30,300', '230,184 396,188 398,300 228,296', '420,190 572,184 570,298 424,302',
];
export const ROADS = [[216, 15, 216, 315], [409, 15, 409, 315], [20, 174, 580, 174]];
export const centroid = (pts) => {
  const p = pts.split(' ').map((s) => s.split(',').map(Number));
  return [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
};
