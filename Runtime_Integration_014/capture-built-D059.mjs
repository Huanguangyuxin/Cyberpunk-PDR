// First-party native Engine capture only. No browser UI, DOM evaluation or input.
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const R=dirname(fileURLToPath(import.meta.url)),G=resolve(R,'../Engine_Workspace/afterlife-engine'),E=resolve(R,'evidence',process.argv[5]??'D059-baseline');await mkdir(E,{recursive:true});
const {createBrowserCapture}=await import(pathToFileURL(resolve(G,'node_modules/@forgeax/engine/node_modules/@forgeax/engine-devkit/dist/index.mjs')).href);
const view=process.argv[2]??'drinks';if(!['drinks','liquid','liquid-top','liquid-detail','liquid-light','stage','chairs','entrance'].includes(view))throw Error('Unknown scene bookmark');
const owner=createBrowserCapture(G);let session;const frames=[];
try{
 const url='http://localhost:53664/'+(view==='entrance'?'':'?view='+view+(process.argv[6]==='debug'?'&liquidDebug=1':''));
 session=await owner.open({serverUrl:url,backend:'hardware',headless:true,launchProfile:'development',width:1600,height:1000,outputDir:E});
 console.log('Native hardware owner opened '+view);
 await new Promise(r=>setTimeout(r,30000));
 const count=Number(process.argv[3]??3);for(let i=0;i<count;i++){
  const start=performance.now(),record=await session.capture(undefined,{purpose:'observe',timeoutMs:60000,output:resolve(E,`${view}-${i}.png`)}),end=performance.now();
  frames.push({startMs:start,endMs:end,midpointMs:(start+end)/2,record});console.log(JSON.stringify({view,sample:i,ok:record.ok,engineFrame:record.runtime.engineFrameId,fatal:record.runtime.fatalError}));
  if(!record.ok)break;if(i<count-1)await new Promise(r=>setTimeout(r,Number(process.argv[4]??250)));
 }
 const manifest=await readFile(resolve(G,'dist/forgeax-dist.json'));
 await writeFile(resolve(E,view+'-capture.json'),JSON.stringify({classification:'D059 real built ForgeaX hardware WebGPU, headless native owner; fixed own-app bookmark, no UI/input. Consecutive actual samples; no interpolation. Submitted frame observations with screenshot latency, NOT GPU completion benchmark.',view,url,buildManifestSha256:createHash('sha256').update(manifest).digest('hex'),frames,report:session.report()},null,2));
}finally{await session?.close();await owner.close();}
