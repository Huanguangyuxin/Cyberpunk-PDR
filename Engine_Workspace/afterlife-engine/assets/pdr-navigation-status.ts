export const NAV_CHANNEL='cyberpunk/navigation-hud/v1';
export const ENTRY={eye:[0,1.64,-1.1] as const,yaw:0,pitch:0};
export interface NavigationStatus {
  liquidDiagnostics?:unknown;renderDiagnostics?:unknown;
  kind:'status';channel:typeof NAV_CHANNEL;collisionReady:boolean;admitted:number;total:number;
  firstPerson:boolean;freeMove:boolean;focusAcknowledged:boolean;keyboardAllowed:boolean;
  mouseLook:boolean;mouseLocked:boolean;grounded:boolean;position:number[];
}
export function keyboardStatus(focused:boolean,status:NavigationStatus|null,fresh:boolean):string {
  if(!focused)return '键盘：未接收 · 点击场景画面';
  if(!status||!fresh)return '键盘：等待场景响应';
  if(!status.collisionReady)return '键盘：暂不可移动 · 碰撞加载中';
  if(!status.firstPerson||!status.freeMove)return '键盘：已聚焦 · 固定机位，按 R 回门口';
  if(!status.focusAcknowledged||!status.keyboardAllowed)return '键盘：等待输入同步';
  return '键盘：已就绪 · WASD 可移动';
}
