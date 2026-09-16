import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreePlayRenderer } from '../src/render3d.js?v=20260916-trike-1';

test('2D player chooses dedicated left artwork without mirroring and keeps fallback',async()=>{
  const previous=globalThis.Image;
  const images=[];
  globalThis.Image=class {constructor(){this.complete=true;this.naturalWidth=this.naturalHeight=1254;images.push(this);}};
  try {
    const {drawPlayer}=await import('../src/render.js?v=20260916-trike-1');
    const names={idle:'9914630D',right0:'029A536A',right1:'7B1D2CC0',left0:'594F8DAD',left1:'90285534',jumpRight:'B1003C9C',jumpLeft:'70FE4599'};
    for(const [grounded,vx,facing,time,key,flip] of [
      [true,0,1,0,'idle',1],[true,0,-1,0,'idle',-1],
      [true,1,1,0,'idle',1],[true,-1,-1,0,'idle',-1],
      [true,80,1,0,'right0',1],[true,80,1,.125,'right1',1],
      [true,-80,-1,0,'left0',1],[true,-80,-1,.125,'left1',1],
      [false,80,1,0,'jumpRight',1],[false,-80,-1,0,'jumpLeft',1],
      [false,0,-1,0,'jumpLeft',1],[false,0,1,0,'jumpRight',1]
    ]){
      const calls=[];
      const ctx=new Proxy({}, {get:(_,method)=>(...args)=>calls.push([method,...args]),set:()=>true});
      const p={x:100,y:200,w:28,h:38,grounded,vx,facing};
      drawPlayer(ctx,p,time);
      const draw=calls.find(c=>c[0]==='drawImage');assert.ok(draw[1].src.includes(names[key]));
      assert.deepEqual(calls.find(c=>c[0]==='scale'),['scale',flip,1]);
      assert.equal(draw[4],draw[5],'square source aspect ratio preserved');
      assert.deepEqual(calls.find(c=>c[0]==='translate'),['translate',114,238]);
    }
    images.find(i=>i.src.includes(names.jumpLeft)).complete=false;
    let raster=false;
    const ctx=new Proxy({}, {get:(_,method)=>()=>{if(method==='drawImage')raster=true;},set:()=>true});
    drawPlayer(ctx,{x:0,y:0,w:28,h:38,grounded:false,vx:0,facing:-1},0);
    assert.equal(raster,false,'unloaded left jump must use the vector fallback');
  } finally {globalThis.Image=previous;}
});

test('renderer disposes the dedicated left jump texture once',()=>{
  let disposed=0;const resource=()=>({dispose(){}});
  const r=Object.create(ThreePlayRenderer.prototype);
  Object.assign(r,{enemyNodes:[],effects:[],playerTextures:[],playerLeftTextures:[],playerJumpTexture:resource(),playerLeftJumpTexture:{dispose(){disposed++;}},playerIdleTexture:resource(),materials:new Map(),geometries:new Map(),animeTextures:[],outlineMaterial:resource(),renderer:resource()});
  r.dispose();assert.equal(disposed,1);
});
