// Bake identical bubble and filled-cassette geometry into the Blender source.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createStreamGeometry,createTankGeometry} from '../../assets/pdr-cobalt-stream-geometry.ts';
const bubbles=createStreamGeometry();
for(const [prefix,geometry] of [['bubbles',bubbles],['tank',createTankGeometry(bubbles.collector)]]){
  for(const key of ['position','uv','indices']){
    const data=geometry[key];
    writeFileSync(join(process.argv[2],prefix+'-'+key),Buffer.from(data.buffer,data.byteOffset,data.byteLength));
  }
}
