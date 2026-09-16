import '../src/engine-fixes.js?v=20260916-enemy-direction-1';
import '../src/moving-platform-collision.js?v=20260916-enemy-direction-1';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/engine.js?v=20260916-enemy-direction-1';
import { createStage, StageEditor, StageStore } from '../src/stage.js?v=20260916-enemy-direction-1';
import { encodeStage, decodeStage } from '../src/share.js?v=20260916-enemy-direction-1';
import { moveTrike } from '../src/trike-enemy.js?v=20260916-enemy-direction-1';
const idle={left:false,right:false,jump:false};
function setup(extra=[]) {
  const s=createStage();s.objects.push({type:'trikeEnemy',x:8,y:11},...extra);
  return new GameEngine(s);
}
const advance=(g,n)=>{for(let i=0;i<n;i++)g.step(1/120,idle);};
test('trike editor, undo, save and share retain the new type',()=>{
  const ed=new StageEditor(createStage());ed.place('trikeEnemy',8,11);ed.undo();ed.redo();
  const mem=new Map();const store=new StageStore({getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)});
  store.save(ed.stage);const saved=store.list()[0].data;
  assert.ok(decodeStage(encodeStage(saved)).objects.some(o=>o.type==='trikeEnemy'));
  assert.equal(new GameEngine(saved).enemies[0].state,'walk');
});
for(const type of ['ground','block','platform','breakable','switchBlock','pressureBlock','timerBlock','door','enemyDoor','crate','movingPlatform']) {
  for(const state of ['walk','sliding'])test(`${state} trike reflects from both sides of ${type}`,()=>{
    for(const direction of [1,-1]) {
      const g=setup([{type,x:10,y:11}]);const e=g.enemies[0];
      const o=type==='crate'?g.crates[0]:type==='movingPlatform'?g.movingPlatforms[0]:g.solids.get('10,11');
      Object.assign(e,{state,direction,x:direction===1?o.x-e.w-1:o.x+o.w+1,y:o.y,vy:0});
      moveTrike(g,e,1/120);moveTrike(g,e,1/120);moveTrike(g,e,1/120);
      assert.equal(e.direction,-direction);
      assert.equal(e.state,state);
      assert.ok(e.x+e.w<=o.x || e.x>=o.x+o.w);
    }
  });
}
test('stomp, kick from either side, stomp sliding and returning side damage',()=>{
  for(const direction of [1,-1]) {
    const g=setup();advance(g,20);const e=g.enemies[0],p=g.player;
    Object.assign(p,{x:e.x,y:e.y-p.h-1,vy:240});g.step(1/120,idle);
    assert.equal(e.state,'flipped');assert.equal(e.vx,0);assert.ok(p.vy<0);
    Object.assign(p,{x:direction===1?e.x-p.w+1:e.x+e.w-1,y:e.y+e.h-p.h,vy:0});g.step(1/120,idle);
    assert.equal(e.state,'sliding');assert.equal(e.direction,direction);assert.equal(g.deaths,0);
    Object.assign(p,{x:e.x,y:e.y-p.h-1,vy:240});g.step(1/120,idle);
    assert.equal(e.state,'flipped');
    e.state='sliding';Object.assign(p,{x:e.x+5,y:e.y+e.h-p.h,vy:0});g.step(1/120,idle);
    assert.equal(g.deaths,1);
  }
});
for(const type of ['enemy','flyingEnemy','trikeEnemy'])test(`sliding defeats ${type} regardless of ordering`,()=>{
  for(const reversed of [false,true]) {
    const g=setup([{type,x:10,y:11}]);const e=g.enemies[0],other=g.enemies[1];
    Object.assign(e,{state:'sliding',direction:1,x:430,y:548,grounded:true});
    Object.assign(other,{x:462,y:540,baseY:540,vy:0,vx:0});
    if(reversed)g.enemies.reverse();g.step(1/120,idle);
    assert.ok(g.enemies.includes(e));assert.ok(!g.enemies.includes(other));
  }
});
test('trikes drop into holes, disappear, and release enemy doors',()=>{
  const g=setup([{type:'enemyDoor',x:15,y:11}]);
  for(const [key,o] of g.solids)if(o.type==='ground'&&o.x>=7*48&&o.x<=14*48)g.solids.delete(key);
  advance(g,140);assert.equal(g.enemies.length,0);assert.ok(!g.solids.has('15,11'));
});
test('stage edges reflect and long frames cannot tunnel through thin platforms',()=>{
  const g=setup([{type:'platform',x:10,y:10}]);const e=g.enemies[0];
  Object.assign(e,{state:'sliding',direction:-1,x:0,y:548});g.step(1/120,idle);
  assert.equal(e.direction,1);
  Object.assign(e,{state:'flipped',x:480,y:390,vy:900});g.step(.1,idle);
  assert.equal(e.y+e.h,480);assert.equal(e.grounded,true);
});
test('moving platform entering trike resolves overlap and reverses slide',()=>{
  const g=setup([{type:'movingPlatform',x:10,y:11}]);const e=g.enemies[0],o=g.movingPlatforms[0];
  Object.assign(e,{state:'sliding',direction:1,x:o.x-e.w+3,y:o.y,vy:0});
  moveTrike(g,e,1/120);assert.equal(e.direction,-1);assert.ok(e.x+e.w<=o.x);
});
test('a kicked trike bounces off a wall and kills its kicker on return',()=>{
  const g=setup([{type:'block',x:11,y:11}]);advance(g,20);
  const e=g.enemies[0],p=g.player;e.state='flipped';e.vx=0;
  Object.assign(p,{x:e.x-p.w+1,y:576-p.h,vy:0});g.step(1/120,idle);
  assert.equal(e.state,'sliding');assert.equal(g.deaths,0);
  let reflected=false;
  for(let i=0;i<150&&g.deaths===0;i++){g.step(1/120,idle);if(e.direction===-1)reflected=true;}
  assert.ok(reflected);assert.equal(g.deaths,1);
});
test('two sliding trikes resolve without passing through each other',()=>{
  const g=setup([{type:'trikeEnemy',x:10,y:11}]);
  Object.assign(g.enemies[0],{state:'sliding',direction:1,x:430,y:548});
  Object.assign(g.enemies[1],{state:'sliding',direction:-1,x:465,y:548});
  g.step(1/120,idle);assert.equal(g.enemies.length,1);
});

test('trikes can be configured to start walking left or right',()=>{
  for(const [direction,sign] of [['left',-1],['right',1]]) {
    const stage=createStage();
    const editor=new StageEditor(stage);editor.place('trikeEnemy',8,11);
    const trike=editor.stage.objects.find(o=>o.type==='trikeEnemy');
    assert.equal(trike.props.direction,'left');
    trike.props.direction=direction;
    const encoded=decodeStage(encodeStage(editor.stage));
    const game=new GameEngine(encoded);const enemy=game.enemies[0];
    assert.equal(enemy.direction,sign);
    const before=enemy.x;game.step(1/120,idle);
    assert.equal(Math.sign(enemy.x-before),sign);
  }
});
test('invalid trike directions are rejected',()=>{
  const stage=createStage();stage.objects.push({type:'trikeEnemy',x:8,y:11,props:{direction:'up'}});
  assert.throws(()=>new GameEngine(stage),/トリケラの向き/);
});
