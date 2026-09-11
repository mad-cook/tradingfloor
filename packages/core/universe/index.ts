export type Candidate={mint:string;symbol:string;issuer:string;inIssuerRegistry:boolean;isVerified:boolean;taggedStock:boolean;liquidity:number;usdPrice:number;referencePrice:number;quoteImpactPct:number;quoteUsd:number;routable:boolean;tokenProgram:string;decimals:number};
export function qualify(c:Candidate) {
 return c.issuer!=='Ondo'&&c.inIssuerRegistry&&c.isVerified&&c.taggedStock&&c.routable&&Boolean(c.tokenProgram)&&Number.isInteger(c.decimals)&&c.decimals>=0&&c.liquidity>=150000&&c.quoteUsd===2000&&c.quoteImpactPct>=0&&c.quoteImpactPct<=1.5&&c.usdPrice>0&&c.referencePrice>0&&Math.abs(c.usdPrice/c.referencePrice-1)<.10;
}
export function selectUniverse(candidates:Candidate[],count=12){
 const unique=[...new Map(candidates.filter(qualify).map(c=>[c.mint,c])).values()].sort((a,b)=>b.liquidity-a.liquidity);
 const spy=unique.find(c=>c.symbol==='SPYx');if(!spy)throw Error('SPYx is not routable: stop and re-plan');
 const roster=unique.slice(0,count);if(!roster.includes(spy))roster[roster.length-1]=spy;return roster;
}

