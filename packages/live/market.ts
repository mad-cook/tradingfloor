import {SOL,STOCKS,TOKEN_PROGRAMS} from './config';
export type Holding={mint:string;amount:string;decimals:number};
export type Wallet={lamports:number;holdings:Holding[];slot:number};
export type Price={usdPrice:number;decimals:number;blockId:number;priceChange24h?:number;multiplier?:number;paused?:boolean};
export async function rpc(method:string,params:unknown[]=[]):Promise<any>{
 const url=process.env.RPC_URL;if(!url)throw Error('RPC_URL is not configured');
 for(let attempt=0;attempt<3;attempt++){
  try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12_000)});
   if(response.ok){const data=await response.json();if(!data.error)return data.result;}
  }catch{}
  if(attempt<2)await new Promise(r=>setTimeout(r,400*(attempt+1)));
 }
 throw Error('Solana RPC unavailable for '+method);
}
export async function readWallet(owner:string,minContextSlot=0):Promise<Wallet>{
 const balance=await rpc('getBalance',[owner,{commitment:'finalized',minContextSlot}]);
 const accounts=await Promise.all(TOKEN_PROGRAMS.map(programId=>rpc('getTokenAccountsByOwner',[owner,{programId},{encoding:'jsonParsed',commitment:'finalized',minContextSlot:balance.context.slot}])));
 const map=new Map<string,Holding>();for(const result of accounts)for(const account of result.value){const info=account.account.data.parsed.info,t=info.tokenAmount;if(info.owner!==owner||!/^\d+$/.test(t.amount))throw Error('Invalid token account');const prev=map.get(info.mint);map.set(info.mint,{mint:info.mint,amount:(BigInt(prev?.amount??0)+BigInt(t.amount)).toString(),decimals:t.decimals});}
 if(!Number.isSafeInteger(balance.value)||balance.value<0)throw Error('Invalid SOL balance');return {lamports:balance.value,holdings:[...map.values()],slot:balance.context.slot};
}
export async function readPrices():Promise<Record<string,Price>>{
 const ids=[SOL,...STOCKS.map(s=>s.mint)].join(',');const headers:Record<string,string>={};if(process.env.JUPITER_API_KEY)headers['x-api-key']=process.env.JUPITER_API_KEY;
 const response=await fetch('https://api.jup.ag/price/v3?ids='+ids,{headers,signal:AbortSignal.timeout(12_000)});if(!response.ok)throw Error('Stock price service unavailable');const data=await response.json();
 const result:Record<string,Price>={};for(const mint of [SOL,...STOCKS.map(s=>s.mint)]){const p=data[mint];if(p&&Number.isFinite(p.usdPrice)&&p.usdPrice>0&&Number.isInteger(p.decimals)&&p.decimals>=0&&p.decimals<=18&&Number.isSafeInteger(p.blockId))result[mint]=p;}
 if(!result[SOL])throw Error('SOL price unavailable');
 const mints=await rpc('getMultipleAccounts',[STOCKS.map(s=>s.mint),{encoding:'jsonParsed',commitment:'finalized'}]);
 for(const [i,stock] of STOCKS.entries()){
  const account=mints.value[i],info=account?.data?.parsed?.info,p=result[stock.mint];if(!p)continue;
  if(!account||!TOKEN_PROGRAMS.includes(account.owner)||!info?.isInitialized||info.decimals!==p.decimals){delete result[stock.mint];continue;}
  const extensions=info.extensions??[],scaled=extensions.find((e:any)=>e.extension==='scaledUiAmountConfig')?.state;
  const multiplier=scaled?Number(Date.now()/1000>=Number(scaled.newMultiplierEffectiveTimestamp)?scaled.newMultiplier:scaled.multiplier):1;
  if(!Number.isFinite(multiplier)||multiplier<=0){delete result[stock.mint];continue;}
  p.multiplier=multiplier;p.paused=extensions.some((e:any)=>e.extension==='pausableConfig'&&e.state.paused);
 }
 return result;
}
export function freshPrice(p:Price|undefined,slot:number){return !!p&&!p.paused&&p.blockId>=slot-750&&p.blockId<=slot+300;}
