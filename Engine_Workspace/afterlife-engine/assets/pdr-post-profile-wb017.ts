/**
 * WB017 post-profile — D054 native post-process tuning for the Cyberpunk PDR scene (ForgeaX 0.4.18).
 * Author/executor: WorkBuddy, model display name Claude-Opus-5.5 (UI name; API id not verified).
 *
 * PURE PARAMETER MODULE. It has no runtime import, no side effect, starts nothing and builds nothing.
 * It only uses `import type` from the public facade `@forgeax/engine/render`. The integrator (Codex, serial)
 * passes these objects to the EXISTING owners:
 *   - Camera fields               -> pdr-newlayout.pack.ts camera setup and `setArtPost` (bloom)
 *   - AmbientOcclusion (GTAO)     -> pdr-newlayout.pack.ts `world.addComponent(entity,{component:AmbientOcclusion,...})`
 *   - ScreenSpaceReflection       -> pdr-wet-floor.ts `setSSR` (both its set and addComponent branches)
 * Nothing new is added: no second tone map, no second bloom, no SSAO, no extra pass, no extra light,
 * no change to the 32 native lights, exposure, the 1600x900 internal cap, layout, upper floor or first-person control.
 *
 * Source facts behind every number (read from the installed 0.4.18 package; SHA256 in logs/read-receipt-wb017.json):
 *   - tone-mapping.wgsl `mapTone`: `whitePoint` is read only by mode 1 (reinhard-extended). With ACES (mode 4) it is inert.
 *   - ACES here is the Three r184 Hill fit, applied per channel and clamped. Very hot saturated emissive therefore drifts
 *     toward a white core. That comes from emissive strength x exposure, not from Bloom; it is NOT fixed by this module.
 *   - Bloom: linear HDR, before exposure and tone. It applies smoothstep(threshold, threshold + smoothWidth, luminance)
 *     on a half-res highpass, then composites 5 Gaussian levels with weights 1/.8/.6/.4/.2, each blended toward
 *     (1.2 - w) by `bloomRadius`. Uniform gain is about 2.936. Ranges: intensity [0,8], smoothWidth [0,1], radius [0,1].
 *     Cost is 11 passes / 11 targets whatever the values (intensity 0 is the zero-work case).
 *   - AmbientOcclusion: algorithm index ['ssao','gtao'], quality index ['low','medium','high'] -> GTAO uses
 *     12 / 24 / 36 depth candidates. `thickness` is the view-space Z rejection distance (default 1 m).
 *     `distanceExponent` is the radial sample distribution. `resolutionScale` is in [.25,1]; .5 means 1/4 of the texels.
 *     `directLightingStrength` is in [0,1]. AO multiplies ambient light and the SSR fallback only.
 *   - ScreenSpaceReflection: only maxDistance / thickness / maxRoughness are public. It runs at full internal resolution;
 *     its hit-source mask already feeds TAA reactivity (7x7).
 *   - TAA/TAAU: no public history-weight or sharpen field. `Camera.historyVersion` cuts that camera's history.
 */
import type { AmbientOcclusionData, CameraData, ScreenSpaceReflectionData } from '@forgeax/engine/render';

export const POST_PROFILE_ID = 'wb017-d054-post-v1' as const;

/** Values actually present in the current Engine source (pack SHA a5d74b08…, wet-floor in receipt). For diff / rollback only. */
export const BASELINE = {
  camera: { tonemap: 4, exposureMode: 0, exposure: 0.60, whitePoint: 4, antialias: 'TAA (existing constant)',
            bloom: 1, bloomIntensity: 0.06, bloomThreshold: 1.6, bloomSmoothWidth: 0.15, bloomRadius: 0.22 },
  gtao: { algorithm: 1, quality: 1, radius: 0.3, intensity: 0.8, directLightingStrength: 0, resolutionScale: 0.5,
          thickness: 1, distanceExponent: 1, distanceFallOff: 1, bias: 0 },
  ssr: { maxDistance: 24, thickness: 0.16, maxRoughness: 0.7 },
} as const;

/**
 * Camera: tone, exposure and AA are deliberately UNCHANGED (still ACES 4, manual exposure .60, TAA).
 * Only the four bloom shape fields change. Apply these after the existing Camera set call; do not repeat
 * `tonemap`/`exposure` writes.
 */
export const CAMERA_BLOOM = {
  bloom: 1,
  /** D085: .20 keeps strong Bloom on ceiling light bands and a soft neon halo on pillar strips while preventing secondary lights from blowing out. */
  bloomIntensity: 0.20,
  /**
   * 1.65 (scene-linear luminance, pre-exposure). Ceiling bands (linear ~4.14) cross it strongly,
   * pillar strips (linear ~2.22) get a gentle pink halo, and weakened wall sconces/step LEDs/bulbs stay below it.
   */
  bloomThreshold: 1.65,
  /**
   * .50 wide knee ramp (1.65–2.15) prevents thin emissive lines from popping in and out of bloom under TAA jitter.
   */
  bloomSmoothWidth: 0.50,
  /**
   * .34 radius spreads a soft halo around overhead light bands and pillar strips without washing out the room.
   */
  bloomRadius: 0.34,
} as const satisfies Partial<CameraData>;

/**
 * GTAO (real AMBIENT_OCCLUSION_GTAO; not SSAO). Quality and resolutionScale are unchanged, so cost is unchanged:
 * 24 candidates, half resolution.
 */
export const GTAO = {
  algorithm: 1,            // AMBIENT_OCCLUSION_ALGORITHMS[1] === 'gtao'; integrator may use the existing AMBIENT_OCCLUSION_GTAO constant.
  quality: 1,              // 'medium' = 24 depth candidates (unchanged).
  radius: 0.3,             // unchanged: covers chair legs, stool bases, booth seats and table pedestals.
  intensity: 0.8,          // unchanged raw-visibility exponent.
  /**
   * 1.0 -> .35 m. Thin occluders (rail posts, chair legs, stool poles, truss tubes) stop darkening surfaces up to 1 m
   * behind them. Main fix for dark AO halos ("contact shadows too black") without weakening true contact.
   */
  thickness: 0.35,
  /** 1 -> 1.5. Concentrates the fixed 24 candidates near the pixel: crisper contact under feet/bases, softer far lift. */
  distanceExponent: 1.5,
  distanceFallOff: 1,      // unchanged (Three r184 default).
  bias: 0,                 // unchanged; engine already compensates 12-bit octahedral normal quantisation.
  /** Kept 0: AO never darkens direct light, so neon/spot-lit areas keep their colour and contact is not crushed to black. */
  directLightingStrength: 0,
  resolutionScale: 0.5,    // unchanged: full res would be 4x AO texels/raw+filter pixels.
} as const satisfies AmbientOcclusionData;

/**
 * Screen-space reflection (screen-space only; NOT hardware ray tracing). The two ReflectionProbes stay as they are:
 * the off-screen fallback, which is also not RT.
 */
export const SSR = {
  /** Unchanged. The deep wet hall is about 22 m long (z -22..-44); stage/backdrop reflections need this reach. */
  maxDistance: 24,
  /**
   * .16 -> .10 m (Three r184 default .1). Fewer false hits behind thin objects, which smear rails, chair legs and
   * stand-up ledges into the wet floor and break reflection edges. Too thin causes holes; see verification item V3.
   */
  thickness: 0.10,
  /**
   * .7 -> .52. pdr-wet-floor.ts writes wet roughness .09–.115 and dry front-hall roughness >= .58 (D051).
   * With .52 the wet deep hall keeps SSR, while the dry front hall falls back to probe/IBL only. That keeps the front
   * hall looking dry (no blurry SSR sheen) and the SSR work done there is rejected early. Transition band z -29..-22
   * must be checked (V3).
   */
  maxRoughness: 0.52,
} as const satisfies ScreenSpaceReflectionData;

/**
 * Motion clarity with the existing TAA. On any teleport-like camera jump (R entrance reset, N stairs, bookmark /
 * view= links, 1–9 saved views), bump `Camera.historyVersion` on the jumped camera, so the first frames after the
 * jump do not blend history from the previous pose (ghost/smear). Ordinary walking/look keeps history.
 * Pure helper: returns the next value; the integrator writes it with world.set(entity, Camera, {historyVersion}).
 */
export function nextHistoryVersion(current: number): number {
  return (Math.max(0, Math.floor(current)) + 1) >>> 0;
}

/**
 * Only for MEASURED low frame rate (sustained < 10 FPS from the Engine HUD/timings, not a single screenshot).
 * Apply one tier at a time, cheapest visual loss first. Never disable all effects at once; tone map and TAA always stay.
 */
export const LOW_FPS_TIERS = [
  { id: 'T1', why: 'SSR is full internal resolution; shorter rays cut trace steps, wet-floor near reflections stay',
    ssr: { maxDistance: 16 } },
  { id: 'T2', why: 'GTAO medium->low: 24 -> 12 depth candidates at the same half resolution; contact stays, AO gets noisier',
    gtao: { quality: 0 } },
  { id: 'T3', why: 'GTAO resolution .5 -> .35 (about half the AO texels of .5); expect softer silhouettes',
    gtao: { resolutionScale: 0.35 } },
] as const;

export interface ProfileIssue { readonly field: string; readonly value: number; readonly expected: string }

/** Range check against the documented 0.4.18 contracts. Pure; returns issues instead of throwing. */
export function validatePostProfile(
  cam: Partial<CameraData> = CAMERA_BLOOM,
  ao: AmbientOcclusionData = GTAO,
  ssr: ScreenSpaceReflectionData = SSR,
): ProfileIssue[] {
  const out: ProfileIssue[] = [];
  const req = (field: string, v: number | undefined, ok: (x: number) => boolean, expected: string) => {
    if (v === undefined) return;
    if (!Number.isFinite(v) || !ok(v)) out.push({ field, value: v, expected });
  };
  req('camera.bloomIntensity', cam.bloomIntensity, x => x >= 0 && x <= 8, '[0,8]');
  req('camera.bloomThreshold', cam.bloomThreshold, x => x >= 0 && x <= 65504, '[0,65504]');
  req('camera.bloomSmoothWidth', cam.bloomSmoothWidth, x => x >= 0 && x <= 1, '[0,1]');
  req('camera.bloomRadius', cam.bloomRadius, x => x >= 0 && x <= 1, '[0,1]');
  req('gtao.algorithm', ao.algorithm, x => x === 1, '1 (gtao); 0 would be SSAO and is not allowed here');
  req('gtao.quality', ao.quality, x => x === 0 || x === 1 || x === 2, '0|1|2');
  req('gtao.radius', ao.radius, x => x > 0, '> 0');
  req('gtao.bias', ao.bias, x => x >= 0, '>= 0');
  req('gtao.intensity', ao.intensity, x => x >= 0, '>= 0');
  req('gtao.thickness', ao.thickness, x => x > 0, '> 0');
  req('gtao.distanceExponent', ao.distanceExponent, x => x >= 0, '>= 0');
  req('gtao.distanceFallOff', ao.distanceFallOff, x => x >= 0 && x <= 1, '[0,1]');
  req('gtao.resolutionScale', ao.resolutionScale, x => x >= 0.25 && x <= 1, '[0.25,1]');
  req('gtao.directLightingStrength', ao.directLightingStrength, x => x >= 0 && x <= 1, '[0,1]');
  req('ssr.maxDistance', ssr.maxDistance, x => x > 0, '> 0 (engine also checks against camera view range)');
  req('ssr.thickness', ssr.thickness, x => x > 0, '> 0');
  req('ssr.maxRoughness', ssr.maxRoughness, x => x >= 0 && x <= 1, '[0,1]');
  return out;
}

/**
 * What must be observed in REAL Engine frames after integration. Nothing here has been run; every item is 待验证 (unverified).
 * Same build, same saved views; still and short motion. These are what to look at, not an extra report loop.
 */
export const VERIFY_AFTER_INTEGRATION = [
  { id: 'V1', where: 'view=stage, entrance', look: 'neon/bar emitters keep a pink/violet hue band around the core; halos hug the tube shape; lit floor pools do not glow' },
  { id: 'V2', where: 'view=chairs, bar stools, booths', look: 'contact darkening under legs/bases visible but not black; no dark ring behind thin rails or chair legs' },
  { id: 'V3', where: 'deep hall floor z -44..-22 and transition z -29..-22', look: 'wet reflections continuous, rail/chair reflections not smeared; no hard SSR cut line in the transition; front hall reads dry' },
  { id: 'V4', where: 'walk + mouse-look, R / view= jump', look: 'no ghost after a jump; thin rails/truss do not shimmer more than before; HUD FPS >= 10 sustained' },
] as const;
