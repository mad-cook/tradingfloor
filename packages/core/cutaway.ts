export const CUTAWAY_DURATION=41000;
export const STAGES=[['panic',0],['draw',9000],['blackout',11200],['aftermath',14500],['cleaner',16500],['removal',22500],['replacement',30000],['introduction',38000]] as const;
export type CutawayPhase=typeof STAGES[number][0];
export type CutawayEvent={id:string;startedAt:number;generation:number;manual?:boolean};
export type CutawayState=CutawayEvent&{phase:CutawayPhase;preview:boolean};
export function cutawayPhase(elapsed:number):CutawayPhase|null{if(elapsed>=CUTAWAY_DURATION)return null;return [...STAGES].reverse().find(([,start])=>elapsed>=start)?.[0]??'panic';}
export class CrashMonitor{
 private mint='';private samples:{cap:number;at:number}[]=[];private lastAt=0;private low=0;private cooldown=0;private generation=1;
 observe(mint:string,cap:number,at:number,now:number):CutawayEvent|null{
 if(!mint||!Number.isFinite(cap)||cap<=0||at>now+1000||now-at>90000)return null;
 if(this.mint!==mint){this.mint=mint;this.samples=[];this.lastAt=0;this.low=0;this.cooldown=0;this.generation=1;}
 if(at<=this.lastAt)return null;this.lastAt=at;this.samples=this.samples.filter(s=>at-s.at<=15*60_000);
 const peak=Math.max(cap,...this.samples.map(s=>s.cap));this.samples.push({cap,at});if(this.samples.length>64)this.samples.shift();
 this.low=cap<=peak*.65?this.low+1:0;
 if(this.low<2||now<this.cooldown)return null;
 this.low=0;this.samples=[{cap,at}];this.cooldown=now+10*60_000;
 return {id:mint+':'+at,startedAt:now,generation:++this.generation};
 }
}

export const PANIC_LINES=[
 "Who sold? WHO SOLD? I said buy the dip, not dig a bloody crater! Get investor relations on the phone. We do not HAVE investor relations?",
 "Why is it red? Who approved all this red? I promised the holders a yacht! That is not a chart. That is a fucking waterfall!",
 "Stop the chart! Can somebody stop the chart? The holders are watching! Tell them it is maintenance. What do you mean they can see the wallet?"
] as const;
