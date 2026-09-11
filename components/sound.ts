import type {FloorEvent} from '@/packages/core/types';
import {useFloor} from './store';
import {DialoguePicker,type DialogueLine} from './dialogue';
type Request={desk:string;category:string;kind:string;at:number;priority:number;replyDesk?:string;chapter?:'challenge'|'reply'};
export class FloorSound{
 private context:AudioContext;private master:GainNode;private room:GainNode;private cinemaPhase="idle";private epoch=0;private shotCount=0;private cinemaSources=new Set<AudioBufferSourceNode>();private enabled=false;private bedGain:GainNode|null=null;
 private buffers=new Map<string,AudioBuffer>();private manifest:Record<string,DialogueLine[]>={};private picker:DialoguePicker;
 private queue:Request[]=[];private sources=new Set<AudioBufferSourceNode>();private active=0;
 private lastStart=0;private nextAmbient=0;private nextPhone=0;private nextKeys=0;private nextScene=0;
 private timer:ReturnType<typeof setInterval>;private cooldown=new Map<string,number>();private played=0;private effects=0;private failures=0;
 private recentLines:string[]=[];private recentCategories:string[]=[];private intensity:'hum'|'rush'='hum';private phaseUntil=0;
 constructor(){
  let history:[string,number][]=[];try{history=JSON.parse(sessionStorage.getItem('floor-dialogue-history')??'[]');}catch{}
  this.picker=new DialoguePicker(8*60_000,history);
  this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.room=this.context.createGain();this.room.connect(this.master);
  const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=6;this.master.connect(limiter).connect(this.context.destination);
  void fetch('/vo/manifest-v2.json').then(r=>{if(!r.ok)throw Error('Voice bank missing');return r.json();}).then(m=>{this.manifest=m;}).catch(()=>{this.failures++;});
  this.timer=setInterval(()=>this.tick(),250);
 }
 private async buffer(url:string){let b=this.buffers.get(url);if(!b){const r=await fetch(url);if(!r.ok)throw Error('Missing audio');b=await this.context.decodeAudioData(await r.arrayBuffer());if(this.buffers.size>=48)this.buffers.delete(this.buffers.keys().next().value!);this.buffers.set(url,b);}return b;}
 async setEnabled(enabled:boolean){await this.context.resume();this.enabled=enabled;this.master.gain.setTargetAtTime(enabled?.8:0,this.context.currentTime,.08);
  if(enabled){const now=performance.now();this.nextAmbient=now;this.nextPhone=now+2200;this.nextScene=now+13000;this.phaseUntil=now+16000;if(!this.bedStarted)void this.startBed();}
  else{this.epoch++;for(const source of this.cinemaSources)try{source.stop();}catch{};this.queue=[];for(const source of this.sources)try{source.stop();}catch{};useFloor.getState().clearVoices();}this.debug();
 }
 private bedStarted=false;
 private async startBed(){this.bedStarted=true;try{const b=await this.buffer('/vo/room-babble-v2.mp3');const source=this.context.createBufferSource();source.buffer=b;source.loop=true;this.bedGain=this.context.createGain();this.bedGain.gain.value=.22;source.connect(this.bedGain).connect(this.room);source.start();}catch{this.failures++;this.bedStarted=false;}}
 event(event:FloorEvent){
  if(!this.enabled||this.quiet)return;
  const categories:Record<string,string>={PITCH_MADE:'pitch',PITCH_APPROVED:'approved',PITCH_TRIMMED:'trim',RISK_BLOCK:'risk',FILL:'fill',FORECAST_HIT:'hit',FORECAST_MISS:'miss'};
  if(event.kind==='FILL'){this.foley('printer');this.tone([880,1174],.18,.06);}
  if(event.kind==='PITCH_APPROVED'||event.kind==='PITCH_TRIMMED')this.foley('phone');
  if(event.deskId&&categories[event.kind])this.enqueue({desk:event.deskId,category:categories[event.kind],kind:event.kind,at:performance.now(),priority:event.kind==='FILL'?5:event.kind==='PITCH_MADE'?2:3});
  if(['SESSION_CLOSE','CIRCUIT_BREAKER','KILL_SWITCH'].includes(event.kind))this.enqueue({desk:'principal',category:'boss',kind:'BOSS_CALL',at:performance.now(),priority:6});
 }
 private enqueue(r:Request){
  if(this.quiet||(r.desk==='principal'&&this.cinemaPhase!=='idle'))return;const existing=this.queue.findIndex(q=>q.desk===r.desk);
  if(existing>=0){if(this.queue[existing].priority<=r.priority)this.queue[existing]=r;return;}
  if(this.queue.length<8)this.queue.push(r);else{const lowest=this.queue.reduce((a,q,i)=>q.priority<this.queue[a].priority?i:a,0);if(this.queue[lowest].priority<r.priority)this.queue[lowest]=r;}
 }
 private tick(){
  const s=useFloor.getState().snapshot,now=performance.now();
  if(!this.enabled||this.quiet||document.hidden||!s||s.paused)return;
  if(now>=this.phaseUntil){this.intensity=this.intensity==='hum'?'rush':'hum';this.phaseUntil=now+(this.intensity==='rush'?11000+Math.random()*7000:18000+Math.random()*14000);}
  this.bedGain?.gain.setTargetAtTime(s.marketOpen?(this.intensity==='rush'?.3:.17):.035,this.context.currentTime,.6);
  if(now>=this.nextScene&&s.marketOpen&&Object.keys(this.manifest).length){
   const a=Math.floor(Math.random()*s.desks.length),b=(a+1+Math.floor(Math.random()*(s.desks.length-1)))%s.desks.length;
   this.enqueue({desk:s.desks[a].id,category:'challenge',kind:'BANTER',at:now,priority:4,replyDesk:s.desks[b].id,chapter:'challenge'});
   this.nextScene=now+38000+Math.random()*23000;this.intensity='rush';this.phaseUntil=now+15000;
  }
  if(now>=this.nextAmbient&&Object.keys(this.manifest).length){
   const candidates=s.desks.filter(d=>now-(this.cooldown.get(d.id)??-Infinity)>9000);
   const desk=s.marketOpen?candidates[Math.floor(Math.random()*candidates.length)]:s.desks[0];
   if(desk)this.enqueue({desk:desk.id,category:s.marketOpen?'ambient':'night',kind:'AMBIENT_CALL',at:now,priority:1});
   this.nextAmbient=now+(s.marketOpen?(this.intensity==='rush'?2500:6500)+Math.random()*1800:25000);
  }
  if(s.marketOpen&&now>=this.nextPhone){this.foley('phone');this.nextPhone=now+(this.intensity==='rush'?4200:10500)+Math.random()*5000;}
  if(s.marketOpen&&now>=this.nextKeys){this.foley('keys');this.nextKeys=now+650+Math.random()*1800;}
  this.queue=this.queue.filter(q=>now-q.at<12000);
  if(this.queue.length&&this.active<2&&now-this.lastStart>=1000){
   const ready=this.queue.map((q,i)=>({q,i})).filter(({q})=>now>=q.at&&now-(this.cooldown.get(q.desk)??-Infinity)>=6500).sort((a,b)=>b.q.priority-a.q.priority);
   if(ready.length){const item=this.queue.splice(ready[0].i,1)[0];this.cooldown.set(item.desk,now);this.lastStart=now;void this.speak(item);}
  }this.debug();
 }
 private async speak(r:Request){
  const line=this.picker.pick(this.manifest[r.desk]??[],r.category);if(!line)return;this.active++;const epoch=this.epoch;
  try{
   const buffer=await this.buffer(line.url);if(!this.enabled||epoch!==this.epoch||this.quiet){this.active--;return;}
   try{sessionStorage.setItem('floor-dialogue-history',JSON.stringify(this.picker.history()));}catch{}
   const source=this.context.createBufferSource();source.buffer=buffer;const gain=this.context.createGain();gain.gain.value=r.desk==='principal'?.95:.8;
   const pan=this.context.createStereoPanner();const desk=useFloor.getState().snapshot?.desks.find(d=>d.id===r.desk);pan.pan.value=desk?((desk.seed%4)/3-.5)*1.25:0;
   source.connect(gain).connect(pan).connect(this.room);this.sources.add(source);
   useFloor.getState().addVoice({deskId:r.desk,text:line.text,kind:r.kind,id:Date.now()});
   source.onended=()=>{this.active--;this.sources.delete(source);useFloor.getState().removeVoice(r.desk);
    if(this.enabled&&epoch===this.epoch&&r.chapter==='challenge'&&r.replyDesk)this.enqueue({desk:r.replyDesk,category:'reply',kind:'BANTER',at:performance.now()+700,priority:5,chapter:'reply'});
    else if(this.enabled&&epoch===this.epoch&&r.chapter==='reply')this.enqueue({desk:'principal',category:'boss',kind:'BOSS_CALL',at:performance.now()+900,priority:6});
    this.debug();};
   source.start();this.played++;this.recentLines.push(line.key);this.recentCategories.push(r.category);this.recentCategories=this.recentCategories.slice(-100);this.recentLines=this.recentLines.slice(-100);this.debug();
  }catch{this.active--;this.failures++;this.debug();}
 }
 private tone(frequencies:number[],duration:number,volume:number,delay=0){
  const at=this.context.currentTime+delay;
  for(const frequency of frequencies){const o=this.context.createOscillator(),g=this.context.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume/frequencies.length,at+.015);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g).connect(this.room);o.start(at);o.stop(at+duration+.02);}
 }
 private foley(kind:'phone'|'keys'|'printer'){
  if(!this.enabled||this.quiet)return;this.effects++;
  if(kind==='phone'){for(let i=0;i<3;i++)this.tone([440,480],.12,.045,i*.2);return;}
  const repeats=kind==='printer'?9:3;
  for(let j=0;j<repeats;j++){const length=kind==='printer'?.035:.012,buffer=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*length),this.context.sampleRate);const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);const source=this.context.createBufferSource();source.buffer=buffer;const g=this.context.createGain();g.gain.value=kind==='printer'?.06:.015;source.connect(g).connect(this.room);source.start(this.context.currentTime+j*.065);}
 }
 private get quiet(){return ['panic','draw','blackout','suspended'].includes(this.cinemaPhase);}
 setCutaway(phase:string,elapsed=0){
  if(phase===this.cinemaPhase)return;const previous=this.cinemaPhase;this.cinemaPhase=phase;this.epoch++;
  for(const source of this.cinemaSources)try{source.stop();}catch{};
  if(this.quiet){this.queue=[];for(const source of this.sources)try{source.stop();}catch{};useFloor.getState().clearVoices();}
  this.room.gain.cancelScheduledValues(this.context.currentTime);this.room.gain.setValueAtTime(this.quiet?0:1,this.context.currentTime);
  if(phase==='panic'&&this.enabled)void this.cinemaVoice('panic-'+((useFloor.getState().cutaway!.generation-2+3)%3));
  if(phase==='introduction'&&this.enabled)void this.cinemaVoice('arrival');
  if(phase==='blackout'&&previous==='draw'&&elapsed<11800&&this.enabled)this.shot();
  if(phase==='aftermath')this.nextAmbient=performance.now();this.debug();
 }
 private async cinemaVoice(name:string){const epoch=this.epoch;try{const buffer=await this.buffer('/vo/cutaway/'+name+'.mp3');if(!this.enabled||epoch!==this.epoch)return;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=.8;source.connect(gain).connect(this.master);this.cinemaSources.add(source);source.onended=()=>this.cinemaSources.delete(source);source.start();}catch{this.failures++;}}
 private shot(){
  const rate=this.context.sampleRate,buffer=this.context.createBuffer(1,Math.ceil(rate*.95),rate),data=buffer.getChannelData(0);let low=0;
  for(let i=0;i<data.length;i++){const t=i/rate,noise=Math.random()*2-1;low=low*.82+noise*.18;
   // Sharp transient, low concussion, then discrete reflections in the room.
   let v=noise*.8*Math.exp(-t*145)+low*1.5*Math.exp(-t*24)+Math.sin(2*Math.PI*(110*t-26*t*t))*.55*Math.exp(-t*32);
   for(const [delay,level] of [[.075,.25],[.135,.15],[.22,.08]])if(t>=delay)v+=noise*level*Math.exp(-(t-delay)*38);
   data[i]=Math.tanh(v*1.5)*.8;
  }
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=.72;source.connect(gain).connect(this.master);this.cinemaSources.add(source);source.onended=()=>this.cinemaSources.delete(source);source.start(this.context.currentTime+.06);this.shotCount++;
 }
 private debug(){(window as any).__floorAudio={enabled:this.enabled,cinemaPhase:this.cinemaPhase,roomGain:this.room.gain.value,shotCount:this.shotCount,active:this.active,played:this.played,effects:this.effects,failures:this.failures,queued:this.queue.length,intensity:this.intensity,recentLines:this.recentLines,recentCategories:this.recentCategories};}
 dispose(){clearInterval(this.timer);for(const source of this.sources)try{source.stop();}catch{};void this.context.close();useFloor.getState().clearVoices();}
}


