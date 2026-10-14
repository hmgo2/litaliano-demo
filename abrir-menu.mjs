import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const url=process.argv.includes('--personal')?'http://127.0.0.1:56565/personal':'http://127.0.0.1:56565/';
async function ready(){try{const response=await fetch('http://127.0.0.1:56565/api/menu',{signal:AbortSignal.timeout(1500)});if(!response.ok)return false;const value=await response.json();return Array.isArray(value.products)&&Number.isInteger(value.tableCount);}catch{return false;}}
if(!await ready()){
 const server=spawn(process.execPath,[path.join(root,'server.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:'ignore'});server.unref();
 for(let attempt=0;attempt<20&&!await ready();attempt++)await new Promise(r=>setTimeout(r,250));
}
if(!await ready()){console.error('No se pudo iniciar el menú. Revisa que el puerto 56565 esté disponible.');process.exitCode=1;}
else{if(!process.argv.includes('--no-open')){const browser=spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});browser.unref();}console.log('Menú disponible: '+url);}
