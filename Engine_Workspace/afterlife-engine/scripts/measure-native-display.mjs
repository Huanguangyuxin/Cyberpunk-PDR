// Run from the engine project: node scripts/measure-native-display.mjs http://127.0.0.1:64710
import {createRequire} from 'node:module';
import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('../node_modules/.pnpm/',import.meta.url);
const installed=(await readdir(root)).find(n=>n.startsWith('playwright-core@'));
const require=createRequire(import.meta.url);
const {chromium}=require(fileURLToPath(new URL(installed+'/node_modules/playwright-core',root)));
const base=new URL(process.argv[2]??'http://127.0.0.1:64710');
const rows=[];
function observeAttachments(){
  if(!globalThis.GPUDevice||globalThis.__nativeTargets)return;
  const targets=globalThis.__nativeTargets={};
  const create=GPUDevice.prototype.createTexture;
  GPUDevice.prototype.createTexture=function(descriptor){
    const texture=create.call(this,descriptor);
    if(['hdrp-scene-color','gbuffer-normal-roughness','scene-color','scene-depth'].includes(texture.label)){
      targets[texture.label]=[texture.width,texture.height];
    }
    return texture;
  };
}
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--enable-unsafe-webgpu']});
try{
  const cases=[
    {dpr:1,mobile:false},{dpr:2,mobile:false},
    {dpr:2,mobile:true},{dpr:2,mobile:false,large:true},
  ];
  for(const {dpr,mobile,large} of cases.filter(c=>(!process.argv.includes('--mobile-only')||c.mobile)&&(!process.argv.includes('--large-only')||c.large))){
    const lens=large?{width:1280,height:720}:mobile?{width:390,height:844}:{width:840,height:540};
    const context=await browser.newContext({viewport:lens,deviceScaleFactor:dpr,
      ...(mobile?{isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'}:{})});
    await context.addInitScript(observeAttachments);
    await context.route(/\/(?:[^/]*worker[^/]*|rhi-webgpu[^/]*|render-[^/]*|execution-bootstrap[^/]*)\.js$/,async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:'('+observeAttachments.toString()+')();\n'+await response.text()});
    });
    const page=await context.newPage();
    await page.goto(base.href,{waitUntil:'domcontentloaded'});
    await page.getByText(/碰撞：\d+\/\d+ 已就绪/).first().waitFor({timeout:180000});
    await page.locator('#forgeax-loading-title').waitFor({state:'hidden',timeout:180000});
    await page.locator('#pdr-render-toggle').click();
    const output=page.locator('[data-ui-part="render-pixels"]');
    const aa=page.locator('[data-ui-part="antialias"]');
    for(const [width,height,mode] of (large?[[1280,720,'taa'],[1920,1080,'taa'],[960,540,'taa']]:mobile?[[390,844,'taa'],[844,390,'fxaa']]:[[840,540,'taa'],[1060,640,'fxaa'],[864,600,'tsr'],[864,600,'taa']])){
      await page.setViewportSize({width,height});
      const option=aa.locator('option[value="'+mode+'"]');
      if(await option.evaluate(el=>el.disabled)){
        rows.push({mode,mobile,css:[width,height],dpr,unavailable:await option.getAttribute('title')});
        continue;
      }
      await aa.selectOption(mode);
      const until=Date.now()+35000;
      let row, aligned=false;
      do{
        await page.waitForTimeout(400);
        const targetSets=await Promise.all([page,...page.workers()].map(w=>w.evaluate(()=>globalThis.__nativeTargets??{}).catch(()=>({}))));
        const gpu=Object.assign({},...targetSets);
        const dom=await page.locator('canvas#app').evaluate(el=>({css:[el.clientWidth,el.clientHeight],backing:[el.width,el.height],dpr:devicePixelRatio}));
        const aperture=[Math.min(dom.backing[0],Math.round(dom.backing[1]*16/9)),Math.min(dom.backing[1],Math.round(dom.backing[0]*9/16))];
        const panel=await output.evaluate(el=>JSON.parse(el.dataset.pixelReport??'null'));
        const native=dom.backing[0]===width*dpr && dom.backing[1]===height*dpr;
        const matchesAperture=label=>gpu[label]?.every((v,i)=>Math.abs(v-aperture[i])<=1);
        const attachment=[['hdrp-scene-color','gbuffer-normal-roughness'],['scene-color','scene-depth']]
          .some(pair=>pair.every(matchesAperture));
        aligned=native&&attachment&&panel?.aligned===true&&panel.css.width===width&&panel.css.height===height&&await aa.inputValue()===mode;
        const ssr=page.getByLabel('屏幕空间反射（SSR）',{exact:true});
        row={mode,mobile,dom,aperture,gpu,panel,aligned,ssrActive:await ssr.isChecked(),ssrAvailable:!await ssr.isDisabled()};
      }while(!aligned && Date.now()<until);
      console.error(JSON.stringify(row));
      assert.ok(aligned,'Native GPU target mismatch');
      assert.ok(row.panel?.aligned,'HUD must report the native output');
      if(large)assert.equal(row.ssrActive,width<1280,'SSR should resume only when the native view fits its budget');
      rows.push(row);
    }
    assert.equal(await page.getByLabel('动态分辨率',{exact:true}).isDisabled(),true);
    await page.locator('#pdr-render-toggle').click();
    const canvas=page.locator('canvas#app');
    const bounds=await canvas.boundingBox();
    const pos={x:Math.floor(bounds.width*.49),y:Math.floor(bounds.height*.54)};
    const hit=await canvas.evaluate((el,p)=>el.ownerDocument.elementFromPoint(p.x,p.y)===el,pos);
    assert.equal(hit,true,'Point on the rendered canvas did not hit the canvas DOM surface');
    if(mobile)await canvas.tap({position:pos});
    else await canvas.click({position:pos});
    assert.equal(await canvas.evaluate(el=>el===el.ownerDocument.activeElement),true);
    await context.close();
  }
  console.log(JSON.stringify(rows,null,2));
}finally{await browser.close();}
