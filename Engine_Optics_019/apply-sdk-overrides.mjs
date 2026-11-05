// Apply the archived extension only to an explicit, independent ForgeaX 0.4.18 SDK.
// No dependency installation, game mutation, network access, or original-store edits.
import {readFile, writeFile, mkdir, realpath, lstat} from 'node:fs/promises';
import {resolve, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile(resolve(here,'SDK_OVERRIDES.json'),'utf8'));
const argv=process.argv.slice(2);
const verifyOnly=argv.includes('--verify-only');
const at=argv.indexOf('--sdk');
if(!verifyOnly && (at<0 || !argv[at+1]))throw new Error('Use --verify-only, or --sdk /absolute/path/to/independent-0.4.18-sdk');
let sdk;
if(!verifyOnly){
 sdk=await realpath(resolve(argv[at+1]));
 if(sdk===manifest.protectedOriginalSdkAtCapture || sdk.split(sep).includes('.pnpm'))
  throw new Error('Refusing to modify the protected original SDK or a package store. Use an independent copy.');
 const pkg=JSON.parse(await readFile(resolve(sdk,'package.json'),'utf8'));
 if(pkg.name!=='@forgeax/engine' || pkg.version!==manifest.baseVersion)throw new Error('Requires the exact ForgeaX 0.4.18 carrier root.');
}
const pending=[];
for(const row of manifest.files){
 const bytes=await readFile(resolve(here,row.stored));
 if(hash(bytes)!==row.sha256 || bytes.length!==row.bytes)throw new Error(`Archive mismatch: ${row.stored}`);
 if(verifyOnly)continue;
 const target=resolve(sdk,row.path);
 if(!target.startsWith(sdk+sep))throw new Error('Invalid target path');
 const parent=await realpath(dirname(target));
 if(!parent.startsWith(sdk+sep))throw new Error(`Dependency links escape independent SDK: ${row.path}`);
 let old;
 try{
  const stat=await lstat(target);if(stat.isSymbolicLink())throw new Error(`Refusing linked target: ${row.path}`);
  old=await readFile(target);
 }catch(error){if(error.code!=='ENOENT')throw error;}
 const current=old && hash(old);
 if(current===row.sha256)continue;
 if((old && current!==row.originalSha256) || (!old && row.originalSha256))
  throw new Error(`Unexpected baseline; preserve and resolve first: ${row.path}`);
 pending.push({target,bytes,old,path:row.path});
}
// Validate the entire set before the first write. Keep original bytes recoverable.
for(const row of pending){
 if(row.old){
  const backup=resolve(sdk,'.cyberpunk-optics019-backup',row.path);
  await mkdir(dirname(backup),{recursive:true});
  try{await writeFile(backup,row.old,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
 }
 await writeFile(row.target,row.bytes);
}
console.log(JSON.stringify({ok:true,verifyOnly,filesVerified:manifest.files.length,filesApplied:pending.length,sdk:sdk??null}));
