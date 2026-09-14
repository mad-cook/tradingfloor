'use client';
import {useRef,useMemo,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Html} from '@react-three/drei';
import {useFloor} from './store';
import {showClock} from './ShowDirector';
import {definition,showSpeaker} from '@/packages/core/show';
import {SEATS,bossPath,samplePath} from './choreography';
export default function ShowEffects(){
 const show=useFloor(s=>s.show),beat=useFloor(s=>s.showBeat),snapshot=useFloor(s=>s.snapshot);
 const spot=useRef<THREE.Mesh>(null);const sheets=useRef<THREE.InstancedMesh>(null),confetti=useRef<THREE.InstancedMesh>(null),beacon=useRef<THREE.Group>(null),award=useRef<THREE.Group>(null);
 const matrix=useMemo(()=>new THREE.Object3D(),[]);const color=useMemo(()=>new THREE.Color(),[]);
 useEffect(()=>{if(!confetti.current)return;for(let i=0;i<90;i++)confetti.current.setColorAt(i,color.set(['#ff663d','#294cff','#ffc857','#fff4d1'][i%4]));if(confetti.current.instanceColor)confetti.current.instanceColor.needsUpdate=true;},[color]);
 useFrame(()=>{const t=showClock.elapsed/1000,effect=show?definition(show.kind).effect:'';
 if(spot.current&&show){const who=showSpeaker(show,beat),index=snapshot?.desks.findIndex(d=>d.id===who)??-1;let p=who==='principal'?[0,0,-2.89]:SEATS[index];if(who==='principal'&&show.kind==='audit'){const route=bossPath(Math.max(0,snapshot?.desks.findIndex(d=>d.id===show.lead)??0));const ms=showClock.elapsed;p=ms<8500?samplePath(route,ms/8500).position:ms<14500?route[route.length-1]:samplePath([...route].reverse(),(ms-14500)/8500).position;}if(p)spot.current.position.set(p[0],.025,p[2]+(who==='principal'?0:.76));}
 if(sheets.current){sheets.current.visible=effect==='paper';for(let i=0;i<48&&sheets.current.visible;i++){const age=(t+i*.16)%4.3;matrix.position.set(4.9-age*(.7+(i%4)*.22),Math.max(.04,1.12+age*1.7-age*age*.57),3.9-age*.7+Math.sin(i*9)*age*.33);matrix.rotation.set(-Math.PI/2+age*2+i,age*.7+i,Math.sin(age*2+i)*.5);matrix.scale.setScalar(1);matrix.updateMatrix();sheets.current.setMatrixAt(i,matrix.matrix);}sheets.current.instanceMatrix.needsUpdate=true;}
 if(confetti.current){confetti.current.visible=effect==='confetti'&&t>2;for(let i=0;i<90&&confetti.current.visible;i++){const age=(t-2+i*.043)%5;matrix.position.set(Math.sin(i*2.399)*4.8,5-age*.95,Math.cos(i*2.399)*3.3+.3);matrix.rotation.set(age*2+i,age*3+i,age+i);matrix.scale.setScalar(1);matrix.updateMatrix();confetti.current.setMatrixAt(i,matrix.matrix);}confetti.current.instanceMatrix.needsUpdate=true;}
 if(beacon.current){beacon.current.visible=effect==='audit'||effect==='phones';beacon.current.rotation.y=t*3;}
 if(award.current){const index=snapshot?.desks.findIndex(d=>d.id===show?.lead)??0;const p=SEATS[Math.max(0,index)];award.current.visible=effect==='confetti';award.current.position.set(p[0],2.65+Math.sin(t*2)*.09,p[2]+.7);award.current.rotation.y=t*.6;}
 });
 if(!snapshot)return null;
 const speaker=show?showSpeaker(show,beat):null,index=snapshot.desks.findIndex(d=>d.id===speaker),p=speaker==='principal'?[0,0,-2.89]:SEATS[index];
 return <>
 <instancedMesh ref={sheets} args={[undefined,undefined,48]} visible={false}><planeGeometry args={[.29,.38]}/><meshStandardMaterial color="#fff4d1" side={THREE.DoubleSide}/></instancedMesh>
 <instancedMesh ref={confetti} args={[undefined,undefined,90]} visible={false}><planeGeometry args={[.075,.16]}/><meshStandardMaterial side={THREE.DoubleSide}/></instancedMesh>
 <group ref={beacon} position={[0,2.3,-3.65]} visible={false}><mesh><cylinderGeometry args={[.14,.18,.06,8]}/><meshStandardMaterial color="#343442"/></mesh><mesh position={[0,.14,0]}><sphereGeometry args={[.14,8,5]}/><meshStandardMaterial color="#ff663d" emissive="#ff663d" emissiveIntensity={1.5}/></mesh><mesh position={[.08,.13,0]}><boxGeometry args={[.13,.13,.12]}/><meshStandardMaterial color="#ffc857" emissive="#ffc857"/></mesh></group>
 <group ref={award} visible={false}><mesh><cylinderGeometry args={[.16,.10,.20,6]}/><meshStandardMaterial color="#ffbe48" metalness={.5} roughness={.3}/></mesh><mesh position={[0,-.16,0]}><cylinderGeometry args={[.04,.04,.16,6]}/><meshStandardMaterial color="#ffbe48"/></mesh><mesh position={[0,-.27,0]}><boxGeometry args={[.23,.06,.20]}/><meshStandardMaterial color="#191923"/></mesh></group>
 {show&&p&&<mesh ref={spot} rotation-x={-Math.PI/2} position={[p[0],.025,p[2]+(speaker==='principal'?0:.76)]}><ringGeometry args={[.49,.55,36]}/><meshBasicMaterial color="#ff663d" transparent opacity={.8}/></mesh>}
 {show&&<Html position={[0,3.2,-2]} center zIndexRange={[5,1]}><div className={'show-room-sign '+(show.kind==='outage'?'offline-sign':'')}>{show.kind==='outage'?'CONNECTION LOST. EGOS STILL ONLINE.':definition(show.kind).tag}</div></Html>}
 </>;
}
