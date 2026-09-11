import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {DialoguePicker,type DialogueLine} from '../components/dialogue';
const make=(key:string,category='ambient'):DialogueLine=>({key,category,url:'/vo/'+key+'.mp3',text:key});
test('dialogue chooses fresh variants and falls back to fresh desk banter',()=>{
 const picker=new DialoguePicker(1000);const bank=[make('risk-1','risk'),make('risk-2','risk'),make('desk-ambient')];
 assert.equal(picker.pick(bank,'risk',0,()=>0)?.key,'risk-1');assert.equal(picker.pick(bank,'risk',1,()=>0)?.key,'risk-2');assert.equal(picker.pick(bank,'risk',2,()=>0)?.key,'desk-ambient');assert.equal(picker.pick(bank,'risk',3,()=>0),null);
 assert.equal(picker.pick(bank,'risk',1000,()=>0)?.key,'risk-1');
});
test('same phrase is blocked even when spoken by another desk',()=>{
 const picker=new DialoguePicker();const a=make('risk-1','risk'),b={...a,text:'A different stock in the same sentence',url:'/vo/other.mp3'};
 assert.ok(picker.pick([a],'risk',100,()=>0));assert.equal(picker.pick([b],'risk',200,()=>0),null);
});
test('refresh preserves dialogue history and night shift never falls back to market chatter',()=>{
 const picker=new DialoguePicker();picker.pick([make('already')],'ambient',100);
 const restored=new DialoguePicker(480000,picker.history(200));assert.equal(restored.pick([make('already')],'ambient',201),null);
 assert.equal(restored.pick([make('market')],'night',201),null);
});
test('expanded script contains genuinely distinct desk banter and outcome categories',()=>{
 const source=JSON.parse(readFileSync('scripts/voice-script.json','utf8').replace(/^\uFEFF/,''));
 const all=Object.values(source).flat() as {key:string;text:string;category:string}[];
 assert.equal(all.length,860);assert.ok(new Set(all.map(l=>l.text)).size>=700);assert.ok(new Set(all.map(l=>l.key)).size>=260);
 for(const [desk,lines] of Object.entries(source) as [string,DialogueLine[]][]){if(desk==='principal')continue;
  assert.equal(lines.filter(l=>l.category==='ambient').length,16);
  for(const category of ['pitch','approved','trim','risk','fill','hit','miss'])assert.equal(lines.filter(l=>l.category===category).length,6);
 }
});

