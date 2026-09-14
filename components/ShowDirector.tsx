'use client';
import {useEffect} from 'react';
import {useFloor} from './store';
import {castShow,chooseShow,definition,SHOW_DURATION,showBeatAt,type ShowEpisode} from '@/packages/core/show';
export const showClock={elapsed:0};let number=0;
export function startShow(kind:string,source='Director’s pick'){
 const s=useFloor.getState();if(s.show||s.cutaway||!s.snapshot||s.snapshot.paused)return false;
 const cast=castShow(s.snapshot.desks,kind,number);if(!cast)return false;
 const count=s.showHistory.filter(h=>h.kind===kind).length;
 const episode:ShowEpisode={id:Date.now(),kind, ...cast,variant:count%2,source,number:++number};showClock.elapsed=0;s.setShow(episode);return true;
}
export default function ShowDirector({enabled}:{enabled:boolean}){
 useEffect(()=>{let previous=performance.now(),idle=0,next=7000,lastAudience=useFloor.getState().audience.at,pending:ReturnType<typeof useFloor.getState>['audience']['last']=null,frame=0;
 const tick=(now:number)=>{const delta=Math.min(100,now-previous);previous=now;const s=useFloor.getState();
 if(s.cutaway){if(s.show)s.setShow(null);idle=0;next=16000;}
 else if(enabled&&!document.hidden&&s.snapshot&&!s.snapshot.paused){
  if(s.audience.at>lastAudience){lastAudience=s.audience.at;if(Date.now()-lastAudience<30000)pending=s.audience.last;}
  if(s.show){showClock.elapsed+=delta;
   if(showClock.elapsed>=SHOW_DURATION){const d=definition(s.show.kind);s.rememberShow({id:s.show.id,kind:d.id,title:d.title,lead:s.show.lead,rival:s.show.rival,source:s.show.source});s.setShow(null);idle=0;next=18000+Math.random()*14000;}
   else{const beat=showBeatAt(showClock.elapsed);if(beat!==s.showBeat)s.setShow(s.show,beat);}
  }else{idle+=delta;if(idle>=next||(pending&&idle>6000)){const kind=chooseShow(s.showHistory.map(h=>h.kind),pending);startShow(kind,pending?'The gallery: '+pending:'Director’s pick');pending=null;}}
 }
 (window as any).__floorShow={kind:useFloor.getState().show?.kind??null,beat:useFloor.getState().showBeat,elapsed:showClock.elapsed,history:useFloor.getState().showHistory.length};frame=requestAnimationFrame(tick);
 };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[enabled]);return null;
}
