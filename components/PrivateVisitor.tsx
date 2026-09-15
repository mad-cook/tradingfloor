'use client';
import {useMemo,useRef,useEffect,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {useAnimations,useGLTF,Html} from '@react-three/drei';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import {useFloor} from './store';
import {showClock} from './ShowDirector';
import {BEAT_MS,SHOW_DURATION} from '@/packages/core/show';
import {samplePath} from './choreography';
const route:[number,number,number][]=[[-7,.12,4],[-7,.12,-1.4],[-1.3,.12,-1.4],[-.9,.12,-2.2]];
export default function PrivateVisitor(){const show=useFloor(s=>s.show),paused=useFloor(s=>s.snapshot?.paused);const {scene,animations}=useGLTF('/models/analyst.glb');const object=useMemo(()=>clone(scene),[scene]);const root=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null);const {actions,mixer}=useAnimations(animations,body);const [walking,setWalking]=useState(true);const previous=useRef<THREE.AnimationAction|null>(null);
 useEffect(()=>{const action=actions[walking?'walk':'standYell'];if(!action)return;action.reset().setLoop(walking?THREE.LoopRepeat:THREE.LoopOnce,Infinity);action.clampWhenFinished=true;action.play();previous.current?.fadeOut(.2);action.fadeIn(.2);previous.current=action;},[walking,actions]);
 useEffect(()=>{mixer.timeScale=paused?0:1;},[mixer,paused]);
 useFrame(()=>{if(!root.current)return;const t=showClock.elapsed;const leaving=t>=BEAT_MS*4;const walk=t<BEAT_MS||leaving;setWalking(v=>v===walk?v:walk);const sample=t<BEAT_MS?samplePath(route,t/BEAT_MS):leaving?samplePath([...route].reverse(),(t-BEAT_MS*4)/(SHOW_DURATION-BEAT_MS*4)):{position:route[route.length-1],heading:Math.PI/2};root.current.position.set(...sample.position);root.current.rotation.y=sample.heading;root.current.userData.privateVisitor=true;});
 if(!show?.offer)return null;
 return <group ref={root}><group ref={body}><primitive object={object}/></group><mesh position={[.52,.75,.04]}><boxGeometry args={[.38,.3,.12]}/><meshStandardMaterial color="#784527"/></mesh><mesh position={[.52,.94,.04]}><torusGeometry args={[.075,.018,4,8,Math.PI]}/><meshStandardMaterial color="#d1ac50"/></mesh><Html position={[0,2.9,0]} center><div className="visitor-badge">PRIVATE MARKETS<br/><b>{show.offer.symbol}</b></div></Html></group>;
}
