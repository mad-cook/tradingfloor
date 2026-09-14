import {timingSafeEqual} from 'node:crypto';
export function authorizedOperator(header:string|null|undefined,secret=process.env.TRADING_CONTROL_TOKEN){
 if(!secret||secret.length<32||!header?.startsWith('Bearer '))return false;
 const a=Buffer.from(header.slice(7)),b=Buffer.from(secret);return a.length===b.length&&timingSafeEqual(a,b);
}
export const TEST_BUDGET_LAMPORTS=200_000_000;
export const TEST_BUY_LAMPORTS=10_000_000;
export type TestRun={phase:'buy'|'sell'|'complete'|'failed'|'stopped';startedAt:number;floorLamports:number;reservedLamports:number;rawAcquired:string;buySignature?:string;sellSignature?:string;attempts:number;lastAttempt:number;error?:string};
export function automaticTradingAllowed(running:boolean|undefined,killed:boolean,pending:boolean,test?:TestRun){
 return running===true&&!killed&&!pending&&(!test||['complete','failed','stopped'].includes(test.phase));
}
