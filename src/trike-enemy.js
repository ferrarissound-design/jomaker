import { TILE } from './stage.js?v=20260916-enemy-direction-1';

export const TRIKE_WALK_SPEED = 60;
export const TRIKE_SLIDE_SPEED = 290;
const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

export function moveTrike(game, e, dt) {
  const speed = e.state === 'walk' ? TRIKE_WALK_SPEED : e.state === 'sliding' ? TRIKE_SLIDE_SPEED : 0;
  e.vx = speed * e.direction;
  const obstacles = [...game.solids.values(), ...game.crates, ...game.movingPlatforms];
  // Resolve a platform entering the body before advancing the dinosaur.
  for (const o of obstacles) {
    if (!overlaps(e, o)) continue;
    const choices = [
      {d:e.x+e.w-o.x, x:o.x-e.w, dir:-1},
      {d:o.x+o.w-e.x, x:o.x+o.w, dir:1},
      {d:e.y+e.h-o.y, y:o.y-e.h},
      {d:o.y+o.h-e.y, y:o.y+o.h}
    ].sort((a,b)=>a.d-b.d);
    const fix=choices[0];
    if (fix.x !== undefined) { e.x=fix.x; e.direction=fix.dir; e.vx=speed*e.direction; }
    else { e.y=fix.y; e.vy=0; }
  }
  const dx=e.vx*dt;
  e.x += dx;
  let wall=false;
  for (const o of obstacles) {
    if (!overlaps(e,o)) continue;
    e.x=dx>0 ? o.x-e.w : o.x+o.w;
    wall=true;
  }
  const limit=game.stage.width*TILE-e.w;
  if(e.x<0 || e.x>limit) { e.x=Math.max(0,Math.min(limit,e.x));wall=true; }
  if(wall && speed) { e.direction*=-1;e.vx=speed*e.direction; }
  e.vy=Math.min(900,e.vy+1800*dt);
  const dy=e.vy*dt;
  e.y+=dy;e.grounded=false;
  for(const o of obstacles) {
    if(!overlaps(e,o)) continue;
    e.y=dy>=0 ? o.y-e.h : o.y+o.h;
    e.grounded=dy>=0;e.vy=0;
  }
}

// Returns true only for a damaging side/underside contact.
export function hitTrike(game,e,stomp) {
  const p=game.player;
  if(stomp) {
    e.state='flipped';e.vx=0;
    p.y=e.y-p.h;p.vy=-420;p.grounded=false;p.platformKey=null;
    game.stompSerial++;
    return false;
  }
  if(e.state!=='flipped') return true;
  // Underside contact is harmless, but is not a kick.
  if(p.y>=e.y+e.h-4) return false;
  e.direction=p.x+p.w/2<e.x+e.w/2 ? 1 : -1;
  e.state='sliding';e.vx=e.direction*TRIKE_SLIDE_SPEED;
  // Separate the kicker rather than granting immunity to a returning shell.
  p.x=e.direction>0 ? e.x-p.w : e.x+e.w;
  game.stompSerial++;
  return false;
}
