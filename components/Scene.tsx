'use client';
import CutawayCast from './CutawayCast';
import {OfficeBoard} from './Board';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useGLTF,useAnimations,OrbitControls,Html} from '@react-three/drei';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {useFloor} from './store';
import type {Desk} from '@/packages/core/types';
import {SEATS,deskMood,bossPath,samplePath,type Cue,type Visit} from './choreography';
import {useChoreography} from './useChoreography';
const seats=SEATS;
function Asset({path,position=[0,0,0],rotation=0,scale=1}:{path:string;position?:[number,number,number];rotation?:number;scale?:number}){const {scene}=useGLTF(path);const object=useMemo(()=>scene.clone(true),[scene]);return <primitive object={object} position={position} rotation-y={rotation} scale={scale}/>;}
function Analyst({desk,position,boss=false,cue,clock,visit,paused=false}:{desk?:Desk;position:[number,number,number];boss?:boolean;cue?:Cue;clock:React.RefObject<number>;visit?:Visit|null;paused?:boolean}){
 const generation=useFloor(s=>s.principalNumber);const {scene,animations}=useGLTF('/models/analyst.glb');const ref=useRef<THREE.Group>(null);const character=useMemo(()=>{const object=clone(scene);object.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry=node.geometry.clone();const colors=node.geometry.getAttribute('color');if(colors){const jacket=new THREE.Color(desk?.color??(generation%2?'#354c65':'#75466d'));for(let i=0;i<colors.count;i++){const r=colors.getX(i),g=colors.getY(i),b=colors.getZ(i);if(r>g*2&&g>b*1.6)colors.setXYZ(i,jacket.r,jacket.g,jacket.b);}colors.needsUpdate=true;}}});return object;},[scene,desk?.color,generation]);const {actions,mixer}=useAnimations(animations,ref);const floorEvent=useFloor(s=>s.event);const voice=useFloor(s=>s.voices.find(v=>v.deskId===(desk?.id??'principal')));const event=voice??floorEvent;
 const [clip,setClip]=useState('idle');const [forced,setForced]=useState<string|null>(null);const forcedRef=useRef<string|null>(null);const posture=useRef<THREE.Group>(null);
 const audience=useFloor(s=>s.audience);const board=useFloor(s=>s.board);const marketPressure=Boolean(board?.token.at&&Date.now()-board.token.at<90000&&(board.token.change24h??0)<-5);const mood=desk?deskMood(desk):marketPressure?'strained':'neutral';const playClip=forced??clip;
 useEffect(()=>{mixer.timeScale=paused?0:1;},[mixer,paused]);
 const lastReaction=useRef(-Infinity);
 const pending=useRef<ReturnType<typeof setTimeout>|null>(null);
 const returnToIdle=useRef<ReturnType<typeof setTimeout>|null>(null);
 const currentClip=useRef('idle');
 const previousAction=useRef<THREE.AnimationAction|null>(null);
 useEffect(()=>{
  if(event?.deskId!==(desk?.id??'principal'))return;
  const next=['PITCH_MADE','FORECAST_HIT','BANTER','BOSS_CALL','AMBIENT_CALL'].includes(event.kind)?'standYell'
   :['PITCH_APPROVED','PITCH_TRIMMED','FILL'].includes(event.kind)?'phone'
   :['RISK_BLOCK','PITCH_REJECTED','FORECAST_MISS','FAIL','FIRED'].includes(event.kind)?'deskSlam':null;
  if(!next)return;
  if(pending.current)clearTimeout(pending.current);
  const react=()=>{
   pending.current=null;
   if(currentClip.current!==next){currentClip.current=next;lastReaction.current=performance.now();setClip(next);}
   if(returnToIdle.current)clearTimeout(returnToIdle.current);
   returnToIdle.current=setTimeout(()=>{currentClip.current='idle';setClip('idle');},3000);
  };
  const delay=Math.max(0,2800-(performance.now()-lastReaction.current));
  if(delay)pending.current=setTimeout(react,delay);else react();
 },[event,desk?.id]);
 useEffect(()=>()=>{if(pending.current)clearTimeout(pending.current);if(returnToIdle.current)clearTimeout(returnToIdle.current);},[]);
 useEffect(()=>{
  const action=actions[playClip];if(!action)return;
  const previous=previousAction.current;
  action.reset().setEffectiveWeight(1);
  action.setLoop(playClip==='idle'||playClip==='phone'||playClip==='walk'?THREE.LoopRepeat:THREE.LoopOnce,Infinity);
  action.clampWhenFinished=playClip!=='idle'&&playClip!=='phone'&&playClip!=='walk';
  action.setEffectiveTimeScale(playClip==='idle'?.88+(desk?.seed??4)%5*.045:1);
  if(playClip==='idle')action.time=((desk?.seed??12)*.193)%action.getClip().duration;
  action.play();
  if(previous&&previous!==action)previous.crossFadeTo(action,.4,false);else action.fadeIn(.4);
  previousAction.current=action;
  if(ref.current)ref.current.userData={analyst:desk?.id??'principal',clip:playClip,transitions:(ref.current.userData.transitions??0)+1};
 },[actions,playClip,desk?.seed,desk?.id]);
 useFrame((_,delta)=>{
  if(!ref.current||paused)return;const now=clock.current;const active=cue&&now>=cue.start&&now<cue.end?cue:null;
  let desired:string|null=active?.kind==='celebrate'||active?.kind==='object'?'standYell':active?.kind==='reprimand'?'deskSlam':active?.kind==='tangle'?'phone':active?.kind==='coffee'?'deskSlam':null;
  let heading=Math.PI,walkPosition:[number,number,number]|null=null;
  if(boss&&visit){
   const elapsed=now-visit.start,path=bossPath(visit.index);
   if(elapsed<8500){const sample=samplePath(path,elapsed/8500);walkPosition=sample.position;heading=sample.heading;desired='walk';}
   else if(elapsed<14500){walkPosition=path[path.length-1];heading=visit.index%4===3?Math.PI/2:-Math.PI/2;desired='standYell';}
   else{const sample=samplePath([...path].reverse(),(elapsed-14500)/8500);walkPosition=sample.position;heading=sample.heading;desired='walk';}
  }else if(active&&(active.kind==='look'||active.kind==='object')){
   const source=SEATS[desk?.seed??0],target=SEATS[active.target];heading=Math.atan2(target[0]-source[0],target[2]-source[2]);
  }else if(voice?.kind==='BANTER')heading+=((desk?.seed??0)%2?-.65:.65);
  if(boss&&!visit&&audience.at&&Date.now()-audience.at<8000){desired=audience.last==='doubt'?'deskSlam':'standYell';heading=0;}
  if(desired!==forcedRef.current){forcedRef.current=desired;setForced(desired);}
  if(boss){const p=walkPosition??position;ref.current.position.set(...p);}
  ref.current.rotation.y=THREE.MathUtils.damp(ref.current.rotation.y,heading,6,delta);
  if(posture.current){const tilt=desired?0:mood==='strained'?-.13:mood==='confident'?.055:0;posture.current.rotation.x=THREE.MathUtils.damp(posture.current.rotation.x,tilt,3,delta);}
  ref.current.userData.mood=mood;ref.current.userData.cue=active?.kind??null;ref.current.userData.visiting=Boolean(boss&&visit);ref.current.userData.posture=posture.current?.rotation.x??0;
 });
 return <group ref={ref} position={position} rotation-y={Math.PI} scale={boss?1.08:1}><group ref={posture} position={[0,.72,0]}><primitive object={character} position={[0,-.72,0]}/></group>{boss&&(voice||visit||(audience.at&&Date.now()-audience.at<8000))&&<Html position={[0,2.7,0]} center zIndexRange={[22,22]}><div className="voice-bubble boss-bubble"><b>THE PRINCIPAL</b><span>{voice?.text??(visit?"Risk review. At your desk.":audience.last==='doubt'?"The gallery wants answers!":audience.last==='chaos'?"You heard them. Wake this floor up!":"The gallery is backing us. Stay sharp!")}</span></div></Html>}</group>;
}

function DeskProps({desk,cue,clock}:{desk:Desk;cue?:Cue;clock:React.RefObject<number>}){
 const cup=useRef<THREE.Group>(null),papers=useRef<THREE.InstancedMesh>(null);
 const cord=useMemo(()=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(64*3),3));return new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#11191b'}));},[]);
 useEffect(()=>()=>{cord.geometry.dispose();(cord.material as THREE.Material).dispose();},[cord]);
 const count=Math.min(18,desk.pitches.length+desk.ordersToday);
 useEffect(()=>{if(!papers.current)return;const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();for(let i=0;i<count;i++){q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.sin(i*3+desk.seed)*.25);matrix.compose(new THREE.Vector3(-.55+Math.sin(i*7)*.04,.962+i*.007,.06+Math.cos(i*2)*.035),q,new THREE.Vector3(1,1,1));papers.current.setMatrixAt(i,matrix);}papers.current.count=count;papers.current.instanceMatrix.needsUpdate=true;},[count,desk.seed]);
 useFrame(()=>{
  const t=cue?(clock.current-cue.start)/1000:-1,active=t>=0&&clock.current<(cue?.end??0);
  const rescue=active&&cue?.kind==='coffee'?Math.sin(Math.min(1,t/4.4)*Math.PI):0;
  if(cup.current){cup.current.position.set(.30+rescue*.18,.945-rescue*.012,.24);cup.current.rotation.z=-rescue*.88;cup.current.userData={deskProp:desk.id,rescue,paperCount:count,tangled:Boolean(active&&cue?.kind==='tangle')};}
  cord.visible=Boolean(active&&cue?.kind==='tangle');
  if(cord.visible){const attribute=cord.geometry.getAttribute('position') as THREE.BufferAttribute;for(let i=0;i<64;i++){const u=i/63;attribute.setXYZ(i,.61-u*.22+Math.sin(u*35+t*4)*.027,1.0+Math.sin(u*Math.PI)*(.28+.10*Math.sin(t*3)),.23+u*.25+Math.cos(u*35)*.035);}attribute.needsUpdate=true;cord.geometry.computeBoundingSphere();}
 });
 return <><group ref={cup} position={[.30,.945,.24]}><Asset path="/models/coffee.glb"/></group><primitive object={cord} visible={false}/><instancedMesh ref={papers} args={[undefined,undefined,18]}><boxGeometry args={[.24,.005,.17]}/><meshStandardMaterial color="#d8cfaf"/></instancedMesh>{cue&&['coffee','tangle'].includes(cue.kind)&&<Html position={[.3,1.9,.6]} center zIndexRange={[12,11]}><div className="mishap-note">{cue.kind==='coffee'?'SAVE THE COFFEE!':'WHO TANGLED THIS?'}</div></Html>}</>;
}
function DeskModel({desk,index,cue,clock,paused}:{desk:Desk;index:number;cue?:Cue;clock:React.RefObject<number>;paused:boolean}){
 const selected=useFloor(s=>s.selected);const cutaway=useFloor(s=>s.cutaway);const select=useFloor(s=>s.select);const event=useFloor(s=>s.event);const p=seats[index];
 const voice=useFloor(s=>s.voices.find(v=>v.deskId===desk.id));const hot=event?.deskId===desk.id;
 return <group position={p} onClick={e=>{e.stopPropagation();select(desk.id);}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='auto';}}>
 <Asset path="/models/workstation.glb"/>
 <Analyst desk={desk} position={[0,0,.76]} cue={cue} clock={clock} paused={paused}/><DeskProps desk={desk} cue={cue} clock={clock}/>
 {voice&&<Html position={[0,2.35+(index%3)*.18,.76]} center zIndexRange={[20,11]}><div className="voice-bubble"><b>{desk.symbol}</b><span>{voice.text}</span></div></Html>}
 <mesh rotation-x={-Math.PI/2} position={[0,.016,.76]}><circleGeometry args={[.40,16]}/><meshBasicMaterial color="#07191c" transparent opacity={.36}/></mesh>
 <Html position={[0,.91,.52]} center zIndexRange={[10,0]}><button className={'desk-label '+(selected===desk.id?'selected':'')} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();select(desk.id);}} style={{borderColor:hot?'#e5ad65':undefined}}><span style={{color:desk.color}}>●</span> {desk.symbol}<small>{hot?event?.kind.replaceAll('_',' ').toLowerCase():'analyst '+String(index+1).padStart(2,'0')}</small></button></Html>
 {selected===desk.id&&<mesh rotation-x={-Math.PI/2} position={[0,.022,.15]}><ringGeometry args={[.92,.96,32]}/><meshBasicMaterial color="#e7b263" transparent opacity={.9}/></mesh>}
 </group>;
}
function CameraRig(){
 const controls=useRef<any>(null);const selected=useFloor(s=>s.selected);const cutaway=useFloor(s=>s.cutaway);const camera=useThree(s=>s.camera);const size=useThree(s=>s.size);useEffect(()=>{if(camera instanceof THREE.PerspectiveCamera){camera.fov=size.width<700?65:40;camera.updateProjectionMatrix();}},[camera,size.width]);const destination=useRef(new THREE.Vector3(12,11,14));const target=useRef(new THREE.Vector3(0,0,0));const moving=useRef(false);
 useEffect(()=>{const index=useFloor.getState().snapshot?.desks.findIndex(d=>d.id===selected)??-1;const p=seats[index];if(cutaway&&(cutaway.phase==='panic'||cutaway.phase==='draw')){destination.current.set(4.5,4.5,3);target.current.set(0,1,-2.8);}else if(cutaway&&['blackout','aftermath','cleaner'].includes(cutaway.phase)){destination.current.set(3.5,10,-.2);target.current.set(.7,0,-2.3);}else if(cutaway){destination.current.set(10,11,3);target.current.set(2,.3,-.5);}else if(p&&!cutaway){destination.current.set(p[0]+3.3,3.4,p[2]+4.3);target.current.set(p[0],.9,p[2]);}else{destination.current.set(12,11,14);target.current.set(0,.3,0);}moving.current=true;},[selected,cutaway?.phase]);
 useFrame((_,delta)=>{if(moving.current&&controls.current){camera.position.lerp(destination.current,1-Math.exp(-delta*3));controls.current.target.lerp(target.current,1-Math.exp(-delta*3));if(camera.position.distanceTo(destination.current)<.03)moving.current=false;controls.current.update();}});
 return <OrbitControls ref={controls} enablePan={false} minDistance={3} maxDistance={23} maxPolarAngle={Math.PI*.47} minPolarAngle={.2} autoRotate={!selected&&!cutaway&&!moving.current} autoRotateSpeed={.12}/>;
}
function ChoreographyClock({clock,running}:{clock:React.RefObject<number>;running:boolean}){useFrame((_,delta)=>{if(running&&!document.hidden)clock.current+=Math.min(delta,.1)*1000;});return null;}
function Metrics(){const n=useRef(0);const elapsed=useRef(0);useFrame(({gl,scene},delta)=>{n.current++;elapsed.current+=delta;if(elapsed.current>2){const actors:any[]=[];const props:any[]=[];scene.traverse(o=>{if(o.userData.analyst||o.userData.cutawayActor)actors.push({...o.userData,position:o.getWorldPosition(new THREE.Vector3()).toArray()});if(o.userData.deskProp)props.push({...o.userData});});(window as any).__floorMetrics={actors,props,fps:Math.round(n.current/elapsed.current),drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles};n.current=0;elapsed.current=0;}});return null;}
function PrinterTickets(){
 const event=useFloor(s=>s.event);const group=useRef<THREE.Group>(null);const started=useRef(-Infinity);
 useEffect(()=>{if(event?.kind==='FILL')started.current=performance.now();},[event]);
 useFrame(()=>{if(!group.current)return;const elapsed=(performance.now()-started.current)/1000;group.current.visible=elapsed<2.6;
  group.current.children.forEach((card,i)=>{const t=Math.max(0,elapsed-i*.16);card.position.set(4.9+Math.sin(i*2)*t*.16,Math.max(.035,1.04+t*.16-t*t*.4),4.25+t*.38);card.rotation.set(-Math.PI/2+t*.7,i*.3+t*.4,t*.2);});
 });
 return <group ref={group} visible={false}>{[0,1,2].map(i=><mesh key={i}><planeGeometry args={[.24,.32]}/><meshStandardMaterial color="#e4d9b3" side={THREE.DoubleSide}/></mesh>)}</group>;
}
export default function Scene(){
 const cutaway=useFloor(s=>s.cutaway);const generation=useFloor(s=>s.principalNumber);const snapshot=useFloor(s=>s.snapshot);const floorEvent=useFloor(s=>s.event);const {state:choreo,clock}=useChoreography(snapshot?.desks??[],floorEvent,Boolean(snapshot&&!snapshot.paused&&snapshot.marketOpen&&!cutaway));
 return <Canvas dpr={[1,1.5]} camera={{position:[12,11,14],fov:40}} gl={{antialias:true}}>
 <ChoreographyClock clock={clock} running={Boolean(snapshot&&!snapshot.paused&&snapshot.marketOpen&&!cutaway)}/><color attach="background" args={['#e8e1d4']}/><fog attach="fog" args={['#e8e1d4',24,44]}/>
 <ambientLight intensity={snapshot?.marketOpen ? 1.35 : .35}/><hemisphereLight args={['#e9e7ff','#3e3545',.65]}/><directionalLight position={[-5,9,3]} intensity={snapshot?.marketOpen?2:.6} color="#ffd5a0"/>
 <Suspense fallback={null}><Asset path="/models/room.glb"/>
 {snapshot?.desks.map((d,i)=><DeskModel key={d.id} desk={d} index={i} cue={choreo.cues[d.id]} clock={clock} paused={Boolean(snapshot?.paused)}/>)}
 <Asset path="/models/workstation.glb" position={[0,.12,-3.65]}/>{cutaway?<CutawayCast/>:<Analyst key={generation} position={[0,.12,-2.89]} boss clock={clock} visit={choreo.visit} paused={Boolean(snapshot?.paused)}/>}
 <PrinterTickets/><group position={[0,3.65,-4.95]}><mesh><boxGeometry args={[3.85,2.15,.16]}/><meshStandardMaterial color="#191923"/></mesh><Html transform distanceFactor={5.7} position={[0,0,.095]} zIndexRange={[4,0]}><OfficeBoard/></Html></group>
 <Html position={[0,2.75,-2.22]} center zIndexRange={[3,0]}><div className="office-sign">THE PRINCIPAL<span>CAPITAL ALLOCATION</span></div></Html>
 <Html position={[4.9,1.55,3.9]} center zIndexRange={[3,0]}><button className="printer-label" onClick={()=>window.dispatchEvent(new Event('open-blotter'))}>TRADE TICKETS ↗</button></Html>
 </Suspense><CameraRig/><Metrics/>
 </Canvas>;
}
