import {randomUUID} from 'node:crypto';
import {emailAddress} from './reservation-mail.mjs';
const reject=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const clean=(v,max)=>String(v??'').trim().slice(0,max);
export function localDateTime(date=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function slot(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))reject('Fecha u hora inválida.');
 const d=new Date(date+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)reject('Fecha inválida.');
 return Date.parse(date+'T'+time+':00Z');
}
export function requestReservation(db,b){
 const clientId=clean(b.id,100);if(!/^[a-zA-Z0-9_-]{16,100}$/.test(clientId))reject('Falta identificador de solicitud.');
 if(b.website)reject('Solicitud inválida.');if(b.consent!==true)reject('Autoriza el uso de tus datos para gestionar la reserva.');
 const name=clean(b.name,100),phone=clean(b.phone,40),date=clean(b.date,10),time=clean(b.time,5),notes=clean(b.notes,400),guests=Number(b.guests),email=emailAddress(b.email);
 if(name.length<2||!/^\+?[\d ()-]{7,40}$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15)reject('Indica nombre y teléfono válidos.');
 if(!Number.isInteger(guests)||guests<1||guests>30)reject('Indica entre 1 y 30 personas. Para grupos mayores, contacta al restaurante.');
 const stamp=slot(date,time),signature=JSON.stringify([name,phone,date,time,guests,notes,email]);
 const previous=db.reservations.find(r=>r.clientId===clientId);
 if(previous){if(previous.signature!==signature)reject('Este identificador ya corresponde a otra solicitud.',409);return {code:previous.code,status:'requested'};}
 const current=localDateTime();if(date+'T'+time<=current||stamp>Date.parse(current+':00Z')+90*86400000)reject('Elige una fecha y hora futuras dentro de los próximos 90 días.');
 const r={id:randomUUID(),clientId,signature,code:'R-'+randomUUID().slice(0,8).toUpperCase(),name,phone,email,date,time,guests,notes,status:'requested',table:null,createdAt:new Date().toISOString(),events:[]};
 db.reservations.push(r);return {code:r.code,status:'requested'};
}
export function reservationAction(db,b,u){
 const r=db.reservations.find(r=>r.id===b.id);if(!r)reject('Reserva inexistente.',404);
 const at=new Date().toISOString(),reason=clean(b.reason,400);
 if(r.emailDelivery?.status==='sending')reject('Hay un correo en proceso. Espera su resultado antes de modificar la reserva.',409);
 if(b.action==='confirm'){
  if(r.status!=='requested')reject('La reserva ya cambió de estado.',409);
  if(r.date+'T'+r.time<=localDateTime())reject('La hora solicitada ya pasó. Pide una nueva solicitud.',409);
  const table=Number(b.table);if(!Number.isInteger(table)||table<1||table>db.settings.tableCount)reject('Selecciona una mesa válida.');
  const stamp=slot(r.date,r.time);
  if(db.reservations.some(a=>a.id!==r.id&&['confirmed','arrived'].includes(a.status)&&String(a.table)===String(table)&&Math.abs(slot(a.date,a.time)-stamp)<90*60000))reject('Esa mesa ya tiene una reserva cercana. El margen de planificación es de 90 minutos.',409);
  r.table=String(table);r.status='confirmed';r.confirmedAt=at;r.confirmedBy=u.id;
 }else if(b.action==='cancel'){
  if(!['requested','confirmed'].includes(r.status))reject('Esta reserva no admite anulación.',409);
  if(!reason)reject('Indica un motivo de anulación.');r.status='cancelled';r.cancelReason=reason;
 }else if(b.action==='arrive'){
  if(r.status!=='confirmed')reject('Confirma la reserva antes de registrar la llegada.',409);
  if(r.date!==localDateTime().slice(0,10))reject('Registra la llegada el día de la reserva.',409);
  if(db.visits.some(v=>v.table===r.table&&v.status!=='closed'))reject('La mesa está ocupada o pendiente de caja. Libérala antes de registrar la llegada.',409);
  const v={id:randomUUID(),table:r.table,status:'open',openedAt:at,waiterId:u.id,reservationId:r.id};db.visits.push(v);r.visitId=v.id;r.status='arrived';r.arrivedAt=at;
 }else if(b.action==='no_show'){
  if(r.status!=='confirmed'||r.date+'T'+r.time>localDateTime())reject('Solo puedes registrar ausencia después de la hora confirmada.',409);
  r.status='no_show';
 }else reject('Acción de reserva desconocida.');
 r.events.push({action:b.action,at,userId:u.id,userName:u.name,reason,table:r.table});return {ok:true};
}
export function visibleReservations(db,u){return ['admin','garzon'].includes(u.role)?db.reservations.map(({clientId,signature,...r})=>r):[];}
