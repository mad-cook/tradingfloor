import {evaluate,type Order,type RiskState} from '../risk';
export async function fetchOrder(params:{inputMint:string;outputMint:string;amount:string;taker:string}){
 if(!process.env.JUPITER_API_KEY)throw Error('Jupiter connection is not configured');
 const url=new URL('https://api.jup.ag/swap/v2/order');Object.entries({...params,excludeRouters:'jupiterz'}).forEach(([k,v])=>url.searchParams.set(k,v));
 const r=await fetch(url,{headers:{'x-api-key':process.env.JUPITER_API_KEY},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('Quote service '+r.status);return r.json();
}
export function paperFill(order:Order,state:RiskState){
 const verdict=evaluate(order,state);if(!verdict.ok)return {verdict,fill:null};
 return {verdict,fill:{usd:order.usd,qty:order.qty,price:order.price,paper:true as const,signature:null}};
}
export function executeLive():never {throw Error('Live execution unavailable: M0 and explicit treasury authorization required');}

