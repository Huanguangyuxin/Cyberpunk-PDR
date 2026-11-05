import{readFile,writeFile}from'node:fs/promises';
import{parse,validate}from'./sdk/engine/node_modules/@forgeax/engine-naga/dist/index.mjs';
const source=(await readFile('./sdk/engine/node_modules/@forgeax/engine-shader/src/taa-resolve.wgsl','utf8')).replace(/^#define_import_path.*$/m,'');
const p=await parse(source);if(!p.ok){console.log(p.error);process.exitCode=1;}else{const v=await validate(p.value);if(v.ok){v.value.free();console.log('Naga parse/validate pass');await writeFile('evidence/D068-taa-naga.json',JSON.stringify({ok:true,subject:'Actual full native TAA WGSL, import metadata stripped for raw Naga'},null,2));}else{console.log(v.error);process.exitCode=1;}}
