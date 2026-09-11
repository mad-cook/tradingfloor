import type {AudienceState} from './audience';
export type BoardData={
 mode:'test'|'project';
 token:{mint:string|null;symbol:string|null;marketCapUsd:number|null;fdvUsd:number|null;priceUsd:number|null;change24h:number|null;liquidityUsd:number|null;at:number|null;error:string|null;pair:string|null};
 wallet:{address:string|null;sol:number|null;feesSol:number|null;balanceAt:number|null;feesAt:number|null;error:string|null;feeScope:string};
};
export const EMPTY_AUDIENCE:AudienceState={counts:{back:0,doubt:0,chaos:0},total:0,last:null,at:0};
export function pickTokenPair(pairs:any[],mint:string){return pairs.filter(p=>p.chainId==='solana'&&p.baseToken?.address===mint&&Number.isFinite(Number(p.priceUsd))&&Number(p.priceUsd)>0).sort((a,b)=>(b.liquidity?.usd??0)-(a.liquidity?.usd??0))[0]??null;}
export function finiteValue(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;}
