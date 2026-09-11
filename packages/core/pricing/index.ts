export function valuePosition(uiAmount:number,usdPrice:number):number {
 if(!Number.isFinite(uiAmount)||uiAmount<0||!Number.isFinite(usdPrice)||usdPrice<=0)throw Error('Invalid UI balance or price');
 return uiAmount*usdPrice;
}
export function nav(cash:number,positions:{qty:number;price:number}[]) {return cash+positions.reduce((sum,p)=>sum+valuePosition(p.qty,p.price),0);}
export async function fetchPrices(mints:string[],apiKey?:string){
 const url=new URL('https://lite-api.jup.ag/price/v3');url.searchParams.set('ids',mints.join(','));
 const r=await fetch(url,{headers:apiKey?{'x-api-key':apiKey}:{},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('Price service '+r.status);
 const data=await r.json();
 return Object.fromEntries(mints.map(mint=>{const p=data[mint]; if(!p||!Number.isFinite(p.usdPrice)||p.usdPrice<=0)throw Error('Missing valid price: '+mint);return [mint,{usdPrice:p.usdPrice,reference:p.stockData?.price??null,referenceAt:p.stockData?.updatedAt??null,liquidity:p.liquidity??0,at:Date.now()}];}));
}
export async function fetchMarketHours(){
 const r=await fetch('https://hermes.pyth.network/v2/price_feeds?query=SPY&asset_type=equity',{signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('Market hours unavailable');
 const feed=(await r.json()).find((f:any)=>f.attributes?.symbol==='Equity.US.SPY/USD');
 if(typeof feed?.market_hours?.is_open!=='boolean')throw Error('Missing market hours');
 return feed.market_hours as {is_open:boolean;next_open:number;next_close:number};
}

