// Rebuild the copied native package from its actual TypeScript sources.
// No string edits of distributed JS; original installed packages are untouched.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url));
const req=createRequire(resolve(root,'sdk/engine/package.json'));
const esbuild=req('esbuild');
const pkg=resolve(root,'sdk/engine/node_modules/@forgeax/engine-render');
const manifest=JSON.parse(await readFile(resolve(pkg,'package.json'),'utf8'));
const entryPoints={};
for(const value of Object.values(manifest.exports)){
 if(typeof value!=='object'||!value.import)continue;
 const key=value.import.replace(/^\.\/dist\//,'').replace(/\.mjs$/,'');
 entryPoints[key]=resolve(pkg,'src',key+'.ts');
}
const result=await esbuild.build({entryPoints,outdir:resolve(pkg,'dist'),bundle:true,splitting:true,format:'esm',
 outExtension:{'.js':'.mjs'},
 platform:'neutral',packages:'external',target:'es2022',sourcemap:true,metafile:true,
 loader:{'.wgsl':'text','.bin':'binary'},logLevel:'warning'});
const sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(resolve(root,'evidence'),{recursive:true});
await writeFile(resolve(root,'evidence/render-build.json'),JSON.stringify({classification:'Local native render package, source rebuild; not official SDK release',
 baseVersion:'0.4.18',entryPoints,sourceFiles:Object.keys(result.metafile.inputs).length,
 entrySha256:sha(await readFile(resolve(pkg,'dist/index.mjs'))),metafile:result.metafile},null,2));
console.log(JSON.stringify({ok:true,entryPoints:Object.keys(entryPoints),sourceFiles:Object.keys(result.metafile.inputs).length}));
