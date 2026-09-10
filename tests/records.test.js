import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordStore, courseKey, formatTime } from '../src/records.js';
import { GameEngine } from '../src/engine.js';
import { createStage } from '../src/stage.js';
const memory = () => {const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
const idle={left:false,right:false,jump:false,jumpHeld:false};

test('run clock survives death, freezes after clear and starts fresh on retry',()=>{
  const g=new GameEngine(createStage());
  g.step(1/120,idle);
  const elapsed=g.elapsed;
  assert.ok(elapsed>0);
  g.die();
  assert.equal(g.elapsed,elapsed);
  assert.equal(g.deaths,1);
  g.clear=true;g.step(1/120,idle);
  assert.equal(g.elapsed,elapsed);
  g.reset();
  assert.equal(g.elapsed,0);assert.equal(g.deaths,0);
});
test('best time and badges accumulate independently and survive reload',()=>{
  const storage=memory(),records=new RecordStore(storage),stage=createStage();
  stage.objects.push({type:'coin',x:4,y:3});
  const total=stage.objects.filter(o=>o.type==='coin').length;
  assert.equal(records.save(stage,{time:30,deaths:0,coins:0}).firstClear,true);
  const faster=records.save(stage,{time:20,deaths:2,coins:total});
  assert.equal(faster.newBest,true);assert.equal(faster.improvement,10);
  const slow=records.save(stage,{time:40,deaths:1,coins:0});
  assert.equal(slow.newBest,false);
  const r=new RecordStore(storage).get(stage);
  assert.equal(r.bestTime,20);assert.equal(r.clears,3);
  assert.equal(r.noMiss,true);assert.equal(r.allCoins,true);
});
test('layout changes isolate records; names and object property order do not',()=>{
  const stage=createStage(),copy=structuredClone(stage);
  copy.name='new name';copy.background='classic';
  copy.objects=copy.objects.map(o=>Object.fromEntries(Object.entries(o).reverse()));
  assert.equal(courseKey(stage),courseKey(copy));
  copy.playerStart.x++;
  assert.notEqual(courseKey(stage),courseKey(copy));
  const records=new RecordStore(memory());records.save(stage,{time:10,deaths:0,coins:0});
  assert.equal(records.get(copy),null);
});
test('zero-coin courses do not award all-coins badge; ties are not new bests',()=>{
  const stage=createStage();stage.objects=stage.objects.filter(o=>o.type!=='coin');
  const records=new RecordStore(memory());
  assert.equal(records.save(stage,{time:10,deaths:1,coins:0}).record.allCoins,false);
  assert.equal(records.save(stage,{time:10,deaths:1,coins:0}).newBest,false);
});
test('corrupt or blocked storage cannot interrupt a clear',()=>{
  const stage=createStage();
  for(const content of ['broken','{}','[null,{"key":"bad"}]']){
    const r=new RecordStore({getItem:()=>content,setItem:()=>{throw Error('quota');}});
    assert.equal(r.get(stage),null);
    assert.equal(r.save(stage,{time:10,deaths:1,coins:0}).saved,false);
  }
});
test('time formatting carries hundredths across minute boundaries',()=>{
  assert.equal(formatTime(0),'0:00.00');
  assert.equal(formatTime(59.999),'1:00.00');
  assert.equal(formatTime(125.12),'2:05.12');
});
