import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage, createStageId, gridLine, StageEditor, StageStore, validateStage, resizeStage, resetStageLayout } from '../src/stage.js';
import { GameEngine } from '../src/engine.js';
import { encodeStage, decodeStage } from '../src/share.js';
const idle={left:false,right:false,jump:false,jumpHeld:false};
const advance=(g,n,input=idle)=>{for(let i=0;i<n;i++)g.step(1/120,input);};
test('reset preserves custom dimensions and metadata, remains saveable and supports undo',()=>{
  for(const [width,height] of [[20,14],[100,14],[10,8],[300,40]]){
    const original={...createStage(),width,height,name:'Custom',background:'classic',playerStart:{x:1,y:1},objects:[{type:'coin',x:4,y:2}]};
    const e=new StageEditor(original);
    e.change(resetStageLayout);
    validateStage(e.stage);
    assert.equal(e.stage.width,width);
    assert.equal(e.stage.height,height);
    assert.equal(e.stage.name,'Custom');
    assert.equal(e.stage.background,'classic');
    assert.equal(e.stage.objects.filter(o=>o.type==='ground').length,width);
    assert.equal(e.stage.objects.filter(o=>o.type==='goal').length,1);
    const memory=new Map(),store=new StageStore({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)});
    store.save(e.stage);
    assert.deepEqual(store.list()[0].data,e.stage);
    e.undo();
    assert.deepEqual(e.stage,original);
    e.redo();
    validateStage(e.stage);
  }
});
test('enemies falling out of the stage stop blocking enemy-clear doors',()=>{
  const s=createStage();
  s.objects=s.objects.filter(o=>!(o.type==='ground'&&o.x>=6&&o.x<=12));
  s.objects.push({type:'enemy',x:8,y:11},{type:'enemyDoor',x:14,y:11});
  const g=new GameEngine(s);
  assert.equal(g.solids.has('14,11'),true);
  advance(g,240);
  assert.equal(g.deaths,0);
  assert.equal(g.enemies.length,0);
  assert.equal(g.solids.has('14,11'),false);
  assert.equal(g.stompSerial,0);
  g.reset();
  assert.equal(g.enemies.length,1);
  assert.equal(g.solids.has('14,11'),true);
});
test('placement, unique goal, erase, undo and redo',()=>{const e=new StageEditor(createStage());e.place('enemy',8,11);assert.equal(e.stage.objects.at(-1).type,'enemy');e.place('spike',8,11);assert.equal(e.stage.objects.filter(o=>o.x===8&&o.y===11).length,1);e.undo();assert.equal(e.stage.objects.at(-1).type,'enemy');e.redo();e.place('erase',8,11);assert.ok(!e.stage.objects.some(o=>o.x===8&&o.y===11));e.place('goal',30,11);assert.equal(e.stage.objects.filter(o=>o.type==='goal').length,1);e.place('block',-1,0);validateStage(e.stage);});
test('stage length expands floors, crops the right edge and is undoable',()=>{const e=new StageEditor(createStage());e.change(s=>resizeStage(s,100));assert.equal(e.stage.width,100);assert.ok(e.stage.objects.some(o=>o.type==='ground'&&o.x===99&&o.y===12));e.stage.objects.push({type:'coin',x:90,y:10});e.change(s=>resizeStage(s,40));assert.equal(e.stage.width,40);assert.ok(e.stage.objects.every(o=>o.x<40));validateStage(e.stage);e.undo();assert.equal(e.stage.width,100);assert.ok(e.stage.objects.some(o=>o.type==='coin'&&o.x===90));});
test('stage length rejects invalid sizes and cannot cut off the start position',()=>{const s=createStage();assert.throws(()=>resizeStage(s,9),/10〜300/);s.playerStart={x:25,y:11};assert.throws(()=>resizeStage(s,20),/スタート位置/);});

test('multiple stages survive serialization, updates preserve creation and delete',()=>{const memory=new Map();const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};const store=new StageStore(storage);const first=store.save(createStage());const second=store.save({...createStage(),name:'Second'});const date=store.list().find(r=>r.id===first).createdAt;store.save({...createStage(),name:'Changed'},first);assert.equal(store.list().length,2);assert.equal(store.list()[0].createdAt,date);assert.equal(new StageStore(storage).list()[0].name,'Changed');store.remove(second);assert.equal(store.list().length,1);});
test('editor drafts round-trip, retain stage ids and can be cleared',()=>{const memory=new Map();const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};const store=new StageStore(storage),stage=createStage();stage.name='復旧する冒険';const draft=store.saveDraft(stage,'stage-1');assert.equal(draft.stageId,'stage-1');assert.equal(store.loadDraft().data.name,'復旧する冒険');assert.equal(store.loadDraft().stageId,'stage-1');store.clearDraft();assert.equal(store.loadDraft(),null);});
test('saving another stage cannot clear a different recovery draft',()=>{const memory=new Map();const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};const store=new StageStore(storage),stage=createStage();store.saveDraft(stage,'stage-a');assert.equal(store.clearDraft('stage-b'),false);assert.equal(store.loadDraft().stageId,'stage-a');assert.equal(store.clearDraft('stage-a'),true);assert.equal(store.loadDraft(),null);});
test('stage ids support environments without crypto.randomUUID',()=>{const id=createStageId();assert.equal(typeof id,'string');assert.ok(id.length>8);const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};const store=new StageStore(storage,()=> 'fallback-id');assert.equal(store.save(createStage()),'fallback-id');});
test('malformed drafts are rejected without touching saved stages',()=>{const memory=new Map();const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};const store=new StageStore(storage);const saved=store.save(createStage());memory.set(store.draftKey,'{broken');assert.throws(()=>store.loadDraft(),/下書き/);assert.equal(store.list()[0].id,saved);});

test('storage failures propagate without replacing editor data',()=>{const s=createStage();const store=new StageStore({getItem:()=>null,setItem:()=>{throw new Error('quota');}});assert.throws(()=>store.save(s),/quota/);assert.equal(s.name,'名前のない冒険');});
test('landing, horizontal motion, jumping and engine data isolation',()=>{const s=createStage(),before=JSON.stringify(s),g=new GameEngine(s);advance(g,60);assert.equal(g.player.grounded,true);assert.equal(g.landingSerial,0);const x=g.player.x;advance(g,30,{...idle,right:true});assert.ok(g.player.x>x);const y=g.player.y;g.step(1/120,{...idle,jump:true});assert.ok(g.player.y<y);advance(g,120);assert.equal(g.player.grounded,true);assert.equal(g.landingSerial,1);advance(g,30);assert.equal(g.landingSerial,1);assert.equal(JSON.stringify(s),before);});
test('spikes, enemies and falling respawn without reload',()=>{for(const type of ['spike','enemy']){const s=createStage();s.objects.push({type,x:4,y:11});const g=new GameEngine(s);advance(g,100,{...idle,right:true});assert.ok(g.deaths>0,type);}const g=new GameEngine(createStage());g.player.y=900;g.step(1/120,idle);assert.equal(g.deaths,1);assert.equal(g.player.x,106);});
test('pteranodons patrol in the air and count toward enemy-clear doors',()=>{const s=createStage();s.playerStart={x:1,y:11};s.objects.push({type:'flyingEnemy',x:8,y:5},{type:'enemyDoor',x:12,y:11});const g=new GameEngine(s);const e=g.enemies.find(enemy=>enemy.type==='flyingEnemy');assert.ok(e);const x=e.x,y=e.y;advance(g,30);assert.notEqual(e.x,x);assert.notEqual(e.y,y);assert.equal(g.solids.has('12,11'),true);g.enemies.splice(g.enemies.indexOf(e),1);g.updateEnemyDoors();assert.equal(g.solids.has('12,11'),false);});

test('goal, coin, solid wall and one-way platform',()=>{const s=createStage();s.objects=s.objects.filter(o=>o.type!=='goal');s.objects.push({type:'goal',x:5,y:11},{type:'coin',x:3,y:11});const g=new GameEngine(s);advance(g,120,{...idle,right:true});assert.equal(g.clear,true);assert.equal(g.coins.size,1);assert.equal(g.coinSerial,1);assert.equal(g.goalSerial,1);const wall=createStage();wall.objects.push({type:'block',x:4,y:11});const blocked=new GameEngine(wall);advance(blocked,120,{...idle,right:true});assert.ok(blocked.player.x+blocked.player.w<=192);const floor=createStage();floor.objects.push({type:'platform',x:2,y:10});const f=new GameEngine(floor);f.player.y=400;f.player.vy=50;advance(f,60);assert.equal(f.player.y+f.player.h,480);});
test('coyote time and buffered landing jump',()=>{const g=new GameEngine(createStage());advance(g,60);g.player.grounded=false;g.coyote=.09;g.step(1/120,{...idle,jump:true});assert.ok(g.player.vy<0);assert.equal(g.jumpSerial,1);g.step(1/120,{...idle,jump:true});assert.equal(g.jumpSerial,1);const b=new GameEngine(createStage());b.player.y=530;b.player.vy=100;b.step(1/120,{...idle,jump:true});advance(b,10);assert.ok(b.player.vy<0);assert.equal(b.jumpSerial,1);});
test('reject malformed and overlapping stage objects',()=>{const s=createStage();s.objects.push({...s.objects[0]});assert.throws(()=>validateStage(s));assert.throws(()=>validateStage({...createStage(),width:100000}));});

test('drag stroke is grouped into one undo operation',()=>{const e=new StageEditor(createStage());e.beginStroke();e.strokePlace('block',30,11);e.strokePlace('block',31,11);e.strokePlace('block',32,11);assert.equal(e.endStroke(),true);assert.equal(e.undoStack.length,1);assert.ok(e.stage.objects.some(o=>o.x===31&&o.y===11&&o.type==='block'));e.undo();assert.ok(!e.stage.objects.some(o=>[30,31,32].includes(o.x)&&o.y===11&&o.type==='block'));});
test('fast drag paths interpolate every crossed grid cell',()=>{assert.deepEqual(gridLine({x:2,y:3},{x:6,y:3}),[{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:6,y:3}]);const diagonal=gridLine({x:2,y:2},{x:5,y:5});assert.deepEqual(diagonal,[{x:2,y:2},{x:3,y:3},{x:4,y:4},{x:5,y:5}]);});

test('short jump cuts upward speed while held jump stays tall',()=>{const held=new GameEngine(createStage()),cut=new GameEngine(createStage());advance(held,60);advance(cut,60);held.step(1/120,{...idle,jump:true,jumpHeld:true});cut.step(1/120,{...idle,jump:true,jumpHeld:true});held.step(1/120,{...idle,jumpHeld:true});cut.step(1/120,idle);assert.ok(cut.player.vy>held.player.vy+200);});

test('spring launches player and checkpoint becomes respawn point',()=>{const s=createStage();s.objects.push({type:'spring',x:3,y:11},{type:'checkpoint',x:5,y:11});const g=new GameEngine(s);advance(g,60);g.player.x=3*48+10;g.step(1/120,idle);assert.ok(g.player.vy<-700);g.player.x=5*48+10;g.player.y=11*48+8;g.player.vy=0;g.step(1/120,idle);assert.deepEqual(g.checkpoint,{x:5,y:11});g.player.y=1000;g.step(1/120,idle);assert.equal(g.deaths,1);assert.equal(g.player.x,5*48+10);});

test('moving platforms animate and can carry the player',()=>{const s=createStage();s.playerStart={x:2,y:8};s.objects=s.objects.filter(o=>!(o.x===2&&o.y===12));s.objects.push({type:'movingPlatform',x:2,y:10});const g=new GameEngine(s);advance(g,80);assert.equal(g.player.platformKey,'2,10');const before=g.player.x;advance(g,30);assert.notEqual(g.movingPlatforms[0].x,g.movingPlatforms[0].baseX);assert.notEqual(g.player.x,before);});

test('keys open doors and are consumed',()=>{const s=createStage();s.objects.push({type:'key',x:3,y:11},{type:'door',x:4,y:11});const g=new GameEngine(s);advance(g,90,{...idle,right:true});assert.ok(g.collectedKeys.has('3,11'));assert.ok(g.openedDoors.has('4,11'));assert.equal(g.keys,0);assert.ok(g.player.x>4*48);});

test('breakable blocks shatter from a head bump',()=>{const s=createStage();s.objects.push({type:'breakable',x:2,y:9});const g=new GameEngine(s);advance(g,60);g.step(1/120,{...idle,jump:true,jumpHeld:true});advance(g,40,{...idle,jumpHeld:true});assert.ok(g.brokenBlocks.has('2,9'));assert.equal(g.solids.has('2,9'),false);});

test('switches toggle switch blocks out of the path',()=>{const s=createStage();s.objects.push({type:'switch',x:3,y:11},{type:'switchBlock',x:5,y:11});const g=new GameEngine(s);advance(g,120,{...idle,right:true});assert.equal(g.switchOn,true);assert.equal(g.solids.has('5,11'),false);assert.ok(g.player.x>5*48);});

test('paired warps move the player forward with a cooldown',()=>{const s=createStage();s.objects.push({type:'warp',x:3,y:11},{type:'warp',x:8,y:11});const g=new GameEngine(s);advance(g,35,{...idle,right:true});assert.ok(g.player.x>=8*48);assert.ok(g.warpCooldown>0);});
test('a warp stays locked until the player exits its destination',()=>{const s=createStage();s.objects.push({type:'warp',x:3,y:11},{type:'warp',x:8,y:11});const g=new GameEngine(s);advance(g,60);g.player.x=3*48+10;g.player.y=11*48+8;g.step(1/120,idle);assert.equal(g.warpLockKey,'8,11');advance(g,90);assert.ok(g.player.x>=8*48,'waiting on the destination must not warp back');g.player.x=9*48+10;g.step(1/120,idle);assert.equal(g.warpLockKey,null);g.player.x=8*48+10;g.step(1/120,idle);assert.ok(g.player.x<4*48,'re-entering the destination may use the warp again');});

test('stage share codes round-trip unicode stage data',()=>{const s=createStage();s.name='カギと扉の冒険🔑';s.objects.push({type:'key',x:4,y:11},{type:'door',x:5,y:11},{type:'warp',x:9,y:11});const code=encodeStage(s);assert.match(code,/^JO1\./);assert.deepEqual(decodeStage(code),s);assert.throws(()=>decodeStage('nope'),/共有コード/);});

test('pushable crates can hold pressure plates to open pressure blocks',()=>{const s=createStage();s.objects.push({type:'crate',x:4,y:11},{type:'plate',x:6,y:11},{type:'pressureBlock',x:8,y:11});const g=new GameEngine(s);advance(g,60);const before=g.crates[0].x;advance(g,40,{...idle,right:true});assert.ok(g.crates[0].x>before);g.crates[0].x=6*48+4;g.crates[0].y=11*48+4;g.crates[0].vy=0;g.step(1/120,idle);assert.equal(g.pressureActive,true);assert.equal(g.solids.has('8,11'),false);g.crates[0].x=7*48+4;g.step(1/120,idle);assert.equal(g.pressureActive,false);assert.equal(g.solids.has('8,11'),true);});

test('stomping enemies defeats them and opens enemy-clear doors',()=>{const s=createStage();s.objects.push({type:'enemy',x:4,y:11},{type:'enemyDoor',x:7,y:11});const g=new GameEngine(s);g.player.x=4*48+10;g.player.y=470;g.player.vy=300;advance(g,20);assert.equal(g.enemies.length,0);assert.equal(g.solids.has('7,11'),false);assert.ok(g.player.vy<0);assert.equal(g.stompSerial,1);advance(g,20);assert.equal(g.stompSerial,1);});

test('cannons defeat enemies and open enemy-clear doors',()=>{const s=createStage();s.playerStart={x:0,y:11};s.objects.push({type:'cannon',x:2,y:11},{type:'enemy',x:5,y:11},{type:'enemyDoor',x:8,y:11});const g=new GameEngine(s);advance(g,220);assert.equal(g.enemies.length,0);assert.equal(g.solids.has('8,11'),false);assert.equal(g.deaths,0);});

test('cannon shots break blocks and can remotely toggle switches',()=>{const breakStage=createStage();breakStage.playerStart={x:0,y:11};breakStage.objects.push({type:'cannon',x:2,y:11},{type:'breakable',x:5,y:11});const breaker=new GameEngine(breakStage);advance(breaker,220);assert.ok(breaker.brokenBlocks.has('5,11'));const switchStage=createStage();switchStage.playerStart={x:0,y:11};switchStage.objects.push({type:'cannon',x:2,y:11},{type:'switch',x:5,y:11},{type:'switchBlock',x:8,y:11});const remote=new GameEngine(switchStage);advance(remote,100);assert.equal(remote.switchOn,true);assert.equal(remote.solids.has('8,11'),false);});

test('cannon shots can shove crates into puzzle positions',()=>{const s=createStage();s.playerStart={x:0,y:11};s.objects.push({type:'cannon',x:2,y:11},{type:'crate',x:5,y:11});const g=new GameEngine(s);const before=g.crates[0].x;advance(g,120);assert.ok(g.crates[0].x>before);});

test('timer switches open timed blocks and they close again',()=>{const s=createStage();s.objects.push({type:'timerSwitch',x:3,y:11},{type:'timerBlock',x:6,y:11});const g=new GameEngine(s);g.player.x=3*48+10;g.player.y=11*48+8;g.step(1/120,idle);assert.ok(g.timerGate>3);assert.equal(g.solids.has('6,11'),false);g.player.x=2*48+10;advance(g,400);assert.equal(g.timerGate,0);assert.equal(g.solids.has('6,11'),true);});
test('dynamic blocks wait for occupied space before reappearing',()=>{const s=createStage();s.objects.push({type:'timerBlock',x:6,y:11},{type:'switchBlock',x:8,y:11});const g=new GameEngine(s);g.activateTimer(.001);g.player.x=6*48+10;g.player.y=11*48+8;g.step(1/120,idle);assert.equal(g.solids.has('6,11'),false);assert.equal(g.player.x,6*48+10);g.player.x=4*48+10;g.step(1/120,idle);assert.equal(g.solids.has('6,11'),true);g.setSwitch(true);g.player.x=8*48+10;g.player.y=11*48+8;g.setSwitch(false);assert.equal(g.solids.has('8,11'),false);g.player.x=4*48+10;g.step(1/120,idle);assert.equal(g.solids.has('8,11'),true);});
test('reset restarts moving-platform time without a phase jump',()=>{const s=createStage();s.objects.push({type:'movingPlatform',x:5,y:8});const g=new GameEngine(s);advance(g,90);assert.notEqual(g.movingPlatforms.at(-1).x,g.movingPlatforms.at(-1).baseX);g.reset();assert.equal(g.time,0);g.step(1/120,idle);assert.ok(Math.abs(g.movingPlatforms.at(-1).x-g.movingPlatforms.at(-1).baseX)<2);});

test('new stages use tropical background while legacy stages remain valid',()=>{const fresh=createStage();assert.equal(fresh.background,'tropicalSea');const legacy=structuredClone(fresh);delete legacy.background;assert.doesNotThrow(()=>validateStage(legacy));});

test('configurable parts receive defaults and reject invalid props',()=>{const e=new StageEditor(createStage());e.place('cannon',30,11);const cannon=e.stage.objects.find(o=>o.type==='cannon');assert.equal(cannon.props.direction,'right');assert.equal(cannon.props.interval,1.65);const bad=structuredClone(e.stage);bad.objects.find(o=>o.type==='cannon').props.interval=.1;assert.throws(()=>validateStage(bad),/大砲/);});

test('moving platform settings control axis distance and speed',()=>{const s=createStage();s.objects.push({type:'movingPlatform',x:5,y:7,props:{axis:'y',distance:3,speed:2}});const g=new GameEngine(s);const p=g.movingPlatforms.at(-1);const x=p.x,y=p.y;advance(g,30);assert.equal(p.x,x);assert.notEqual(p.y,y);assert.equal(p.distance,3);assert.equal(p.speed,2);});

test('cannon settings control direction and firing interval',()=>{const s=createStage();s.playerStart={x:20,y:11};s.objects.push({type:'cannon',x:10,y:11,props:{direction:'left',interval:.5}});const g=new GameEngine(s);advance(g,50);assert.ok(g.projectiles.some(shot=>shot.vx<0));assert.equal(g.cannons.at(-1).interval,.5);});

test('custom timer duration and explicit warp targets are respected',()=>{const s=createStage();s.objects.push({type:'timerSwitch',x:3,y:11,props:{duration:6}},{type:'warp',x:5,y:11,props:{target:'12,11'}},{type:'warp',x:8,y:11},{type:'warp',x:12,y:11});const g=new GameEngine(s);g.player.x=3*48+10;g.player.y=11*48+8;g.step(1/120,idle);assert.ok(g.timerGate>5.9);g.player.x=5*48+10;g.player.y=11*48+8;g.warpCooldown=0;g.step(1/120,idle);assert.ok(g.player.x>=12*48);});
