import {CrashMonitor,CUTAWAY_DURATION,type CutawayEvent} from '../core/cutaway';
const crashMonitor=new CrashMonitor();let latestCutaway:CutawayEvent|undefined;
import {address,getAddressEncoder,getProgramDerivedAddress} from '@solana/addresses';
import {pickTokenPair,finiteValue,type BoardData} from '../core/board';
const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',AMM='pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',ATA='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',WSOL='So11111111111111111111111111111111111111112';
const encode=getAddressEncoder();const bytes=(key:string)=>encode.encode(address(key));const seed=(s:string)=>new TextEncoder().encode(s);
async function rpc(method:string,params:unknown[]){const url=process.env.RPC_URL;if(!url)throw Error('RPC not configured');const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(6500),cache:'no-store'});if(!r.ok)throw Error('RPC unavailable');const data=await r.json();if(data.error)throw Error('RPC unavailable');return data.result;}
async function creatorFees(creator:string){
 const [pumpVault]=await getProgramDerivedAddress({programAddress:address(PUMP),seeds:[seed('creator-vault'),bytes(creator)]});
 const [authority]=await getProgramDerivedAddress({programAddress:address(AMM),seeds:[seed('creator_vault'),bytes(creator)]});
 const [ammVault]=await getProgramDerivedAddress({programAddress:address(ATA),seeds:[bytes(authority),bytes(TOKEN),bytes(WSOL)]});
 const [pump,amm]=await Promise.all([rpc('getAccountInfo',[pumpVault,{encoding:'base64',commitment:'confirmed'}]),rpc('getAccountInfo',[ammVault,{encoding:'jsonParsed',commitment:'confirmed'}])]);
 let pumpLamports=0,ammLamports=0;
 if(pump.value){if(![PUMP,'11111111111111111111111111111111'].includes(pump.value.owner))throw Error('Unexpected vault owner');const size=Buffer.from(pump.value.data[0],'base64').length;const rent=await rpc('getMinimumBalanceForRentExemption',[size]);pumpLamports=Math.max(0,pump.value.lamports-rent);}
 if(amm.value){const info=amm.value.data?.parsed?.info;if(amm.value.owner!==TOKEN||info?.mint!==WSOL||info?.owner!==authority||info?.tokenAmount?.decimals!==9)throw Error('Unexpected fee account');ammLamports=Number(info.tokenAmount.amount);}
 if(!Number.isSafeInteger(pumpLamports)||!Number.isSafeInteger(ammLamports))throw Error('Invalid fee balance');
 return (pumpLamports+ammLamports)/1e9;
}
async function readBoard():Promise<BoardData>{
 const mint=process.env.TOKEN_MINT||null,creator=process.env.CREATOR_WALLET||null;
 const result:BoardData={mode:process.env.BOARD_MODE==='project'?'project':'test',token:{mint,symbol:null,marketCapUsd:null,fdvUsd:null,priceUsd:null,change24h:null,liquidityUsd:null,at:null,error:null,pair:null},wallet:{address:creator,sol:null,feesSol:null,balanceAt:null,feesAt:null,error:null,feeScope:'Direct Pump SOL + PumpSwap WSOL vaults for this wallet; excludes shared-fee allocations and other quote tokens. Estimated before claim transaction costs.'}};
 await Promise.allSettled([
  (async()=>{if(!mint)return;try{address(mint);const r=await fetch('https://api.dexscreener.com/token-pairs/v1/solana/'+mint,{signal:AbortSignal.timeout(6500),cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();const pair=pickTokenPair(Array.isArray(data)?data:[],mint);if(!pair)throw Error();result.token={...result.token,symbol:typeof pair.baseToken.symbol==='string'?pair.baseToken.symbol.slice(0,20):null,marketCapUsd:finiteValue(pair.marketCap),fdvUsd:finiteValue(pair.fdv),priceUsd:finiteValue(Number(pair.priceUsd)),change24h:typeof pair.priceChange?.h24==='number'&&Number.isFinite(pair.priceChange.h24)?pair.priceChange.h24:null,liquidityUsd:finiteValue(pair.liquidity?.usd),at:Date.now(),pair:pair.pairAddress};}catch{result.token.error='Market data unavailable';}})(),
  (async()=>{if(!creator)return;try{address(creator);const balance=await rpc('getBalance',[creator,{commitment:'confirmed'}]);if(!Number.isSafeInteger(balance.value)||balance.value<0)throw Error();result.wallet.sol=balance.value/1e9;result.wallet.balanceAt=Date.now();}catch{result.wallet.error='Wallet balance unavailable';}})(),
  (async()=>{if(!creator)return;try{address(creator);result.wallet.feesSol=await creatorFees(creator);result.wallet.feesAt=Date.now();}catch{result.wallet.error=result.wallet.error?'Wallet and fee reads unavailable':'Creator fee read unavailable';}})()
 ]);
 if(result.mode==='project'&&result.token.mint&&result.token.marketCapUsd&&result.token.at&&!result.token.error){
 const event=crashMonitor.observe(result.token.mint,result.token.marketCapUsd,result.token.at,Date.now());if(event)latestCutaway=event;
 }
 if(result.mode==='project'&&latestCutaway?.id.startsWith(result.token.mint+':')&&Date.now()-latestCutaway.startedAt<CUTAWAY_DURATION)result.cutaway=latestCutaway;
 return result;
}
let cached:{data:BoardData;expires:number}|null=null;let pending:Promise<BoardData>|null=null;
export function getBoard(){if(cached&&Date.now()<cached.expires)return Promise.resolve(cached.data);if(pending)return pending;pending=readBoard().then(data=>{cached={data,expires:Date.now()+30_000};return data;}).finally(()=>{pending=null;});return pending;}
