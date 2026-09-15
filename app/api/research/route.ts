import {getPythResearch} from '@/packages/market/pyth';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(await getPythResearch(),{headers:{'Cache-Control':'no-store'}});}
