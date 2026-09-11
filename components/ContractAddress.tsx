'use client';
import {useEffect,useRef,useState} from 'react';
import {useFloor} from './store';
export default function ContractAddress(){
 const mint=useFloor(s=>s.board?.token.mint),[status,setStatus]=useState<'idle'|'copied'|'manual'>('idle'),input=useRef<HTMLInputElement>(null);
 useEffect(()=>{setStatus('idle');},[mint]);
 useEffect(()=>{if(status==='manual'){input.current?.focus();input.current?.select();}if(status!=='copied')return;const timer=setTimeout(()=>setStatus('idle'),2500);return()=>clearTimeout(timer);},[status]);
 async function copy(){if(!mint)return;try{await navigator.clipboard.writeText(mint);setStatus('copied');}catch{setStatus('manual');}}
 return <div className="contract-control"><button className="mode-badge contract-address" disabled={!mint} onClick={()=>void copy()} title={mint??'Token address not configured'} aria-label={mint?'Copy token contract address':'Token address not configured'}><b>CA</b><span>{mint??'NOT CONFIGURED'}</span><em aria-hidden="true">{status==='copied'?'✓':'⧉'}</em></button><span className="copy-status" role="status">{status==='copied'?'Address copied':status==='manual'?'Select and copy the address below':''}</span>{status==='manual'&&<input ref={input} className="manual-address" aria-label="Token contract address to copy" readOnly value={mint??''} onFocus={e=>e.currentTarget.select()}/>}</div>;
}

