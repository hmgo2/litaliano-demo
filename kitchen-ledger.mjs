// Per-item quantities. Original order quantities and recipe prices are immutable.
const round=n=>Math.round(n*10000)/10000;
export const activeQuantity=a=>a.quantity-(a.cancelledQuantity||0);
export const unpreparedQuantity=a=>activeQuantity(a)-((a.preparedQuantity||0)-(a.cancelledPreparedQuantity||0));
export const pendingDelivery=a=>activeQuantity(a)-(a.deliveredQuantity||0);
export function aggregate(items,count){const result=new Map();for(const item of items){const units=count(item);for(const ingredient of item.recipe||[]){const a=result.get(ingredient.materialId)||{materialId:ingredient.materialId,name:ingredient.name,unit:ingredient.unit,qty:0,unitCost:ingredient.unitCost};a.qty=round(a.qty+ingredient.qty*units);result.set(a.materialId,a);}}return [...result.values()].filter(a=>a.qty>0).map(a=>({...a,cost:round(a.qty*a.unitCost)}));}
export function recalculate(order){if(!order.itemTracking)return;
 order.total=order.items.reduce((sum,a)=>sum+activeQuantity(a)*a.unitPrice,0);
 order.plannedIngredients=aggregate(order.items,activeQuantity);
 order.ingredients=aggregate(order.items,a=>a.preparedQuantity||0);
 order.wasteIngredients=aggregate(order.items,a=>a.cancelledPreparedQuantity||0);
 order.ingredientCost=round(order.ingredients.reduce((sum,a)=>sum+a.cost,0));
 order.wasteCost=round(order.wasteIngredients.reduce((sum,a)=>sum+a.cost,0));
 order.billableIngredientCost=round(order.ingredientCost-order.wasteCost);
 order.costComplete=order.items.filter(a=>activeQuantity(a)>0||a.preparedQuantity>0).every(a=>a.recipeConfigured);
 order.waste=order.wasteIngredients.length>0||order.items.some(a=>a.cancelledPreparedQuantity>0);
}
export function migrateOrders(db){let changed=false;
 for(const order of db.orders){if(order.items.every(a=>Number.isInteger(a.deliveredQuantity)))continue;changed=true;
  // Past aggregate-only consumption cannot be safely allocated using today's recipes.
  // Keep its historical cost/inventory intact. New orders use full item snapshots.
  order.legacyItemTracking=true;
  const prepared=['preparing','ready','served'].includes(order.status)||order.waste;
  for(const a of order.items){a.cancelledQuantity=order.status==='cancelled'?a.quantity:0;a.preparedQuantity=prepared?a.quantity:0;a.cancelledPreparedQuantity=order.status==='cancelled'&&prepared?a.quantity:0;a.deliveredQuantity=['ready','served'].includes(order.status)?a.quantity:0;a.recipe=[];}
  if(['ready','served','cancelled'].includes(order.status))order.kitchenClosedAt=order.timeline.find(t=>t.status==='ready'||t.status==='cancelled')?.at||order.createdAt;
  order.itemEvents=[];
 }
 if(changed)db.version=2;return changed;
}
