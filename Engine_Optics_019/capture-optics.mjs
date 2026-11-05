// First-party Engine hardware observation of the isolated native runtime.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url)),game=resolve(root,'game');
const view=process.argv[2]??'drinks';
if(!['drinks','liquid-light','liquid-top','liquid-caustic','upper-vip','lighting-transition','entrance','stage','chairs','stage-shadow','stairs','gallery','stage-led-front','stage-led','overlap-drinks'].includes(view))throw Error('Closed optics view required');
const debug=process.argv[5]??'';if(debug&&!['head-left-lit','head-left-clear','head-right-lit','head-right-clear','head-sweep','head-sweep-no-taa','shadow-on','shadow-off','bloom-on','bloom-off','read','fog-off','ssr-off','gtao-off','taa-off','bands-off','plaque-baseline'].includes(debug))throw Error('Closed render diagnostic only');
const baseUrl=process.env.PDR_CAPTURE_BASE_URL??'http://localhost:53665/';
const distDir=process.env.PDR_CAPTURE_DIST_DIR??'dist';
const count=Number(process.argv[3]??2),out=resolve(root,'evidence',process.argv[4]??'native-layered');await mkdir(out,{recursive:true});
const {createBrowserCapture}=await import(pathToFileURL(resolve(root,'sdk/engine/node_modules/@forgeax/engine-devkit/dist/index.mjs')).href);
const owner=createBrowserCapture(game);let session;const frames=[];
try{
 const url=baseUrl+(view==='entrance'?'':'?view='+view)+(debug?(view==='entrance'?'?':'&')+'renderDebug='+debug:'');
 session=await owner.open({serverUrl:url,backend:'hardware',headless:true,launchProfile:'development',width:1600,height:1000,outputDir:out});
 console.log('Isolated native optics owner opened '+view);
 await new Promise(r=>setTimeout(r,30000));
 // A first capture can report native frame readiness before the loading DOM
 // has retired. Keep bounded warm-up evidence and require actual scene frames.
 for(let w=0;w<9;w++){
  const warm=await session.capture(undefined,{purpose:'observe',timeoutMs:60000,output:resolve(out,'warmup-'+w+'.png')});
  console.log(JSON.stringify({warmup:w,ok:warm.ok,frame:warm.runtime.engineFrameId,fatal:warm.runtime.fatalError}));
  if(warm.runtime.fatalError)throw Error(warm.runtime.fatalError);
  if((warm.runtime.engineFrameId??0)>100)break;
  if(w===8)throw Error('Scene failed to advance past warm-up within bounded observation');
  await new Promise(r=>setTimeout(r,10000));
 }
 for(let i=0;i<count;i++){
  const record=await session.capture(undefined,{purpose:'observe',timeoutMs:60000,output:resolve(out,view+'-'+i+'.png')});
  frames.push(record);console.log(JSON.stringify({i,ok:record.ok,frame:record.runtime.engineFrameId,fatal:record.runtime.fatalError}));
  if(!record.ok)break;
  if(i+1<count)await new Promise(r=>setTimeout(r,1400));
 }
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 await writeFile(resolve(out,view+'-receipt.json'),JSON.stringify({classification:'Actual isolated ForgeaX0.4.18 native-source extension; NOT original SDK or official new release; no UI/input',
  url,buildManifestSha256:sha(await readFile(resolve(game,distDir,'forgeax-dist.json'))),
  nativeRenderEntrySha256:sha(await readFile(resolve(root,'sdk/engine/node_modules/@forgeax/engine-render/dist/index.mjs'))),frames,report:session.report()},null,2));
}finally{await session?.close();await owner.close();}
