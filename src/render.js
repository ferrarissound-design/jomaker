import { TILE, PARTS } from './stage.js';
export function drawPart(ctx,type,x,y,size=TILE,time=0) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/TILE,size/TILE);ctx.fillStyle=PARTS[type]?.[2]??'#fff';
  if(type==='ground'||type==='block') {ctx.beginPath();ctx.roundRect(1,1,46,46,6);ctx.fill();ctx.fillStyle=type==='ground'?'#8bc8a0':'#ffd28a';ctx.fillRect(4,3,40,6);ctx.fillStyle='#152c3620';ctx.fillRect(7,28,12,4);ctx.fillRect(29,17,10,4);}
  if(type==='platform') {ctx.beginPath();ctx.roundRect(0,0,48,12,5);ctx.fill();ctx.fillStyle='#d8f5ed';ctx.fillRect(5,2,38,3);}
  if(type==='coin') {ctx.beginPath();ctx.ellipse(24,24,11+Math.sin(time*3)*2,15,0,0,7);ctx.fill();ctx.strokeStyle='#fff1ad';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#b38239';ctx.fillRect(22,17,4,14);}
  if(type==='spike') {for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(i*16,46);ctx.lineTo(i*16+8,10);ctx.lineTo(i*16+16,46);ctx.fill();}}
  if(type==='enemy') {ctx.beginPath();ctx.roundRect(6,13,36,32,10);ctx.fill();ctx.fillStyle='#243442';ctx.fillRect(13,23,6,6);ctx.fillRect(29,23,6,6);ctx.fillRect(10,43,9,4);ctx.fillRect(29,43,9,4);}
  if(type==='goal'||type==='start') {ctx.fillRect(10,6,4,42);ctx.beginPath();ctx.moveTo(14,6);ctx.lineTo(41,14);ctx.lineTo(14,26);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.fillText(type==='goal'?'★':'S',17,20);}
  ctx.restore();
}
export function drawPlayer(ctx,p,time) {ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#77cfbf';ctx.beginPath();ctx.roundRect(0,3,p.w,31,9);ctx.fill();ctx.fillStyle='#f3f5df';ctx.beginPath();ctx.roundRect(4,8,20,14,5);ctx.fill();ctx.fillStyle='#193943';ctx.fillRect(8,12,4,5);ctx.fillRect(18,12,4,5);ctx.fillStyle='#efb66f';ctx.fillRect(-3,25,34,5);ctx.fillStyle='#27565e';const step=p.grounded&&p.vx?Math.sin(time*18)*3:0;ctx.fillRect(3,33,8,5+step);ctx.fillRect(18,33,8,5-step);ctx.restore();}
export function render(ctx,w,h,stage,camera,scale,editing,game,time,selected,cameraY=0) {
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#e8f2ed';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#d6e6df';for(let i=-1;i<8;i++){const x=i*230-(camera*.18)%230;ctx.beginPath();ctx.moveTo(x,h);ctx.lineTo(x+140,h*.24);ctx.lineTo(x+290,h);ctx.fill();}
  ctx.save();ctx.scale(scale,scale);ctx.translate(-camera,-cameraY);
  if(editing){ctx.strokeStyle='#183f4010';ctx.lineWidth=1/scale;ctx.beginPath();for(let x=Math.floor(camera/TILE)*TILE;x<camera+w/scale;x+=TILE){ctx.moveTo(x,0);ctx.lineTo(x,stage.height*TILE);}for(let y=0;y<=stage.height*TILE;y+=TILE){ctx.moveTo(camera,y);ctx.lineTo(camera+w/scale,y);}ctx.stroke();}
  for(const o of stage.objects) {if(o.x*TILE<camera-TILE||o.x*TILE>camera+w/scale+TILE)continue;if(game&&o.type==='enemy')continue;if(game?.coins.has(`${o.x},${o.y}`))continue;drawPart(ctx,o.type,o.x*TILE,o.y*TILE,TILE,time);}
  if(editing){drawPart(ctx,'start',stage.playerStart.x*TILE,stage.playerStart.y*TILE);if(selected){ctx.strokeStyle='#234f58';ctx.lineWidth=3/scale;ctx.strokeRect(selected.x*TILE+1,selected.y*TILE+1,46,46);}}
  if(game){for(const e of game.enemies)if(e.x>camera-TILE&&e.x<camera+w/scale+TILE)drawPart(ctx,'enemy',e.x-7,e.y-12,TILE,time);drawPlayer(ctx,game.player,time);}
  ctx.restore();
}
