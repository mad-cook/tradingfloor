import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'The Floor — Trading room',description:'An original low-poly trading firm. Paper rehearsal with transparent forecasts and risk decisions.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}

