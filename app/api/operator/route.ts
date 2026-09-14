import {authorizedOperator} from '@/packages/live/control';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(req.headers.get('origin')||!authorizedOperator(req.headers.get('authorization')))return Response.json({error:'Owner authorization required'},{status:403});
 try{if(Number(req.headers.get('content-length'))>1024)return Response.json({error:'Request too large'},{status:413});const text=await req.text();if(text.length>1024)return Response.json({error:'Request too large'},{status:413});const body=JSON.parse(text);if(!['status','start','stop','test'].includes(body.action))return Response.json({error:'Unknown owner command'},{status:400});
  const response=await fetch((process.env.WORKER_URL??'http://127.0.0.1:3101')+'/operator',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.TRADING_CONTROL_TOKEN},body:JSON.stringify({action:body.action,wallet:body.wallet,confirmation:body.confirmation}),signal:AbortSignal.timeout(10_000)});
  return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Owner control unavailable; check status before retrying'},{status:503});}
}
