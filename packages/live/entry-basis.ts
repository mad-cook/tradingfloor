import type {Ticket} from '../core/types';
import type {Intent} from './executor';

/** Price-signal basis only. Cash accounting continues to include all actual debits.
 * Reconstruct principal from exact-input buys, excluding network/storage overhead.
 * Unmatched transfers or incomplete history return undefined instead of inventing a basis.
 */
export function entryBasis(deskId:string,qty:number,multiplier:number,tickets:Ticket[],receipts:{signature:string;failed:boolean;intent:Intent}[]):number|undefined{
 if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(multiplier)||multiplier<=0)return undefined;
 const fills=new Map(tickets.filter(t=>t.deskId===deskId&&t.signature).map(t=>[t.signature,t]));
 let rawUnits=0,cost=0,seen=false;
 for(const receipt of receipts){
  const i=receipt.intent;if(i.deskId!==deskId||receipt.failed)continue;
  const fill=fills.get(receipt.signature),scale=i.multiplier??1;
  if(!fill||!Number.isFinite(scale)||scale<=0||!Number.isFinite(fill.qty)||fill.qty<=0)return undefined;
  const units=fill.qty/scale;
  if(i.side==='BUY'){
   const principal=Number(i.amount)/1e9*i.solPrice;if(!Number.isFinite(principal)||principal<=0)return undefined;
   rawUnits+=units;cost+=principal;seen=true;
  }else{
   if(units>rawUnits+1e-10||rawUnits<=0)return undefined;
   cost*=Math.max(0,1-units/rawUnits);rawUnits=Math.max(0,rawUnits-units);
  }
 }
 const expected=rawUnits*multiplier;
 if(!seen||cost<=0||Math.abs(expected-qty)>Math.max(1e-10,qty*1e-6))return undefined;
 return cost;
}
