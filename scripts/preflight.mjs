import {writeFile,mkdir} from 'node:fs/promises';
const checks=[];
async function probe(id,url,inspect){
 const start=Date.now();
 try {const r=await fetch(url,{signal:AbortSignal.timeout(20000)}); const body=await r.text(); let data;try{data=JSON.parse(body)}catch{}
 checks.push({id,url,status:r.ok?'observed':'blocked',http:r.status,ms:Date.now()-start,observation:r.ok?inspect(data):body.slice(0,250)}); }
 catch(e){checks.push({id,url,status:'blocked',error:e.message});}
}
await probe('registry','https://api.backed.fi/api/v2/public/assets',d=>({shape:Array.isArray(d)?'array':Object.keys(d??{}),sample:JSON.stringify(d).slice(0,1300)}));
await probe('price-v3','https://lite-api.jup.ag/price/v3?ids=XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W',d=>d);
await probe('F7-market-hours','https://hermes.pyth.network/v2/price_feeds?query=SPY&asset_type=equity',d=>d);
for(const [id,reason] of Object.entries({'F1':'Not attempted: live-money authorization and funded treasury required.','F2':'Model provider and credentials not configured.','F3':'Model provider and credentials not configured.','F4':'Offline voice bank pending; synthesized local sound effects selected for initial development.','F5':'Original Blender model and browser performance measurement pending.','F6':'RPC and treasury token accounts not configured.','universe-gate':'Mirror companion specification missing; registry, metadata and executable quotes must be independently verified before enabling market mode.'}))checks.push({id,status:'blocked',reason});
await mkdir('reports',{recursive:true});
await writeFile('reports/preflight-report.json',JSON.stringify({at:new Date().toISOString(),readyForLive:false,checks},null,2));
console.log(JSON.stringify(checks,null,2));

