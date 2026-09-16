import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreePlayRenderer } from '../src/render3d.js?v=20260916-trike-direction-1';
import { TILE } from '../src/stage.js?v=20260916-trike-direction-1';
const vector = () => ({set(x,y,z){Object.assign(this,{x,y,z});}});
const node = () => ({position:vector(),scale:vector(),center:vector(),material:{},userData:{baseScale:1.55}});
test('sprite soles stay on the collision bottom across frames and facing directions',()=>{
  const r=Object.create(ThreePlayRenderer.prototype);
  Object.assign(r,{stage:{height:16},playerNode:node(),playerShadow:node(),playerTextures:[{},{}],playerLeftTextures:[{},{}],playerIdleTexture:{},playerJumpTexture:{},playerLeftJumpTexture:{},lastLandingSerial:0,platformNodes:[node()],crateNodes:[],projectileNodes:[],ensureEnemies(){},ensureCount(){},updateEffects(){}});
  const game={player:{x:100,y:200,w:28,h:38,vx:0,grounded:true,facing:1},landingSerial:0,enemies:[],movingPlatforms:[{x:96,y:238,w:TILE,h:12}],crates:[],projectiles:[]};
  for(const [grounded,vx,time,footY,facing,texture,flip] of [
    [true,0,0,1193,1,r.playerIdleTexture,1],
    [true,80,0,1121,1,r.playerTextures[0],1],
    [true,80,.125,1157,1,r.playerTextures[1],1],
    [true,-80,0,1153,-1,r.playerLeftTextures[0],1],
    [true,-80,.125,1135,-1,r.playerLeftTextures[1],1],
    [false,80,0,1155,1,r.playerJumpTexture,1],
    [false,-80,0,1156,-1,r.playerLeftJumpTexture,1],
    [false,0,0,1156,-1,r.playerLeftJumpTexture,1],
    [false,0,0,1155,1,r.playerJumpTexture,1],
    [true,0,0,1193,-1,r.playerIdleTexture,-1]
  ]){
    Object.assign(game.player,{grounded,vx,facing});r.updateDynamic(game,time);
    const renderedSole=r.playerNode.position.y+(1-footY/1254-r.playerNode.center.y)*r.playerNode.scale.y;
    assert.equal(renderedSole,16-238/TILE);
    assert.equal(r.playerNode.position.x,114/TILE);
    assert.equal(Math.sign(r.playerNode.scale.x),flip);
    assert.equal(r.playerNode.material.map,texture);
    assert.equal(r.playerNode.center.x,((grounded && vx < -1) || (!grounded && facing < 0)) ? .38 : .62);
    // Platform mesh is authored in a full tile, even though its collider is 12px tall.
    assert.equal(r.platformNodes[0].position.y+.5,renderedSole);
  }
});
