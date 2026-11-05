// Local, reversible repair of the official single-html owner. No game/SDK writes.
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=dirname(fileURLToPath(import.meta.url));
let source=await readFile(resolve(root,'single-html.fixed.ts'),'utf8');
const system=await readFile(resolve(root,'vendor/package/dist/s.min.js'),'utf8');
const license=await readFile(resolve(root,'vendor/package/LICENSE'),'utf8');
const systemSource=`/* SystemJS 6.15.1 — ${license.replaceAll('*/','* /')} */\n${system}`;
function replaceFunction(text,name,replacement){
 const ast=ts.createSourceFile('owner.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
 if(!node)throw Error(`Missing owner function ${name}`);
 return text.slice(0,node.getStart(ast))+replacement+text.slice(node.end);
}
const bundle=`export async function bundleSingleHtmlEntry(distRootInput: string,indexHtml: string,projectRoot?: string): Promise<CommandResult<SingleHtmlBundle>> {
  const selected=collectEntrySource(indexHtml); if(!selected.ok)return selected;
  const entryPath=normalizePath(selected.value);
  if(entryPath!==undefined){
    try {if((await stat(resolve(distRootInput,entryPath))).isFile())return {ok:true,value:{entrySource:'await globalThis.__forgeaxImport('+JSON.stringify(entryPath)+');',artifacts:[]}};}catch{}
  }
  const path=GENERATED_PREFIX+'inline-entry.mjs';
  return {ok:true,value:{entrySource:'await globalThis.__forgeaxImport('+JSON.stringify(path)+');',artifacts:[{path,mediaType:'text/javascript',bytes:Buffer.from(selected.value)}]}};
}`;
source=replaceFunction(source,'bundleSingleHtmlEntry',bundle);
// A logical dist path is now one registered module per realm, rather than a
// separate closed bundle per import/Worker URL. Preserve live bindings and TLA.
const helper=`const _singleHtmlSystemSource = ${JSON.stringify(systemSource)};
function registerSingleHtmlModules(resources: readonly SingleHtmlBundleArtifact[]): SingleHtmlBundleArtifact[] {
 return resources.map(resource=>{
  if(!/\\.(?:m?js|cjs)$/i.test(resource.path))return resource;
  const result=ts.transpileModule(Buffer.from(resource.bytes).toString('utf8'),{fileName:resource.path,compilerOptions:{module:ts.ModuleKind.System,target:ts.ScriptTarget.ESNext,moduleDetection:ts.ModuleDetectionKind.Force,ignoreDeprecations:"6.0",sourceMap:false,removeComments:false},reportDiagnostics:true});
  const errors=result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[];
  if(errors.length)throw new Error('single-html module conversion failed: '+resource.path+' '+errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
  return {...resource,bytes:Buffer.from(result.outputText),mediaType:'text/javascript'};
 });
}
`;
if(!source.includes('const _singleHtmlSystemSource ='))source=source.replace('function workerBootstrapSource(): string {',helper+'\nfunction workerBootstrapSource(): string {');
// Replace native import of independently bundled Blob graphs with SystemJS's
// standard linked-module registry, with all IO still in the official asset table.
source=source.replace("const importURLs=new Map();\nglobalThis.__forgeaxImport=async(value)=>{const loaded=await load(value,'import');if(loaded.native)return import(loaded.url);let url=importURLs.get(loaded.path);if(url===undefined){url=nativeURL.createObjectURL(new Blob([loaded.data],{type:loaded.mime||'text/javascript'}));importURLs.set(loaded.path,url);}return import(url);};",`const resourcePaths=init.resourcePaths??[];
const canonical=(path)=>{const normalized=withoutBundle(path);const exact=resourcePaths.find(p=>p===path||withoutBundle(p)===normalized);if(exact!==undefined)return exact;const suffix=resourcePaths.filter(p=>normalized.endsWith('/'+withoutBundle(p)));if(suffix.length===1)return suffix[0];const name=normalized.slice(normalized.lastIndexOf('/')+1);const matches=resourcePaths.filter(p=>p.slice(p.lastIndexOf('/')+1)===name);if(matches.length===1)return matches[0];throw new TypeError('single-html unresolved module '+path);};
(0,eval)(\${JSON.stringify(_singleHtmlSystemSource)});
const modules=globalThis.System;
modules.resolve=(value,parent)=>{const raw=String(value);const url=new nativeURL(raw,parent||'forgeax-resource:///'+sourcePath);const resolved=resolveInput(url);if(resolved.kind!=='resource')throw new TypeError('single-html external module blocked '+raw);return 'forgeax-resource:///'+canonical(resolved.path);};
modules.instantiate=async(id)=>{const loaded=await load(id,'import');(0,eval)(new TextDecoder().decode(loaded.data));const registration=modules.getRegister();if(!registration)throw new TypeError('single-html module did not register '+id);return registration;};
globalThis.__forgeaxImport=(value)=>modules.import(String(value),'forgeax-resource:///'+sourcePath);`);
source=source.replace('sourcePath:resolved.path,bootstrapURL,sourceOrigin}}','sourcePath:canonical(resolved.path),bootstrapURL,sourceOrigin,resourcePaths}}');
source=source.replace("const source=await load(sourcePath,'worker');const sourceURL=nativeURL.createObjectURL(new Blob([source.data],{type:source.mime||'text/javascript'}));try{await import(sourceURL);}finally{nativeURL.revokeObjectURL(sourceURL);}","await modules.import('forgeax-resource:///'+canonical(sourcePath));");
const mainStart=source.indexOf('  const importUrls = new Map();',source.indexOf('function runtimeBootstrap'));
const mainEnd=source.indexOf('  const external = ',mainStart);
if(mainStart<0||mainEnd<0)throw Error('Missing original main import owner');
source=source.slice(0,mainStart)+`  (0,eval)(\${JSON.stringify(_singleHtmlSystemSource)});
  const modules=globalThis.System;
  modules.resolve=(specifier,parent)=>{const url=new nativeURL(String(specifier),parent||document.baseURI);const entry=lookup(url);if(entry===undefined){noteMiss('import',specifier);throw new TypeError('single-html module missing '+specifier);}return 'forgeax-resource:///'+entry.path;};
  modules.instantiate=async(id)=>{const entry=lookup(id);if(entry===undefined)throw new TypeError('single-html module missing '+id);resourceHits+=1;(0,eval)(new TextDecoder().decode(await decode(entry)));const registration=modules.getRegister();if(!registration)throw new TypeError('single-html module did not register '+id);return registration;};
  globalThis.__forgeaxImport=(specifier)=>modules.import(String(specifier),document.baseURI);
`+source.slice(mainEnd);
source=source.replace('sourceOrigin: document.location.origin }','sourceOrigin: document.location.origin, resourcePaths: entries.map(e=>e.path) }');
const closeStart=source.indexOf('    const closed = await closeStaticJavaScriptGraphs(',source.indexOf('export async function writeSingleHtml'));
const buildStart=source.indexOf('    const built = buildHtml(',closeStart);
if(closeStart<0||buildStart<0)throw Error('Missing graph close owner');
source=source.slice(0,closeStart)+`    const registered = registerSingleHtmlModules([...resources,...options.bundle.artifacts]);
`+source.slice(buildStart).replace('buildHtml(indexHtml, closed.value,','buildHtml(indexHtml, registered,');
await writeFile(resolve(root,'single-html.fixed.ts'),source);
// Mirror precisely these owned functions into the isolated CLI and public API.
const ast=ts.createSourceFile('owner.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const names=['bundleSingleHtmlEntry','registerSingleHtmlModules','workerRuntimeSource','runtimeBootstrap','writeSingleHtml'];
for(const filename of ['dist/index.mjs','dist/commands-DABHGFZM.mjs']){
 let code=await readFile(resolve(root,filename),'utf8');
 const compiler=filename.includes('commands-')?'ts':'ts7';
 if(!code.includes('const _singleHtmlSystemSource ='))code=code.replace('function workerBootstrapSource()',`const _singleHtmlSystemSource = ${JSON.stringify(systemSource)};\nfunction workerBootstrapSource()`);
 for(const name of names){
  const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
  const text=node.getText(ast).replace(/^export /,'');
  let converted=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ESNext}}).outputText.replace(/\bts\./g,compiler+'.');
  if(name==='registerSingleHtmlModules'&&!code.includes('function '+name+'('))code=code.replace('function workerBootstrapSource()',converted+'\nfunction workerBootstrapSource()');
  else code=replaceFunction(code,name,converted);
 }
 await writeFile(resolve(root,filename),code);
}
console.log('Repaired single-html module identity in source copy and both local official owners');
