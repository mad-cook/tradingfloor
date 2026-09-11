export const dynamic='force-dynamic';
export async function GET(req:Request){
 const kind=new URL(req.url).searchParams.get('stream')==='1'?'events':'state';
 try{const response=await fetch((process.env.WORKER_URL??'http://127.0.0.1:3101')+'/'+kind,{cache:'no-store',signal:req.signal});
 return new Response(response.body,{status:response.status,headers:{'Content-Type':kind==='events'?'text/event-stream':'application/json','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
 }catch{return Response.json({error:'The floor worker is offline. Start the local worker to resume.'},{status:503});}
}
export async function POST(req:Request){
 const host=req.headers.get('host')??'';const origin=req.headers.get('origin');if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)||origin&&new URL(origin).host!==host)return Response.json({error:'Rehearsal controls are local-only'},{status:403});
 try{const {action}=await req.json();if(!['pause','night','kill','close','risk'].includes(action))return Response.json({error:'Unknown action'},{status:400});
 const r=await fetch((process.env.WORKER_URL??'http://127.0.0.1:3101')+'/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action}),signal:AbortSignal.timeout(5000)});return new Response(await r.text(),{status:r.status,headers:{'Content-Type':'application/json'}});
 }catch{return Response.json({error:'Worker unavailable'},{status:503});}
}


