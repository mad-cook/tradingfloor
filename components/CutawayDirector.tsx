'use client';
import {useEffect} from 'react';
import {useFloor} from './store';
import {CUTAWAY_DURATION,cutawayPhase,type CutawayEvent} from '@/packages/core/cutaway';
export const cutawayClock={elapsed:0};
export function startCutaway(event?:CutawayEvent){
 const s=useFloor.getState();if(s.cutaway)return false;
 const elapsed=event&&!event.manual?Math.max(0,Date.now()-event.startedAt):0;if(elapsed>=CUTAWAY_DURATION)return false;
 cutawayClock.elapsed=elapsed;
 s.setCutaway({...event,id:event?.id??'preview:'+Date.now(),startedAt:event?.startedAt??Date.now(),generation:event?.generation??s.principalNumber+1,preview:!event,phase:cutawayPhase(elapsed)!});
 return true;
}
export function CutawayDirector({enabled}:{enabled:boolean}){
 const event=useFloor(s=>s.board?.cutaway),episode=useFloor(s=>s.cutaway);
 useEffect(()=>{if(!enabled||!event||episode)return;const key='floor-cutaway:'+event.id;try{if(sessionStorage.getItem(key))return;}catch{}if(startCutaway(event)){try{sessionStorage.setItem(key,'seen');}catch{}}},[enabled,event?.id,episode?.id]);
 useEffect(()=>{if(!episode)return;let previous=performance.now(),frame=0;
 const tick=(now:number)=>{const delta=Math.min(100,now-previous);previous=now;const s=useFloor.getState();if(!s.cutaway)return;
 if(enabled&&!document.hidden&&!s.snapshot?.paused)cutawayClock.elapsed+=delta;
 const phase=cutawayPhase(cutawayClock.elapsed);
 if(!phase){s.setPrincipalNumber(s.cutaway.generation);s.setCutaway(null);(window as any).__floorCutaway={phase:'idle',elapsed:0,generation:s.principalNumber};return;}
 if(phase!==s.cutaway.phase)s.setCutaway({...s.cutaway,phase});
 (window as any).__floorCutaway={phase,elapsed:cutawayClock.elapsed,generation:s.cutaway.generation};frame=requestAnimationFrame(tick);};
 frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[episode?.id,enabled]);
 return episode?.phase==='blackout'?<div className="cutaway-blackout" aria-label="Scene cutaway" role="status"/>:null;
}
