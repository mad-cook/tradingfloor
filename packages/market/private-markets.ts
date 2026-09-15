import {normalizeOffers,type PrivateMarkets} from '../core/private-markets';
let cached:PrivateMarkets|undefined,pending:Promise<PrivateMarkets>|undefined;
export function getPrivateMarkets():Promise<PrivateMarkets>{
 if(cached&&Date.now()-cached.at<60000)return Promise.resolve(cached);
 if(pending)return pending;
 pending=(async()=>{try{const r=await fetch('https://prestocks.com/api/prestocks',{signal:AbortSignal.timeout(8000),cache:'no-store'});if(!r.ok)throw Error();const offers=normalizeOffers(await r.json());if(!offers.length)throw Error();return cached={offers,at:Date.now(),error:null};}catch{return cached={offers:[],at:Date.now(),error:'PreStocks data unavailable. New pitches are paused.'};}})().finally(()=>{pending=undefined;});return pending;
}
