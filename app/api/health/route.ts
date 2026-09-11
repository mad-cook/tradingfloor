export const dynamic='force-dynamic';
export async function GET(){try{const r=await fetch((process.env.WORKER_URL??'http://127.0.0.1:3101')+'/health',{cache:'no-store',signal:AbortSignal.timeout(2500)});if(!r.ok)throw Error();return Response.json({ok:true,mode:'paper-rehearsal'});}catch{return Response.json({ok:false},{status:503});}}
