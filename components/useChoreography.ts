import {useEffect,useRef,useState} from 'react';
import type {Desk,FloorEvent} from '@/packages/core/types';
import {reactionWave,type Choreography} from './choreography';
export function useChoreography(desks:Desk[],event:FloorEvent|null,running:boolean){
 const clock=useRef(0),data=useRef<Choreography>({cues:{},visit:null}),lastId=useRef(0),blocks=useRef(new Map<string,number[]>());
 const lastWave=useRef(-Infinity);const nextVisit=useRef(0),nextMishap=useRef(14000),mishapIndex=useRef(0);
 const [state,setState]=useState(data.current);
 const cast=useRef(desks);cast.current=desks;
 const publish=()=>setState({...data.current,cues:{...data.current.cues}});
 useEffect(()=>{

  const timer=setInterval(()=>{if(!running||document.hidden)return;
   const now=clock.current;let changed=false;
   for(const [id,cue] of Object.entries(data.current.cues))if(cue.end<=now){delete data.current.cues[id];changed=true;}
   if(data.current.visit&&now>=data.current.visit.end){data.current.visit=null;changed=true;}
   if(now>=nextMishap.current&&cast.current.length){
    const desk=cast.current[(mishapIndex.current*5+3)%cast.current.length];const kind=mishapIndex.current++%2?'tangle':'coffee';
    if(!data.current.cues[desk.id]&&data.current.visit?.deskId!==desk.id){data.current.cues[desk.id]={id:-Math.round(now),kind,start:now,end:now+4400,target:desk.seed};changed=true;}
    nextMishap.current=now+21000+Math.random()*16000;
   }
   if(changed)publish();
  },100);return()=>clearInterval(timer);
 },[running]);
 useEffect(()=>{
  if(!event||event.id<=lastId.current||!desks.length)return;lastId.current=event.id;const now=clock.current;
  if(now-lastWave.current>=4500){const wave=reactionWave(event,desks,now);if(Object.keys(wave).length){lastWave.current=now;for(const [id,cue] of Object.entries(wave))if(!data.current.cues[id]||data.current.cues[id].end<=now)data.current.cues[id]=cue;}}
  if(event.kind==='RISK_BLOCK'&&event.deskId){
   const times=[...(blocks.current.get(event.deskId)??[]).filter(t=>now-t<90000),now];blocks.current.set(event.deskId,times);
   if(times.length>=3&&!data.current.visit&&now>=nextVisit.current){
    const index=desks.findIndex(d=>d.id===event.deskId);
    if(index>=0){data.current.visit={deskId:event.deskId,index,start:now,end:now+23000};nextVisit.current=now+52000;blocks.current.set(event.deskId,[]);
     data.current.cues[event.deskId]={id:event.id,kind:'reprimand',start:now+8500,end:now+14500,target:index};
     desks.filter(d=>Math.abs(d.seed-index)<=1&&d.id!==event.deskId).forEach(d=>{data.current.cues[d.id]={id:event.id,kind:'look',start:now+7000,end:now+14000,target:index};});
    }
   }
  }
  publish();
 },[event,desks]);
 return {state,clock};
}
