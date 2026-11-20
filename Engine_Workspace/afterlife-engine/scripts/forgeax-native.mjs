import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const preload = new URL('./forgeax-native-preload.mjs', import.meta.url).href;
const cli = fileURLToPath(new URL('../node_modules/@forgeax/engine/dist/bin/forgeax.mjs', import.meta.url));
const child = spawn(process.execPath,[cli,...process.argv.slice(2)],{
  stdio:'inherit',
  env:{...process.env,NODE_OPTIONS:[process.env.NODE_OPTIONS,'--import='+preload].filter(Boolean).join(' ')},
});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.once('error',error=>{console.error(error.message);process.exitCode=1;});
child.once('exit',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?130:1);});
