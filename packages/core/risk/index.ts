export const LIMITS=Object.freeze({maxOrder:50,maxPositionPct:15,minCashPct:20,maxTurnover:300,maxOrders:6,cooldownMs:20*60_000,maxImpactPct:3,maxSlippageBps:150,maxDrawdownPct:25,maxQuoteAgeMs:15000});
export type Order={mint:string;side:'BUY'|'SELL';usd:number;qty:number;price:number;priceImpactPct:number;slippageBps:number;quoteAt:number};
export type RiskState={universe:readonly string[];nav:number;openNav:number;cash:number;positionQty:number;positionValue:number;turnover:number;deskOrders:number;lastOrder:number;now:number;marketOpen:boolean;killSwitch:boolean};
export function evaluate(order:Order,state:RiskState):{ok:boolean;violations:string[]} {
 const v:string[]=[];
 const fail=(test:boolean,msg:string)=>{if(test)v.push(msg)};
 fail(![order.usd,order.qty,order.price,order.priceImpactPct,order.slippageBps,order.quoteAt,state.nav,state.openNav,state.cash,state.positionQty,state.positionValue,state.turnover,state.deskOrders,state.lastOrder,state.now].every(Number.isFinite),'Invalid numeric input');
 fail(order.side!=='BUY'&&order.side!=='SELL','Invalid order side');
 fail(order.usd<=0||order.qty<=0||order.price<=0||order.priceImpactPct<0||order.slippageBps<0,'Invalid order amount');
 fail(state.nav<=0||state.openNav<=0||state.cash<0||state.positionQty<0||state.turnover<0,'Invalid treasury state');
 fail(Math.abs(order.qty*order.price-order.usd)>Math.max(0.01,order.usd*0.001),'Quote amount mismatch');
 fail(!state.universe.includes(order.mint),'Mint is outside routable universe');
 fail(state.killSwitch,'Kill switch active');
 fail(!state.marketOpen,'Market closed');
 fail(state.nav<state.openNav*(1-LIMITS.maxDrawdownPct/100),'Circuit breaker: session drawdown exceeds 25%');
 fail(order.usd>LIMITS.maxOrder,'Order exceeds $50');
 const nextValue=state.positionValue+(order.side==='BUY'?order.usd:-order.usd);
 fail(order.side==='BUY'&&nextValue>state.nav*LIMITS.maxPositionPct/100,'Position exceeds 15% of NAV');
 fail(order.side==='BUY'&&state.cash-order.usd<state.nav*LIMITS.minCashPct/100,'Cash reserve below 20%');
 fail(state.turnover+order.usd>LIMITS.maxTurnover,'Daily turnover exceeds $300');
 fail(state.deskOrders>=LIMITS.maxOrders,'Desk daily order limit reached');
 fail(state.lastOrder>0&&state.now-state.lastOrder<LIMITS.cooldownMs,'Desk cooldown active');
 fail(order.priceImpactPct>LIMITS.maxImpactPct,'Price impact exceeds 3%');
 fail(order.slippageBps>LIMITS.maxSlippageBps,'Slippage exceeds 150 bps');
 fail(state.now-order.quoteAt>LIMITS.maxQuoteAgeMs||order.quoteAt>state.now+1000,'Quote is stale');
 fail(order.side==='SELL'&&order.qty>state.positionQty,'Insufficient token balance');
 return {ok:v.length===0,violations:v};
}

