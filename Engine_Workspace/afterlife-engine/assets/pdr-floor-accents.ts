import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {createBoxGeometry, packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {MeshFilter, MeshRenderer, Visibility, VisibilityStateValue} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import type {AssetHandle} from '@forgeax/engine/types';

type Finish = 'tread';
const accents = [
  // Front of the doors, between the two entry posts.
  {id:'entrance-tread', size:[2.72,.006,.18], centre:[0,.004,-.40], repeat:.24, finish:'tread'},
] as const;

export function installFloorAccents(
  world: World,
  assets: AssetRegistry,
  materials: Readonly<Record<Finish, AssetHandle<'material'>>>,
) {
  const meshes: AssetHandle<'mesh'>[] = [];
  const entities: EntityHandle[] = [];
  const dispose = () => {
    for (const entity of entities) world.despawn(entity).unwrap();
    for (const mesh of meshes) assets.release(mesh).unwrap();
  };

  try {
    for (const {id,size,centre,repeat,finish} of accents) {
      const [width,height,depth] = size;
      const geom = createBoxGeometry(width,height,depth).unwrap();
      const {position, normal, uv: sourceUv} = geom.attributes;
      if (!(position instanceof Float32Array && normal instanceof Float32Array && sourceUv instanceof Float32Array)) {
        throw new Error('Floor accent mesh is missing position, normal or UV data');
      }
      const uv = new Float32Array(sourceUv);
      // Scale the top-face UV at the material's authored repeat distance.
      // Side faces are only a few millimetres high and keep their standard mapping.
      for (let i=0; i<uv.length/2; i++) {
        if (normal[i*3+1] < .9) continue;
        uv[i*2] *= width/repeat;
        uv[i*2+1] *= depth/repeat;
      }
      const attributes = {...geom.attributes, uv};
      const {vertices} = packInterleavedVertexAttributes(attributes,position.length/3).unwrap();
      const mesh = assets.create({...geom,attributes,vertices}).unwrap();
      meshes.push(mesh);
      entities.push(world.spawn(
        {component:Name,data:{value:`PDR/floor-accent/${id}`}},
        {component:Transform,data:{pos:[...centre]}},
        {component:MeshFilter,data:{assetHandle:mesh}},
        {component:MeshRenderer,data:{materials:geom.materialSlots.map(()=>materials[finish])}},
        {component:Visibility,data:{state:VisibilityStateValue.hidden}},
      ).unwrap());
    }
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    setEnabled: (enabled:boolean) => {
      const state = enabled ? VisibilityStateValue.inherited : VisibilityStateValue.hidden;
      for (const entity of entities) world.set(entity,Visibility,{state}).unwrap();
    },
    read: () => accents.map(({id,finish,size,centre},index)=>({
      id,finish,size,centre,visible:world.get(entities[index],Visibility).unwrap().state!==VisibilityStateValue.hidden,
    })),
    dispose,
  };
}
