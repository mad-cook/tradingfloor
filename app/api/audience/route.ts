import {createHmac,randomBytes,randomUUID} from 'node:crypto';
export const dynamic='force-dynamic';
const secret=process.env.AUDIENCE_SECRET||randomBytes(32).toString('hex');
const sign=(value:string)=>createHmac('sha256',secret).update(value).digest('hex');
const worker=()=>process.env.WORKER_URL??'http://127.0.0.1:3101';
export async function GET(){try{const r=await fetch(worker()+'/audience',{cache:'no-store',signal:AbortSignal.timeout(3000)});return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}catch{return Response.json({error:'Gallery temporarily unavailable'},{status:503});}}
export async function POST(req:Request){
 const origin=req.headers.get('origin');try{if(!origin||new URL(origin).host!==req.headers.get('host'))return Response.json({error:'Open the gallery on this site'},{status:403});}catch{return Response.json({error:'Invalid origin'},{status:403});}
 if(Number(req.headers.get('content-length')??0)>256)return Response.json({error:'Request too large'},{status:413});
 try{const body=await req.text();if(body.length>256)return Response.json({error:'Request too large'},{status:413});const {reaction}=JSON.parse(body);if(!['back','doubt','chaos'].includes(reaction))return Response.json({error:'Choose a listed reaction'},{status:400});
 const raw=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('floor_viewer='))?.slice(13)??'';const [candidate,signature]=raw.split('.');const id=candidate&&/^[a-f0-9-]{36}$/.test(candidate)&&signature===sign(candidate)?candidate:randomUUID();
 const r=await fetch(worker()+'/audience',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sign(id),reaction}),signal:AbortSignal.timeout(3000)});
 return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':'floor_viewer='+id+'.'+sign(id)+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400'+(origin.startsWith('https:')?'; Secure':'')}});
 }catch{return Response.json({error:'Gallery temporarily unavailable'},{status:503});}
}
