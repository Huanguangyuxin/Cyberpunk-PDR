// Sample the engine's authored curtain at rest for the manufacturing GLB and Blender file.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createStreamGeometry} from '../../assets/pdr-cobalt-stream-geometry.ts';

const frame = createStreamGeometry();
for (const key of ['position', 'backingPosition', 'normal', 'uv', 'indices']) {
  const data = frame[key];
  writeFileSync(join(process.argv[2],key),Buffer.from(data.buffer,data.byteOffset,data.byteLength));
}
