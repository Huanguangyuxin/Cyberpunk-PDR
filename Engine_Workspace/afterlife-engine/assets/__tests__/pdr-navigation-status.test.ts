import {describe,it,expect} from 'vitest';
import {keyboardStatus,ENTRY,NAV_CHANNEL,type NavigationStatus} from '../pdr-navigation-status';
const ready:NavigationStatus={channel:NAV_CHANNEL,kind:'status',collisionReady:true,admitted:1834,total:1834,
  firstPerson:true,freeMove:true,focusAcknowledged:true,keyboardAllowed:true,mouseLook:false,mouseLocked:false,grounded:true,position:[...ENTRY.eye]};
describe('navigation HUD truthful readiness',()=>{
  it('cannot promise input without canvas focus, collision adoption and a current source acknowledgement',()=>{
    expect(keyboardStatus(false,ready,true)).toContain('未接收');
    expect(keyboardStatus(true,ready,false)).toContain('等待场景');
    expect(keyboardStatus(true,{...ready,collisionReady:false},true)).toContain('碰撞加载');
    expect(keyboardStatus(true,{...ready,keyboardAllowed:false},true)).toContain('等待输入同步');
    expect(keyboardStatus(true,ready,true)).toContain('已就绪');
  });
  it('explains fixed viewpoints and defines an entrance spawn at human eye height',()=>{
    expect(keyboardStatus(true,{...ready,freeMove:false},true)).toContain('按 R 回门口');
    expect(ENTRY.eye).toEqual([0,1.64,-1.1]);
  });
});
