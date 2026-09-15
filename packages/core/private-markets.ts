export type PrivateOffer={mint:string;symbol:string;name:string;price:number;mark:number;premiumPct:number;impliedValuation:number|null;decision:'WATCHLIST'|'PASS';reason:string;fetchedAt:number};
export type PrivateMarkets={offers:PrivateOffer[];at:number;error:string|null};
export function normalizeOffers(data:unknown,now=Date.now()):PrivateOffer[]{
 if(!Array.isArray(data))throw Error('Invalid PreStocks response');
 const seen=new Set<string>();
 return data.flatMap(p=>{
  if(!p||typeof p.contract_address!=='string'||! /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.contract_address)||seen.has(p.contract_address)||typeof p.symbol!=='string'||! /^[A-Z0-9]{1,16}$/.test(p.symbol)||typeof p.tokenPrice!=='number'||!Number.isFinite(p.tokenPrice)||p.tokenPrice<=0||typeof p.markPrice!=='number'||!Number.isFinite(p.markPrice)||p.markPrice<=0)return [];
  seen.add(p.contract_address);const premiumPct=(p.tokenPrice/p.markPrice-1)*100;
  const watch=premiumPct<=5&&premiumPct>=-30;
  return [{mint:p.contract_address,symbol:p.symbol,name:typeof p.name==='string'?p.name.slice(0,70):p.symbol,price:p.tokenPrice,mark:p.markPrice,premiumPct,impliedValuation:typeof p.impliedValuation==='number'&&Number.isFinite(p.impliedValuation)&&p.impliedValuation>0?p.impliedValuation:null,decision:watch?'WATCHLIST' as const:'PASS' as const,reason:watch?'Within the research premium band. Check liquidity, issuer terms and a current quote before considering execution.':premiumPct>5?'More than 5% above the issuer reference mark. The boss passes on the premium.':'More than 30% below the reference mark. Investigate the discrepancy before proceeding.',fetchedAt:now}];
 });
}
export function freshOffer(offer:PrivateOffer,now=Date.now()){return now>=offer.fetchedAt&&now-offer.fetchedAt<180000;}
