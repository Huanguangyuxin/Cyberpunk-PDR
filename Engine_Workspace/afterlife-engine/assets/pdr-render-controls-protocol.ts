export const RENDER_CONTROL_CHANNEL = 'cyberpunk/render-controls/v1';

export const LIGHT_GROUPS = {
  foyer: '入口与前厅',
  bar: '吧台',
  booths: '卡座',
  dance: '舞池',
  stage: '舞台',
  gallery: '通廊与夹层',
  vip: 'VIP 包厢',
  environment: '环境与反射',
  practicals: '装饰自发光',
  other: '其他光源',
};

export type LightGroup = keyof typeof LIGHT_GROUPS;
export const ANTIALIAS_MODES = { none: '关闭', fxaa: 'FXAA', smaa: 'SMAA', taa: 'TAA', tsr: 'TSR', msaa: 'MSAA 4×' };
export type AntialiasMode = keyof typeof ANTIALIAS_MODES;
export const CAMERA_CONTROLS = {
  exposure: {label:'曝光', min:.1, max:2, step:.01},
  temperature: {label:'白平衡（K）', min:2500, max:12000, step:50},
  tint: {label:'色调', min:-1, max:1, step:.01},
  bloomIntensity: {label:'泛光强度', min:0, max:2, step:.01},
};
export type CameraControl = keyof typeof CAMERA_CONTROLS;
export const TONEMAPS = {aces:'ACES', agx:'AgX', neutral:'Neutral', reinhard:'Reinhard', linear:'Linear', none:'关闭'};
export type Tonemap = keyof typeof TONEMAPS;
export const RENDER_SWITCHES = {
  installedFinishes: '新版墙地材质',
  shadows: '动态阴影',
  ssr: '屏幕空间反射（SSR）',
  gtao: '环境光遮蔽（GTAO）',
  bloom: '泛光（Bloom）',
  fog: '体积雾',
  fogMotion: '雾体动画',
  planar: '地面平面反射',
  contactShadows: '接触阴影',
  diffuseGi: '全局光照（GI）',
  tracedReflections: '世界空间光追反射',
  lensFlare: '镜头光晕',
  depthOfField: '景深',
  motionBlur: '运动模糊',
  autoExposure: '自动曝光',
  weightedTransparency: '加权透明混合',
  dynamicResolution: '动态分辨率',
  stereo: '并排立体视图',
  vignette: '暗角',
  chromaticAberration: '色差',
  filmGrain: '胶片颗粒',
  barrelDistortion: '镜头畸变',
};

export type RenderSwitch = keyof typeof RENDER_SWITCHES;
export interface LightStatus {
  id: string;
  name: string;
  group: LightGroup;
  enabled: boolean;
  intensity: number;
}

export interface RenderControlStatus {
  lights: LightStatus[];
  antialias: AntialiasMode;
  effects: Record<RenderSwitch, boolean>;
  hardwareRayQuery: boolean;
  giTestLightsOn: boolean;
  unavailable: Partial<Record<RenderSwitch | AntialiasMode,string>>;
  renderScale: number;
  tonemap: Tonemap;
  camera: Record<CameraControl, number>;
  fogQuality: 'low' | 'high';
  giState: string;
  notice?: string;
}

export type RenderCommand =
  | { action: 'light'; id: string; enabled: boolean }
  | { action: 'group'; id: LightGroup; enabled: boolean }
  | { action: 'all-lights'; enabled: boolean }
  | { action: 'restore-lights' }
  | { action: 'prepare-gi-test' }
  | { action: 'antialias'; mode: AntialiasMode }
  | { action: 'tonemap'; mode: Tonemap }
  | { action: 'fog-quality'; mode: 'low' | 'high' }
  | { action: 'scale'; value: number }
  | { action: 'camera'; id: CameraControl; value: number }
  | { action: 'effect'; id: RenderSwitch; enabled: boolean }
  | { action: 'restore-render' };
