import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {generateKeyPairSync} from 'node:crypto';import {address} from '@solana/addresses';import bs58 from 'bs58';
function keypair(){const {privateKey,publicKey}=generateKeyPairSync('ed25519');const pub=publicKey.export({type:'spki',format:'der'}).subarray(-32);return {publicKey:bs58.encode(pub),secretKey:Buffer.concat([privateKey.export({type:'pkcs8',format:'der'}).subarray(-32),pub])};}
import {buyingBudget,buySize,exitFraction,LIMITS,SOL,STOCKS,TOKEN_PROGRAMS} from '../packages/live/config';
import {checkSimulation,validateQuote,loadSigner,fetchSwapQuote,type Intent} from '../packages/live/executor';
test('unsigned quote retry recovers routing failure but never retries bad authentication',async()=>{const original=globalThis.fetch;let calls=0;try{globalThis.fetch=async()=>++calls===1?Response.json({error:'Failed to get quotes'},{status:400}):Response.json({requestId:'ok'});assert.equal((await fetchSwapQuote('https://quote.test',{})).requestId,'ok');assert.equal(calls,2);calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:'Unauthorized'},{status:401});};await assert.rejects(fetchSwapQuote('https://quote.test',{}),/401/);assert.equal(calls,1);}finally{globalThis.fetch=original;}});
import {LiveEngine} from '../packages/live/engine';import {freshPrice} from '../packages/live/market';
import {entryBasis} from '../packages/live/entry-basis';
import {updateLiveScore} from '../packages/core/scoring';
import {FloorEngine} from '../packages/core/sim/engine';
test('live scores wait for evidence and update without changing holdings or hiring state',()=>{const d=new FloorEngine().state.desks[0];updateLiveScore(d,100,1000);assert.equal(d.scoreAt,undefined);d.lastOrder=1;d.qty=2;d.price=10;d.cost=18;d.realized=1;d.forecasts=[{id:1,at:1,due:2,spot:9,target:10,benchmarkSpot:1,actual:10,hit:true,error:0}];const before=structuredClone(d);updateLiveScore(d,100,2000);assert.ok(Math.abs(d.score-.415)<1e-12);assert.equal(d.scoreAt,2000);assert.equal(d.qty,before.qty);assert.equal(d.cost,before.cost);assert.equal(d.analystId,before.analystId);updateLiveScore(d,0,3000);assert.equal(d.scoreAt,2000);});
const owner=keypair().publicKey;
const intent:Intent={deskId:'nvda',side:'BUY',mint:STOCKS[0].mint,amount:'10000000',decimals:8,solPrice:100,tokenPrice:100,at:Date.now()};
const quote=()=>({router:'metis',taker:owner,inputMint:SOL,outputMint:intent.mint,inAmount:intent.amount,outAmount:'1000000',otherAmountThreshold:'995000',swapMode:'ExactIn',transaction:'encoded',requestId:'test',slippageBps:50,priceImpact:.1,signatureFeeLamports:5000,prioritizationFeeLamports:5000,rentFeeLamports:2039280,feeBps:10,lastValidBlockHeight:'12345'});

test('price exit basis excludes setup overhead, handles partial exits and scaled units, and refuses unknown transfers',()=>{
 const buy={id:1,at:1,deskId:'nvda',symbol:'NVDAx',side:'BUY' as const,usd:3.25,qty:.03,price:3.25/.03,paper:false,signature:'buy'};
 const receipts=[{signature:'buy',failed:false,intent:{...intent,amount:'30000000'}}];
 assert.equal(entryBasis('nvda',.03,1,[buy],receipts),3);
 assert.ok(.03*100/buy.usd-1<-.02); // Old cash basis spuriously passed the loss trigger.
 assert.equal(.03*100/entryBasis('nvda',.03,1,[buy],receipts)!-1,0);
 const sell={...buy,id:2,signature:'sell',side:'SELL' as const,qty:.015};
 const both=[...receipts,{signature:'sell',failed:false,intent:{...intent,side:'SELL' as const,amount:'1500000'}}];
 assert.equal(entryBasis('nvda',.015,1,[buy,sell],both),1.5);
 assert.equal(entryBasis('nvda',.0165,1.1,[buy,sell],both),1.5);
 assert.equal(entryBasis('nvda',.02,1,[buy,sell],both),undefined);
 assert.equal(entryBasis('nvda',.015,1,[sell],both),undefined);
 assert.equal(entryBasis('nvda',.03,1,[buy],[...receipts,{signature:'failed',failed:true,intent}]),3);
});
test('whole-wallet budget grows with claims while preserving fees and per-trade limits',()=>{assert.equal(buyingBudget(1e9),970000000);assert.equal(buyingBudget(2e9),1970000000);assert.equal(buyingBudget(1),0);assert.equal(buySize(1e9,100,0,100),19270000);assert.equal(buySize(1e9,100,15,100),0);assert.equal(buySize(30000000,100,0,100),0);assert.throws(()=>buyingBudget(NaN));});

test('allocation varies with funding, momentum and exposure without exceeding bounds',()=>{
 const starter=buySize(2.5e9,250,0,100,0),weak=buySize(2.5e9,250,5,100,.0025),strong=buySize(2.5e9,250,5,100,.02);
 assert.ok(starter<weak&&weak<strong);assert.equal(strong,150000000);
 assert.ok(buySize(1e9,100,0,100,0)<starter);
 assert.ok(buySize(2.5e9,250,37.4,100,.02)<=1000001);
 assert.equal(buySize(30_000_000,250,0,100,.02),0);
 assert.throws(()=>buySize(1e9,100,0,100,NaN));
 assert.equal(exitFraction(.04,.01),.25);assert.equal(exitFraction(.01,-.01),.5);assert.equal(exitFraction(-.03,-.01),.75);
});

test('research events are spaced and do not change trading accounting or proposals',()=>withLiveControl(async(e,_who,prices)=>{
 const wallet={lamports:2500000000,holdings:[],slot:1000},d=e.state.desks[0];d.qty=.1;d.cost=10;
 (e as any).journal.history[d.id]=[{at:1,price:100},{at:2,price:100},{at:3,price:100}];
 const before={qty:d.qty,cost:d.cost,forecasts:d.forecasts.length,pitches:d.pitches.length};
 (e as any).research(wallet,prices);assert.equal(e.state.events.at(-1)?.kind,'PITCH_REJECTED');
 assert.deepEqual({qty:d.qty,cost:d.cost,forecasts:d.forecasts.length,pitches:d.pitches.length},before);
 const count=e.state.events.length;(e as any).research(wallet,prices);assert.equal(e.state.events.length,count);assert.equal(e.controlStatus().pending,null);
}));

test('live proposal does not sell an unchanged stock merely because setup costs exceed the loss threshold',()=>withLiveControl(async(e,_who,prices)=>{
 const d=e.state.desks[0];d.qty=.03;d.cost=3.25;d.price=100;d.lastOrder=0;
 e.state.tickets=[{id:1,at:1,deskId:d.id,symbol:d.symbol,side:'BUY',usd:3.25,qty:.03,price:3.25/.03,paper:false,signature:'entry'}];
 (e as any).journal.receipts=[{signature:'entry',at:1,failed:false,intent:{...intent,amount:'30000000'}}];
 (e as any).journal.history[d.id]=[{at:1,price:100},{at:2,price:100},{at:3,price:100}];
 assert.equal((e as any).propose({lamports:1e9,holdings:[],slot:1000},prices),undefined);
 prices[STOCKS[0].mint].usdPrice=97;
 assert.equal((e as any).propose({lamports:1e9,holdings:[],slot:1000},prices)?.side,'SELL');
}));
test('issuer mint allowlist is unique and contains only valid Solana addresses',()=>{assert.equal(new Set(STOCKS.map(s=>s.mint)).size,12);for(const s of STOCKS)assert.equal(address(s.mint),s.mint);assert.equal(STOCKS.find(s=>s.deskId==='spcx')?.symbol,'COINx');});
test('quote rejects wrong mint, owner, excessive costs, stale prices and oversized trades',()=>{validateQuote(quote(),intent,owner,intent.at);for(const change of [{outputMint:SOL},{taker:keypair().publicKey},{slippageBps:500},{priceImpact:2},{rentFeeLamports:9000000},{outAmount:'1'},{otherAmountThreshold:'0'},{router:'jupiterz'},{feeBps:100}])assert.throws(()=>validateQuote({...quote(),...change},intent,owner,intent.at));assert.throws(()=>validateQuote(quote(),intent,owner,intent.at+31000));assert.throws(()=>validateQuote(quote(),{...intent,amount:'1000000000'},owner,intent.at));});
function token(amount:bigint){const raw=Buffer.alloc(165);Buffer.from(bs58.decode(intent.mint)).copy(raw);Buffer.from(bs58.decode(owner)).copy(raw,32);raw.writeBigUInt64LE(amount,64);raw[108]=1;return {owner:TOKEN_PROGRAMS[0],lamports:2039280,data:[raw.toString('base64'),'base64']};}
test('quote cost guard rejects disproportionate fees on both sides and separates storage deposits',()=>{
 const expensive={...quote(),signatureFeeLamports:5000,prioritizationFeeLamports:195000};
 assert.throws(()=>validateQuote(expensive,intent,owner,intent.at),/execution costs/);
 validateQuote({...quote(),rentFeeLamports:6000000},intent,owner,intent.at);
 const sell={...intent,side:'SELL' as const,amount:'1000000'};
 const sellQuote={...quote(),inputMint:intent.mint,outputMint:SOL,inAmount:sell.amount,outAmount:'10000000',otherAmountThreshold:'9950000'};
 validateQuote(sellQuote,sell,owner,intent.at);
 assert.throws(()=>validateQuote({...sellQuote,prioritizationFeeLamports:195000},sell,owner,intent.at),/execution costs/);
 assert.throws(()=>validateQuote({...quote(),feeBps:30,priceImpact:.5,prioritizationFeeLamports:20000},intent,owner,intent.at),/execution costs/);
});
const native=(lamports:number)=>({owner:'11111111111111111111111111111111',lamports,data:['','base64'],executable:false});
test('transaction simulation accepts expected output and rejects SOL drain, hidden token spends and delegation',()=>{
 const before=[native(1e9),token(100n)],after=[native(987950000),token(1000100n)];checkSimulation(before,after,intent,995000n,owner);
 assert.throws(()=>checkSimulation(before,[native(1000),after[1]],intent,995000n,owner));
 assert.throws(()=>checkSimulation(before,[after[0],token(0n)],intent,995000n,owner));
 const delegated=token(1000100n),raw=Buffer.from(delegated.data[0],'base64');raw.writeUInt32LE(1,72);delegated.data[0]=raw.toString('base64');assert.throws(()=>checkSimulation(before,[after[0],delegated],intent,995000n,owner));
 assert.throws(()=>checkSimulation(before,[after[0],null],intent,995000n,owner));
});
test('stale or missing price cannot qualify for execution',()=>{assert.equal(freshPrice(undefined,1000),false);assert.equal(freshPrice({usdPrice:100,decimals:8,blockId:100},1000),false);assert.equal(freshPrice({usdPrice:100,decimals:8,blockId:999},1000),true);});
test('signer refuses a key for another wallet',()=>{const saved=process.env.TRADING_PRIVATE_KEY;try{process.env.TRADING_PRIVATE_KEY=JSON.stringify([...keypair().secretKey]);assert.throws(()=>loadSigner(owner),/does not match/);}finally{if(saved===undefined)delete process.env.TRADING_PRIVATE_KEY;else process.env.TRADING_PRIVATE_KEY=saved;}});
test('funding accounting, persistence and wallet-change protection',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'floor-live-test-'));const saved={...process.env};process.env.DATA_DIR=dir;process.env.CREATOR_WALLET=owner;process.env.DATA_MODE='shadow';
 try{const e=await LiveEngine.open();const prices=Object.fromEntries([SOL,...STOCKS.map(s=>s.mint)].map(m=>[m,{usdPrice:100,decimals:8,blockId:1000}]));
 const wallet={lamports:1e9,holdings:[],slot:1000};(e as any).account(wallet,prices);assert.equal(e.state.nav,100);assert.equal(e.state.treasury!.pnlUsd,0);
 (e as any).account({...wallet,lamports:2e9},prices);assert.equal(e.state.nav,200);assert.equal(e.state.treasury!.netFundingUsd,200);assert.equal(e.state.treasury!.pnlUsd,0);
 (e as any).account({...wallet,lamports:2e9},{...prices,[SOL]:{...prices[SOL],usdPrice:110}});assert.equal(e.state.treasury!.pnlUsd,20);
 await (e as any).persist();const restored=await LiveEngine.open();assert.equal(restored.state.treasury!.pnlUsd,20);assert.equal(restored.state.mode,'shadow');
 process.env.CREATOR_WALLET=keypair().publicKey;await assert.rejects(()=>LiveEngine.open(),/does not match/);
 }finally{process.env=saved;await rm(dir,{recursive:true,force:true});}
});
test('unresolved saved transaction survives restart and cannot be submitted twice',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'floor-pending-test-'));const saved={...process.env},fetchSaved=globalThis.fetch;process.env.DATA_DIR=dir;process.env.CREATOR_WALLET=owner;process.env.DATA_MODE='shadow';
 try{const e=await LiveEngine.open();(e as any).journal.pending={intent,signature:'pending-signature',lastValidBlockHeight:12345,submittedAt:Date.now()};await (e as any).persist();let calls:string[]=[];
 globalThis.fetch=async(_url,options)=>{const method=JSON.parse(options!.body as string).method;calls.push(method);return Response.json({result:method==='getTransaction'?null:method==='getSignatureStatuses'?{value:[null]}:12000});};process.env.RPC_URL='https://rpc.test';
 const restored=await LiveEngine.open();await restored.cycle();assert.deepEqual(calls,['getTransaction','getSignatureStatuses','getBlockHeight']);const disk=JSON.parse(await readFile(join(dir,'trading-shadow.json'),'utf8'));assert.equal(disk.pending.signature,'pending-signature');assert.equal(restored.state.tickets.length,0);
 }finally{globalThis.fetch=fetchSaved;process.env=saved;await rm(dir,{recursive:true,force:true});}
});
import {createPublicKey,verify} from 'node:crypto';
test('signing uses the matching ed25519 key and signs the exact message',()=>{const keys=keypair(),saved=process.env.TRADING_PRIVATE_KEY;try{process.env.TRADING_PRIVATE_KEY=bs58.encode(keys.secretKey);const signer=loadSigner(keys.publicKey),message=Buffer.from('test transaction message');const signature=signer.sign(message);const publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(bs58.decode(keys.publicKey))]),type:'spki',format:'der'});assert.equal(verify(null,message,publicKey,signature),true);assert.equal(verify(null,Buffer.from('other transaction'),publicKey,signature),false);}finally{if(saved===undefined)delete process.env.TRADING_PRIVATE_KEY;else process.env.TRADING_PRIVATE_KEY=saved;}});
test('scaled stock balances increase NAV without inventing a deposit',async()=>{const dir=await mkdtemp(join(tmpdir(),'floor-scaled-test-')),saved={...process.env};process.env.DATA_DIR=dir;process.env.CREATOR_WALLET=owner;process.env.DATA_MODE='shadow';try{const e=await LiveEngine.open(),prices=Object.fromEntries([SOL,...STOCKS.map(s=>s.mint)].map(m=>[m,{usdPrice:100,decimals:8,blockId:1000,multiplier:1}]));const w={lamports:1e9,holdings:[{mint:STOCKS[0].mint,amount:'100000000',decimals:8}],slot:1000};(e as any).account(w,prices);assert.equal(e.state.nav,200);(e as any).account(w,{...prices,[STOCKS[0].mint]:{...prices[STOCKS[0].mint],multiplier:1.1}});assert.equal(e.state.desks[0].qty,1.1);assert.equal(e.state.treasury!.netFundingUsd,200);assert.equal(e.state.treasury!.pnlUsd,10);}finally{process.env=saved;await rm(dir,{recursive:true,force:true});}});
test('finalized swap reconciliation counts fees as loss, not funding, exactly once',async()=>{const dir=await mkdtemp(join(tmpdir(),'floor-fill-test-')),saved={...process.env},originalFetch=globalThis.fetch;process.env.DATA_DIR=dir;process.env.CREATOR_WALLET=owner;process.env.DATA_MODE='shadow';process.env.RPC_URL='https://rpc.test';try{const e=await LiveEngine.open(),prices=Object.fromEntries([SOL,...STOCKS.map(s=>s.mint)].map(m=>[m,{usdPrice:100,decimals:8,blockId:1000}]));(e as any).account({lamports:1e9,holdings:[],slot:1000},prices);(e as any).journal.pending={intent,signature:'receipt',lastValidBlockHeight:1234,submittedAt:Date.now()};globalThis.fetch=async()=>Response.json({result:{slot:1000,transaction:{message:{accountKeys:[owner]}},meta:{err:null,preBalances:[1e9],postBalances:[987000000],preTokenBalances:[],postTokenBalances:[{owner,mint:intent.mint,uiTokenAmount:{amount:'1000000',decimals:8}}]}}});await (e as any).settle();(e as any).account({lamports:987000000,holdings:[{mint:intent.mint,amount:'1000000',decimals:8}],slot:1000},prices);assert.equal(e.state.tickets.length,1);assert.equal(e.state.tickets[0].signature,'receipt');assert.equal(e.state.treasury!.netFundingUsd,100);assert.ok(Math.abs(e.state.treasury!.pnlUsd+.3)<1e-8);await (e as any).settle();assert.equal(e.state.tickets.length,1);assert.equal((e as any).journal.receipts.length,1);}finally{globalThis.fetch=originalFetch;process.env=saved;await rm(dir,{recursive:true,force:true});}});
import {authorizedOperator,automaticTradingAllowed} from '../packages/live/control';
test('owner control rejects missing credentials and trading never defaults on',()=>{const secret='x'.repeat(64);assert.equal(authorizedOperator(null,secret),false);assert.equal(authorizedOperator('Bearer '+'y'.repeat(64),secret),false);assert.equal(authorizedOperator('Bearer '+secret,secret),true);assert.equal(authorizedOperator('Bearer short','short'),false);assert.equal(automaticTradingAllowed(undefined,false,false),false);assert.equal(automaticTradingAllowed(true,true,false),false);assert.equal(automaticTradingAllowed(true,false,true),false);assert.equal(automaticTradingAllowed(true,false,false),true);});
async function withLiveControl(fn:(e:LiveEngine,who:string,prices:any)=>Promise<void>){const dir=await mkdtemp(join(tmpdir(),'floor-control-test-')),saved={...process.env},keys=keypair();Object.assign(process.env,{DATA_DIR:dir,CREATOR_WALLET:keys.publicKey,DATA_MODE:'live',PAPER:'0',LIVE_TRADING_ENABLED:'1',TRADING_PRIVATE_KEY:bs58.encode(keys.secretKey),KILL_SWITCH:'0'});try{const e=await LiveEngine.open(),prices=Object.fromEntries([SOL,...STOCKS.map(s=>s.mint)].map(m=>[m,{usdPrice:100,decimals:8,blockId:1000}]));(e as any).account({lamports:2500000000,holdings:[],slot:1000},prices);await fn(e,keys.publicKey,prices);}finally{process.env=saved;await rm(dir,{recursive:true,force:true});}}
test('start requires owner and explicit confirmation, stop survives restart',()=>withLiveControl(async(e,who)=>{assert.equal(e.controlStatus().running,false);await assert.rejects(()=>e.control('start',who),/confirmation/);await assert.rejects(()=>e.control('start',owner,'START_TRADING'),/mismatch/);await e.control('start',who,'START_TRADING');assert.equal(e.controlStatus().running,true);const restored=await LiveEngine.open();assert.equal(restored.controlStatus().running,true);await restored.control('stop',who);assert.equal((await LiveEngine.open()).controlStatus().running,false);}));
test('test simulation protects the non-test balance independently of general trade limits',()=>{const bounded={...intent,maxNativeSpendLamports:16500000,minNativeBalanceLamports:2300000000};checkSimulation([native(2500000000),null],[native(2483500000),token(1000000n)],bounded,995000n,owner);assert.throws(()=>checkSimulation([native(2310000000),null],[native(2299000000),token(1000000n)],bounded,995000n,owner),/Protected/);assert.throws(()=>checkSimulation([native(2500000000),null],[native(2480000000),token(1000000n)],bounded,995000n,owner),/cap/);});
test('stop during test preparation discards the prepared transaction',()=>withLiveControl(async(e,who,prices)=>{await e.control('test',who,'TEST_ONLY');let sent=0;(e as any).executor={prepare:async(i:any)=>{await e.control('stop',who);return {pending:{intent:i,signature:'never-sent',lastValidBlockHeight:2000,submittedAt:Date.now()},signed:'not-a-real-transaction',requestId:'x'};},submit:async()=>{sent++;}};await (e as any).testCycle({lamports:2500000000,holdings:[],slot:1000},prices);assert.equal(sent,0);assert.equal(e.controlStatus().running,false);assert.equal(e.controlStatus().pending,null);assert.equal(e.controlStatus().test?.phase,'stopped');assert.equal(e.controlStatus().testReservedSol,0);}));
test('bounded test buys once, sells only acquired units, and finishes with auto trading off',()=>withLiveControl(async(e,who,prices)=>{const originalFetch=globalThis.fetch;try{await e.control('test',who,'TEST_ONLY');const intents:any[]=[];(e as any).executor={prepare:async(i:any)=>{intents.push(i);return {pending:{intent:i,signature:'test-'+i.side,lastValidBlockHeight:2000,submittedAt:Date.now()},signed:'fixture',requestId:'x'};},submit:async()=>{}};await (e as any).testCycle({lamports:2500000000,holdings:[],slot:1000},prices);assert.equal(intents[0].amount,'10000000');assert.equal(intents[0].minNativeBalanceLamports,2300000000);process.env.RPC_URL='https://rpc.test';const tokens=(amount:string)=>[{owner:who,mint:STOCKS[0].mint,uiTokenAmount:{amount,decimals:8}}];const receipt=(pre:number,post:number,before:any[],after:any[])=>({slot:1000,transaction:{message:{accountKeys:[who]}},meta:{err:null,preBalances:[pre],postBalances:[post],preTokenBalances:before,postTokenBalances:after}});globalThis.fetch=async()=>Response.json({result:receipt(2500000000,2487000000,[],tokens('1000000'))});await (e as any).settle();assert.equal(e.controlStatus().test?.phase,'sell');(e as any).account({lamports:2487000000,holdings:[{mint:STOCKS[0].mint,amount:'1000000',decimals:8}],slot:1000},prices);(e as any).journal.test.lastAttempt=0;await (e as any).testCycle((e as any).journal.expected,prices);assert.equal(intents[1].amount,'1000000');assert.equal(intents[1].side,'SELL');globalThis.fetch=async()=>Response.json({result:receipt(2487000000,2496900000,tokens('1000000'),tokens('0'))});await (e as any).settle();assert.equal(e.controlStatus().test?.phase,'complete');assert.equal(e.controlStatus().running,false);assert.equal(e.controlStatus().pending,null);assert.equal(e.state.tickets.length,2);assert.ok(e.controlStatus().testReservedSol<=.2);await e.control('test',who,'TEST_ONLY');assert.equal(intents.length,2);}finally{globalThis.fetch=originalFetch;}}));
