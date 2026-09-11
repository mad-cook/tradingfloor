export const REACTIONS=['back','doubt','chaos'] as const;
export type Reaction=typeof REACTIONS[number];
export type AudienceState={counts:Record<Reaction,number>;total:number;last:Reaction|null;at:number};
type Vote={reaction:Reaction;at:number};
export class Audience {
 private votes=new Map<string,Vote>();
 constructor(private now=()=>Date.now()){}
 snapshot():AudienceState{const now=this.now();for(const [id,v] of this.votes)if(now-v.at>15*60_000)this.votes.delete(id);const counts={back:0,doubt:0,chaos:0};let latest:Vote|undefined;for(const v of this.votes.values()){counts[v.reaction]++;if(!latest||v.at>latest.at)latest=v;}return {counts,total:this.votes.size,last:latest?.reaction??null,at:latest?.at??0};}
 vote(id:string,reaction:unknown){this.snapshot();if(!REACTIONS.includes(reaction as Reaction))throw Error('Choose a listed reaction');const prior=this.votes.get(id);if(prior&&this.now()-prior.at<30_000)throw Error('Give the floor 30 seconds before reacting again');if(!prior&&this.votes.size>=10_000)throw Error('The gallery is full. Try again later');this.votes.set(id,{reaction:reaction as Reaction,at:this.now()});return this.snapshot();}
}
