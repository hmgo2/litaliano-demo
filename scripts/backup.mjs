import fs from 'node:fs/promises';
import path from 'node:path';
const data=process.env.DATA_DIR||'data';const target=process.argv[2];
if(!target)throw Error('Indica la ruta privada de destino: node scripts/backup.mjs /ruta/respaldo.json');
const raw=await fs.readFile(path.join(data,'operacion.json'));JSON.parse(raw);await fs.writeFile(target,raw,{flag:'wx'});console.log('Respaldo guardado. Contiene datos y hashes de acceso: mantener privado.');
