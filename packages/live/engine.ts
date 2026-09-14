import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {FloorEngine} from '../core/sim/engine';
import type {Snapshot,Desk} from '../core/types';
import {STOCKS,SOL,LIMITS,buyingBudget,buySize} from './config';
import {readPrices,readWallet,rpc,freshPrice,type Wallet,type Price} from './market';
import {Executor,loadSigner,type Intent,type Pending} from './executor';
type Journal={version:1;owner:string;mode:'live'|'shadow';snapshot:Snapshot;expected:Wallet|null;netFundingUsd:number;highWater:number;pending:Pending|null;lastAttempt:number;day:string;dailyTrades:number;receipts?:{signature:string;at:number;failed:boolean;intent:Intent}[];history:Record<string,{at:number;price:number}[]>};
export class LiveEngine extends FloorEngine{
 private journal:Journal;private file:string;private executor?:Executor;private lastError='';private stopRequested=false;
 requestStop(){this.stopRequested=true;}
 private constructor(owner:string,mode:'live'|'shadow',dir:string){
  super();this.file=join(dir,'trading-'+mode+'.json');
  this.state={...this.state,mode,cash:0,nav:0,openNav:0,now:Date.now(),events:[],tickets:[],curve:[]};
  this.state.desks.forEach((d,i)=>{d.symbol=STOCKS[i].symbol;d.price=0;d.reference=0;d.lastThinkPrice=0;});
  this.journal={version:1,owner,mode,snapshot:this.state,expected:null,netFundingUsd:0,highWater:0,pending:null,lastAttempt:0,day:'',dailyTrades:0,history:{}};
  if(mode==='live'){if(process.env.LIVE_TRADING_ENABLED!=='1'||process.env.PAPER!=='0')throw Error('Live trading requires PAPER=0 and LIVE_TRADING_ENABLED=1');this.executor=new Executor(owner,loadSigner(owner));}
 }
 static async open(){
  const owner=process.env.CREATOR_WALLET;if(!owner)throw Error('CREATOR_WALLET is required');
  const mode=process.env.DATA_MODE==='live'?'live':'shadow',dir=process.env.DATA_DIR??'data';await mkdir(dir,{recursive:true});const engine=new LiveEngine(owner,mode,dir);
  try{const j=JSON.parse(await readFile(engine.file,'utf8')) as Journal;if(j.version!==1||j.owner!==owner||j.mode!==mode||j.snapshot.desks.length!==12)throw Error('Trading journal does not match this wallet');engine.journal=j;engine.restore(j.snapshot);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  await engine.persist();return engine;
 }
 private async persist(){this.journal.snapshot=this.state;await writeFile(this.file+'.tmp',JSON.stringify(this.journal),{mode:0o600});await rename(this.file+'.tmp',this.file);}
 private status(message:string){if(this.state.treasury)this.state.treasury.status=message;}
 private async settle(){
  const p=this.journal.pending;if(!p)return 0;
  const tx=await rpc('getTransaction',[p.signature,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]);
  if(!tx){const status=await rpc('getSignatureStatuses',[[p.signature],{searchTransactionHistory:true}]);const height=await rpc('getBlockHeight',[{commitment:'finalized'}]);
   if(!status.value[0]&&height>p.lastValidBlockHeight+150){this.emit('ORDER_EXPIRED','Unconfirmed order expired without a receipt.',p.intent.deskId);this.journal.pending=null;await this.persist();return 0;}
   this.status('Waiting for finalized transaction');return -1;
  }
  if(!tx.meta||!this.journal.expected)throw Error('Missing transaction accounting');
  const keys=[...tx.transaction.message.accountKeys,...(tx.meta.loadedAddresses?.writable??[]),...(tx.meta.loadedAddresses?.readonly??[])];const index=keys.indexOf(this.journal.owner);if(index<0)throw Error('Receipt does not contain treasury wallet');
  const nativeDelta=tx.meta.postBalances[index]-tx.meta.preBalances[index];if(!Number.isSafeInteger(nativeDelta))throw Error('Invalid receipt balance');
  const expected=structuredClone(this.journal.expected);expected.lamports+=nativeDelta;
  const deltas=new Map<string,{amount:bigint;decimals:number}>();
  for(const [sign,list] of [[-1,tx.meta.preTokenBalances],[1,tx.meta.postTokenBalances]] as const)for(const b of list??[]){if(b.owner!==this.journal.owner)continue;const old=deltas.get(b.mint);deltas.set(b.mint,{amount:(old?.amount??0n)+BigInt(sign)*BigInt(b.uiTokenAmount.amount),decimals:b.uiTokenAmount.decimals});}
  for(const [mint,delta] of deltas){let h=expected.holdings.find(h=>h.mint===mint);if(!h){h={mint,amount:'0',decimals:delta.decimals};expected.holdings.push(h);}h.amount=(BigInt(h.amount)+delta.amount).toString();}
  const d=this.state.desks.find(d=>d.id===p.intent.deskId)!;
  if(tx.meta.err){this.emit('ORDER_FAILED','Solana rejected the swap. Network costs remain in P&L.',d.id);}
  else{
   const change=Number(deltas.get(p.intent.mint)?.amount??0n)/10**p.intent.decimals*(p.intent.multiplier??1),qty=Math.abs(change),usd=Math.abs(nativeDelta)/1e9*p.intent.solPrice;
   if(qty<=0||(p.intent.side==='BUY'?change<=0:change>=0))throw Error('Unexpected confirmed stock movement');
   if(p.intent.side==='BUY')d.cost+=usd;else{const basis=d.qty?d.cost/d.qty:0;d.realized+=nativeDelta/1e9*p.intent.solPrice-qty*basis;d.cost=Math.max(0,d.cost-qty*basis);}
   d.lastOrder=Date.now();d.ordersToday++;this.state.turnover+=usd;
   this.emit('FILL',d.symbol+' '+p.intent.side+' confirmed on Solana.',d.id);
   this.state.tickets.unshift({id:this.state.events.at(-1)!.id,at:Date.now(),deskId:d.id,symbol:d.symbol,side:p.intent.side,usd,qty,price:usd/qty,paper:false,signature:p.signature});this.state.tickets=this.state.tickets.slice(0,500);d.state='ELATED';
  }
  this.journal.receipts??=[];this.journal.receipts.push({signature:p.signature,at:Date.now(),failed:!!tx.meta.err,intent:p.intent});this.journal.expected=expected;this.journal.pending=null;await this.persist();return tx.slot;
 }
 async cycle(){
  this.state.now=Date.now();
  try{
   const settledSlot=await this.settle();if(settledSlot<0){await this.persist();return;}
   const [wallet,prices]=await Promise.all([readWallet(this.journal.owner,settledSlot),readPrices()]);
   if(!freshPrice(prices[SOL],wallet.slot))throw Error('SOL price is stale');
   // Missing prices on held assets halt valuation rather than silently valuing them at zero.
   for(const stock of STOCKS){const h=wallet.holdings.find(h=>h.mint===stock.mint);if(h&&BigInt(h.amount)>0n&&!freshPrice(prices[stock.mint],wallet.slot))throw Error('A held stock has no fresh price');}
   this.account(wallet,prices);
   const day=new Date().toISOString().slice(0,10);if(this.journal.day!==day){this.journal.day=day;this.journal.dailyTrades=0;for(const d of this.state.desks)d.ordersToday=0;}
   this.lastError='';this.state.connected=true;
   if(process.env.KILL_SWITCH==='1')this.state.killed=true;
   if(this.state.nav<this.journal.highWater*(1-LIMITS.drawdownFraction)){this.state.killed=true;this.emit('CIRCUIT_BREAKER','Treasury drawdown reached 15%. Trading halted.');}
   this.status(this.state.killed?'Trading halted':this.journal.mode==='shadow'?'Observing wallet · execution disabled':'Watching stock markets');
   await this.persist();
   if(this.stopRequested||this.state.killed||this.state.paused||Date.now()-this.journal.lastAttempt<LIMITS.intervalMs||this.journal.dailyTrades>=LIMITS.maxDailyTrades)return;
   const intent=this.propose(wallet,prices);if(!intent)return;
   this.journal.lastAttempt=Date.now();const d=this.state.desks.find(d=>d.id===intent.deskId)!;d.state='PITCHING';d.lastThink=Date.now();this.emit('PITCH_MADE',d.symbol+': '+intent.side+' proposed from observed market prices.',d.id);
   const forecast={id:this.state.events.at(-1)!.id,at:Date.now(),due:Date.now()+3_600_000,spot:d.price,target:d.price*(intent.side==='BUY'?1.01:.99),benchmarkSpot:this.state.desks[1].price};
   d.forecasts.push(forecast);d.forecasts=d.forecasts.slice(-200);
   d.pitches.unshift({id:forecast.id,at:forecast.at,side:intent.side,conviction:5,usd:Number(intent.amount)/10**(intent.side==='BUY'?9:intent.decimals)*(intent.side==='BUY'?intent.solPrice:intent.tokenPrice),thesis:intent.side==='BUY'?'Small starter position or positive price momentum. Shared treasury limits apply.':'Reducing exposure after a gain, loss, or negative momentum.',bark:'Boss, check the tape!',decision:this.executor?'VALIDATING':'OBSERVE',reason:this.executor?'Awaiting quote and transaction checks.':'Wallet preview does not execute orders.',forecast,violations:[]});d.pitches=d.pitches.slice(0,100);await this.persist();
   if(!this.executor){this.emit('PITCH_APPROVED',d.symbol+': observation only; no order signed or sent.',d.id);await this.persist();return;}
   const prepared=await this.executor.prepare(intent);
   if(this.stopRequested||process.env.KILL_SWITCH==='1'||this.state.killed)return;
   this.journal.pending=prepared.pending;this.journal.dailyTrades++;this.status('Transaction pending');this.state.treasury!.pendingSignature=prepared.pending.signature;
   this.emit('ORDER_SENT',d.symbol+': submitting validated Solana swap.',d.id);
   // Durable intent precedes all network submission. A crashed process only reconciles this signature.
   await this.persist();await this.executor.submit(prepared);
  }catch(e){const message=(e as Error).message;this.state.connected=false;this.status(message);if(message!==this.lastError){this.emit('RISK_BLOCK',message);this.lastError=message;}await this.persist();}
 }
 private account(wallet:Wallet,prices:Record<string,Price>){
  const solPrice=prices[SOL].usdPrice,old=this.journal.expected;let flow=(wallet.lamports-(old?.lamports??0))/1e9*solPrice;
  for(const stock of STOCKS){const d=this.state.desks.find(d=>d.id===stock.deskId)!,p=prices[stock.mint];const h=wallet.holdings.find(h=>h.mint===stock.mint),previous=old?.holdings.find(h=>h.mint===stock.mint);const multiplier=p?.multiplier??1,qty=h?Number(h.amount)/10**h.decimals*multiplier:0,prior=previous?Number(previous.amount)/10**previous.decimals*multiplier:0;
   if(p){
    for(const f of d.forecasts.filter(f=>f.actual===undefined&&f.due<=Date.now())){if(!freshPrice(p,wallet.slot))continue;f.actual=p.usdPrice;f.hit=Math.sign(f.target-f.spot)===Math.sign(p.usdPrice-f.spot);f.error=Math.abs(p.usdPrice-f.target)/p.usdPrice;this.emit(f.hit?'FORECAST_HIT':'FORECAST_MISS',d.symbol+': one-hour forecast '+(f.hit?'hit':'miss')+'.',d.id);}
    const transfer=(qty-prior)*p.usdPrice;flow+=transfer;d.cost=Math.max(0,d.cost+transfer);d.price=p.usdPrice;d.reference=p.usdPrice;d.change=p.priceChange24h??0;
    if(freshPrice(p,wallet.slot)){const history=this.journal.history[d.id]??[];if(!history.length||Date.now()-history.at(-1)!.at>=55_000)history.push({at:Date.now(),price:p.usdPrice});this.journal.history[d.id]=history.filter(h=>h.at>Date.now()-3_600_000);}}
   d.qty=qty;d.state='RESEARCHING';
  }
  this.journal.netFundingUsd+=flow;this.journal.highWater+=flow;
  if(old&&Math.abs(flow)>.01)this.emit('TREASURY_FLOW',(flow>=0?'Funding received: $':'Treasury withdrawal: $')+Math.abs(flow).toFixed(2)+'. Excluded from trading profit.');
  this.state.cash=wallet.lamports/1e9*solPrice;this.state.nav=this.state.cash+this.state.desks.reduce((v,d)=>v+d.qty*d.price,0);this.state.openNav=this.journal.netFundingUsd;
  this.journal.highWater=Math.max(this.journal.highWater,this.state.nav);this.journal.expected=wallet;
  this.state.treasury={wallet:this.journal.owner,sol:wallet.lamports/1e9,availableSol:buyingBudget(wallet.lamports)/1e9,netFundingUsd:this.journal.netFundingUsd,pnlUsd:this.state.nav-this.journal.netFundingUsd,updatedAt:Date.now(),status:'Connected'};
  this.state.curve.push({at:Date.now(),nav:this.state.nav-this.journal.netFundingUsd});this.state.curve=this.state.curve.slice(-240);
 }
 private propose(wallet:Wallet,prices:Record<string,Price>):Intent|undefined{
  for(const d of [...this.state.desks].sort((a,b)=>a.lastThink-b.lastThink)){
   const stock=STOCKS.find(s=>s.deskId===d.id)!,p=prices[stock.mint],history=this.journal.history[d.id]??[];
   if(!freshPrice(p,wallet.slot)||history.length<3||Date.now()-d.lastOrder<LIMITS.deskIntervalMs)continue;
   const momentum=p.usdPrice/history[0].price-1,gain=d.cost>0?d.qty*p.usdPrice/d.cost-1:0;
   const sell=d.qty>0&&(gain>=.03||gain<=-.02||momentum<-.005);
   if(!sell&&d.qty>0&&momentum<.0025)continue;
   const units=sell?Math.floor(Math.min(d.qty*.5,LIMITS.maxTradeLamports/1e9*prices[SOL].usdPrice/p.usdPrice)/(p.multiplier??1)*10**p.decimals):buySize(wallet.lamports,this.state.nav,d.qty*d.price,prices[SOL].usdPrice);
   const valueSol=sell?units/10**p.decimals*(p.multiplier??1)*p.usdPrice/prices[SOL].usdPrice:units/1e9;
   if(!Number.isSafeInteger(units)||units<=0||valueSol<LIMITS.minTradeLamports/1e9)continue;
   return {deskId:d.id,side:sell?'SELL':'BUY',mint:stock.mint,amount:String(units),decimals:p.decimals,solPrice:prices[SOL].usdPrice,tokenPrice:p.usdPrice*(p.multiplier??1),multiplier:p.multiplier??1,at:Date.now()};
  }
 }
 override command(action:string){if(action==='pause')this.state.paused=!this.state.paused;else if(action==='kill')this.state.killed=!this.state.killed;else throw Error('Simulation commands are disabled for a real wallet');}
}
