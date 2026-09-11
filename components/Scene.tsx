'use client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useGLTF,useAnimations,OrbitControls,Html} from '@react-three/drei';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {Suspense,useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {useFloor} from './store';
import type {Desk} from '@/packages/core/types';
const seats=Array.from({length:12},(_,i)=>[(-3.9+(i%4)*2.6),0,(-1.3+Math.floor(i/4)*2.05)] as [number,number,number]);
function Asset({path,position=[0,0,0],rotation=0,scale=1}:{path:string;position?:[number,number,number];rotation?:number;scale?:number}){const {scene}=useGLTF(path);const object=useMemo(()=>scene.clone(true),[scene]);return <primitive object={object} position={position} rotation-y={rotation} scale={scale}/>;}
function Analyst({desk,position,boss=false}:{desk?:Desk;position:[number,number,number];boss?:boolean}){
 const {scene,animations}=useGLTF('/models/analyst.glb');const ref=useRef<THREE.Group>(null);const character=useMemo(()=>{const object=clone(scene);object.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry=node.geometry.clone();const colors=node.geometry.getAttribute('color');if(colors){const jacket=new THREE.Color(desk?.color??'#354c65');for(let i=0;i<colors.count;i++){const r=colors.getX(i),g=colors.getY(i),b=colors.getZ(i);if(r>g*2&&g>b*1.6)colors.setXYZ(i,jacket.r,jacket.g,jacket.b);}colors.needsUpdate=true;}}});return object;},[scene,desk?.color]);const {actions}=useAnimations(animations,ref);const event=useFloor(s=>s.event);
 useEffect(()=>{let clip='idle';if(event?.deskId===desk?.id){if(event?.kind==='PITCH_MADE'||event?.kind==='FORECAST_HIT')clip='standYell';if(event?.kind==='PITCH_APPROVED'||event?.kind==='FILL')clip='phone';if(['RISK_BLOCK','FORECAST_MISS','FAIL','FIRED'].includes(event?.kind??''))clip='deskSlam';}
 const action=actions[clip];action?.reset().fadeIn(.25).play();return()=>{action?.fadeOut(.25);};},[actions,event,desk?.id]);
 return <group ref={ref} position={position} rotation-y={0} scale={boss?1.08:1}><primitive object={character}/></group>;
}
function DeskModel({desk,index}:{desk:Desk;index:number}){
 const selected=useFloor(s=>s.selected);const select=useFloor(s=>s.select);const event=useFloor(s=>s.event);const p=seats[index];
 const hot=event?.deskId===desk.id;
 return <group position={p} onClick={e=>{e.stopPropagation();select(desk.id);}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='auto';}}>
 <Asset path="/models/workstation.glb"/>
 <Analyst desk={desk} position={[0,0,-.76]}/>
 <mesh rotation-x={-Math.PI/2} position={[0,.016,-.74]}><circleGeometry args={[.40,16]}/><meshBasicMaterial color="#07191c" transparent opacity={.36}/></mesh>
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
 <Asset path="/models/workstation.glb" position={[0,.12,-3.65]}/><Analyst position={[0,.12,-4.4]} boss/>
 <Html position={[0,2.75,-2.22]} center><div className="office-sign">THE PRINCIPAL<span>CAPITAL ALLOCATION</span></div></Html>
 <Html position={[4.9,1.55,3.9]} center><button className="printer-label" onClick={()=>window.dispatchEvent(new Event('open-blotter'))}>TRADE TICKETS ↗</button></Html>
 </Suspense><CameraRig/><Metrics/>
 </Canvas>;
}





