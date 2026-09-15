import {createPrivateKey,createPublicKey,sign as signBytes} from 'node:crypto';
import {address,getProgramDerivedAddress} from '@solana/addresses';
import {getTransactionDecoder} from '@solana/transactions';
import {getCompiledTransactionMessageDecoder} from '@solana/transaction-messages';
type Signer={publicKey:string;sign:(message:Uint8Array)=>Buffer};
import bs58 from 'bs58';
import {LIMITS,SOL,STOCKS,TOKEN_PROGRAMS} from './config';
import {rpc} from './market';
export type Intent={deskId:string;side:'BUY'|'SELL';mint:string;amount:string;decimals:number;solPrice:number;tokenPrice:number;multiplier?:number;test?:boolean;maxNativeSpendLamports?:number;minNativeBalanceLamports?:number;at:number};
export type Pending={intent:Intent;signature:string;lastValidBlockHeight:number;submittedAt:number};
// Retry only unsigned quote retrieval. Submission remains single-attempt and reconciled.
export async function fetchSwapQuote(url:string,headers:Record<string,string>){
 for(let attempt=0;attempt<3;attempt++){
  let response:Response;
  try{response=await fetch(url,{headers,signal:AbortSignal.timeout(5000)});}catch{if(attempt===2)throw Error('Swap quote unavailable (network timeout)');await new Promise(r=>setTimeout(r,400));continue;}
  if(response.ok)return response.json();
  const body=await response.json().catch(()=>null);
  const routingFailure=response.status===400&&body?.error==='Failed to get quotes';
  const transient=routingFailure||response.status===429||response.status>=500;
  if(!transient||attempt===2)throw Error(`Swap quote unavailable (HTTP ${response.status}${routingFailure?': route provider could not quote':''})`);
  await new Promise(r=>setTimeout(r,400*(attempt+1)));
 }
 throw Error('Swap quote unavailable');
}
export function loadSigner(owner:string){
 const secret=process.env.TRADING_PRIVATE_KEY;if(!secret)throw Error('TRADING_PRIVATE_KEY is not configured');
 let signer:Signer;try{const bytes=secret.trim().startsWith('[')?Uint8Array.from(JSON.parse(secret)):bs58.decode(secret.trim());if(bytes.length!==64)throw Error();
 const key=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from(bytes.subarray(0,32))]),format:'der',type:'pkcs8'});
 const publicBytes=createPublicKey(key).export({format:'der',type:'spki'}).subarray(-32);if(!publicBytes.equals(Buffer.from(bytes.subarray(32))))throw Error();
 signer={publicKey:bs58.encode(publicBytes),sign:message=>signBytes(null,message,key)};
 }catch{throw Error('Trading key must be a valid 64-byte Solana keypair (base58 or JSON array)');}
 if(signer.publicKey!==owner)throw Error('Trading key does not match CREATOR_WALLET');return signer;
}
export function validateQuote(q:any,intent:Intent,owner:string,now=Date.now()){
 if(!/^\d+$/.test(intent.amount)||BigInt(intent.amount)<=0n||!Number.isSafeInteger(Number(intent.amount)))throw Error('Invalid trade amount');
 const solValue=Number(intent.amount)/10**(intent.side==='BUY'?9:intent.decimals)*(intent.side==='BUY'?1:intent.tokenPrice/intent.solPrice);
 if(!Number.isFinite(solValue)||solValue>LIMITS.maxTradeLamports/1e9+1e-10)throw Error('Trade exceeds size limit');
 const input=intent.side==='BUY'?SOL:intent.mint,output=intent.side==='BUY'?intent.mint:SOL;
 if(!STOCKS.some(s=>s.mint===intent.mint&&s.deskId===intent.deskId))throw Error('Token is not in the issuer allowlist');
 if(now-intent.at>30_000||intent.at>now)throw Error('Trade proposal expired');
 if(q.error||q.errorCode||q.router!=='metis'||q.taker!==owner||q.inputMint!==input||q.outputMint!==output||q.inAmount!==intent.amount||q.swapMode!=='ExactIn'||!q.transaction||!q.requestId)throw Error('Unexpected swap quote');
 if(!/^\d+$/.test(q.outAmount)||BigInt(q.outAmount)<=0n||!/^\d+$/.test(q.otherAmountThreshold))throw Error('Invalid output amount');
 if(!Number.isInteger(q.slippageBps)||q.slippageBps<0||q.slippageBps>LIMITS.slippageBps||BigInt(q.otherAmountThreshold)<BigInt(q.outAmount)*BigInt(10000-LIMITS.slippageBps)/10000n)throw Error('Excessive slippage');
 const impact=Number(q.priceImpact);if(!Number.isFinite(impact)||Math.abs(impact)>LIMITS.impactPct)throw Error('Excessive price impact');
 const fee=Number(q.signatureFeeLamports)+Number(q.prioritizationFeeLamports),rent=Number(q.rentFeeLamports);
 if(!Number.isSafeInteger(fee)||fee<0||fee>LIMITS.maxFeeLamports||!Number.isSafeInteger(rent)||rent<0||rent>LIMITS.maxRentLamports)throw Error('Transaction costs exceed limits');
 if(!Number.isFinite(q.feeBps)||q.feeBps<0||q.feeBps>30)throw Error('Swap fee exceeds limit');
 const inputUsd=Number(intent.amount)/10**(intent.side==='BUY'?9:intent.decimals)*(intent.side==='BUY'?intent.solPrice:intent.tokenPrice);
 const outputUsd=Number(q.outAmount)/10**(intent.side==='BUY'?intent.decimals:9)*(intent.side==='BUY'?intent.tokenPrice:intent.solPrice);
 if(!Number.isFinite(inputUsd)||inputUsd<=0||!Number.isFinite(outputUsd)||Math.abs(outputUsd/inputUsd-1)>.025)throw Error('Quote disagrees with market prices');
 if(!Number.isSafeInteger(Number(q.lastValidBlockHeight)))throw Error('Missing transaction expiry');
}
const PROGRAMS=new Set([...TOKEN_PROGRAMS,'11111111111111111111111111111111','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL','JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4']);
// Compare the account state produced by simulation, including token authorities.
export function checkSimulation(before:any[],after:any[],intent:Intent,minOutput:bigint,owner:string){
 if(after.length!==before.length||!after[0]||after[0].owner!=='11111111111111111111111111111111'||after[0].executable)throw Error('Unexpected simulated wallet');
 const nativeSpend=before[0].lamports-after[0].lamports;
 const allowance=LIMITS.maxFeeLamports+LIMITS.maxRentLamports;
 if(intent.maxNativeSpendLamports!==undefined&&nativeSpend>intent.maxNativeSpendLamports)throw Error('Test spending cap exceeded');
 if(intent.minNativeBalanceLamports!==undefined&&after[0].lamports<intent.minNativeBalanceLamports)throw Error('Protected wallet balance would be spent');
 if(after[0].lamports<LIMITS.reserveLamports||nativeSpend>(intent.side==='BUY'?Number(intent.amount):0)+allowance)throw Error('Simulation exceeds SOL budget');
 if(intent.side==='SELL'&&BigInt(Math.floor(-nativeSpend+allowance))<minOutput)throw Error('Simulation returns too little SOL');
 let spent=0n,received=0n;
 for(let i=1;i<before.length;i++){
  const pre=before[i],post=after[i];if(!post){if(pre)throw Error('Simulation closes an existing account');continue;}
  const raw=Buffer.from(post.data[0],'base64');if(!TOKEN_PROGRAMS.includes(post.owner)||raw.length<165||bs58.encode(raw.subarray(32,64))!==owner)throw Error('Unexpected token owner');
  const mint=bs58.encode(raw.subarray(0,32));const amount=raw.readBigUInt64LE(64);
  const old=pre?Buffer.from(pre.data[0],'base64'):null;const delta=amount-(old?.readBigUInt64LE(64)??0n);
  if(old){const a=Buffer.from(old),b=Buffer.from(raw);a.fill(0,64,72);b.fill(0,64,72);if(pre.owner!==post.owner||!a.equals(b)||post.lamports<pre.lamports)throw Error('Simulation changes token permissions or account state');}
  else if(raw.readUInt32LE(72)!==0||raw.readUInt32LE(129)!==0||raw[108]!==1)throw Error('Unexpected new account permissions');
  if(delta<0n){if(intent.side!=='SELL'||mint!==intent.mint)throw Error('Simulation spends an unrelated token');spent-=delta;}
  if(delta>0n){if(intent.side!=='BUY'||mint!==intent.mint)throw Error('Simulation returns an unexpected token');received+=delta;}
 }
 if(intent.side==='SELL'&&spent!==BigInt(intent.amount))throw Error('Unexpected stock spend');
 if(intent.side==='BUY'&&received<minOutput)throw Error('Simulation returns too few stocks');
}
export class Executor{
 constructor(private owner:string,private signer?:Signer){}
 async prepare(intent:Intent){if(!this.signer)throw Error('Signing wallet is not configured');return this.inspect(intent,true);}
 async preview(intent:Intent){await this.inspect(intent,false);return {validated:true};}
 private async inspect(intent:Intent,sign:boolean):Promise<{pending:Pending;signed:string;requestId:string}>{
  const params=new URLSearchParams({inputMint:intent.side==='BUY'?SOL:intent.mint,outputMint:intent.side==='BUY'?intent.mint:SOL,amount:intent.amount,taker:this.owner,excludeRouters:'jupiterz,dflow,okx',slippageBps:String(LIMITS.slippageBps)});
  const headers:Record<string,string>={};if(process.env.JUPITER_API_KEY)headers['x-api-key']=process.env.JUPITER_API_KEY;
  const q=await fetchSwapQuote('https://api.jup.ag/swap/v2/order?'+params,headers);validateQuote(q,intent,this.owner);
  const tx=getTransactionDecoder().decode(Buffer.from(q.transaction,'base64'));const message=getCompiledTransactionMessageDecoder().decode(tx.messageBytes);
  if(message.version!==0||message.header.numSignerAccounts!==1||message.header.numReadonlySignerAccounts!==0||message.staticAccounts[0]!==this.owner)throw Error('Unexpected transaction signer or version');
  const loadedWritable:string[]=[],loadedReadonly:string[]=[];
  for(const lookup of message.addressTableLookups??[]){const a=await rpc('getAccountInfo',[lookup.lookupTableAddress,{encoding:'base64',commitment:'confirmed'}]);if(!a.value||a.value.owner!=='AddressLookupTab1e1111111111111111111111111')throw Error('Missing lookup table');const raw=Buffer.from(a.value.data[0],'base64');
   for(const [indexes,dest] of [[lookup.writableIndexes,loadedWritable],[lookup.readonlyIndexes,loadedReadonly]] as const)for(const index of indexes){const key=raw.subarray(56+index*32,88+index*32);if(key.length!==32)throw Error('Invalid lookup address');dest.push(bs58.encode(key));}}
  const keys=[...message.staticAccounts,...loadedWritable,...loadedReadonly];
  for(const ix of message.instructions){const program=keys[ix.programAddressIndex];if(!PROGRAMS.has(program))throw Error('Unexpected transaction program');
   // Swaps must not change mint authorities, approve delegates, mint, burn, freeze, or thaw.
   if(TOKEN_PROGRAMS.includes(program)&&![1,3,9,12,16,17,18,21,22].includes(ix.data?.[0]??-1))throw Error('Unexpected token instruction');
  }
  const mintInfo=await rpc('getAccountInfo',[intent.mint,{encoding:'base64',commitment:'finalized'}]);if(!mintInfo.value||!TOKEN_PROGRAMS.includes(mintInfo.value.owner))throw Error('Unexpected mint program');
  const accounts=await Promise.all(TOKEN_PROGRAMS.map(programId=>rpc('getTokenAccountsByOwner',[this.owner,{programId},{encoding:'base64',commitment:'confirmed'}])));
  const [outputAta]=await getProgramDerivedAddress({seeds:[bs58.decode(this.owner),bs58.decode(mintInfo.value.owner),bs58.decode(intent.mint)],programAddress:address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')});
  const writable=new Set([...message.staticAccounts.filter((_,i)=>i<message.header.numSignerAccounts-message.header.numReadonlySignerAccounts||i>=message.header.numSignerAccounts&&i<message.staticAccounts.length-message.header.numReadonlyNonSignerAccounts),...loadedWritable]);
  const addresses=[...new Set([this.owner,...accounts.flatMap(a=>a.value.map((v:any)=>v.pubkey)).filter((key:string)=>writable.has(key)),outputAta])];if(addresses.length>90)throw Error('Wallet has too many token accounts for safe simulation');
  const before=await rpc('getMultipleAccounts',[addresses,{encoding:'base64',commitment:'confirmed'}]);
  const signature=sign?this.signer!.sign(new Uint8Array(tx.messageBytes)):Buffer.alloc(64);const signed=Buffer.concat([Buffer.from([1]),signature,Buffer.from(tx.messageBytes)]).toString('base64');
  const simulation=await rpc('simulateTransaction',[signed,{encoding:'base64',sigVerify:sign,commitment:'confirmed',minContextSlot:before.context.slot,accounts:{encoding:'base64',addresses}}]);
  if(simulation.value.err||!simulation.value.accounts)throw Error('Swap simulation failed');checkSimulation(before.value,simulation.value.accounts,intent,BigInt(q.otherAmountThreshold),this.owner);
  if(Date.now()-intent.at>30_000)throw Error('Quote expired during validation');
  return {pending:{intent,signature:bs58.encode(signature),lastValidBlockHeight:Number(q.lastValidBlockHeight),submittedAt:Date.now()},signed,requestId:q.requestId};
 }
 async submit(prepared:{signed:string;requestId:string}){
  const headers:Record<string,string>={'Content-Type':'application/json'};if(process.env.JUPITER_API_KEY)headers['x-api-key']=process.env.JUPITER_API_KEY;
  // A timeout is an unknown outcome. Reconcile the saved signature; never create another order here.
  try{await fetch('https://api.jup.ag/swap/v2/execute',{method:'POST',headers,body:JSON.stringify({signedTransaction:prepared.signed,requestId:prepared.requestId}),signal:AbortSignal.timeout(15_000)});}catch{}
 }
}
