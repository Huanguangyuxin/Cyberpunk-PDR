import type {AssetHandle} from '@forgeax/engine/types';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {MeshFilter, MeshRenderer} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import contactSpec from './pdr-furniture-clearance.json';
import {loadFixtureMeshes} from './pdr-fixtures-d051';

type OriginalBooth = {entity:EntityHandle; mesh:AssetHandle<'mesh'>; materials:number[]};

// Keep authored roots, drinks and physical navigation. Bind the Blender donor meshes
// before the scene's static trimesh colliders are registered.
export async function installOtherScreens(world:World, assets:AssetRegistry, foyer:string, hall:string, vip:string) {
  const loaded = await loadFixtureMeshes(assets, [foyer, hall, vip]);
  const saved: OriginalBooth[] = [];
  const glassware: {entity:EntityHandle; pos:number[]}[] = [];
  const adopted: string[] = [];
  const dispose = () => {
    for (const {entity, mesh, materials} of saved) {
      world.set(entity, MeshFilter, {assetHandle:mesh}).unwrap();
      world.set(entity, MeshRenderer, {materials}).unwrap();
    }
    for (const {entity, pos} of glassware) world.set(entity, Transform, {pos}).unwrap();
    loaded.dispose();
  };
  try {
    for (const row of world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap()) {
      const name = row.get(Name).value;
      if (!/^BOOTH_(?:F1[123]|D[EW][1-5]|U[EW][1-4])$/.test(name)) continue;
      const donor = loaded.rows[name.startsWith('BOOTH_F') ? 0 : name.startsWith('BOOTH_D') ? 1 : 2];
      saved.push({entity:row.entity, mesh:row.get(MeshFilter).assetHandle, materials:Array.from(row.get(MeshRenderer).materials)});
      world.set(row.entity, MeshFilter, {assetHandle:donor.handle}).unwrap();
      world.set(row.entity, MeshRenderer, {materials:donor.materials}).unwrap();
      adopted.push(name);
    }
    for (const row of world.query({read:[Name,Transform]}).unwrap()) {
      if (!/^DRINK_BOOTH_(?:F1[123]|D[EW][1-5]|U[EW][1-4])_(?:COUPE|TUMBLER)$/.test(row.get(Name).value)) continue;
      const pos = Array.from(row.get(Transform).pos);
      glassware.push({entity:row.entity,pos});
      // Original glass contact plane at 554 mm; the new inset stone top is 690 mm.
      world.set(row.entity, Transform, {pos:[pos[0],pos[1]+.136,pos[2]]}).unwrap();
    }
    if (adopted.length!==21 || glassware.length!==42) {
      throw new Error(`Incomplete D189 furniture installation: ${adopted.length} seats, ${glassware.length} glass placements`);
    }
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    read: () => ({ready:true, expectedAssemblies:21, adopted, donorMeshes:loaded.rows.map(r=>r.handle), tableHeightM:.690, vipTableHeightM:.690+contactSpec.vipTableRise, glassware:glassware.length}),
    dispose,
  };
}
