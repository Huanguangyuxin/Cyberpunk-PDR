/** Stage plaque, ceiling bands and directional light inside the upper booths. */
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {MeshFilter, MeshRenderer, PointLight, RectAreaLight, SpotLight} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import type {AssetHandle} from '@forgeax/engine/types';

type RGB = readonly [number, number, number];

export const brandAmbient = {
  irradiance: [0.88, 0.38, 1.20],
  sky: [0.82, 0.68, 0.96],
};

const violet: RGB = [.48, .22, 1];
const orchid: RGB = [.77, .28, 1];
const pink: RGB = [1, .18, .55];
const vipLight: RGB = [.76, .83, 1];
const vipStripRadiance = 960;
const rose: RGB = [1, .25, .48];
const coral: RGB = [1, .29, .20];
const coralLight: RGB = [1, .43, .36];
const houseBandNumbers = new Set([12, 13, 14, 18, 19, 20, 21, 23, 26]);
const plaqueBounceNumbers = new Set([31, 32]);
const plaqueFaceSlot = 'D077_Official_ForgeAX_E8692C';
const plaqueGlowGain = 3.65;
const plaqueEmission: RGB = [1, .073, .018];

// D112 candidate: front-strip radiance 825 (was1500) retains wall diffuse gradients.
// Source dimensions/colors/positions, other24 lights, exposure/Bloom/ambient unchanged.
// D108: Reuse existing light slots as finite, downward-facing luminous strips.
// Dimensions/positions match the flush emitters built by elevationAndSoffit:
// A3 roof strips y=9.243; B2 gallery strips y=3.344. The 6mm offset
// places the emitting plane just below the diffuser, not in a solid beam.
// Rect intensity is source radiance scale, NOT the candela used by Point/Spot.
const stripSources = new Map<number, {pos:RGB; width:number; height:number; intensity:number; range:number; mount:string; color?:RGB}>([
  [4, {pos:[8,9.237,-6.1], width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof +8 south'}],
  [5, {pos:[8,9.237,-14.9],width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof +8 north'}],
  [6, {pos:[-11.2,9.237,-6.1],width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof -11.2 south'}],
  [7, {pos:[-11.2,9.237,-14.9],width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof -11.2 north'}],
  [8, {pos:[-8,9.237,-6.1],width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof -8 south'}],
  [9, {pos:[-8,9.237,-14.9],width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof -8 north'}],
  [10,{pos:[11.2,9.237,-6.1],width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof +11.2 south'}],
  [11,{pos:[11.2,9.237,-14.9],width:.15,height:8.8,intensity:825,range:27,mount:'A3 roof +11.2 north'}],
  [15,{pos:[-12.305,6.584,-38.3],width:.13,height:1.64,intensity:vipStripRadiance,range:9,color:vipLight,mount:'VIP_W2_SHELL suspended opal strip'}],
  [16,{pos:[-9.475,3.338,-35.3],width:.14,height:5.1,intensity:120,range:11,mount:'B2 west soffit bay 3'}],
  [17,{pos:[9.475,3.338,-35.3],width:.14,height:5.1,intensity:120,range:11,mount:'B2 east soffit bay 3'}],
  [28,{pos:[12.305,6.584,-38.3],width:.13,height:1.64,intensity:vipStripRadiance,range:9,color:vipLight,mount:'VIP_E2_SHELL suspended opal strip'}],
  [29,{pos:[-9.475,3.338,-24.7],width:.14,height:3.9,intensity:120,range:11,mount:'B2 west soffit bay 1'}],
  [30,{pos:[9.475,3.338,-24.7],width:.14,height:3.9,intensity:120,range:11,mount:'B2 east soffit bay 1'}],
  // D113: retire the two8cd plaque bounce slots; match real missing VIP1 emitters.
  [31,{pos:[-12.305,6.584,-28.1],width:.13,height:1.64,intensity:vipStripRadiance,range:9,color:vipLight,mount:'VIP_W1_SHELL suspended opal strip; reused source31'}],
  [32,{pos:[12.305,6.584,-28.1],width:.13,height:1.64,intensity:vipStripRadiance,range:9,color:vipLight,mount:'VIP_E1_SHELL suspended opal strip; reused source32'}],
]);

function fixtureColor(number: number): RGB {
  if (number === 24) return [.42, .52, 1];
  if (number === 25) return [1, .22, .60];
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
  // D095: Front-hall East bar canopy spots (L01..L03) + Front-hall flush ceiling light-band wash (L04..L14 at y = 8.45m)
  [1, {pos:[10.65,2.092,-6.70], intensity:11, range:7.0, cone:[34,56]}],
  [2, {pos:[10.65,2.092,-8.90], intensity:16, range:7.0, cone:[34,56]}],
  [3, {pos:[10.65,2.092,-12.20], intensity:11, range:7.0, cone:[34,56]}],
  [4, {pos:[8.2,8.45,-4.5], intensity:1150, range:24.0}],
  [5, {pos:[8.2,8.45,-15.5], intensity:1220, range:24.0}],
  [6, {pos:[-11.5,8.45,-3.5], intensity:1100, range:24.0}],
  [7, {pos:[-11.5,8.45,-9.5], intensity:1100, range:24.0}],
  [8, {pos:[-11.5,8.45,-16.0], intensity:1220, range:24.0}],
  [9, {pos:[-8.2,8.45,-3.5], intensity:1080, range:24.0}],
  [10, {pos:[-8.2,8.45,-9.5], intensity:1080, range:24.0}],
  [11, {pos:[-8.2,8.45,-15.5], intensity:1150, range:24.0}],
  // D095: Place L12..L14 at y = 8.45m (just below the flush ceiling light bands at y = 8.58m) with wide 54..82 deg wash cones
  [12, {pos:[-4.5,8.588,-2.75], direction:[.10,-.96,-.26], intensity:600, range:30, cone:[50,78]}],
  [13, {pos:[4.5,8.588,-8.25], direction:[-.14,-.98,-.10], intensity:620, range:30, cone:[50,78]}],
  [14, {pos:[-4.5,8.588,-13.75], direction:[.10,-.96,-.24], intensity:600, range:30, cone:[50,78]}],
  [15, {pos:[-12.305,6.562,-38.3], intensity:85, range:9.0, cone:[40,68]}],
  // D095: L16 & L17 sit under the raised West & East 2nd-floor soffits (y = 2.86m, z = -37.2m)
  // with wide 62..88 deg downward/inward cones to wash the northern ground-floor booths & round tables.
  [16, {pos:[-10.45,2.86,-37.2], direction:[.22,-.975,0], intensity:380, range:15.0, cone:[54,82]}],
  [17, {pos:[10.45,2.86,-37.2], direction:[-.22,-.975,0], intensity:380, range:15.0, cone:[54,82]}],
  // D095: L18_PORTAL sits directly under the raised 2nd-floor bridge soffit (y = 2.94m, z = -21.20m)
  // to illuminate the ground-floor bridge underpass and central transition zone without shadow cast blockage.
  [18, {pos:[0,2.94,-21.20], direction:[0,-.985,-.17], intensity:680, range:20, cone:[58,84]}],
  [19, {pos:[5,8.576,-26.5], direction:[0,-1,0], intensity:1360, range:28, cone:[28,52]}],
  [20, {pos:[-6,8.576,-31.5], direction:[0,-1,0], intensity:1340, range:28, cone:[28,52]}],
  [21, {pos:[3.5,8.576,-35], direction:[0,-1,0], intensity:1200, range:26, cone:[28,52]}],
  [22, {intensity:1650, range:19, cone:[20,36]}],
  [23, {pos:[-3.2,8.328,-42.68], direction:[.08,-.985,.15], intensity:1200, range:23, cone:[44,72]}],
  [24, {intensity:3600, range:24, cone:[6.5,13.5]}],
  [25, {intensity:3600, range:24, cone:[6.5,13.5]}],
  [26, {pos:[3.2,8.328,-42.68], direction:[-.08,-.985,.15], intensity:1200, range:23, cone:[44,72]}],
  [27, {intensity:1600, range:19, cone:[20,36]}],
  [28, {pos:[12.305,6.562,-38.3], intensity:85, range:9.0, cone:[40,68]}],
  // D095: L29_DEEP_W & L30_DEEP_E sit under the raised West & East 2nd-floor gallery soffits (y = 2.86m, z = -27.8m)
  // with wide 16.5m reach to eliminate ground-floor shadows under the 2nd-floor decks.
  [29, {pos:[-10.45,2.86,-27.8], intensity:320, range:15.5}],
  [30, {pos:[10.45,2.86,-27.8], intensity:320, range:15.5}],
  // Two retired gallery slots now sit behind the opaque plaque enclosure
  // (rear z=-43.65), in the gap to the stage wall (z=-43.94).
  [31, {pos:[-1.10,3.35,-43.70], intensity:8, range:1.35}],
  [32, {pos:[1.10,3.35,-43.70], intensity:8, range:1.35}],
]);

function tuneFixtures(world: World) {
  const points = Array.from(world.query({read: [Name, Transform, PointLight]}).unwrap(), row => ({
    entity: row.entity, name: row.get(Name).value, kind: 'point' as const,
    pos: Array.from(row.get(Transform).pos),
    quat: Array.from(row.get(Transform).quat),
    pointData: {...row.get(PointLight),color:Array.from(row.get(PointLight).color)},
    intensity: row.get(PointLight).intensity, range: row.get(PointLight).range, color: Array.from(row.get(PointLight).color),
  }));
  const spots = Array.from(world.query({read: [Name, Transform, SpotLight]}).unwrap(), row => ({
    entity: row.entity, name: row.get(Name).value, kind: 'spot' as const,
    pos: Array.from(row.get(Transform).pos),
    quat: Array.from(row.get(Transform).quat),
    intensity: row.get(SpotLight).intensity, range: row.get(SpotLight).range, color: Array.from(row.get(SpotLight).color),
    direction: Array.from(row.get(SpotLight).direction),
    innerConeDeg: row.get(SpotLight).innerConeDeg, outerConeDeg: row.get(SpotLight).outerConeDeg,
  }));
  const fixtures = [...points, ...spots];
  const numbers = fixtures.map(fixture => Number(/^L(\d{2})_/.exec(fixture.name)?.[1]));
  if (fixtures.length !== 32 || new Set(numbers).size !== 32 || numbers.some(n => !(n >= 1 && n <= 32))) {
    throw new Error('D078 requires the existing 32 named fixtures');
  }
  const convertedStrips = new Set<EntityHandle>();
  for (const [index, fixture] of fixtures.entries()) {
    const number = numbers[index];
    const strip = stripSources.get(number);
    if (strip) {
      if (fixture.kind !== 'point') throw new Error('D108 strip slot must replace a point: ' + fixture.name);
      world.removeComponent(fixture.entity,PointLight).unwrap();
      try {
        world.addComponent(fixture.entity,{component:RectAreaLight,data:{
          color:[...(strip.color ?? orchid)],intensity:strip.intensity,range:strip.range,width:strip.width,height:strip.height,
        }}).unwrap();
        world.set(fixture.entity,Transform,{pos:[...strip.pos],quat:[Math.SQRT1_2,0,0,Math.SQRT1_2]}).unwrap();
      } catch (error) {
        if(world.hasComponent(fixture.entity,RectAreaLight))world.removeComponent(fixture.entity,RectAreaLight).unwrap();
        world.addComponent(fixture.entity,{component:PointLight,data:fixture.pointData}).unwrap();
        throw error;
      }
      convertedStrips.add(fixture.entity);
      continue;
    }
    const adjustment = fixtureAdjustments.get(number);
    const pos = adjustment?.pos ?? (number >= 6 && number <= 11 ? [fixture.pos[0], .722, fixture.pos[2]] : undefined);
    if (pos) world.set(fixture.entity, Transform, {pos: [...pos]}).unwrap();
    const patch = {color: [...(plaqueBounceNumbers.has(number) ? coral : fixtureColor(number))], range: adjustment?.range ?? (number >= 6 && number <= 11 ? 3.5 : fixture.range),
      intensity: adjustment?.intensity ?? (number >= 6 && number <= 11 ? 6 : fixture.intensity)};
    if (fixture.kind === 'spot') {
      world.set(fixture.entity, SpotLight, {...patch, direction: adjustment?.direction ? [...adjustment.direction] : fixture.direction,
        innerConeDeg: adjustment?.cone?.[0] ?? fixture.innerConeDeg,
        outerConeDeg: adjustment?.cone?.[1] ?? fixture.outerConeDeg}).unwrap();
    } else {
      world.set(fixture.entity, PointLight, patch).unwrap();
    }
  }
  const restore = () => {
    for (const fixture of fixtures) {
      world.set(fixture.entity, Transform, {pos: fixture.pos,quat:fixture.quat}).unwrap();
      const patch = {color: fixture.color, intensity: fixture.intensity, range: fixture.range};
      if (fixture.kind === 'point' && convertedStrips.has(fixture.entity)) {
        if(world.hasComponent(fixture.entity,RectAreaLight))world.removeComponent(fixture.entity,RectAreaLight).unwrap();
        world.addComponent(fixture.entity,{component:PointLight,data:fixture.pointData}).unwrap();
      } else if (fixture.kind === 'spot') world.set(fixture.entity, SpotLight, {...patch, direction: fixture.direction, innerConeDeg: fixture.innerConeDeg, outerConeDeg: fixture.outerConeDeg}).unwrap();
      else world.set(fixture.entity, PointLight, patch).unwrap();
    }
  };
  if (convertedStrips.size !== 16) throw new Error('D113 expected sixteen strip sources');
  const houseBands = spots.filter(spot => houseBandNumbers.has(Number(spot.name.slice(1,3))));
  const plaqueBounce = points.filter(point => plaqueBounceNumbers.has(Number(point.name.slice(1,3))) && !convertedStrips.has(point.entity));
  const read = () => ({
    nativeCount:fixtures.length,
    retiredPlaqueBounceSlots:[31,32],
    strips:points.filter(point=>convertedStrips.has(point.entity)).map(point=>{
      const light=world.get(point.entity,RectAreaLight);
      const strip=stripSources.get(Number(point.name.slice(1,3)))!;
      return {name:point.name,kind:'native LTC rectangle',mount:stripSources.get(Number(point.name.slice(1,3)))!.mount,
        intensity:light.ok?light.value.intensity:0,units:'radiance scale (not cd)',
        width:light.ok?light.value.width:strip.width,height:light.ok?light.value.height:strip.height,
        pos:Array.from(world.get(point.entity,Transform).unwrap().pos)};
    }),
    main:houseBands.map(spot => ({name:spot.name,
      intensity:world.get(spot.entity,SpotLight).unwrap().intensity,
      pos:Array.from(world.get(spot.entity,Transform).unwrap().pos)})),
    upperBooths:points.filter(point => [15,28,31,32].includes(Number(point.name.slice(1,3)))).map(point => {
      const light = world.get(point.entity,RectAreaLight);
      const strip=stripSources.get(Number(point.name.slice(1,3)))!;
      return {name:point.name,kind:'ceiling strip',mount:strip.mount,intensity:light.ok?light.value.intensity:0,range:light.ok?light.value.range:strip.range};
    }),
    plaqueBounce:plaqueBounce.map(point => ({
      name:point.name,intensity:world.get(point.entity,PointLight).unwrap().intensity,
      pos:Array.from(world.get(point.entity,Transform).unwrap().pos),
    })),
  });
  const muteHouseBands = () => {
    for (const spot of houseBands) world.set(spot.entity,SpotLight,{intensity:0}).unwrap();
    for (const entity of convertedStrips) world.set(entity,RectAreaLight,{intensity:0}).unwrap();
  };
  const mutePlaqueBounce = () => {
    for (const point of plaqueBounce) world.set(point.entity,PointLight,{intensity:0}).unwrap();
  };
  const muteVipLights=()=>{for(const entity of convertedStrips){const n=Number(world.get(entity,Name).unwrap().value.slice(1,3));if([15,28,31,32].includes(n))world.set(entity,RectAreaLight,{intensity:0}).unwrap();}};
  return {restore,read,muteHouseBands,mutePlaqueBounce,muteVipLights};
}
// Graphic neon and labels retain their own identity. Architectural LEDs get
// both a hue and a luminance ceiling; old HDR bulbs could clip to white.
type Practical = readonly [color: RGB, targetEmission: number];
const practicals = new Map<string, Practical>([
  ['M_STEP_LED', [pink, 1.35]],
  ['M_OPAL_PINK_DIM', [rose, .22]],
  ['M_OPAL_PINK', [[1, .20, .58], 4.6]],
  ['WB015_M_STEP_LED', [pink, 1.35]],
  ['WB015_M_PLINTH_PINK', [orchid, 1.7]],
  ['WB015_M_FRAME_PINK', [pink, 2.1]],
  ['WB015_M_COVE_BLUE', [violet, 4.8]],
  ['WB015_M_UPLIGHT', [orchid, 5.2]],
  ['M18_BASE_LED_PINK', [[1, .18, .55], 3.1]],
  ['M18_TALL_PANEL_PINK', [coral, 3.2]],
  ['M18_BAND_COOL', [orchid, 9.0]],
  ['M18_BAND_COOL_DIM', [violet, 5.4]],
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
  // D109: DCC owns rebuilt architectural/furniture PBR. Do not overwrite
  // its baseColor or multiply the original dark texture a second time.
  ['M_PLANT_LEAF', [2.2, 1.85, 2.1, 1]],
  ['WB015_M_PLANT_LEAF', [2.2, 1.85, 2.1, 1]],
  ['M_POT', [.08, .076, .094, 1]],
  ['WB015_M_POT', [.08, .076, .094, 1]],
  ['M_CONE', [.048, .046, .055, 1]],
]);

export async function installForgeAxBrandLighting(world: World, assets: AssetRegistry) {
  const fixtures = tuneFixtures(world);
  const setFrontStripBaseline=()=>{
    let count=0;
    for(const row of world.query({read:[Name,RectAreaLight]}).unwrap()){
      const n=Number(row.get(Name).value.match(/^L(\d+)_/)?.[1]);
      if(n>=4&&n<=11){world.set(row.entity,RectAreaLight,{intensity:1500}).unwrap();count++;}
    }
    if(count!==8)throw new Error('D112 expected8 front ceiling strips');
  };
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

  const vipEmitterNames:string[]=[];
  let vipStripMaterial:AssetHandle<'material'>|undefined;
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
        // D107: never overwrite ARCH_FLOOR_SLAB / ARCH_DANCE_FLOOR / ARCH_FLOOR_PATCHES wet materials
        // installed by installWetFloor — otherwise brandLighting replaces them with dry non-SSR materials!
        if (['ARCH_FLOOR_SLAB', 'ARCH_DANCE_FLOOR', 'ARCH_FLOOR_PATCHES'].includes(row.name)) continue;
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
        const sourceDonor = slot.slotName === 'D109_STAIR_COATED_STEEL';
        const ref = materials[index] || slot.defaultMaterial;
        if ((!practical && !isStageGraphic && !isPlaqueFace && !darkLift && !sourceDonor) || !ref) continue;
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
    // The four VIP strips retain their own opal donor and use the same tint as their Rect lights.
    // Source DIM donor is already cooked and has no emissive texture. Leave all
    // other table lamps/bulbs at their existing .22 setting.
    const vipBase=donorMaterials.get('M_OPAL_PINK_DIM');
    if(vipBase===undefined)throw new Error('D113 cooked nontextured opal donor missing');
    vipStripMaterial=assets.copy(vipBase).unwrap();
    const vipData=assets.read(vipStripMaterial).unwrap();
    assets.update(vipStripMaterial,{values:{...vipData.values,baseColor:[.72,.77,.86,1],emissive:[...vipLight],emissiveIntensity:6.5}}).unwrap();
    created.set('vip-ceiling-strip',vipStripMaterial);
    donorMaterials.set('vip-ceiling-strip',vipStripMaterial);
    for (const row of rows) {
      const source = assets.read(row.mesh);
      if (!source.ok || source.value.kind !== 'mesh') continue;
      const original = Array.from(world.get(row.entity, MeshRenderer).unwrap().materials);
      const materials = source.value.materialSlots.map((_, index) => Number(original[index] ?? 0));
      let changed = false;
      // D095: also brighten under-soffit pendant bulbs (`FIX_SOFFIT_PENDANTS`) so the 16 soffit club lamps glow visibly
      for (const [index, slot] of source.value.materialSlots.entries()) {
        const isUpperSconce = (row.name.startsWith('WPANEL_') || row.name.startsWith('VIP_')) && slot.slotName === 'WB015_M_OPAL_PINK';
        const isSoffitPendantBulb = row.name === 'FIX_SOFFIT_PENDANTS' && slot.slotName === 'M_BULB_WARM';
        const isVipCeiling=/^VIP_[EW][12]_SHELL$/.test(row.name)&&slot.slotName==='WB015_M_OPAL_PINK_DIM';
        if(isVipCeiling)vipEmitterNames.push(row.name);
        const donor = isVipCeiling ? 'vip-ceiling-strip' : isSoffitPendantBulb ? 'M_OPAL_PINK' : isUpperSconce ? 'sconce-opal' : sharedOpalSlots.get(slot.slotName);
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
    if(vipEmitterNames.length!==4||new Set(vipEmitterNames).size!==4)throw new Error('D113 expected four scoped VIP ceiling emitters');
  } catch (error) {
    dispose();
    throw error;
  }

  const resetPlaqueGlow = () => {
    if (!plaqueFace) throw new Error('D081 cannot reset an unbound plaque');
    world.set(plaqueFace.entity,MeshRenderer,{materials:plaqueFace.materials}).unwrap();
    fixtures.mutePlaqueBounce();
  };
  const read=()=>({...fixtures.read(),vipCeilings:{names:vipEmitterNames,sourceSlot:'WB015_M_OPAL_PINK_DIM',emissiveIntensity:vipStripMaterial?assets.read(vipStripMaterial).unwrap().values?.emissiveIntensity??null:null,scope:'only four shell ceiling strips; no other DIM bulb modified'}});
  const muteVipEmission=()=>{if(vipStripMaterial){const m=assets.read(vipStripMaterial).unwrap();assets.update(vipStripMaterial,{values:{...m.values,emissiveIntensity:0}}).unwrap();}};
  const emissions = new Map<AssetHandle<'material'>,number>();
  const setPracticalEmission = (enabled: boolean) => {
    if (!enabled && !emissions.size) {
      for (const handle of created.values()) {
        const {values} = assets.read(handle).unwrap();
        if (typeof values?.emissiveIntensity !== 'number' || values.emissiveIntensity <= 0) continue;
        emissions.set(handle, values.emissiveIntensity);
        assets.update(handle, {values:{...values,emissiveIntensity:0}}).unwrap();
      }
    } else if (enabled) {
      for (const [handle,emissiveIntensity] of emissions) {
        const {values} = assets.read(handle).unwrap();
        assets.update(handle, {values:{...values,emissiveIntensity}}).unwrap();
      }
      emissions.clear();
    }
  };
  return {dispose, read, setPracticalEmission, muteVipLights:fixtures.muteVipLights,muteVipEmission,setFrontStripBaseline, muteHouseBands:fixtures.muteHouseBands, resetPlaqueGlow, materials: new Map(Array.from(created, ([key, handle]) => [key.split(':', 1)[0], handle]))};
}
