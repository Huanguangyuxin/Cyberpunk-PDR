/** Linear 3D medium with clear borders, irregular wisps and a mild lower-height bias. */
export function smokeDensity(size = 32): Uint8Array {
  const data = new Uint8Array(size ** 3);
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), v = y / (size - 1), w = z / (size - 1);
    const edge = Math.min(1, Math.min(u, 1 - u, v, 1 - v, w, 1 - w) * 12);
    const cloud = .48 + .18 * Math.sin(x * .31 + Math.sin(z * .19)) +
      .16 * Math.sin(z * .43 + y * .21) + .12 * Math.sin(x * .17 - y * .27 + z * .11);
    data[x + size * (y + size * z)] = Math.round(255 * edge * Math.max(.08, Math.min(.95, cloud)) * (.65 + .35 * (1 - v)));
  }
  return data;
}
