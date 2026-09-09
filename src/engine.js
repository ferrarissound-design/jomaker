import { TILE, clone, validateStage } from './stage.js';
const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
export class GameEngine {
  constructor(stage) { this.stage = clone(validateStage(stage)); this.solids = new Map(); for (const o of stage.objects) if (['ground','block','platform'].includes(o.type)) this.solids.set(`${o.x},${o.y}`, { ...o, x:o.x*TILE, y:o.y*TILE, w:TILE, h:o.type==='platform'?12:TILE }); this.deaths=0; this.reset(); }
  reset() { this.player={ x:this.stage.playerStart.x*TILE+10, y:this.stage.playerStart.y*TILE+8, w:28,h:38,vx:0,vy:0,grounded:false }; this.enemies=this.stage.objects.filter(o=>o.type==='enemy').map(o=>({x:o.x*TILE+7,y:o.y*TILE+12,w:34,h:36,vx:65,vy:0})); this.coins=new Set(); this.clear=false; this.coyote=0; this.buffer=0; }
  nearby(body) { const found=[]; for(let y=Math.floor(body.y/TILE)-1;y<=Math.floor((body.y+body.h)/TILE)+1;y++) for(let x=Math.floor(body.x/TILE)-1;x<=Math.floor((body.x+body.w)/TILE)+1;x++) { const o=this.solids.get(`${x},${y}`); if(o) found.push(o); } return found; }
  move(body,dt) { body.x+=body.vx*dt; let wall=false; for(const o of this.nearby(body)) if(o.type!=='platform'&&overlaps(body,o)) { body.x=body.vx>0?o.x-body.w:o.x+o.w; wall=true; } body.x=Math.max(0,Math.min(this.stage.width*TILE-body.w,body.x)); const bottom=body.y+body.h; body.vy=Math.min(900,body.vy+1800*dt); body.y+=body.vy*dt; body.grounded=false; for(const o of this.nearby(body)) { if(!overlaps(body,o) || (o.type==='platform'&&(body.vy<0||bottom>o.y+1))) continue; if(body.vy>=0) {body.y=o.y-body.h;body.grounded=true;} else body.y=o.y+o.h; body.vy=0; } return wall; }
  step(dt,input) { if(this.clear) return; const p=this.player; this.buffer=input.jump?0.13:Math.max(0,this.buffer-dt); this.coyote=p.grounded?0.11:Math.max(0,this.coyote-dt); p.vx=(Number(input.right)-Number(input.left))*260; if(this.buffer>0&&this.coyote>0) {p.vy=-650;p.grounded=false;this.coyote=0;this.buffer=0;} this.move(p,dt);
    for(const e of this.enemies) { const wall=this.move(e,dt); const ahead=e.vx>0?e.x+e.w+5:e.x-5; const support=this.solids.has(`${Math.floor(ahead/TILE)},${Math.floor((e.y+e.h+5)/TILE)}`); if(wall || e.x<=0 || e.x+e.w>=this.stage.width*TILE || (e.grounded&&!support)) e.vx*=-1; if(overlaps(p,e)) return this.die(); }
    if(p.y>this.stage.height*TILE+100) return this.die();
    for(const o of this.stage.objects) { if(Math.abs(o.x*TILE-p.x)>TILE*2) continue; const b={x:o.x*TILE+8,y:o.y*TILE+8,w:32,h:40}; if(!overlaps(p,b)) continue; if(o.type==='spike') return this.die(); if(o.type==='coin') this.coins.add(`${o.x},${o.y}`); if(o.type==='goal') this.clear=true; }
  }
  die() { this.deaths++; this.reset(); }
}
