import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {localDateTime} from './reservations.mjs';
const fail=(s,status=400)=>{throw Object.assign(Error(s),{status});};
export const rewardTypes={SOR01:'Minipremio sorpresa',LIM02:'Limonada pequeña'};
export function initializeRewards(db){db.prizes||=[];db.rewardCampaign||={enabled:!!db.demo,days:14,limits:{SOR01:db.demo?10:0,LIM02:db.demo?10:0}};}
const visitorHash=v=>createHash('sha256').update(v).digest('hex');
export function publicPrize(p){if(!p)return null;return{code:p.code,type:p.type,label:rewardTypes[p.type],createdAt:p.createdAt,expiresAt:p.expiresAt,status:p.status==='issued'&&Date.parse(p.expiresAt)<=Date.now()?'expired':p.status,demo:p.demo};}
export function createPizzaGame(database,{clock=()=>Date.now()}={}){
 const rounds=new Map(),rate=new Map();
 function start(visitor){const time=clock();for(const [key,r] of rounds)if(time-r.startedAt>120000)rounds.delete(key);for(const[key,r]of rate)if(time-r.at>3600000)rate.delete(key);
  const key=visitorHash(visitor),limit=rate.get(key)||{at:time,count:0};if(limit.count>=10)fail('Has jugado varias veces. Vuelve en una hora.',429);limit.count++;rate.set(key,limit);
  const topping=Math.random()<.5?'basil':'pepperoni',recipe=['dough','tomato','cheese',topping,'oven','serve'];const token=randomBytes(24).toString('hex'),id=randomUUID();rounds.set(id,{id,token,visitor:key,startedAt:time,lastAt:time,index:0,recipe,bakingAt:0,result:null});return{id,token,recipe,remainingMs:18000};
 }
 function step(visitor,b){const db=typeof database==='function'?database():database;const r=rounds.get(b.id),time=clock();if(!r||r.visitor!==visitorHash(visitor)||r.token!==b.token)fail('La partida no es válida. Inicia otra.',403);
  if(r.result)return r.result;
  if(time-r.startedAt>18000){rounds.delete(r.id);fail('Se acabó el tiempo. Puedes volver a intentarlo.',409);}
  if(b.step!==r.index)fail('La preparación ya cambió. No se duplicó la acción.',409);
  if(b.action!==r.recipe[r.index])fail('Ese ingrediente no corresponde todavía. Sigue la receta.',409);
  if(time-r.lastAt<250)fail('Prepara cada paso antes de continuar.',409);
  if(b.action==='serve'&&time-r.bakingAt<3000)fail('La pizza necesita 3 segundos en el horno.',409);
  r.index++;r.lastAt=time;if(b.action==='oven')r.bakingAt=time;
  if(b.action!=='serve')return{step:r.index,baking:b.action==='oven'};
  const today=localDateTime(new Date(time)).slice(0,10),existing=db.prizes.find(p=>p.visitor===r.visitor&&p.day===today);
  let prize=existing;if(!existing&&db.rewardCampaign.enabled){const available=Object.keys(rewardTypes).filter(type=>db.prizes.filter(p=>p.type===type).length<db.rewardCampaign.limits[type]);if(available.length){const type=available[Math.floor(Math.random()*available.length)];prize={id:randomUUID(),code:type+'-'+randomBytes(8).toString('hex').toUpperCase(),type,status:'issued',visitor:r.visitor,day:today,createdAt:new Date(time).toISOString(),expiresAt:new Date(time+db.rewardCampaign.days*86400000).toISOString(),demo:!!db.demo};db.prizes.push(prize);}}
  r.result={won:true,step:r.index,prize:publicPrize(prize),digital:true,alreadyAwarded:!!existing};return r.result;
 }
 return{start,step};
}
export function redeemPrize(db,b,u){const code=String(b.code||'').trim().toUpperCase(),p=db.prizes.find(p=>p.code===code);if(!p)fail('Código de premio inexistente.',404);if(p.status!=='issued')fail('El premio ya fue canjeado.',409);if(Date.parse(p.expiresAt)<=Date.now())fail('El premio está vencido.',409);
 const visit=db.visits.find(v=>v.id===b.visitId&&['open','payment_pending'].includes(v.status));if(!visit)fail('Selecciona una atención de mesa abierta o pendiente de caja.',409);
 if(db.prizes.some(p=>p.visitId===visit.id&&p.status==='redeemed'))fail('Esta cuenta ya canjeó un premio. Se permite uno por atención.',409);
 p.status='redeemed';p.visitId=visit.id;p.table=visit.table;p.redeemedAt=new Date().toISOString();p.redeemedBy=u.id;p.redeemedByName=u.name;return{ok:true,prize:publicPrize(p)};
}
export function rewardState(db,u){if(!['admin','caja','garzon'].includes(u.role))return undefined;return{campaign:db.rewardCampaign,prizes:db.prizes.map(p=>({...publicPrize(p),...(u.role==='admin'||p.redeemedBy===u.id?{table:p.table,redeemedAt:p.redeemedAt,redeemedByName:p.redeemedByName}:{})})),types:rewardTypes};}
export function saveCampaign(db,b){const days=Number(b.days);if(!Number.isInteger(days)||days<1||days>90)fail('Vigencia entre 1 y 90 días.');const limits={};for(const type of Object.keys(rewardTypes)){const n=Number(b.limits?.[type]);if(!Number.isInteger(n)||n<db.prizes.filter(p=>p.type===type).length||n>10000)fail('La cantidad debe cubrir los premios emitidos y no superar 10.000.');limits[type]=n;}db.rewardCampaign={enabled:!!b.enabled,days,limits};return{ok:true};}
