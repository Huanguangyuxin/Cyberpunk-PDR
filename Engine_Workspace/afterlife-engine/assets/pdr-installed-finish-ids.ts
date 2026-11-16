import type {MaterialTextureValue} from '@forgeax/engine/types';
import type {NativeFloorInputs} from './pdr-native-floor-material';

// Imported identities from PDR-D180-Installed-Finishes.glb.meta.json.
export const INSTALLED_FINISH_SCENE='01a1e0f1-0b81-7437-aab4-5bc44b953810';
export const INSTALLED_FLOOR_TRIM='01a1e0f1-0b81-7437-aab4-5bc352175f01';
export const architecturalFinishGuids = {
  dryTile: '01a1e1aa-9c13-78a7-bb8e-2619b4daec31',
  tread: INSTALLED_FLOOR_TRIM,
  perforated: '01a1e0f1-0b81-7437-aab4-5bbce3827afb',
  acoustic: '01a1e0f1-0b81-7437-aab4-5bbe507e970f',
  brushed: '01a1e0f1-0b81-7437-aab4-5bbd1e0e0302',
  satinTile: '01a1e111-cbad-7225-8995-f9a5cb21b7a7',
};
export type ArchitecturalFinish = keyof typeof architecturalFinishGuids;

type FloorTextures = Pick<NativeFloorInputs,'baseColorTexture'|'metallicRoughnessTexture'|'normalTexture'|'occlusionTexture'>;
function floorMaps(base:string, orm:string, normal:string):FloorTextures {
  // The original ground UV0 tile repeats over 2.4 m. D178 maps repeat over 1.2 m.
  const map=(texture:string):MaterialTextureValue=>({texture,coordinates:{set:0,transform:{scale:[2,2]}}});
  return {baseColorTexture:map(base),metallicRoughnessTexture:map(orm),normalTexture:map(normal),occlusionTexture:map(orm)};
}

export const installedFloorInputs={
  M_FLOOR_TILE:{
    ...floorMaps('01a1e1aa-9c13-78a7-bb8e-261eb716bd16','01a1e1aa-9c13-78a7-bb8e-261d5582e74a','01a1e1aa-9c13-78a7-bb8e-261c76b9bab9'),
    baseColor:[1,1,1,1],roughness:1,normalScale:[.86,.86],specular:.47,wetStrength:0,
  },
  M_DANCE_TILE:{
    ...floorMaps('01a1e1aa-9c13-78a7-bb8e-2621d3b104c2','01a1e1aa-9c13-78a7-bb8e-2620d7a130ac','01a1e1aa-9c13-78a7-bb8e-261f45993af8'),
    baseColor:[1,1,1,1],roughness:1.53,normalScale:[.68,.68],specular:.34,
    wetMaskChannel:2,wetStrength:.75,wetRoughnessMin:.125,wetRoughnessMax:.16,
  },
} as const satisfies Record<string,Omit<NativeFloorInputs,'wetMaskTexture'|'filmNormalTexture'>>;
