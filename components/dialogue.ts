export type DialogueLine={url:string;text:string;category:string;key:string};
export class DialoguePicker{
 private used=new Map<string,number>();
 constructor(private repeatWindowMs=8*60_000,history:[string,number][]=[]){for(const [key,at] of history)this.used.set(key,at);}
 pick(lines:DialogueLine[],category:string,now=Date.now(),random=Math.random):DialogueLine|null{
  const available=(pool:DialogueLine[])=>pool.filter(l=>now-(this.used.get(l.key)??-Infinity)>=this.repeatWindowMs);
  let candidates=available(lines.filter(l=>l.category===category));
  if(!candidates.length&&!['boss','night','challenge','reply'].includes(category))candidates=available(lines.filter(l=>l.category==='ambient'));
  if(!candidates.length)return null;
  const line=candidates[Math.floor(random()*candidates.length)];
  this.used.set(line.key,now);return line;
 }
 history(now=Date.now()):[string,number][]{return [...this.used].filter(([,at])=>now-at<this.repeatWindowMs);}
}


