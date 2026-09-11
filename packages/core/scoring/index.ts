import type {Desk} from '../types';
export function scoreDesk(d:Desk,nav:number,benchmarkReturn:number){
 const resolved=d.forecasts.filter(f=>f.actual!==undefined);
 const accuracy=resolved.length?resolved.filter(f=>f.hit).length/resolved.length:0;
 const meanError=resolved.length?resolved.reduce((s,f)=>s+(f.error??0),0)/resolved.length:0;
 const pnl=(d.realized+d.qty*d.price-d.cost)/nav-benchmarkReturn;
 const discipline=-Math.min(1,d.pitches.filter(p=>p.violations.length).length/6);
 return {pnl,accuracy,meanError,discipline,total:.5*pnl+.4*(accuracy-meanError)+.1*discipline};
}
export function fireCandidate(desks:Desk[],session:number){return desks.filter(d=>session-d.hiredSession>=2).sort((a,b)=>a.score-b.score)[0];}

