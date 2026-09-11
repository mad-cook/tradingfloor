import type {Desk,Snapshot,SceneState} from '../types';
import {nav} from '../pricing';
import {paperFill} from '../route';
import {scoreDesk,fireCandidate} from '../scoring';
const cast=[
 ['NVDA','Nico Voss','#cf7345',142,'momentum','wired'],
 ['SPY','Mara Finch','#487f83',612,'flow','unflappable'],
 ['TSLA','Otto Pike','#bda44a',248,'catalyst','anxious'],
 ['CRCL','Cleo March','#996e9c',127,'momentum','theatrical'],
 ['AAPL','Wren Holt','#668c68',229,'mean_reversion','skeptical'],
 ['QQQ','Ivo Moss','#6f7da1',537,'flow','precise'],
 ['MSTR','Zara Quill','#ac5960',318,'catalyst','restless'],
 ['SPCX','Finn Vale','#9b8662',184,'premium','patient'],
 ['META','Rae Flint','#8e9164',734,'momentum','blunt'],
 ['AMZN','Arlo Reed','#627f9d',224,'mean_reversion','nervous'],
 ['GOOG','Bea North','#a77660',203,'flow','dry'],
 ['MSFT','Kit Rowan','#7c7292',509,'premium','calm'],
] as const;
export class FloorEngine {
 state:Snapshot;private seq=0;private tickIndex=0;
 constructor(now=Date.now()){
 this.state={mode:'demo',connected:true,session:1,now,marketOpen:true,paused:false,killed:false,cash:500,nav:500,openNav:500,turnover:0,benchmarkOpen:612,desks:cast.map((c,i)=>({id:c[0].toLowerCase(),symbol:c[0],name:c[1],color:c[2],seed:i,price:c[3],reference:c[3],change:0,qty:0,cost:0,realized:0,ordersToday:0,lastOrder:0,lastThink:0,lastThinkPrice:c[3],state:'IDLE' as SceneState,traits:{risk:3+i%7,contrarianism:1+i*3%9,focus:c[4],temperament:c[5],horizon:i%3?'intraday':'swing',verbosity:4+i%6},pitches:[],forecasts:[],hiredSession:1,analystId:'seed-'+i,score:0})),events:[],tickets:[],curve:[{at:now,nav:500}],archive:[]};
 this.emit('SESSION_OPEN','Rehearsal session opened. $500 simulated treasury.');
 }
 restore(state:Snapshot){
 this.state=state;
 this.seq=Math.max(0,...state.events.map(e=>e.id),...state.tickets.map(t=>t.id),...state.desks.flatMap(d=>d.forecasts.map(f=>f.id)));
 this.tickIndex=Math.max(0,Math.round((state.now-(state.curve[0]?.at??state.now))/(5*60_000)));
 }
 emit(kind:string,text:string,deskId?:string){this.state.events.push({id:++this.seq,at:this.state.now,kind,text,deskId});this.state.events=this.state.events.slice(-250);}
 mark(){this.state.nav=nav(this.state.cash,this.state.desks);this.state.curve.push({at:this.state.now,nav:this.state.nav});this.state.curve=this.state.curve.slice(-240);}
 tick(){
 const s=this.state;if(s.paused)return;s.now+=5*60_000;this.tickIndex++;
 for(const [i,d] of s.desks.entries()){
 d.state='IDLE';const change=Math.sin(this.tickIndex*.63+i*1.7)*.0034+Math.cos(this.tickIndex*.27+i)*.0011;
 d.price*=1+change;if(s.marketOpen)d.reference=d.price*(1+Math.sin(i+this.tickIndex*.1)*.002);
 d.change=(d.price/(cast[d.seed%12][3])-1)*100;
 for(const f of d.forecasts.filter(f=>f.actual===undefined&&f.due<=s.now)){
 f.actual=d.price;f.hit=Math.sign(f.target-f.spot)===Math.sign(d.price-f.spot);f.error=Math.abs(d.price-f.target)/d.price;
 f.excess=d.price/f.spot-1-(s.desks[1].price/f.benchmarkSpot-1);
 this.emit(f.hit?'FORECAST_HIT':'FORECAST_MISS',d.name+': forecast '+(f.hit?'hit':'miss')+'. Actual $'+d.price.toFixed(2),d.id);d.state=f.hit?'ELATED':'DESPAIR';
 }
 }
 this.mark();if(s.nav<s.openNav*.75){s.killed=true;this.emit('CIRCUIT_BREAKER','Session drawdown exceeded 25%. Execution halted.');}
 if(!s.marketOpen){const d=s.desks[0];d.state='RESEARCHING';if(this.tickIndex%3===0)this.emit('NIGHT_SHIFT_ON',d.symbol+' spread '+((d.price/d.reference-1)*100).toFixed(2)+'% vs last close. Observation only.',d.id);return;}
 if(s.killed)return;
 const candidates=s.desks.filter(d=>(!d.lastThink||Math.abs(d.price/d.lastThinkPrice-1)>.004||s.now-d.lastThink>=30*60_000)&&(!d.lastOrder||s.now-d.lastOrder>=20*60_000)).sort((a,b)=>a.lastThink-b.lastThink).slice(0,2);
 for(const d of candidates){d.state='RESEARCHING';this.emit('DESK_THINKING',d.name+' is checking '+d.symbol+'.',d.id);this.pitch(d);}
 }
 pitch(d:Desk,oversized=false){
 const s=this.state;d.lastThink=s.now;d.lastThinkPrice=d.price;
 const sell=d.qty>0&&(this.tickIndex+d.seed)%4===0;
 const requested=oversized?500:sell?Math.floor(Math.min(d.qty*d.price*.999,30)*100)/100:20+(d.seed%4)*10;
 const target=d.price*(1+(d.seed%3===0?-.007:.008));
 const forecast={id:++this.seq,at:s.now,due:s.now+60*60_000,spot:d.price,target,benchmarkSpot:s.desks[1].price};
 const thesis=sell?'Reducing exposure after the move. The next hour may give back the gain.':d.seed%3===0?'The tape looks stretched. I expect a pullback over the next hour; this small position tests the reversal.':'Price momentum is improving against the benchmark. Requesting a small allocation with a one-hour forecast.';
 const decision=oversized?'APPROVE':requested>35?'TRIM':'APPROVE';
 const usd=oversized?requested:Math.min(requested,35);
 const pitch={id:forecast.id,at:s.now,side:sell?'SELL' as const:'BUY' as const,conviction:4+d.seed%6,usd:requested,thesis,bark:sell?'Take some off the table!':'Boss, I want a little size!',decision,reason:decision==='TRIM'?'Trimmed to preserve room for competing desks.':'Small allocation approved for this rehearsal.',forecast,violations:[] as string[]};
 d.pitches.unshift(pitch);d.forecasts.push(forecast);d.state='PITCHING';this.emit('PITCH_MADE',d.symbol+': '+pitch.bark,d.id);
 this.emit(decision==='TRIM'?'PITCH_TRIMMED':'PITCH_APPROVED',d.symbol+': '+decision.toLowerCase()+' $'+usd.toFixed(2)+'. '+pitch.reason,d.id);
 const price=d.price*(sell?.999:1.001);
 const result=paperFill({mint:'demo:'+d.id,side:pitch.side,usd,qty:usd/price,price,priceImpactPct:.1,slippageBps:100,quoteAt:s.now},{universe:s.desks.map(x=>'demo:'+x.id),nav:s.nav,openNav:s.openNav,cash:s.cash,positionQty:d.qty,positionValue:d.qty*d.price,turnover:s.turnover,deskOrders:d.ordersToday,lastOrder:d.lastOrder,now:s.now,marketOpen:s.marketOpen,killSwitch:s.killed});
 if(!result.fill){pitch.violations=result.verdict.violations;pitch.decision='RISK BLOCK';pitch.reason=pitch.violations.join('; ');d.state='DESPAIR';this.emit('RISK_BLOCK',d.symbol+': '+pitch.reason,d.id);return;}
 const fill=result.fill;this.emit('ORDER_SENT',d.symbol+': paper order sent.',d.id);
 if(sell){const basis=d.qty?d.cost/d.qty:0;d.realized+=usd-fill.qty*basis;d.cost=Math.max(0,d.cost-fill.qty*basis);d.qty=Math.max(0,d.qty-fill.qty);s.cash+=usd;}
 else{d.qty+=fill.qty;d.cost+=usd;s.cash-=usd;}
 d.ordersToday++;d.lastOrder=s.now;s.turnover+=usd;d.state='ON_PHONE';
 s.tickets.unshift({id:++this.seq,at:s.now,deskId:d.id,symbol:d.symbol,side:pitch.side,usd,price,qty:fill.qty,paper:true,signature:null});s.tickets=s.tickets.slice(0,100);
 this.emit('FILL',d.symbol+' '+pitch.side+' $'+usd.toFixed(2)+' filled · paper',d.id);this.mark();
 }
 closeSession(){
 const s=this.state;this.mark();const benchmark=s.desks[1].price/s.benchmarkOpen-1;
 for(const d of s.desks)d.score=scoreDesk(d,s.nav,benchmark).total;
 this.emit('SESSION_CLOSE','Session '+s.session+' closed. NAV $'+s.nav.toFixed(2)+'. Scores recorded.');
 const fired=fireCandidate(s.desks,s.session);
 if(fired){const best=[...s.desks].sort((a,b)=>b.score-a.score)[0];s.archive.push(structuredClone(fired));this.emit('FIRED',fired.name+' dismissed: lowest eligible score '+fired.score.toFixed(3)+'.',fired.id);
 const previous=fired.name;fired.parentId=best.analystId;fired.analystId='hire-'+(++this.seq);fired.name=['Jules','Remy','Ash','Pip'][s.session%4]+' '+['Sable','Wick','Rowe','Fox'][fired.seed%4];fired.traits={...best.traits,risk:Math.max(1,Math.min(10,best.traits.risk+(s.session%2?2:-2)))};fired.hiredSession=s.session+1;fired.forecasts=[];fired.pitches=[];fired.realized=0;fired.cost=fired.qty*fired.price;fired.score=0;fired.state='IDLE';this.emit('HIRED',fired.name+' replaces '+previous+'. Traits inherited from '+best.name+'.',fired.id);}
 else this.emit('HIRING_DEFERRED','All analysts are protected by the two-session grace period.');
 s.session++;s.openNav=s.nav;s.benchmarkOpen=s.desks[1].price;s.turnover=0;for(const d of s.desks){d.ordersToday=0;d.realized=0;d.cost=d.qty*d.price;}
 this.emit('SESSION_OPEN','Session '+s.session+' opened.');
 }
 command(action:string){
 if(action==='pause'){this.state.paused=!this.state.paused;this.emit('PLAYBACK',this.state.paused?'Rehearsal paused.':'Rehearsal resumed.');}
 else if(action==='night'){this.state.marketOpen=!this.state.marketOpen;this.emit(this.state.marketOpen?'NIGHT_SHIFT_OFF':'NIGHT_SHIFT_ON',this.state.marketOpen?'Day shift resumed.':'Night shift. Token prices move; reference prices stay at last close.');}
 else if(action==='kill'){this.state.killed=!this.state.killed;this.emit('KILL_SWITCH',this.state.killed?'Execution halted by operator.':'Execution re-enabled.');}
 else if(action==='close')this.closeSession();
 else if(action==='risk')this.pitch(this.state.desks[0],true);
 else throw Error('Unknown rehearsal action');
 }
}



