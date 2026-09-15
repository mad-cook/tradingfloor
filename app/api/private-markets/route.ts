import {getPrivateMarkets} from '@/packages/market/private-markets';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(await getPrivateMarkets(),{headers:{'Cache-Control':'no-store'}});}
