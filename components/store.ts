import {create} from 'zustand';import type {Snapshot,FloorEvent} from '@/packages/core/types';
export type VoiceActivity={deskId:string;text:string;kind:string;id:number};
type Store={snapshot:Snapshot|null;selected:string|null;event:FloorEvent|null;connected:boolean;voices:VoiceActivity[];setSnapshot:(s:Snapshot)=>void;select:(id:string|null)=>void;setEvent:(e:FloorEvent)=>void;setConnected:(v:boolean)=>void;addVoice:(v:VoiceActivity)=>void;removeVoice:(desk:string)=>void;clearVoices:()=>void};
export const useFloor=create<Store>(set=>({snapshot:null,selected:null,event:null,connected:false,voices:[],setSnapshot:s=>set({snapshot:s,connected:true}),select:selected=>set({selected}),setEvent:event=>set({event}),setConnected:connected=>set({connected}),addVoice:v=>set(s=>({voices:[...s.voices.filter(x=>x.deskId!==v.deskId),v]})),removeVoice:desk=>set(s=>({voices:s.voices.filter(x=>x.deskId!==desk)})),clearVoices:()=>set({voices:[]})}));

