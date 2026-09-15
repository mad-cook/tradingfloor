export type PythPoint={symbol:string;price:number;confidence:number;at:number;session:string};
export type PythResearch={status:'unconfigured'|'unavailable'|'fresh'|'reference-only';points:PythPoint[];premiumPct:number|null;reason:string;at:number};
const FEEDS:Record<number,string>={922:'AAPL',1792:'AAPLx'};
export function parsePyth(data:any,now=Date.now()):PythResearch{
 const rows=data?.parsed?.priceFeeds;if(!Array.isArray(rows))throw Error('Invalid Pyth response');
 const points:PythPoint[]=rows.flatMap((p:any)=>{const symbol=FEEDS[p.priceFeedId],exponent=Number(p.exponent),at=Number(p.feedUpdateTimestamp)/1000;const price=Number(p.price)*10**exponent,confidence=Number(p.confidence)*10**exponent;if(!symbol||!Number.isInteger(exponent)||exponent< -18||exponent>0||!Number.isFinite(price)||price<=0||!Number.isFinite(confidence)||confidence<0||!Number.isFinite(at)||at<=0||at>now+1000)return [];return [{symbol,price,confidence,at,session:typeof p.marketSession==='string'?p.marketSession:'unknown'}];});
 const equity=points.find(p=>p.symbol==='AAPL'),token=points.find(p=>p.symbol==='AAPLx');
 if(!equity||!token)return {status:'unavailable',points,premiumPct:null,reason:'Both Pyth feeds are required for a comparison.',at:now};
 const fresh=points.every(p=>now-p.at<60000&&p.confidence/p.price<=.01)&&equity.session==='regular';
 return {status:fresh?'fresh':'reference-only',points,premiumPct:fresh?(token.price/equity.price-1)*100:null,reason:fresh?'Independent stock/token comparison. A premium is not an executable arbitrage quote.':'Comparison withheld: underlying market is outside its regular session, data is stale, or uncertainty is high.',at:now};
}
