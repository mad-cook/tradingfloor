import type {FloorEvent} from '@/packages/core/types';
import {useFloor} from './store';
type Line={url:string;text:string};type Request={desk:string;line:number;kind:string};
export class FloorSound {
 private context:AudioContext;private master:GainNode;private enabled=false;
 private buffers=new Map<string,AudioBuffer>();private manifest:Record<string,Line[]>={};
 private queue:Request[]=[];private sources=new Set<AudioBufferSourceNode>();private active=0;
 private lastStart=0;private nextAmbient=0;private nextPhone=0;private nextKeys=0;private index=0;
 private timer:ReturnType<typeof setInterval>;private cooldown=new Map<string,number>();
 private played=0;private effects=0;private failures=0;
 constructor(){
  this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;
  const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=6;
  this.master.connect(limiter).connect(this.context.destination);
  void fetch('/vo/manifest.json').then(r=>{if(!r.ok)throw Error('Voice bank missing');return r.json();}).then(m=>{this.manifest=m;}).catch(()=>{this.failures++;});
  this.timer=setInterval(()=>this.tick(),250);
 }
 private async buffer(url:string){let b=this.buffers.get(url);if(!b){const r=await fetch(url);if(!r.ok)throw Error('Missing audio');b=await this.context.decodeAudioData(await r.arrayBuffer());this.buffers.set(url,b);}return b;}
 async setEnabled(enabled:boolean){
  await this.context.resume();this.enabled=enabled;this.master.gain.setTargetAtTime(enabled?.8:0,this.context.currentTime,.08);
  if(enabled){this.nextAmbient=0;this.nextPhone=performance.now()+2200;if(!this.bedStarted)void this.startBed();}
  else{this.queue=[];for(const source of this.sources)try{source.stop();}catch{};useFloor.getState().clearVoices();}
  this.debug();
 }
 private bedStarted=false;
 private async startBed(){this.bedStarted=true;try{const b=await this.buffer('/vo/room-babble.mp3');const source=this.context.createBufferSource();source.buffer=b;source.loop=true;const gain=this.context.createGain();gain.gain.value=.22;source.connect(gain).connect(this.master);source.start();}catch{this.failures++;this.bedStarted=false;}}
 event(event:FloorEvent){
  if(!this.enabled)return;
  const mapping:Record<string,number>={PITCH_MADE:0,PITCH_APPROVED:1,PITCH_TRIMMED:5,RISK_BLOCK:6,FILL:7,FORECAST_HIT:8,FORECAST_MISS:4};
  if(event.kind==='FILL'){this.foley('printer');this.tone([880,1174],.18,.06);}
  if(event.kind==='PITCH_APPROVED'||event.kind==='PITCH_TRIMMED')this.foley('phone');
  if(event.deskId&&mapping[event.kind]!==undefined)this.enqueue({desk:event.deskId,line:mapping[event.kind],kind:event.kind});
 }
 private enqueue(r:Request){if(this.queue.some(q=>q.desk===r.desk))return;if(this.queue.length<5)this.queue.push(r);}
 private tick(){
  const s=useFloor.getState().snapshot,now=performance.now();
  if(!this.enabled||document.hidden||!s||s.paused)return;
  if(now>=this.nextAmbient&&Object.keys(this.manifest).length){
   const desk=s.marketOpen?s.desks[(this.index*5)%s.desks.length]:s.desks[0];
   const line=[2,3,1,9][this.index%4];this.index++;
   this.enqueue({desk:desk.id,line,kind:line===1?'PITCH_APPROVED':'PITCH_MADE'});
   this.nextAmbient=now+(s.marketOpen?3600:20000);
  }
  if(s.marketOpen&&now>=this.nextPhone){this.foley('phone');this.nextPhone=now+6500+(this.index%4)*1700;}
  if(s.marketOpen&&now>=this.nextKeys){this.foley('keys');this.nextKeys=now+900+this.index%3*170;}
  if(this.queue.length&&this.active<2&&now-this.lastStart>=850){
   const item=this.queue.shift()!;if(now-(this.cooldown.get(item.desk)??-10000)<7000)return;
   this.cooldown.set(item.desk,now);this.lastStart=now;void this.speak(item);
  }
  this.debug();
 }
 private async speak(r:Request){
  const line=this.manifest[r.desk]?.[r.line];if(!line)return;
  this.active++;
  try{
   const buffer=await this.buffer(line.url);if(!this.enabled){this.active--;return;}
   const source=this.context.createBufferSource();source.buffer=buffer;
   const gain=this.context.createGain();gain.gain.value=.8;
   const pan=this.context.createStereoPanner();const desk=useFloor.getState().snapshot?.desks.find(d=>d.id===r.desk);pan.pan.value=desk?((desk.seed%4)/3-.5)*1.25:0;
   source.connect(gain).connect(pan).connect(this.master);this.sources.add(source);
   useFloor.getState().addVoice({deskId:r.desk,text:line.text,kind:r.kind,id:Date.now()});
   source.onended=()=>{this.active--;this.sources.delete(source);useFloor.getState().removeVoice(r.desk);this.debug();};
   source.start();this.played++;this.debug();
  }catch{this.active--;this.failures++;this.debug();}
 }
 private tone(frequencies:number[],duration:number,volume:number,delay=0){
  const at=this.context.currentTime+delay;
  for(const frequency of frequencies){const o=this.context.createOscillator(),g=this.context.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume/frequencies.length,at+.015);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g).connect(this.master);o.start(at);o.stop(at+duration+.02);}
 }
 private foley(kind:'phone'|'keys'|'printer'){
  if(!this.enabled)return;this.effects++;
  if(kind==='phone'){for(let i=0;i<3;i++)this.tone([440,480],.12,.045,i*.2);return;}
  const repeats=kind==='printer'?9:3;
  for(let j=0;j<repeats;j++){
   const length=kind==='printer'?.035:.012,buffer=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*length),this.context.sampleRate);
   const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);
   const source=this.context.createBufferSource();source.buffer=buffer;const g=this.context.createGain();g.gain.value=kind==='printer'?.06:.015;source.connect(g).connect(this.master);source.start(this.context.currentTime+j*.065);
  }
 }
 private debug(){(window as any).__floorAudio={enabled:this.enabled,active:this.active,played:this.played,effects:this.effects,failures:this.failures,queued:this.queue.length};}
 dispose(){clearInterval(this.timer);for(const source of this.sources)try{source.stop();}catch{};void this.context.close();useFloor.getState().clearVoices();}
}

