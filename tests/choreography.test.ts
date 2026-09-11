import test from 'node:test';import assert from 'node:assert/strict';import {FloorEngine} from '../packages/core/sim/engine';import {deskMood,reactionWave,bossPath,samplePath,SEATS} from '../components/choreography';
test('mood reflects records, not random state',()=>{const d=new FloorEngine().state.desks[0];assert.equal(deskMood(d),'neutral');d.realized=1;assert.equal(deskMood(d),'confident');d.realized=-1;assert.equal(deskMood(d),'strained');});
test('reaction spreads after the initiating event and includes a late objection',()=>{const desks=new FloorEngine().state.desks;const wave=reactionWave({id:10,at:0,kind:'FORECAST_HIT',deskId:desks[0].id,text:''},desks,1000);
 assert.equal(wave[desks[0].id].kind,'celebrate');const neighbors=Object.entries(wave).filter(([id])=>id!==desks[0].id).map(([,v])=>v);assert.equal(neighbors.length,3);assert.deepEqual(neighbors.map(c=>c.start),[1450,2000,2550]);assert.equal(neighbors[2].kind,'object');
 assert.deepEqual(reactionWave({id:11,at:0,kind:'DESK_THINKING',deskId:desks[0].id,text:''},desks,0),{});
});
test('every principal route travels clear of desktops and stays on the floor',()=>{
 for(let desk=0;desk<12;desk++){const path=bossPath(desk);assert.deepEqual(samplePath(path,0).position,path[0]);samplePath(path,1).position.forEach((v,i)=>assert.ok(Math.abs(v-path.at(-1)![i])<1e-9));
  for(let i=0;i<=200;i++){const [x,y,z]=samplePath(path,i/200).position;assert.ok(Math.abs(x)<6&&Math.abs(z)<5&&y>=0);
   for(const p of SEATS)assert.ok(!(Math.abs(x-p[0])<1.04&&Math.abs(z-p[2])<.64),'Route overlaps a workstation');
  }
 }
});
