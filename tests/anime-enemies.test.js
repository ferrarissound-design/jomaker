import test from 'node:test';
import assert from 'node:assert/strict';
import { animateAnimeEnemy, ENEMY_VISUAL_WIDTH_TILES } from '../src/anime-enemies.js?v=20260916-enemy-direction-1';
import { TILE } from '../src/stage.js?v=20260916-enemy-direction-1';
const vector=()=>({set(x,y,z){Object.assign(this,{x,y,z});}});
test('animated enemies keep collision alignment and preserve their last facing when stopped',()=>{
  const view={stage:{height:16},bodyBottom:e=>16-(e.y+e.h)/TILE};
  for(const type of ['enemy','flyingEnemy']){
    const e={type,x:120,y:200,w:32,h:34,vx:-80,grounded:true};
    const original={...e};
    const frames=[{},{},{},{}];
    const n={position:vector(),scale:vector(),center:vector(),material:{},userData:{frames}};
    animateAnimeEnemy(view,n,e,0);assert.equal(n.material.map,frames[2]);
    const baseline=n.position.y;
    animateAnimeEnemy(view,n,e,.15);assert.equal(n.material.map,frames[3]);
    assert.equal(n.position.y,baseline);assert.equal(n.position.x,(e.x+e.w/2)/TILE);
    assert.deepEqual(e,original,'rendering must not alter physics');
    if(type==='enemy')assert.equal(baseline,view.bodyBottom(e));
    else assert.equal(baseline,16-(e.y+e.h/2)/TILE);
    e.vx=0;animateAnimeEnemy(view,n,e,1);assert.equal(n.userData.facing,-1);
    e.vx=80;animateAnimeEnemy(view,n,e,1);assert.equal(n.userData.facing,type==='flyingEnemy'?-1:1);
    assert.ok(n.scale.x>0,'sprite scale must stay positive');
    assert.equal(n.material.map,frames[type==='flyingEnemy'?2:1]);
  }
});
test('trike walking and flipped animations use distinct frames in both directions',()=>{
  const view={stage:{height:16},bodyBottom:e=>16-(e.y+e.h)/TILE};
  const frames=Array.from({length:8},()=>({}));
  const n={position:vector(),scale:vector(),center:vector(),material:{},userData:{frames}};
  const e={type:'trikeEnemy',state:'walk',x:120,y:200,w:34,h:28,vx:60,grounded:true};
  animateAnimeEnemy(view,n,e,0);assert.equal(n.material.map,frames[0]);
  const baseline=n.position.y;
  e.state='flipped';e.vx=0;animateAnimeEnemy(view,n,e,0);assert.equal(n.material.map,frames[4]);
  animateAnimeEnemy(view,n,e,.15);assert.equal(n.material.map,frames[5]);
  e.state='sliding';e.vx=-290;animateAnimeEnemy(view,n,e,0);assert.equal(n.material.map,frames[6]);
  assert.equal(n.position.y,baseline);
  assert.equal(n.scale.x,1.35);
  assert.equal(ENEMY_VISUAL_WIDTH_TILES.trikeEnemy,ENEMY_VISUAL_WIDTH_TILES.enemy);
});
