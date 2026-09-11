import FloorApp from '@/components/FloorApp';export const dynamic='force-dynamic';export default function Page(){return <FloorApp localControls={process.env.ALLOW_LOCAL_CONTROLS==='1'}/>;}
