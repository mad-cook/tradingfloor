import type {Desk,FloorEvent} from '@/packages/core/types';
export const SEATS=Array.from({length:12},(_,i)=>[-3.9+i%4*2.6,0,-1.3+Math.floor(i/4)*2.05] as [number,number,number]);
export type Mood='confident'|'strained'|'neutral';
export function deskMood(d:Desk):Mood{
 const pnl=d.realized+d.qty*d.price-d.cost, resolved=d.forecasts.filter(f=>f.actual!==undefined).slice(-8);
 const hit=resolved.length?resolved.filter(f=>f.hit).length/resolved.length:.5;
 if(pnl<-.25||(resolved.length>=3&&hit<.4))return 'strained';
 if(pnl>.25||(resolved.length>=3&&hit>.65))return 'confident';
 return 'neutral';
}
export type Cue={id:number;kind:'celebrate'|'look'|'object'|'reprimand'|'coffee'|'tangle';start:number;end:number;target:number};
export type Visit={deskId:string;index:number;start:number;end:number};
export type Choreography={cues:Record<string,Cue>;visit:Visit|null};
export function reactionWave(event:FloorEvent,desks:Desk[],now:number):Record<string,Cue>{
 const index=desks.findIndex(d=>d.id===event.deskId);if(index<0||!['FORECAST_HIT','FILL','FORECAST_MISS','PITCH_REJECTED'].includes(event.kind))return {};
 const neighbors=desks.map((d,i)=>({d,i,distance:Math.hypot(SEATS[i][0]-SEATS[index][0],SEATS[i][2]-SEATS[index][2])})).filter(n=>n.i!==index).sort((a,b)=>a.distance-b.distance).slice(0,3);
 const result:Record<string,Cue>={};
 if(event.kind==='FORECAST_HIT')result[desks[index].id]={id:event.id,kind:'celebrate',start:now,end:now+3400,target:index};
 neighbors.forEach((n,i)=>{result[n.d.id]={id:event.id*10+i,kind:i===2&&['FORECAST_HIT','PITCH_REJECTED'].includes(event.kind)?'object':'look',start:now+450+i*550,end:now+3200+i*550,target:index};});return result;
}
// Walk through the aisle between each column, not through desktops.
export function bossPath(index:number):[number,number,number][]{
 const p=SEATS[index];const side=index%4===3?-1:1;const aisle=p[0]+side*1.30;
 return [[0,.12,-2.89],[0,0,-2.35],[aisle,0,-2.35],[aisle,0,p[2]+.76],[p[0]+side*1.0,0,p[2]+.76]];
}
export function samplePath(points:[number,number,number][],progress:number){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1],p[2]-points[i][2]));const total=lengths.reduce((a,b)=>a+b,0);
 let distance=Math.min(1,Math.max(0,progress))*total;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const t=lengths[i]?distance/lengths[i]:0;return {position:points[i].map((v,k)=>v+(points[i+1][k]-v)*t) as [number,number,number],heading:Math.atan2(points[i+1][0]-points[i][0],points[i+1][2]-points[i][2])};}distance-=lengths[i];}
 return {position:points[0],heading:Math.PI};
}
