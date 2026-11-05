import type {Plugin} from '@forgeax/engine/plugin';
import {mountUi,uiAssetContribution} from '@forgeax/engine/ui';
import {NAV_CHANNEL,keyboardStatus,type NavigationStatus} from './pdr-navigation-status';
import type {} from '@forgeax/engine/app';

const hud:Plugin.Object<{hud:string}>={name:'cyberpunk/navigation-hud',inject:['assets','gameHost'],
  async apply(ctx,config){
    const assets=ctx.assets!,host=ctx.gameHost!,root=host.uiRoot;
    if(!root)throw new Error('Navigation HUD requires presentation GameHost.uiRoot');
    const port=host.presentationPort??host.port;
    if(!port)throw new Error('Navigation HUD requires the App-owned presentation port');
    await ctx.effect(async function*(){
      const decoder=assets.installDecoder(uiAssetContribution.kind,uiAssetContribution.decoder);yield ()=>decoder.dispose();
      const loaded=await assets.load(config.hud,uiAssetContribution.kind);if(!loaded.ok)throw loaded.error;
      yield ()=>assets.release(loaded.value).unwrap();
      const mounted=mountUi(assets.read(loaded.value).unwrap(),{root,layer:60});if(!mounted.ok)throw mounted.error;
      const ui=mounted.value;yield ()=>ui.dispose();
      const document=root.ownerDocument,window=document.defaultView!;
      const canvas=host.canvas as HTMLCanvasElement;
      if(!canvas||typeof canvas.focus!=='function')throw new Error('Navigation HUD requires the presentation canvas');
      const previousTabIndex=canvas.getAttribute('tabindex');canvas.tabIndex=0;
      yield ()=>{if(previousTabIndex===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',previousTabIndex);};
      let status:NavigationStatus|null=null,lastSeen=0,lastFocus:boolean|undefined;
      // Closed native scene bookmarks; ordinary entry remains the first-person door.
      const renderDebug=new URLSearchParams(window.location.search).get('renderDebug');
      const renderReadout=renderDebug?document.createElement('pre'):null;
      if(renderReadout){renderReadout.id='pdr-render-diagnostics';renderReadout.style.cssText='position:fixed;bottom:16px;left:16px;max-width:80vw;white-space:pre-wrap;font:10px monospace;color:white;background:#10131de8;padding:8px;pointer-events:none';ui.host.shadowRoot!.append(renderReadout);}
      const requestedView=new URLSearchParams(window.location.search).get('view');
      // Source-owned, read-only diagnostics for the liquid repair view only.
      const liquidDebug=new URLSearchParams(window.location.search).get('liquidDebug')==='1';
      const liquidReadout=liquidDebug?document.createElement('pre'):null;
      if(liquidReadout){liquidReadout.id='pdr-liquid-diagnostics';liquidReadout.style.cssText='position:fixed;bottom:18px;left:18px;max-width:90vw;white-space:pre-wrap;font:11px monospace;color:#fff;background:#10131de8;padding:8px;pointer-events:none';ui.host.shadowRoot!.append(liquidReadout);}

      const bookmark=['upper-vip','lighting-transition','stage-led-front','stage-led','overlap-drinks','stage-shadow','stairs','gallery','liquid-caustic','drinks','stage','chairs','liquid','liquid-top','liquid-detail','liquid-light'].includes(requestedView??'')?requestedView:null;
      let bookmarkSent=false,renderDiagnosticSent=false;
      const part=(name:string)=>ui.host.shadowRoot!.querySelector<HTMLElement>(`[data-ui-part="${name}"]`)!;
      const keyboard=part('keyboard'),look=part('look'),collision=part('collision');
      const focused=()=>document.hasFocus()&&document.visibilityState==='visible'&&document.activeElement===canvas;
      const render=()=>{
        if(renderReadout)renderReadout.textContent='Render: '+JSON.stringify(status?.renderDiagnostics??null);
        const active=focused(),fresh=Date.now()-lastSeen<1500;
        if(liquidReadout)liquidReadout.textContent='Liquid runtime: '+JSON.stringify(status?.liquidDiagnostics??null);
        keyboard.textContent=keyboardStatus(active,status,fresh);
        look.textContent=status?.mouseLocked?'环视：鼠标已锁定':status?.mouseLook?'环视：已开启 · Esc 退出':'环视：未开启 · 点击画面';
        collision.textContent=status?`碰撞：${status.admitted}/${status.total} ${status.collisionReady?'已就绪':'加载中'}`:'碰撞：等待场景';
        if(lastFocus!==active){lastFocus=active;port.postMessage({channel:NAV_CHANNEL,kind:'focus',focused:active});}
      };
      const receive=(event:MessageEvent)=>{if(event.data?.channel!==NAV_CHANNEL||event.data.kind!=='status')return;
        status=event.data as NavigationStatus;lastSeen=Date.now();render();
        if(!renderDiagnosticSent&&['head-left-lit','head-left-clear','head-right-lit','head-right-clear','head-sweep','head-sweep-no-taa','shadow-on','shadow-off','bloom-on','bloom-off','fog-off','ssr-off','gtao-off','taa-off','bands-off','plaque-baseline'].includes(renderDebug??'')){renderDiagnosticSent=true;port.postMessage({channel:NAV_CHANNEL,kind:'render-diagnostic',mode:renderDebug});}
        if(bookmark&&!bookmarkSent){bookmarkSent=true;port.postMessage({channel:NAV_CHANNEL,kind:'bookmark',view:bookmark});}
      };
      port.addEventListener('message',receive);port.start();yield ()=>port.removeEventListener('message',receive);
      const click=(event:PointerEvent)=>{if(event.button!==0)return;canvas.focus({preventScroll:true});
        lastFocus=undefined;render();port.postMessage({channel:NAV_CHANNEL,kind:'capture',focused:focused()});};
      canvas.addEventListener('pointerdown',click);yield ()=>canvas.removeEventListener('pointerdown',click);
      const focusChange=()=>render();
      for(const event of ['focus','blur']){window.addEventListener(event,focusChange);yield ()=>window.removeEventListener(event,focusChange);}
      for(const event of ['focusin','focusout','visibilitychange']){document.addEventListener(event,focusChange);yield ()=>document.removeEventListener(event,focusChange);}
      const timer=window.setInterval(()=>{render();port.postMessage({channel:NAV_CHANNEL,kind:'inspect',liquidDiagnostics:liquidDebug});},200);
      yield ()=>window.clearInterval(timer);
      render();port.postMessage({channel:NAV_CHANNEL,kind:'inspect',liquidDiagnostics:liquidDebug});
    });
  }};
export default hud;
