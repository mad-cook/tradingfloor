import {parsePyth,type PythResearch} from '../core/pyth';
let cached:PythResearch|undefined,pending:Promise<PythResearch>|undefined;
export function getPythResearch():Promise<PythResearch>{
 if(cached&&Date.now()-cached.at<15000)return Promise.resolve(cached);if(pending)return pending;
 pending=(async()=>{const key=process.env.PYTH_PRO_API_KEY;if(!key)return {status:'unconfigured' as const,points:[],premiumPct:null,reason:'Pyth Pro connection pending. No independent price comparison is available yet.',at:Date.now()};
 try{const r=await fetch('https://pyth-lazer.dourolabs.app/v1/latest_price',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({priceFeedIds:[922,1792],properties:['price','exponent','confidence','feedUpdateTimestamp','marketSession'],formats:['solana'],channel:'fixed_rate@1000ms',parsed:true}),signal:AbortSignal.timeout(8000),cache:'no-store'});if(!r.ok)throw Error();return parsePyth(await r.json());}catch{return {status:'unavailable' as const,points:[],premiumPct:null,reason:'Pyth data unavailable. No comparison is being inferred.',at:Date.now()};}})().then(v=>cached=v).finally(()=>{pending=undefined;});return pending;
}
