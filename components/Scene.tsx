'use client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useGLTF,useAnimations,OrbitControls,Html} from '@react-three/drei';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {useFloor} from './store';
import type {Desk} from '@/packages/core/types';
const seats=Array.from({length:12},(_,i)=>[(-3.9+(i%4)*2.6),0,(-1.3+Math.floor(i/4)*2.05)] as [number,number,number]);
function Asset({path,position=[0,0,0],rotation=0,scale=1}:{path:string;position?:[number,number,number];rotation?:number;scale?:number}){const {scene}=useGLTF(path);const object=useMemo(()=>scene.clone(true),[scene]);return <primitive object={object} position={position} rotation-y={rotation} scale={scale}/>;}
function Analyst({desk,position,boss=false}:{desk?:Desk;position:[number,number,number];boss?:boolean}){
 const {scene,animations}=useGLTF('/models/analyst.glb');const ref=useRef<THREE.Group>(null);const character=useMemo(()=>{const object=clone(scene);object.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry=node.geometry.clone();const colors=node.geometry.getAttribute('color');if(colors){const jacket=new THREE.Color(desk?.color??'#354c65');for(let i=0;i<colors.count;i++){const r=colors.getX(i),g=colors.getY(i),b=colors.getZ(i);if(r>g*2&&g>b*1.6)colors.setXYZ(i,jacket.r,jacket.g,jacket.b);}colors.needsUpdate=true;}}});return object;},[scene,desk?.color]);const {actions}=useAnimations(animations,ref);const floorEvent=useFloor(s=>s.event);const voice=useFloor(s=>s.voices.find(v=>v.deskId===desk?.id));const event=voice??floorEvent;
 const [clip,setClip]=useState('idle');
 const lastReaction=useRef(-Infinity);
 const pending=useRef<ReturnType<typeof setTimeout>|null>(null);
 const returnToIdle=useRef<ReturnType<typeof setTimeout>|null>(null);
 const currentClip=useRef('idle');
 const previousAction=useRef<THREE.AnimationAction|null>(null);
 useEffect(()=>{
  if(!desk?.id||event?.deskId!==desk.id)return;
  const next=event.kind==='PITCH_MADE'||event.kind==='FORECAST_HIT'?'standYell'
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
  const action=actions[clip];if(!action)return;
  const previous=previousAction.current;
  action.reset().setEffectiveWeight(1);
  action.setLoop(clip==='idle'||clip==='phone'?THREE.LoopRepeat:THREE.LoopOnce,Infinity);
  action.clampWhenFinished=clip!=='idle'&&clip!=='phone';
  action.setEffectiveTimeScale(clip==='idle'?.88+(desk?.seed??4)%5*.045:1);
  if(clip==='idle')action.time=((desk?.seed??12)*.193)%action.getClip().duration;
  action.play();
  if(previous&&previous!==action)previous.crossFadeTo(action,.4,false);else action.fadeIn(.4);
  previousAction.current=action;
  if(ref.current)ref.current.userData={analyst:desk?.id??'principal',clip,transitions:(ref.current.userData.transitions??0)+1};
 },[actions,clip,desk?.seed,desk?.id]);
 return <group ref={ref} position={position} rotation-y={Math.PI} scale={boss?1.08:1}><primitive object={character}/></group>;
}
function DeskModel({desk,index}:{desk:Desk;index:number}){
 const selected=useFloor(s=>s.selected);const select=useFloor(s=>s.select);const event=useFloor(s=>s.event);const p=seats[index];
 const voice=useFloor(s=>s.voices.find(v=>v.deskId===desk.id));const hot=event?.deskId===desk.id;
 return <group position={p} onClick={e=>{e.stopPropagation();select(desk.id);}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='auto';}}>
 <Asset path="/models/workstation.glb"/>
 <Analyst desk={desk} position={[0,0,.76]}/>
 {voice&&<Html position={[0,2.35,.76]} center zIndexRange={[20,11]}><div className="voice-bubble"><b>{desk.symbol}</b><span>{voice.text}</span></div></Html>}
 <mesh rotation-x={-Math.PI/2} position={[0,.016,.76]}><circleGeometry args={[.40,16]}/><meshBasicMaterial color="#07191c" transparent opacity={.36}/></mesh>
 <Html position={[0,.91,.52]} center zIndexRange={[10,0]}><button className={'desk-label '+(selected===desk.id?'selected':'')} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();select(desk.id);}} style={{borderColor:hot?'#e5ad65':undefined}}><span style={{color:desk.color}}>●</span> {desk.symbol}<small>{hot?event?.kind.replaceAll('_',' ').toLowerCase():'analyst '+String(index+1).padStart(2,'0')}</small></button></Html>
 {selected===desk.id&&<mesh rotation-x={-Math.PI/2} position={[0,.022,.15]}><ringGeometry args={[.92,.96,32]}/><meshBasicMaterial color="#e7b263" transparent opacity={.9}/></mesh>}
 </group>;
}
function CameraRig(){
 const controls=useRef<any>(null);const selected=useFloor(s=>s.selected);const camera=useThree(s=>s.camera);const size=useThree(s=>s.size);useEffect(()=>{if(camera instanceof THREE.PerspectiveCamera){camera.fov=size.width<700?65:40;camera.updateProjectionMatrix();}},[camera,size.width]);const destination=useRef(new THREE.Vector3(12,11,14));const target=useRef(new THREE.Vector3(0,0,0));const moving=useRef(false);
 useEffect(()=>{const index=useFloor.getState().snapshot?.desks.findIndex(d=>d.id===selected)??-1;const p=seats[index];if(p){destination.current.set(p[0]+3.3,3.4,p[2]+4.3);target.current.set(p[0],.9,p[2]);}else{destination.current.set(12,11,14);target.current.set(0,.3,0);}moving.current=true;},[selected]);
 useFrame((_,delta)=>{if(moving.current&&controls.current){camera.position.lerp(destination.current,1-Math.exp(-delta*3));controls.current.target.lerp(target.current,1-Math.exp(-delta*3));if(camera.position.distanceTo(destination.current)<.03)moving.current=false;controls.current.update();}});
 return <OrbitControls ref={controls} enablePan={false} minDistance={3} maxDistance={23} maxPolarAngle={Math.PI*.47} minPolarAngle={.2} autoRotate={!selected&&!moving.current} autoRotateSpeed={.12}/>;
}
function Metrics(){const n=useRef(0);const elapsed=useRef(0);useFrame(({gl},delta)=>{n.current++;elapsed.current+=delta;if(elapsed.current>2){(window as any).__floorMetrics={fps:Math.round(n.current/elapsed.current),drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles};n.current=0;elapsed.current=0;}});return null;}
export default function Scene(){
 const snapshot=useFloor(s=>s.snapshot);
 return <Canvas dpr={[1,1.5]} camera={{position:[12,11,14],fov:40}} gl={{antialias:true}}>
 <color attach="background" args={['#14282e']}/><fog attach="fog" args={['#14282e',24,44]}/>
 <ambientLight intensity={snapshot?.marketOpen ? 1.35 : .35}/><hemisphereLight args={['#c7e5e2','#252f34',.65]}/><directionalLight position={[-5,9,3]} intensity={snapshot?.marketOpen?2:.6} color="#ffd5a0"/>
 <Suspense fallback={null}><Asset path="/models/room.glb"/>
 {snapshot?.desks.map((d,i)=><DeskModel key={d.id} desk={d} index={i}/>)}
 <Asset path="/models/workstation.glb" position={[0,.12,-3.65]}/><Analyst position={[0,.12,-2.89]} boss/>
 <Html position={[0,2.75,-2.22]} center><div className="office-sign">THE PRINCIPAL<span>CAPITAL ALLOCATION</span></div></Html>
 <Html position={[4.9,1.55,3.9]} center><button className="printer-label" onClick={()=>window.dispatchEvent(new Event('open-blotter'))}>TRADE TICKETS ↗</button></Html>
 </Suspense><CameraRig/><Metrics/>
 </Canvas>;
}








