import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const env={...process.env,WORKER_PORT:process.env.WORKER_PORT??'3101'};
env.WORKER_URL='http://127.0.0.1:'+env.WORKER_PORT;
const children=new Set();let stopping=false,exitCode=0;
function stop(code=0){if(stopping)return;stopping=true;exitCode=code;for(const child of children)child.kill('SIGTERM');const deadline=setTimeout(()=>process.exit(code),9000);deadline.unref();if(!children.size)process.exit(code);}
function launch(args,childEnv=env){const child=spawn(process.execPath,args,{env:childEnv,stdio:'inherit',windowsHide:true});children.add(child);child.on('error',()=>stop(1));child.on('exit',(code)=>{children.delete(child);if(!stopping)stop(code||1);else if(!children.size)process.exit(exitCode);});return child;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
launch(['--import','tsx','apps/floor-worker/index.ts']);
let ready=false;
for(let i=0;i<60&&!stopping;i++){try{const r=await fetch(env.WORKER_URL+'/health',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
const {TRADING_PRIVATE_KEY:unusedSigningKey,...webEnv}=env;
if(!ready)stop(1);else if(!stopping)launch(['node_modules/next/dist/bin/next','start','-H','0.0.0.0','-p',env.PORT??'3100'],webEnv);
