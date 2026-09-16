import test from 'node:test';
import assert from 'node:assert/strict';
import { animateAnimeEnemy } from '../src/anime-enemies.js';
import { TILE } from '../src/stage.js';
const vector=()=>({set(x,y,z){Object.assign(this,{x,y,z});}});
test('animated enemies keep collision alignment and preserve their last facing when stopped',()=>{
  const view={stage:{height:16},bodyBottom:e=>16-(e.y+e.h)/TILE};
  for(const type of ['enemy','flyingEnemy']){
    const e={type,x:120,y:200,w:32,h:34,vx:-80,grounded:true};
    const original={...e};
    const frames=[{},{}];
    const n={position:vector(),scale:vector(),material:{},userData:{frames}};
    animateAnimeEnemy(view,n,e,0);assert.equal(n.material.map,frames[0]);
    const baseline=n.position.y;
    animateAnimeEnemy(view,n,e,.15);assert.equal(n.material.map,frames[1]);
    assert.equal(n.position.y,baseline);assert.equal(n.position.x,(e.x+e.w/2)/TILE);
    assert.deepEqual(e,original,'rendering must not alter physics');
    if(type==='enemy')assert.equal(baseline,view.bodyBottom(e));
    else assert.equal(baseline,16-(e.y+e.h/2)/TILE);
    e.vx=0;animateAnimeEnemy(view,n,e,1);assert.ok(n.scale.x<0);
    e.vx=80;animateAnimeEnemy(view,n,e,1);assert.ok(n.scale.x>0);
  }
});
