import {getBoard} from '@/packages/market/board';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(await getBoard(),{headers:{'Cache-Control':'no-store'}});}
