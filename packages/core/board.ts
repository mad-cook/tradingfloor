import type {CutawayEvent} from './cutaway';
import type {AudienceState} from './audience';
export type BoardData={cutaway?:CutawayEvent;
 mode:'test'|'project';
 token:{mint:string|null;symbol:string|null;marketCapUsd:number|null;fdvUsd:number|null;priceUsd:number|null;change24h:number|null;liquidityUsd:number|null;at:number|null;error:string|null;pair:string|null;estimated?:boolean};
 wallet:{address:string|null;sol:number|null;feesSol:number|null;balanceAt:number|null;feesAt:number|null;error:string|null;feeScope:string;quoteFees?:{symbol:string;amount:number;mint:string}};
};
export const EMPTY_AUDIENCE:AudienceState={counts:{back:0,doubt:0,chaos:0},total:0,last:null,at:0};
export function pickTokenPair(pairs:any[],mint:string){return pairs.filter(p=>p.chainId==='solana'&&p.baseToken?.address===mint&&Number.isFinite(Number(p.priceUsd))&&Number(p.priceUsd)>0).sort((a,b)=>(b.liquidity?.usd??0)-(a.liquidity?.usd??0))[0]??null;}
export function finiteValue(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;}
export function quoteMarketValue(nativePrice:unknown,quoteUsd:number,supply:number){const native=Number(nativePrice);if(!Number.isFinite(native)||native<=0||!Number.isFinite(quoteUsd)||quoteUsd<=0||!Number.isFinite(supply)||supply<=0)throw Error('Quote valuation unavailable');const priceUsd=native*quoteUsd,marketCapUsd=priceUsd*supply;if(!Number.isFinite(marketCapUsd))throw Error('Invalid valuation');return {priceUsd,marketCapUsd};}
