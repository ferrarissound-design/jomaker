import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreePlayRenderer } from '../src/render3d.js';
import { TILE } from '../src/stage.js';
const vector = () => ({set(x,y,z){Object.assign(this,{x,y,z});}});
const node = () => ({position:vector(),scale:vector(),center:vector(),material:{},userData:{baseScale:1.55}});
test('sprite soles stay on the collision bottom across frames and facing directions',()=>{
  const r=Object.create(ThreePlayRenderer.prototype);
  Object.assign(r,{stage:{height:16},playerNode:node(),playerShadow:node(),playerTextures:[{},{}],playerIdleTexture:{},playerJumpTexture:{},lastLandingSerial:0,platformNodes:[node()],crateNodes:[],projectileNodes:[],ensureEnemies(){},ensureCount(){},updateEffects(){}});
  const game={player:{x:100,y:200,w:28,h:38,vx:0,grounded:true,facing:1},landingSerial:0,enemies:[],movingPlatforms:[{x:96,y:238,w:TILE,h:12}],crates:[],projectiles:[]};
  for(const [grounded,vx,time,footY] of [[true,0,0,1193],[true,80,0,1121],[true,-80,.125,1157],[false,80,0,1155],[true,0,0,1193]]){
    Object.assign(game.player,{grounded,vx});r.updateDynamic(game,time);
    const renderedSole=r.playerNode.position.y+(1-footY/1254-r.playerNode.center.y)*r.playerNode.scale.y;
    assert.equal(renderedSole,16-238/TILE);
    assert.equal(r.playerNode.position.x,114/TILE);
    assert.equal(Math.sign(r.playerNode.scale.x),vx<0?-1:1);
    // Platform mesh is authored in a full tile, even though its collider is 12px tall.
    assert.equal(r.platformNodes[0].position.y+.5,renderedSole);
  }
});
