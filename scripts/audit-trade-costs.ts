// Read-only receipt audit. No signer, executor or owner controls are imported.
import {readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {rpc} from '../packages/live/market';
import {SOL} from '../packages/live/config';
import type {Snapshot} from '../packages/core/types';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const state=JSON.parse((await readFile('reports/trading-cost-snapshot.json','utf8')).replace(/^\uFEFF/,'')) as Snapshot;
const owner=state.treasury?.wallet;if(!owner)throw Error('Snapshot has no wallet');
const rows=[];
for(const ticket of [...state.tickets].reverse()){
 if(!ticket.signature)continue;
 const tx=await rpc('getTransaction',[ticket.signature,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]);
 if(!tx?.meta||tx.meta.err)throw Error('Missing successful receipt for '+ticket.signature);
 const keys=[...tx.transaction.message.accountKeys,...(tx.meta.loadedAddresses?.writable??[]),...(tx.meta.loadedAddresses?.readonly??[])],index=keys.indexOf(owner);
 if(index<0)throw Error('Owner absent from receipt');
 const delta=tx.meta.postBalances[index]-tx.meta.preBalances[index];
 const owned=new Set<number>();
 for(const balance of [...(tx.meta.preTokenBalances??[]),...(tx.meta.postTokenBalances??[])])if(balance.owner===owner&&balance.mint!==SOL)owned.add(balance.accountIndex);
 const storageDelta=[...owned].reduce((sum,i)=>sum+tx.meta.postBalances[i]-tx.meta.preBalances[i],0);
 const fee=index===0?tx.meta.fee:0;
 // Residual is a cash-flow estimate, not a decoded DEX swap fee or spread.
 const swapFlow=delta+storageDelta+fee;
 const solUsd=ticket.usd/(Math.abs(delta)/1e9);
 rows.push({symbol:ticket.symbol,side:ticket.side,at:ticket.at,signature:ticket.signature,qty:ticket.qty,
  walletFlowSol:delta/1e9,networkFeeSol:fee/1e9,storageDepositDeltaSol:storageDelta/1e9,
  residualSwapFlowSol:swapFlow/1e9,recordedUsd:ticket.usd,networkFeeUsd:fee/1e9*solUsd,storageDepositDeltaUsd:storageDelta/1e9*solUsd,
  residualUnitPriceUsd:Math.abs(swapFlow)/1e9*solUsd/ticket.qty});
}
const report={asOf:new Date(state.now).toISOString(),wallet:owner,scope:'Successful receipts retained in public snapshot; excludes failed submissions and any older/missing history. Residual flow does not isolate DEX fees or spread.',
 totals:{receipts:rows.length,networkFeesSol:rows.reduce((s,r)=>s+r.networkFeeSol,0),netStorageDepositsSol:rows.reduce((s,r)=>s+r.storageDepositDeltaSol,0),networkFeesUsd:rows.reduce((s,r)=>s+r.networkFeeUsd,0),netStorageDepositsUsd:rows.reduce((s,r)=>s+r.storageDepositDeltaUsd,0)},rows};
await writeFile('reports/trading-cost-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({totals:report.totals,scope:report.scope,recent:rows.slice(-4)},null,2));
