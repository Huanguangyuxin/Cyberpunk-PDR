import { Materials } from '@forgeax/engine/render';
import type { MaterialRootAsset, MaterialTextureValue } from '@forgeax/engine/types';

export function retilePbr(values: MaterialRootAsset['values'], factor:number){
  const result={...values};
  for(const channel of ['baseColorTexture','metallicRoughnessTexture','normalTexture','occlusionTexture']){
    const value=result[channel] as MaterialTextureValue | undefined;
    if(value)result[channel]={...value,coordinates:{set:0,transform:{scale:[factor,factor]}}};
  }
  return result;
}

/** Build-time candidate only. All texture/sampler inputs must be real asset GUIDs.
 * Runtime macro handles are adopted into a COPY of this cooked material, never
 * into a newly created custom shader/material artifact.
 */
export interface NativeFloorInputs {
  readonly baseColor: readonly [number, number, number, number]; // source linear values
  readonly specular?: number;
  readonly roughness: number; // source scalar; ORM.G remains its native UV0 source
  readonly roughnessChannel?: number;
  readonly normalScale: readonly [number, number];
  readonly occlusionStrength?: number;
  readonly wearStrength?: number;
  readonly wetStrength?: number;
  readonly wetMaskChannel?: number;
  readonly wetRoughnessMin?: number;
  readonly wetRoughnessMax?: number;
  readonly baseColorTexture: MaterialTextureValue;
  readonly metallicRoughnessTexture: MaterialTextureValue;
  readonly normalTexture: MaterialTextureValue;
  readonly occlusionTexture: MaterialTextureValue; // may share native ORM.R
  readonly wetMaskTexture: MaterialTextureValue; // UV1; R=existing mask, G=noise
  readonly filmNormalTexture: MaterialTextureValue; // UV1; RG=world X/Z slope
}

function requireSet(value: MaterialTextureValue, set: number, name: string): void {
  if ((value.coordinates?.set ?? 0) !== set) {
    throw new Error(`D112 ${name} requires UV${set}; preserve its own authored transform`);
  }
  if (!('texture' in value) || typeof value.texture !== 'string' || !value.texture.length) {
    throw new Error(`D112 build ${name} requires a real imported/cooked texture GUID`);
  }
}

export function nativeFloorMaterial(input: NativeFloorInputs, planarReflection = false): MaterialRootAsset {
  for (const name of ['baseColorTexture', 'metallicRoughnessTexture', 'normalTexture', 'occlusionTexture'] as const) {
    requireSet(input[name], 0, name);
  }
  for (const name of ['wetMaskTexture', 'filmNormalTexture'] as const) requireSet(input[name], 1, name);
  if (!Number.isFinite(input.roughness) || input.roughness < 0) {
    throw new Error('Floor roughness multiplier must be finite and nonnegative');
  }
  const material = Materials.standard({
    planarReflection,
    surfaceModule: 'cyberpunk_pdr::native_tile_wet_surface_d112',
    parameters: [
      { name: 'baseColor', type: 'color', colorSpace: 'linear' },
      { name: 'metallic', type: 'f32', default: 0 },
      { name: 'roughness', type: 'f32' },
      { name: 'roughnessChannel', type: 'f32', default: 1 },
      { name: 'normalScale', type: 'vec2' },
      { name: 'occlusionStrength', type: 'f32', default: 1 },
      { name: 'ior', type: 'f32', default: 1.46 },
      { name: 'specular', type: 'f32', default: 1 },
      // Author vocabulary is 'texture'; derive maps it to texture2d bindings.
      { name: 'baseColorTexture', type: 'texture' },
      { name: 'metallicRoughnessTexture', type: 'texture' },
      { name: 'normalTexture', type: 'texture' },
      { name: 'occlusionTexture', type: 'texture' },
      { name: 'wetMaskTexture', type: 'texture' },
      { name: 'filmNormalTexture', type: 'texture' },
      { name: 'wearStrength', type: 'f32', default: 0 },
      { name: 'wetStrength', type: 'f32', default: 1 },
      { name: 'wetMaskChannel', type: 'f32', default: 0 },
      { name: 'wetRoughnessMin', type: 'f32', default: 0.09 },
      { name: 'wetRoughnessMax', type: 'f32', default: 0.115 },
      { name: 'groutProtectStart', type: 'f32', default: 0.62 },
      { name: 'groutProtectEnd', type: 'f32', default: 0.74 },
      { name: 'filmNormalScale', type: 'vec2', default: [1/64, 1/64] },
    ],
    values: {
      baseColor: input.baseColor, metallic: 0, roughness: input.roughness,
      roughnessChannel: input.roughnessChannel ?? 1,
      normalScale: input.normalScale, occlusionStrength: input.occlusionStrength ?? 1,
      ior: 1.46, specular: input.specular ?? 1,
      baseColorTexture: input.baseColorTexture,
      metallicRoughnessTexture: input.metallicRoughnessTexture,
      normalTexture: input.normalTexture,
      occlusionTexture: input.occlusionTexture,
      wetMaskTexture: input.wetMaskTexture,
      filmNormalTexture: input.filmNormalTexture,
      wearStrength: input.wearStrength ?? 0,
      wetStrength: input.wetStrength ?? 1, wetMaskChannel: input.wetMaskChannel ?? 0,
      wetRoughnessMin: input.wetRoughnessMin ?? .09, wetRoughnessMax: input.wetRoughnessMax ?? .115,
      groutProtectStart: 0.62, groutProtectEnd: 0.74, filmNormalScale: [1/64, 1/64],
    },
    renderState: { cullMode: 'none' },
  });
  const modes = material.passes?.map(pass => {
    const tags = pass.renderState?.tags as Readonly<Record<string, string>> | undefined;
    return tags?.LightMode;
  }) ?? [];
  for (const mode of ['Forward', 'Deferred', 'ShadowCaster']) {
    if (!modes.includes(mode)) throw new Error(`D112 expected base-only Standard ${mode} pass`);
  }
  return material;
}
