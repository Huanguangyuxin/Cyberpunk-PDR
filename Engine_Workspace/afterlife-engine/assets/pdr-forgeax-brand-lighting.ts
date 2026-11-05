/** Stage plaque, ceiling bands and directional light inside the upper booths. */
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {MeshFilter, MeshRenderer, PointLight, SpotLight} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import type {AssetHandle} from '@forgeax/engine/types';

type RGB = readonly [number, number, number];

export const brandAmbient = {
  irradiance: [1.05, .45, 1.42],
  sky: [.86, .72, 1],
};

const violet: RGB = [.48, .22, 1];
const orchid: RGB = [.77, .28, 1];
const pink: RGB = [1, .18, .55];
const rose: RGB = [1, .25, .48];
const coral: RGB = [1, .29, .20];
const coralLight: RGB = [1, .43, .36];
const houseBandNumbers = new Set([12, 13, 14, 18, 19, 20, 21, 23, 26]);
const upperBoothNumbers = new Set([15, 16, 17, 28]);
const plaqueBounceNumbers = new Set([31, 32]);
const plaqueFaceSlot = 'D077_Official_ForgeAX_E8692C';
const plaqueGlowGain = 3.65;
const plaqueEmission: RGB = [1, .073, .018];
const upperBoothDirection: RGB = [0, -.950, -.312];

function fixtureColor(number: number): RGB {
  if (number >= 22 && number <= 27) return number % 2 === 0 ? coralLight : coral;
  if ([12, 14, 17, 20].includes(number)) return violet;
  if ([18, 19].includes(number)) return orchid;
  if (number === 21) return rose;
  return pink;
}

interface FixtureAdjustment {
  readonly pos?: RGB;
  readonly intensity?: number;
  readonly direction?: RGB;
  readonly range?: number;
  readonly cone?: readonly [inner: number, outer: number];
}

// Y-up metres from the matching GLB emitter surfaces. Place each punctual
// source just outside the visible diffuser instead of inside opaque housing.
// D083: Ceiling light bands (L12-14, L18-21, L23, L26) are the primary illumination
// force with wide, even wash cones; local point/spot lights stay understated so they
// never create overexposed hotspots on nearby surfaces or in volumetric fog.
const fixtureAdjustments = new Map<number, FixtureAdjustment>([
  [1, {pos:[10.65,2.092,-6.70], intensity:8, range:6.5, cone:[32,54]}],
  [2, {pos:[10.65,2.092,-8.90], intensity:15, range:6.5, cone:[32,54]}],
  [3, {pos:[10.65,2.092,-12.20], intensity:8, range:6.5, cone:[32,54]}],
  [4, {pos:[13.94,2.05,-7], intensity:5, range:4.5}],
  [5, {pos:[13.94,2.05,-11.6], intensity:5, range:4.5}],
  [12, {pos:[-6.5,7.376,-3.5], direction:[.08,-.94,-.33], intensity:1460, range:28, cone:[48,76]}],
  [13, {pos:[4.18,6.51,-10.2], direction:[-.18,-.984,0], intensity:1520, range:28, cone:[48,76]}],
  [14, {pos:[-5,7.376,-14.8], direction:[.08,-.96,-.26], intensity:1480, range:28, cone:[48,76]}],
  [15, {pos:[-12.305,6.112,-38.3], intensity:80, range:8.5, cone:[38,66]}],
  [16, {pos:[-12.305,6.112,-28.1], intensity:80, range:8.5, cone:[38,66]}],
  [17, {pos:[12.305,6.112,-28.1], intensity:80, range:8.5, cone:[38,66]}],
  [18, {pos:[0,7.678,-23.468], direction:[0,-.94,-.34], intensity:1320, range:25, cone:[46,74]}],
  [19, {pos:[5,7.376,-26.5], direction:[-.28,-.945,-.17], intensity:1420, range:26, cone:[48,76]}],
  [20, {pos:[-6,7.376,-31.5], direction:[.30,-.952,.06], intensity:1400, range:26, cone:[48,76]}],
  [21, {pos:[3.5,7.376,-35], direction:[-.24,-.96,.14], intensity:1220, range:24, cone:[46,74]}],
  [22, {intensity:620, range:12, cone:[24,42]}],
  [23, {pos:[-3.2,7.678,-42.68], direction:[.08,-.985,.15], intensity:1120, range:21, cone:[44,72]}],
  [24, {intensity:540, range:11.5}],
  [25, {intensity:540, range:11.5}],
  [26, {pos:[3.2,7.678,-42.68], direction:[-.08,-.985,.15], intensity:1120, range:21, cone:[44,72]}],
  [27, {intensity:600, range:12, cone:[24,42]}],
  [28, {pos:[12.305,6.112,-38.3], intensity:80, range:8.5, cone:[38,66]}],
  [29, {pos:[-11.15,2.283,-26.2], intensity:10, range:4.0}],
  [30, {pos:[11.15,2.283,-26.2], intensity:10, range:4.0}],
  // Two retired gallery slots now sit behind the opaque plaque enclosure
  // (rear z=-43.65), in the gap to the stage wall (z=-43.94).
  [31, {pos:[-1.10,3.35,-43.70], intensity:8, range:1.35}],
  [32, {pos:[1.10,3.35,-43.70], intensity:8, range:1.35}],
]);

function tuneFixtures(world: World) {
  const points = Array.from(world.query({read: [Name, Transform, PointLight]}).unwrap(), row => ({
    entity: row.entity, name: row.get(Name).value, kind: 'point' as const,
    pos: Array.from(row.get(Transform).pos),
    pointData: {...row.get(PointLight),color:Array.from(row.get(PointLight).color)},
    intensity: row.get(PointLight).intensity, range: row.get(PointLight).range, color: Array.from(row.get(PointLight).color),
  }));
  const spots = Array.from(world.query({read: [Name, Transform, SpotLight]}).unwrap(), row => ({
    entity: row.entity, name: row.get(Name).value, kind: 'spot' as const,
    pos: Array.from(row.get(Transform).pos),
    intensity: row.get(SpotLight).intensity, range: row.get(SpotLight).range, color: Array.from(row.get(SpotLight).color),
    direction: Array.from(row.get(SpotLight).direction),
    innerConeDeg: row.get(SpotLight).innerConeDeg, outerConeDeg: row.get(SpotLight).outerConeDeg,
  }));
  const fixtures = [...points, ...spots];
  const numbers = fixtures.map(fixture => Number(/^L(\d{2})_/.exec(fixture.name)?.[1]));
  if (fixtures.length !== 32 || new Set(numbers).size !== 32 || numbers.some(n => !(n >= 1 && n <= 32))) {
    throw new Error('D078 requires the existing 32 named fixtures');
  }
  const convertedBooths = new Set<EntityHandle>();
  for (const [index, fixture] of fixtures.entries()) {
    const number = numbers[index];
    const adjustment = fixtureAdjustments.get(number);
    const pos = number >= 6 && number <= 11 ? [fixture.pos[0], .722, fixture.pos[2]] : adjustment?.pos;
    if (pos) world.set(fixture.entity, Transform, {pos: [...pos]}).unwrap();
    const patch = {color: [...(plaqueBounceNumbers.has(number) ? coral : fixtureColor(number))], range: adjustment?.range ?? (number >= 6 && number <= 11 ? 3.5 : fixture.range),
      intensity: adjustment?.intensity ?? (number >= 6 && number <= 11 ? 6 : fixture.intensity)};
    if (fixture.kind === 'point' && upperBoothNumbers.has(number)) {
      world.removeComponent(fixture.entity,PointLight).unwrap();
      try {
        world.addComponent(fixture.entity,{component:SpotLight,data:{
          ...patch, direction:[...upperBoothDirection], innerConeDeg:adjustment?.cone?.[0]??42, outerConeDeg:adjustment?.cone?.[1]??72, castShadow:false,
        }}).unwrap();
      } catch (error) {
        world.addComponent(fixture.entity,{component:PointLight,data:fixture.pointData}).unwrap();
        throw error;
      }
      convertedBooths.add(fixture.entity);
    } else if (fixture.kind === 'spot') {
      world.set(fixture.entity, SpotLight, {...patch, direction: adjustment?.direction ? [...adjustment.direction] : fixture.direction,
        innerConeDeg: adjustment?.cone?.[0] ?? fixture.innerConeDeg,
        outerConeDeg: adjustment?.cone?.[1] ?? fixture.outerConeDeg}).unwrap();
    } else {
      world.set(fixture.entity, PointLight, patch).unwrap();
    }
  }
  const restore = () => {
    for (const fixture of fixtures) {
      world.set(fixture.entity, Transform, {pos: fixture.pos}).unwrap();
      const patch = {color: fixture.color, intensity: fixture.intensity, range: fixture.range};
      if (fixture.kind === 'point' && convertedBooths.has(fixture.entity)) {
        world.removeComponent(fixture.entity,SpotLight).unwrap();
        world.addComponent(fixture.entity,{component:PointLight,data:fixture.pointData}).unwrap();
      } else if (fixture.kind === 'spot') world.set(fixture.entity, SpotLight, {...patch, direction: fixture.direction, innerConeDeg: fixture.innerConeDeg, outerConeDeg: fixture.outerConeDeg}).unwrap();
      else world.set(fixture.entity, PointLight, patch).unwrap();
    }
  };
  if (convertedBooths.size !== 4) throw new Error('D080 expected four upper booth point lights');
  const houseBands = spots.filter(spot => houseBandNumbers.has(Number(spot.name.slice(1,3))));
  const plaqueBounce = points.filter(point => plaqueBounceNumbers.has(Number(point.name.slice(1,3))));
  const read = () => ({
    main:houseBands.map(spot => ({name:spot.name,
      intensity:world.get(spot.entity,SpotLight).unwrap().intensity,
      pos:Array.from(world.get(spot.entity,Transform).unwrap().pos)})),
    upperBooths:points.filter(point => convertedBooths.has(point.entity)).map(point => {
      const spot = world.get(point.entity,SpotLight).unwrap();
      return {name:point.name,kind:'downward spot',intensity:spot.intensity,range:spot.range};
    }),
    plaqueBounce:plaqueBounce.map(point => ({
      name:point.name,intensity:world.get(point.entity,PointLight).unwrap().intensity,
      pos:Array.from(world.get(point.entity,Transform).unwrap().pos),
    })),
  });
  const muteHouseBands = () => {
    for (const spot of houseBands) world.set(spot.entity,SpotLight,{intensity:0}).unwrap();
  };
  const mutePlaqueBounce = () => {
    for (const point of plaqueBounce) world.set(point.entity,PointLight,{intensity:0}).unwrap();
  };
  return {restore,read,muteHouseBands,mutePlaqueBounce};
}
// Graphic neon and labels retain their own identity. Architectural LEDs get
// both a hue and a luminance ceiling; old HDR bulbs could clip to white.
type Practical = readonly [color: RGB, targetEmission: number];
const practicals = new Map<string, Practical>([
  ['M_STEP_LED', [pink, 2.6]],
  ['M_OPAL_PINK_DIM', [rose, .25]],
  ['M_OPAL_PINK', [[1, .20, .58], 5.6]],
  ['WB015_M_STEP_LED', [pink, 2.6]],
  ['WB015_M_PLINTH_PINK', [orchid, 2.0]],
  ['WB015_M_FRAME_PINK', [pink, 2.5]],
  ['WB015_M_COVE_BLUE', [violet, 5.8]],
  ['WB015_M_UPLIGHT', [orchid, 6.5]],
  ['M18_BASE_LED_PINK', [[1, .18, .55], 3.8]],
  ['M18_TALL_PANEL_PINK', [coral, 3.6]],
  ['M18_BAND_COOL', [orchid, 9.5]],
  ['M18_BAND_COOL_DIM', [violet, 5.5]],
]);

// These legacy materials have a different cooked specialization, including
// textured opal and moving-lens slots. Bind the matching already-cooked
// fixtures here instead of instantiating a new shader variant at runtime.
// D083/D084: Point-lamp bulbs and table lamps use soft dim opal (`M_OPAL_PINK_DIM`),
// pillar/panel strips (`WB015_M_OPAL_PINK`) use bright `M_OPAL_PINK` with Bloom,
// and overhead ceiling bands (`WB015_M_OPAL_WHITE`) use bright `M18_BAND_COOL`.
const sharedOpalSlots = new Map([
  ['M_BULB_WARM', 'M_OPAL_PINK_DIM'],
  ['M_LAMP_OPAL', 'M_OPAL_PINK_DIM'],
  ['WB015_M_BULB_WARM', 'M_OPAL_PINK_DIM'],
  ['WB015_M_LAMP_OPAL', 'M_OPAL_PINK_DIM'],
  ['WB015_M_OPAL_PINK', 'M_OPAL_PINK'],
  ['WB015_M_OPAL_PINK_DIM', 'M_OPAL_PINK_DIM'],
  ['WB015_M_LED_BLUE', 'M18_BAND_COOL_DIM'],
  ['WB015_M_OPAL_WHITE', 'M18_BAND_COOL'],
  ['D051_OPTICAL_APERTURE', 'stage-opal'],
]);

// D082: lift charcoal-crushed architectural, booth and foliage linear albedos
// (originally 0.5%-1.6% linear) into physically realistic dark surfaces so indirect
// and direct illumination remain readable without blowing out highlights.
// Note: M_LEATHER_WINE has staticSwitches={clearcoat:true} whose specialization is
// package-scoped, so keep it on its original asset handle and lift all non-switch slots.
type RGBA = readonly [number, number, number, number];
const darkSurfaceBaseColor = new Map<string, RGBA>([
  ['M_ROOF_DARK', [2.2, 2.0, 2.15, 1]],
  ['WB015_M_ROOF_DARK', [2.2, 2.0, 2.15, 1]],
  ['M_WALL_NAVY', [1.85, 1.7, 1.85, 1]],
  ['WB015_M_WALL_NAVY', [1.85, 1.7, 1.85, 1]],
  ['M_STEEL_NAVY', [1.9, 1.75, 1.9, 1]],
  ['WB015_M_STEEL_NAVY', [1.9, 1.75, 1.9, 1]],
  ['M_STEEL_BLACK', [2.3, 2.2, 2.45, 1]],
  ['WB015_M_STEEL_BLACK', [2.3, 2.2, 2.45, 1]],
  ['M_PERF_STEEL', [2.0, 1.9, 2.1, 1]],
  ['WB015_M_PERF_STEEL', [2.0, 1.9, 2.1, 1]],
  ['M_COUNTER_STEEL', [1.55, 1.5, 1.65, 1]],
  ['WB015_M_COUNTER_STEEL', [1.55, 1.5, 1.65, 1]],
  ['M_SPEAKER_GRILLE', [2.4, 2.3, 2.55, 1]],
  ['WB015_M_SPEAKER_GRILLE', [2.4, 2.3, 2.55, 1]],
  ['WB015_M_LEATHER_WINE', [1.32, 1.38, 1.45, 1]],
  ['WB015_M_VINYL_CONTACT', [1.32, 1.38, 1.45, 1]],
  ['M_LEATHER_WORN', [1.32, 1.38, 1.45, 1]],
  ['WB015_M_LEATHER_WORN', [1.32, 1.38, 1.45, 1]],
  ['M_LEATHER_PATCH', [1.32, 1.38, 1.45, 1]],
  ['WB015_M_LEATHER_PATCH', [1.32, 1.38, 1.45, 1]],
  ['M_FLOOR_TILE', [1.35, 1.30, 1.42, 1]],
  ['WB015_M_FLOOR_TILE', [1.35, 1.30, 1.42, 1]],
  ['M_DANCE_TILE', [1.35, 1.30, 1.42, 1]],
  ['WB015_M_DANCE_TILE', [1.35, 1.30, 1.42, 1]],
  ['M_PLANT_LEAF', [2.2, 1.85, 2.1, 1]],
  ['WB015_M_PLANT_LEAF', [2.2, 1.85, 2.1, 1]],
  ['M_POT', [.08, .076, .094, 1]],
  ['WB015_M_POT', [.08, .076, .094, 1]],
  ['M_SOIL', [.085, .062, .05, 1]],
  ['WB015_M_SOIL', [.085, .062, .05, 1]],
  ['M_RUBBER', [.048, .046, .055, 1]],
  ['WB015_M_RUBBER', [.048, .046, .055, 1]],
  ['M_PLASTIC_BLACK', [.048, .046, .055, 1]],
  ['WB015_M_PLASTIC_BLACK', [.048, .046, .055, 1]],
  ['M_CONE', [.048, .046, .055, 1]],
]);

export async function installForgeAxBrandLighting(world: World, assets: AssetRegistry) {
  const fixtures = tuneFixtures(world);
  const created = new Map<string, AssetHandle<'material'>>();
  const saved: {entity: EntityHandle; materials: number[]}[] = [];
  const rows = Array.from(world.query({read: [Name, MeshFilter, MeshRenderer]}).unwrap(), row => ({
    entity: row.entity, name: row.get(Name).value, mesh: row.get(MeshFilter).assetHandle,
    materials: Array.from(row.get(MeshRenderer).materials),
  }));

  const dispose = () => {
    for (const row of saved.reverse()) world.set(row.entity, MeshRenderer, {materials: row.materials}).unwrap();
    for (const handle of created.values()) assets.release(handle).unwrap();
    fixtures.restore();
  };

  let plaqueFace: {entity: EntityHandle; materials: number[]} | undefined;
  try {
    let stageGraphicUpdated = false;
    for (const row of rows) {
      const source = assets.read(row.mesh);
      if (!source.ok || source.value.kind !== 'mesh') continue;
      const slots = source.value.materialSlots;
      const materials = slots.map((_, index) => Number(row.materials[index] ?? 0));
      let changed = false;
      for (const [index, slot] of slots.entries()) {
        const stagePractical = row.name === 'STAGE_PLATFORM_DJ' &&
          ['M_OPAL_PINK','M_OPAL_PINK_DIM','M_STEP_LED'].includes(slot.slotName);
        const sconcePractical = (row.name.startsWith('WPANEL_') || row.name === 'BAR_COUNTER_L' || row.name.startsWith('ENTRY_POST_')) &&
          slot.slotName === 'M_OPAL_PINK';
        const practical: Practical | undefined = stagePractical
          ? [coral, slot.slotName === 'M_STEP_LED' ? 2.0 : slot.slotName === 'M_OPAL_PINK' ? 3.2 : 0.65]
          : sconcePractical
          ? [pink, 2.2]
          : practicals.get(slot.slotName);
        // The bright pink directly under the official plaque is baked into
        // this booth-facing atlas region. Scope its material tint to the DJ.
        const isStageGraphic = row.name === 'STAGE_PLATFORM_DJ' && slot.slotName === 'M_BIG_POSTER';
        const isPlaqueFace = row.name === 'PDR_Official_ForgeAX_Orange_Face' && slot.slotName === plaqueFaceSlot;
        const darkLift = darkSurfaceBaseColor.get(slot.slotName);
        const ref = materials[index] || slot.defaultMaterial;
        if ((!practical && !isStageGraphic && !isPlaqueFace && !darkLift) || !ref) continue;
        const variant = isStageGraphic ? 'dj-fascia' : stagePractical
          ? slot.slotName === 'M_OPAL_PINK' ? 'stage-opal' : 'stage-' + slot.slotName
          : sconcePractical ? 'sconce-opal'
          : slot.slotName;
        const key = variant + ':' + ref;
        let replacement = created.get(key);
        if (replacement === undefined) {
          const isGuid = typeof ref === 'string';
          const original = isGuid
            ? (await assets.load(assets.parseGuid(ref), 'material')).unwrap()
            : ref as AssetHandle<'material'>;
          try {
            const material = assets.read(original).unwrap();
            if (material.kind !== 'material') throw new Error('D077 expected imported material ' + slot.slotName);
            if (practical && typeof material.values?.emissiveIntensity !== 'number') {
              throw new Error('D077 expected imported emissive material ' + slot.slotName);
            }
            const values = {...material.values};
            if (isStageGraphic) {
              if (!values.baseColorTexture) throw new Error('D077 DJ fascia atlas missing');
              values.baseColor = [.68, .79, .13, 1];
            } else if (isPlaqueFace) {
              if (typeof values.emissiveIntensity !== 'number') throw new Error('D081 plaque emission missing');
              // The original warm face was below the 2.2 scene-linear
              // luminance threshold despite its bright tone-mapped output.
              // Preserve the imported diffuse color. Calibrate the LED's
              // HDR tint against ACES so the highlight remains coral.
              values.emissive = [...plaqueEmission];
              values.emissiveIntensity *= plaqueGlowGain;
            } else if (practical) {
              const [color, target] = practical;
              values.emissive = [...color];
              values.emissiveIntensity = target;
            } else if (darkLift) {
              values.baseColor = [...darkLift];
            }
            replacement = assets.create({...material, values}).unwrap();
            created.set(key, replacement);
          } finally {
            if (isGuid) assets.release(original).unwrap();
          }
        }
        if (isStageGraphic) stageGraphicUpdated = true;
        if (isPlaqueFace) plaqueFace = {entity:row.entity, materials:row.materials};
        materials[index] = replacement;
        changed = true;
      }
      if (changed) {
        saved.push({entity: row.entity, materials: row.materials});
        world.set(row.entity, MeshRenderer, {materials}).unwrap();
      }
    }
    if (!stageGraphicUpdated) throw new Error('D077 DJ fascia slot not found');
    if (!plaqueFace) throw new Error('D081 official plaque emissive slot not found');
    if (created.size < 8 || saved.length < 20) throw new Error('D078 architectural practicals did not resolve');

    const donorMaterials = new Map(Array.from(created, ([key, handle]) => [key.split(':', 1)[0], handle]));
    for (const row of rows) {
      const source = assets.read(row.mesh);
      if (!source.ok || source.value.kind !== 'mesh') continue;
      const original = Array.from(world.get(row.entity, MeshRenderer).unwrap().materials);
      const materials = source.value.materialSlots.map((_, index) => Number(original[index] ?? 0));
      let changed = false;
      for (const [index, slot] of source.value.materialSlots.entries()) {
        const isUpperSconce = (row.name.startsWith('WPANEL_') || row.name.startsWith('VIP_')) && slot.slotName === 'WB015_M_OPAL_PINK';
        const donor = isUpperSconce ? 'sconce-opal' : sharedOpalSlots.get(slot.slotName);
        if (!donor) continue;
        const material = donorMaterials.get(donor);
        if (material === undefined) throw new Error('D078 cooked opal material missing ' + donor);
        materials[index] = material;
        changed = true;
      }
      if (changed) {
        saved.push({entity:row.entity, materials:original});
        world.set(row.entity, MeshRenderer, {materials}).unwrap();
      }
    }
  } catch (error) {
    dispose();
    throw error;
  }

  const resetPlaqueGlow = () => {
    if (!plaqueFace) throw new Error('D081 cannot reset an unbound plaque');
    world.set(plaqueFace.entity,MeshRenderer,{materials:plaqueFace.materials}).unwrap();
    fixtures.mutePlaqueBounce();
  };
  return {dispose, read:fixtures.read, muteHouseBands:fixtures.muteHouseBands, resetPlaqueGlow};
}
