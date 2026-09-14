// Solana addresses copied from the issuer registry on 2026-09-14.
// Source: https://xstocks.com/products . Tickers are display labels, never identifiers.
export const SOL='So11111111111111111111111111111111111111112';
export const STOCKS=[
 ['nvda','NVDAx','Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'],
 ['spy','SPYx','XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W'],
 ['tsla','TSLAx','XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB'],
 ['crcl','CRCLx','XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1'],
 ['aapl','AAPLx','XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'],
 ['qqq','QQQx','Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ'],
 ['mstr','MSTRx','XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ'],
 ['spcx','COINx','Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu'],
 ['meta','METAx','Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu'],
 ['amzn','AMZNx','Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg'],
 ['goog','GOOGLx','XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'],
 ['msft','MSFTx','XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX'],
].map(([deskId,symbol,mint])=>({deskId,symbol,mint}));
export const TOKEN_PROGRAMS=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
export type Stock=typeof STOCKS[number];
export const LIMITS=Object.freeze({reserveLamports:30_000_000,maxTradeLamports:30_000_000,minTradeLamports:3_000_000,maxFeeLamports:500_000,maxRentLamports:6_000_000,slippageBps:50,impactPct:.5,positionFraction:.15,intervalMs:600_000,deskIntervalMs:3_600_000,maxDailyTrades:24,drawdownFraction:.15});
export function buyingBudget(lamports:number){if(!Number.isSafeInteger(lamports)||lamports<0)throw Error('Invalid wallet balance');return Math.max(0,lamports-LIMITS.reserveLamports);}
export function buySize(lamports:number,navUsd:number,positionUsd:number,solPrice:number){
 if(![navUsd,positionUsd,solPrice].every(Number.isFinite)||solPrice<=0||navUsd<0||positionUsd<0)throw Error('Invalid valuation');
 const room=Math.max(0,navUsd*LIMITS.positionFraction-positionUsd)/solPrice*1e9;
 return Math.max(0,Math.floor(Math.min(buyingBudget(lamports)-LIMITS.maxFeeLamports-LIMITS.maxRentLamports,LIMITS.maxTradeLamports,room)));
}
