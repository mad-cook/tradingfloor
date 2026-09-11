import type {BoardData} from '@/packages/core/board';
import {EMPTY_AUDIENCE} from '@/packages/core/board';
import type {AudienceState} from '@/packages/core/audience';
import {create} from 'zustand';import type {Snapshot,FloorEvent} from '@/packages/core/types';
export type VoiceActivity={deskId:string;text:string;kind:string;id:number};
type Store={board:BoardData|null;audience:AudienceState;setBoard:(b:BoardData)=>void;setAudience:(a:AudienceState)=>void;snapshot:Snapshot|null;selected:string|null;event:FloorEvent|null;connected:boolean;voices:VoiceActivity[];setSnapshot:(s:Snapshot)=>void;select:(id:string|null)=>void;setEvent:(e:FloorEvent)=>void;setConnected:(v:boolean)=>void;addVoice:(v:VoiceActivity)=>void;removeVoice:(desk:string)=>void;clearVoices:()=>void};
export const useFloor=create<Store>(set=>({board:null,audience:EMPTY_AUDIENCE,setBoard:board=>set({board}),setAudience:audience=>set({audience}),snapshot:null,selected:null,event:null,connected:false,voices:[],setSnapshot:s=>set({snapshot:s,connected:true}),select:selected=>set({selected}),setEvent:event=>set({event}),setConnected:connected=>set({connected}),addVoice:v=>set(s=>({voices:[...s.voices.filter(x=>x.deskId!==v.deskId),v]})),removeVoice:desk=>set(s=>({voices:s.voices.filter(x=>x.deskId!==desk)})),clearVoices:()=>set({voices:[]})}));
