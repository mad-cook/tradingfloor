import {create} from 'zustand';import type {Snapshot,FloorEvent} from '@/packages/core/types';
type Store={snapshot:Snapshot|null;selected:string|null;event:FloorEvent|null;connected:boolean;setSnapshot:(s:Snapshot)=>void;select:(id:string|null)=>void;setEvent:(e:FloorEvent)=>void;setConnected:(v:boolean)=>void};
export const useFloor=create<Store>(set=>({snapshot:null,selected:null,event:null,connected:false,setSnapshot:s=>set({snapshot:s,connected:true}),select:selected=>set({selected}),setEvent:event=>set({event}),setConnected:connected=>set({connected})}));

