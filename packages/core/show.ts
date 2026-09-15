import type {PrivateOffer} from './private-markets';
import definitions from './show-scenes.json';
import type {Desk} from './types';
import type {Reaction} from './audience';
export type ShowGesture='object'|'look'|'celebrate'|'slump'|'phone'|'coffee';
export type ShowBeat={speaker:'lead'|'rival'|'principal';gesture:ShowGesture;lines:string[]};
export type ShowDefinition={id:string;title:string;tag:string;effect:string;beats:ShowBeat[]};
export const SHOWS=definitions as ShowDefinition[];
export const BEAT_MS=4600,SHOW_DURATION=BEAT_MS*5;
export type ShowEpisode={id:number;kind:string;lead:string;rival:string;variant:number;source:string;number:number;offer?:PrivateOffer};
export type ShowMemory={id:number;kind:string;title:string;lead:string;rival:string;source:string};
export function definition(kind:string){return SHOWS.find(s=>s.id===kind)??SHOWS[0];}
export function showBeatAt(elapsed:number){return Math.min(4,Math.max(0,Math.floor(elapsed/BEAT_MS)));}
export function chooseShow(recent:string[],reaction:Reaction|null,random=Math.random){
 const pool=reaction==='back'?['victory','speech']:reaction==='doubt'?['audit','blame']:reaction==='chaos'?['printer','outage','phones','coffee']:SHOWS.filter(s=>!s.id.startsWith('private-')).map(s=>s.id);
 const fresh=pool.filter(k=>!recent.slice(0,3).includes(k));const candidates=fresh.length?fresh:pool.filter(k=>k!==recent[0]);return candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]??pool[0];
}
export function castShow(desks:Desk[],kind:string,number:number){
 if(desks.length<2)return null;
 const pnl=(d:Desk)=>d.realized+d.qty*d.price-d.cost;
 const ordered=[...desks].sort((a,b)=>pnl(b)-pnl(a));
 const lead=kind==='victory'?ordered[number%Math.min(3,ordered.length)]:kind==='audit'?ordered.slice(-3)[number%Math.min(3,ordered.length)]:desks[(number*5)%desks.length];
 const index=desks.findIndex(d=>d.id===lead.id);const rival=desks[(index%2===0?index+1:index-1)%desks.length]??desks[(index+1)%desks.length];return {lead:lead.id,rival:rival.id};
}
export function showSpeaker(episode:ShowEpisode,beat:number){const role=definition(episode.kind).beats[beat]?.speaker;return role==='lead'&&episode.offer?'visitor':role==='principal'?'principal':role==='rival'?episode.rival:episode.lead;}
export function showLine(episode:ShowEpisode,beat:number){const lines=definition(episode.kind).beats[beat]?.lines??[''];return lines[episode.variant%lines.length];}
