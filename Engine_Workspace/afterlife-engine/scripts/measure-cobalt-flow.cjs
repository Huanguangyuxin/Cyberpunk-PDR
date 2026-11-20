// Run from the engine workspace with the production preview already serving.
// node scripts/measure-cobalt-flow.cjs 64725 /path/to/evidence
const fs = require('node:fs');
const path = require('node:path');
const deps = path.resolve('node_modules/.pnpm');
const pw = fs.readdirSync(deps).find(entry => entry.startsWith('playwright-core@'));
const { chromium } = require(path.join(deps, pw, 'node_modules/playwright-core'));
const [port = '64725', output = '.'] = process.argv.slice(2);

async function measure() {
  const browser = await chromium.launch({channel:'chrome', headless:false, args:['--enable-unsafe-webgpu']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
    const errors = [];
    function countPresentedTextures(){
      if(!globalThis.GPUCanvasContext||globalThis.__cobaltFrames!==undefined)return;
      globalThis.__cobaltFrames=0;
      const original=GPUCanvasContext.prototype.getCurrentTexture;
      let last;
      GPUCanvasContext.prototype.getCurrentTexture=function(){
        const current=original.call(this);
        if(current!==last){last=current;globalThis.__cobaltFrames++;}
        return current;
      };
    }
    await page.context().addInitScript(countPresentedTextures);
    await page.context().route(/\/(?:[^/]*worker[^/]*|rhi-webgpu[^/]*|render-[^/]*|execution-bootstrap[^/]*)\.js$/,async r=>{
      const response=await r.fetch();
      await r.fulfill({response,body:'('+countPresentedTextures.toString()+')();\n'+await response.text()});
    });
    const frameCount=async()=>Math.max(...await Promise.all([page,...page.workers()].map(h=>h.evaluate(()=>globalThis.__cobaltFrames??0).catch(()=>0))));

    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.context().route(/program-group-.*\.js$/, async route => {
      const response = await route.fetch();
      const source = await response.text();
      const exposed = source.replace(/(\.insertResource\((?:`cyberpunk\.scale\.calibration`|"cyberpunk\.scale\.calibration"),)(\{inspectAsset)/, '$1globalThis.__cobaltProbe=$2');
      // The first cavity build exposes visibility diagnostics on GLB nodes
      // without a pre-existing Visibility component. Equivalent to the source
      // fix: lazily create the component solely when the test removes a layer.
      const body = exposed.replace(
        'e.set(r.entity,W,{state:n?G.inherited:G.hidden}).unwrap()},setPhase:',
        'e.get(r.entity,W).ok?e.set(r.entity,W,{state:n?G.inherited:G.hidden}).unwrap():e.addComponent(r.entity,{component:W,data:{state:n?G.inherited:G.hidden}}).unwrap()},setPhase:'
      );
      await route.fulfill({response, body});
    });
    await page.goto('http://localhost:'+port+'/?view=bar-folded-end',{waitUntil:'domcontentloaded'});
    const hud = page.getByText(/碰撞：\d+\/\d+ 已就绪/).first();
    const collision = await hud.textContent({timeout:160000});
    await page.locator('#forgeax-loading-title').waitFor({state:'hidden',timeout:160000});
    await hud.evaluate(element => element.getRootNode().host.style.visibility = 'hidden');
    let host;
    for (const context of [page,...page.workers()]) {
      if (await context.evaluate(() => !!globalThis.__cobaltProbe).catch(()=>false)) {host=context;break;}
    }
    if (!host) throw Error('Missing scene diagnostics');
    const initial = await host.evaluate(() => {
      globalThis.__cobaltProbe.inspectAsset([8.91,.79,-8.55],[10.10,.61,-8.62]);
      return globalThis.__cobaltProbe.readCobaltFlow();
    });
    if (!initial.active || initial.bays !== 12 || initial.layers?.length !== 3 || new Set(initial.layers.map(l=>l.material)).size!==3) throw Error('Eight-panel surface inactive');
    const frames = [];
    for (const phase of [0,.08,.16,0]) {
      await host.evaluate(time => globalThis.__cobaltProbe.setCobaltFlowPhase(time),phase);
      await page.waitForTimeout(1100);
      frames.push((await page.screenshot()).toString('base64'));
    }
    // Compare each optical layer against the completed case at phase zero.
    for (const which of ['cover', 'water']) {
      await host.evaluate(which=>globalThis.__cobaltProbe.setCobaltLayerVisible(which,false),which);
      await page.waitForTimeout(1100);
      frames.push((await page.screenshot()).toString('base64'));
      await host.evaluate(which=>globalThis.__cobaltProbe.setCobaltLayerVisible(which,true),which);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(700);
    frames.push((await page.screenshot()).toString('base64'));
    await host.evaluate(()=>globalThis.__cobaltProbe.inspectAsset([9.57,.84,-5.1],[9.99,.60,-7.46]));
    for(const visible of [true,true,false,true]){
      await host.evaluate(visible=>globalThis.__cobaltProbe.setCobaltLayerVisible('cover',visible),visible);
      await page.waitForTimeout(1500);
      frames.push((await page.screenshot()).toString('base64'));
    }
    await host.evaluate(() => globalThis.__cobaltProbe.setCobaltFlowPhase(null));
    const regions = await page.evaluate(async input => {
      const images = await Promise.all(input.map(async data => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + data;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width=image.width; canvas.height=image.height;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(image,0,0);
        return ctx.getImageData(0,0,image.width,image.height);
      }));
      const result={};
      for(const [name,[left,top,right,bottom]] of Object.entries({glass:[754,170,951,642],counter:[665,12,1045,44]})){
        const distances=[0,0,0,0,0];
        const waterRgb=[0,0,0],coverRgb=[0,0,0];
        for(let y=top; y<bottom; ++y) for(let x=left;x<right;++x){
          const i=(y*images[0].width+x)*4;
          for(let c=0;c<3;c++){waterRgb[c]+=images[3].data[i+c]-images[5].data[i+c];coverRgb[c]+=images[3].data[i+c]-images[4].data[i+c];}
          for(let k=0;k<distances.length;++k) for(let c=0;c<3;++c) distances[k]+=Math.abs(images[0].data[i+c]-images[k+2].data[i+c]);
        }
        const samples=(right-left)*(bottom-top)*3;
        result[name]={roi:[left,top,right,bottom],phaseDifference:distances[0]/samples,repeatNoise:distances[1]/samples,withoutClearCover:distances[2]/samples,withoutWater:distances[3]/samples,restored:distances[4]/samples,waterSignedRGB:waterRgb.map(v=>v*3/samples),coverSignedRGB:coverRgb.map(v=>v*3/samples)};
      }
      // The fixed camera is upright. A positive best shift means the moving
      // light travels downward between the successive one-second intervals.
      const scores=[];
      for(let shift=-64;shift<=64;++shift) {
        let xy=0,xx=0,yy=0;
        for(let y=237;y<575;y+=2) for(let x=756;x<950;x+=2) {
          const offset=(y*images[0].width+x)*4+2;
          const dest=offset+shift*images[0].width*4;
          const first=images[1].data[offset]-images[0].data[offset];
          const next=images[2].data[dest]-images[1].data[dest];
          xy+=first*next; xx+=first*first; yy+=next*next;
        }
        scores.push({pixelsDownPerSecond:shift/.08,displacementPx:shift,intervalSeconds:.08,correlation:xy/Math.sqrt(Math.max(1,xx*yy))});
      }
      // Oblique cross-aisle view toward the fascia: a low-iron cover should
      // show little face-on reflection but a marked change at grazing angles.
      const sums=[0,0,0], count=1100*610*3;
      for(let y=100;y<710;++y)for(let x=130;x<1230;++x){
        const off=(y*images[7].width+x)*4;
        for(let k=0;k<3;++k)for(let c=0;c<3;++c)sums[k]+=Math.abs(images[8].data[off+c]-images[[7,9,10][k]].data[off+c]);
      }
      result.grazingCover={roi:[130,100,1230,710],repeatNoise:sums[0]/count,withoutCover:sums[1]/count,restored:sums[2]/count};
      result.verticalTravel=scores.reduce((a,b)=>a.correlation>b.correlation?a:b);
      return result;
    }, frames);
    // A frozen/running pair uses the same actual ForgeaX camera and light state.
    await host.evaluate(()=>globalThis.__cobaltProbe.setCobaltFlowPhase(0));
    await page.waitForTimeout(250);
    const frozenStart=await frameCount(),frozenWall=Date.now();
    await page.waitForTimeout(2500);
    const frozenFps=(await frameCount()-frozenStart)*1000/(Date.now()-frozenWall);
    await host.evaluate(()=>globalThis.__cobaltProbe.setCobaltFlowPhase(null));
    const nativeStart=await frameCount();
    const running=await host.evaluate(()=>globalThis.__cobaltProbe.readCobaltFlow());
    const started=Date.now();
    await page.waitForTimeout(2200);
    const resume = await host.evaluate(() => globalThis.__cobaltProbe.readCobaltFlow());
    const meshPlayback={updates:resume.updates-running.updates,wallSeconds:(Date.now()-started)/1000,
      engineSeconds:resume.timeSeconds-running.timeSeconds,frozenPresentedFps:frozenFps,animatedPresentedFps:(await frameCount()-nativeStart)*1000/(Date.now()-started),vertices:resume.vertices,ribbons:resume.ribbons};

    const report={port,collision,initial,resume,regions,meshPlayback,errors};
    fs.mkdirSync(output,{recursive:true});
    for (const [i,name] of [[3,'三层完整'],[4,'诊断移开透明外壁'],[5,'诊断移开内水层'],[8,'掠射完整玻璃'],[9,'掠射移开玻璃'],[10,'掠射复原玻璃']]) fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(frames[i],'base64'));
    fs.writeFileSync(path.join(output,'水光相位实测.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
    if (errors.length || regions.glass.phaseDifference <= regions.glass.repeatNoise + .15) process.exitCode=1;
  } finally { await browser.close(); }
}

measure().catch(error => {console.error(error);process.exitCode=1;});
