'use client';
import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {useAnimations,useGLTF,Html} from '@react-three/drei';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import {useFloor} from './store';
import {cutawayClock} from './CutawayDirector';
import {samplePath} from './choreography';
const IN:[number,number,number][]=[[7,0,4.5],[5.85,0,4.5],[5.85,0,-2.35],[2,0,-2.35]];
const OUT:[number,number,number][]=[...IN].reverse();OUT[OUT.length-1]=[10,0,4.5];
const BODY:[number,number,number][]=[[-.65,.25,-2.35],...OUT.map(p=>[p[0],.25,p[2]] as [number,number,number])];
const REPLACEMENT:[number,number,number][]=[...IN,[0,0,-2.35],[0,.12,-2.89]];
function Actor({role}:{role:'old'|'cleaner'|'new'}){
 const liveEpisode=useFloor(s=>s.cutaway);const lastEpisode=useRef(liveEpisode);if(liveEpisode)lastEpisode.current=liveEpisode;const episode=lastEpisode.current!;const {scene,animations}=useGLTF('/models/analyst.glb');
 const root=useRef<THREE.Group>(null),pose=useRef<THREE.Group>(null);
 const character=useMemo(()=>{const object=clone(scene),color=new THREE.Color(role==='cleaner'?'#668d7b':(role==='new'?episode.generation:episode.generation-1)%2?'#354c65':'#75466d');object.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry=o.geometry.clone();const c=o.geometry.getAttribute('color');if(c){for(let i=0;i<c.count;i++){const r=c.getX(i),g=c.getY(i),b=c.getZ(i);if(r>g*2&&g>b*1.6)c.setXYZ(i,color.r,color.g,color.b);}c.needsUpdate=true;}}});return object;},[scene,role,episode.generation]);
 const {actions,mixer}=useAnimations(animations,pose);
 const prop=useGLTF('/models/cutaway-prop.glb'),kit=useGLTF('/models/caretaker-kit.glb');
 const stageProp=useMemo(()=>prop.scene.clone(true),[prop.scene]),uniform=useMemo(()=>kit.scene.clone(true),[kit.scene]);
 const clip=role==='old'&&episode.phase==='panic'||role==='new'&&episode.phase==='introduction'?'standYell':'walk';
 useEffect(()=>{const action=actions[clip];if(!action)return;action.reset().setLoop(THREE.LoopRepeat,Infinity).play();return()=>{action.stop();};},[actions,clip]);
 useFrame((_,delta)=>{if(!root.current||!pose.current)return;const t=cutawayClock.elapsed,paused=useFloor.getState().snapshot?.paused||document.hidden;
 mixer.timeScale=paused?0:role==='old'&&episode.phase!=='panic'?0:role==='cleaner'&&episode.phase==='removal'?-1:1;
 if(role==='old'&&episode.phase!=='panic'&&actions.walk)actions.walk.time=0;
 let position:[number,number,number]=[0,.12,-2.89],heading=0,lying=false;
 if(role==='old'){
 root.current.visible=t<23000;lying=t>=4200;
 if(lying){position=[-.65,.25,-2.35];heading=Math.PI/2;if(t>=15500){const length=BODY.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-BODY[i][0],p[2]-BODY[i][2]),0);const path=samplePath(BODY,Math.max(0,((t-15500)/7500)*(length-2.65)/length));heading=path.heading;position=path.position;}}
 }else if(role==='cleaner'){root.current.visible=t>=9500&&t<23000;const path=t<15500?samplePath(IN,(t-9500)/6000):samplePath(OUT,(t-15500)/7500);position=path.position;heading=path.heading+(t>=15500?Math.PI:0);}
 else{root.current.visible=t>=23000;const path=samplePath(REPLACEMENT,(t-23000)/8000);position=path.position;heading=t>=31000?0:path.heading;}
 if(role==='old'&&episode.phase==='draw')stageProp.position.y=.85+.44*Math.min(1,Math.max(0,(t-3000)/450));
 root.current.position.set(...position);const rotation=root.current.rotation.y;root.current.rotation.y=rotation+Math.atan2(Math.sin(heading-rotation),Math.cos(heading-rotation))*(1-Math.exp(-delta*10));pose.current.rotation.x=lying?Math.PI/2:0;
 root.current.userData={cutawayActor:role,phase:episode.phase,visible:root.current.visible,lying,position};
 });
 return <group ref={root} visible={false} scale={role==='cleaner'?.96:1.08}><group ref={pose}><primitive object={character}/>{role==='cleaner'&&<primitive object={uniform}/>}
 {role==='old'&&episode.phase==='draw'&&<primitive object={stageProp} position={[.40,1.29,.30]} rotation-x={Math.PI/2}/>}</group>
 {role==='old'&&episode.phase==='panic'&&<Html position={[0,2.65,0]} center zIndexRange={[24,24]}><div className="voice-bubble boss-bubble"><b>THE PRINCIPAL</b><span>AH! NO, NO, NO!</span></div></Html>}
 {role==='new'&&episode.phase==='introduction'&&<Html position={[0,2.65,0]} center zIndexRange={[24,24]}><div className="voice-bubble boss-bubble"><b>PRINCIPAL {String(episode.generation).padStart(2,'0')}</b><span>Right. Where were we?</span></div></Html>}
 </group>;
}
export default function CutawayCast(){return <><Actor role="old"/><Actor role="cleaner"/><Actor role="new"/></>;}

useGLTF.preload('/models/cutaway-prop.glb');
useGLTF.preload('/models/caretaker-kit.glb');
