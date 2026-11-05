// Use the same official single-HTML owner on the frozen, already-built dist.
// No recook, game-source changes, runtime replacements, or handwritten HTML.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundleSingleHtmlEntry,writeSingleHtml} from './tooling/devkit-single-html-fix/dist/index.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const game=resolve(root,'../Engine_Workspace/afterlife-engine');
const dist=resolve(game,'dist');
const manifest=JSON.parse(await readFile(resolve(dist,'forgeax-dist.json'),'utf8'));
const bundle=await bundleSingleHtmlEntry(dist,await readFile(resolve(dist,'index.html'),'utf8'),game);
if(!bundle.ok)throw new Error(JSON.stringify(bundle.error));
const result=await writeSingleHtml({distRoot:dist,manifest,bundle:bundle.value,output:resolve(root,'../Deliverables/Cyberpunk-PDR.html')});
await writeFile(resolve(root,'evidence/D057-package.json'),JSON.stringify({api:'official DevKit bundleSingleHtmlEntry + writeSingleHtml',frozenDistReused:true,...result},null,2));
if(!result.ok)throw new Error(JSON.stringify(result.error));
console.log(JSON.stringify(result.value.html));
