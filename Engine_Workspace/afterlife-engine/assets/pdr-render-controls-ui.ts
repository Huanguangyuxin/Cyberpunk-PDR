import {boundedDisplayPixels} from './pdr-native-resolution';
import {
  ANTIALIAS_MODES, CAMERA_CONTROLS, LIGHT_GROUPS, RENDER_CONTROL_CHANNEL, RENDER_SWITCHES, TONEMAPS,
  type AntialiasMode, type CameraControl, type RenderCommand, type RenderControlStatus, type RenderSwitch, type Tonemap,
} from './pdr-render-controls-protocol';

export function bindRenderControls(root: ShadowRoot, port: MessagePort) {
  const document = root.ownerDocument;
  const toggle = root.querySelector<HTMLButtonElement>('#pdr-render-toggle')!;
  const panel = root.querySelector<HTMLElement>('#pdr-render-panel')!;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', panel.id);
  const part = <T extends HTMLElement>(name: string) => panel.querySelector<T>(`[data-ui-part="${name}"]`)!;
  const status = part('render-status');
  const antialias = part<HTMLSelectElement>('antialias');
  const pixelReadout=part<HTMLOutputElement>('render-pixels');
  const tonemap = part<HTMLSelectElement>('tonemap');
  const fogQuality = part<HTMLSelectElement>('fog-quality');
  const rayStatus = part('ray-status');
  const options = part<HTMLFieldSetElement>('render-options');
  const lightActions = part<HTMLFieldSetElement>('light-actions');
  const groups = part('light-groups');
  const effectInputs = new Map<RenderSwitch, HTMLInputElement>();
  const lightInputs = new Map<string, HTMLInputElement>();
  const counts = new Map<string, HTMLElement>();
  const sliders = new Map<CameraControl, {input:HTMLInputElement; output:HTMLOutputElement}>();
  const primary = new Set<RenderSwitch>(['installedFinishes','shadows','ssr','gtao','bloom','fog','lensFlare','planar']);

  function button(label: string, callback: () => void) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', callback);
    return element;
  }

  function checkbox(parent: HTMLElement, text: string) {
    const label = document.createElement('label');
    label.className = 'render-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    label.append(input, document.createTextNode(text));
    parent.append(label);
    return input;
  }

  const send = (command: RenderCommand) => port.postMessage({channel: RENDER_CONTROL_CHANNEL, kind: 'command', ...command});
  for (const [id, name] of Object.entries(RENDER_SWITCHES) as [RenderSwitch, string][]) {
    const input = checkbox(part(primary.has(id)?'effects':'advanced-effects'), name);
    input.addEventListener('change', () => send({action: 'effect', id, enabled: input.checked}));
    effectInputs.set(id, input);
  }
  const fillSelect = (select:HTMLSelectElement, choices:Record<string,string>) => {
    for(const [value,label] of Object.entries(choices)){
      const option=document.createElement('option');option.value=value;option.textContent=label;
      select.append(option);
    }
  };
  fillSelect(antialias,ANTIALIAS_MODES);fillSelect(tonemap,TONEMAPS);
  for(const [id,range] of Object.entries(CAMERA_CONTROLS) as [CameraControl,(typeof CAMERA_CONTROLS)[CameraControl]][]){
    const label=document.createElement('label'),input=document.createElement('input'),output=document.createElement('output');
    input.type='range';input.min=String(range.min);input.max=String(range.max);input.step=String(range.step);
    input.addEventListener('input',()=>{output.value=input.value;});
    input.addEventListener('change',()=>send({action:'camera',id,value:input.valueAsNumber}));
    label.append(document.createTextNode(range.label),input,output);
    part('camera-controls').append(label);
    sliders.set(id,{input,output});
  }
  const onAntialias = () => send({action: 'antialias', mode: antialias.value as AntialiasMode});
  antialias.addEventListener('change', onAntialias);
  tonemap.addEventListener('change',()=>send({action:'tonemap',mode:tonemap.value as Tonemap}));
  fogQuality.addEventListener('change',()=>send({action:'fog-quality',mode:fogQuality.value==='low'?'low':'high'}));
  part('restore-render').append(button('恢复画质默认', () => send({action: 'restore-render'})));
  lightActions.append(
    button('全部关闭', () => send({action: 'all-lights', enabled: false})),
    button('全部开启', () => send({action: 'all-lights', enabled: true})),
    button('恢复灯光默认', () => send({action: 'restore-lights'})),
  );

  const prepareGi = button('暂停面光源和补光以测试 GI / 光追', () => send({action:'prepare-gi-test'}));
  rayStatus.after(prepareGi);

  function createGroups(lights: RenderControlStatus['lights']) {
    for (const id of Object.keys(LIGHT_GROUPS) as (keyof typeof LIGHT_GROUPS)[]) {
      const members = lights.filter(light => light.group === id);
      if (!members.length) continue;
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      const count = document.createElement('span');
      count.className = 'render-group-count';
      summary.append(document.createTextNode(LIGHT_GROUPS[id]), count);
      counts.set(id, count);
      const actions = document.createElement('div');
      actions.className = 'render-actions';
      actions.append(
        button('本区全开', () => send({action: 'group', id, enabled: true})),
        button('本区全关', () => send({action: 'group', id, enabled: false})),
      );
      details.append(summary, actions);
      for (const light of members) {
        const input = checkbox(details, light.name);
        input.addEventListener('change', () => send({action: 'light', id: light.id, enabled: input.checked}));
        lightInputs.set(light.id, input);
      }
      groups.append(details);
    }
  }

  const receive = ({data}: MessageEvent) => {
    if (data?.channel !== RENDER_CONTROL_CHANNEL || data.kind !== 'status') return;
    const state: RenderControlStatus = data.state;
    if (!lightInputs.size) createGroups(state.lights);
    for (const light of state.lights) lightInputs.get(light.id)!.checked = light.enabled;
    for (const [id, count] of counts) {
      const members = state.lights.filter(light => light.group === id);
      count.textContent = ` ${members.filter(light => light.enabled).length}/${members.length}`;
    }
    const text = `灯光 ${state.lights.filter(light => light.enabled).length}/${state.lights.length} 开启`;
    if (status.textContent !== text) status.textContent = text;
    antialias.value = state.antialias;
    for(const option of antialias.options){
      const reason=state.unavailable[option.value as AntialiasMode];
      option.disabled=Boolean(reason);option.title=reason??'';
    }
    for (const [id, input] of effectInputs) {
      input.checked = state.effects[id];
      input.disabled = Boolean(state.unavailable[id])&&!input.checked;
      input.title = state.unavailable[id]??'';
      input.parentElement!.title=input.title;
    }
    const canvas=document.querySelector('canvas#app');
    const view=state.pixels;
    if(canvas instanceof HTMLCanvasElement && view){
      const bounds=canvas.getBoundingClientRect(),dpr=document.defaultView?.devicePixelRatio??1;
      const css={width:canvas.clientWidth,height:canvas.clientHeight};
      const goal=boundedDisplayPixels(css,dpr,view.maxDimension||Infinity);
      const width=Math.min(goal.width,Math.round(goal.height*16/9));
      const height=Math.min(goal.height,Math.round(goal.width*9/16));
      const matches=!view.separateEyes && Math.abs(view.internalWidth-width)<=1 && Math.abs(view.internalHeight-height)<=1;
      const reason=view.separateEyes?'双眼分屏':matches?(view.source==='camera'?'画布像素已对齐':'原生像素已对齐'):'当前像素与显示目标不一致';
      const label={attachment:'GPU 目标',view:'视图输出',camera:'相机请求'}[view.source];
      const limited=view.maxDimension>0 && Math.max(css.width,css.height)*dpr>view.maxDimension;
      pixelReadout.textContent=`显示 ${Math.round(bounds.width)}×${Math.round(bounds.height)} CSS · DPR ${dpr} · 目标 ${width}×${height} · ${label} ${view.internalWidth}×${view.internalHeight} · ${reason}${limited?'（GPU 纹理边长上限 '+view.maxDimension+'）':''}`;
      pixelReadout.dataset.pixelReport=JSON.stringify({css,dpr,goal,actual:view,aligned:matches});
    }else{pixelReadout.textContent='等待渲染尺寸';}
    tonemap.value=state.tonemap;fogQuality.value=state.fogQuality;
    for(const [id,{input,output}] of sliders){
      if(root.activeElement===input&&input.matches(':active'))continue;
      input.value=String(state.camera[id]);output.value=input.value;
    }
    const ray = state.hardwareRayQuery?'GPU 支持硬件光线查询':'当前后端不支持硬件光线查询，世界空间光追使用引擎回退路径';
    rayStatus.textContent=[ray,state.giState,state.notice].filter(Boolean).join(' · ');
    prepareGi.disabled=!state.giTestLightsOn;
    options.disabled = lightActions.disabled = false;
  };
  port.addEventListener('message', receive);
  const timer=document.defaultView!.setInterval(()=>{
    if(!panel.hidden)port.postMessage({channel:RENDER_CONTROL_CHANNEL,kind:'request'});
  },900);

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (document.pointerLockElement) document.exitPointerLock();
      port.postMessage({channel: RENDER_CONTROL_CHANNEL, kind: 'request'});
    }
    toggle.focus({preventScroll: true});
  };
  const onToggle = () => setOpen(panel.hasAttribute('hidden'));
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || panel.hidden) return;
    event.stopPropagation();
    setOpen(false);
  };
  toggle.addEventListener('click', onToggle);
  root.addEventListener('keydown', onKey as EventListener);
  return () => {
    document.defaultView!.clearInterval(timer);
    port.removeEventListener('message', receive);
    toggle.removeEventListener('click', onToggle);
    root.removeEventListener('keydown', onKey as EventListener);
    antialias.removeEventListener('change', onAntialias);
  };
}
