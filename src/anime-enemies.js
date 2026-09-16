import { TILE } from './stage.js?v=20260916-enemy-direction-1';

export const ENEMY_VISUAL_WIDTH_TILES = Object.freeze({
  enemy: 1.35,
  flyingEnemy: 1.6,
  trikeEnemy: 1.35
});

const SMALL_CARNIVORE_SHEET_SRC = new URL('../9475BE2E-4E23-4213-89A7-5AB11EF76B44.png', import.meta.url).href;
const SMALL_CARNIVORE_COLUMNS = 4;
const SMALL_CARNIVORE_ROWS = 2;
const NORMALIZED_FRAME_WIDTH = 480;
const NORMALIZED_FRAME_HEIGHT = 420;
const NORMALIZED_BASELINE = 396;
let smallCarnivoreFrames = null;
let smallCarnivoreLoadStarted = false;
const smallCarnivoreReadyCallbacks = [];

function findOpaqueBounds(ctx, x, y, width, height) {
  const pixels = ctx.getImageData(x, y, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (pixels[(py * width + px) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
  }
  if (maxX < 0 || maxY < 0) return { x: 0, y: 0, width, height };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function normalizeSmallCarnivoreSheet(image) {
  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const cells = [];
  for (let row = 0; row < SMALL_CARNIVORE_ROWS; row++) {
    for (let col = 0; col < SMALL_CARNIVORE_COLUMNS; col++) {
      const x0 = Math.round(col * image.naturalWidth / SMALL_CARNIVORE_COLUMNS);
      const x1 = Math.round((col + 1) * image.naturalWidth / SMALL_CARNIVORE_COLUMNS);
      const y0 = Math.round(row * image.naturalHeight / SMALL_CARNIVORE_ROWS);
      const y1 = Math.round((row + 1) * image.naturalHeight / SMALL_CARNIVORE_ROWS);
      const bounds = findOpaqueBounds(sourceCtx, x0, y0, x1 - x0, y1 - y0);
      cells.push({ x0, y0, ...bounds });
    }
  }

  const maxContentWidth = Math.max(...cells.map(cell => cell.width));
  const maxContentHeight = Math.max(...cells.map(cell => cell.height));
  const commonScale = Math.min(450 / maxContentWidth, 372 / maxContentHeight);

  return cells.map(cell => {
    const canvas = document.createElement('canvas');
    canvas.width = NORMALIZED_FRAME_WIDTH;
    canvas.height = NORMALIZED_FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    const drawWidth = cell.width * commonScale;
    const drawHeight = cell.height * commonScale;
    const drawX = (NORMALIZED_FRAME_WIDTH - drawWidth) / 2;
    const drawY = NORMALIZED_BASELINE - drawHeight;
    ctx.drawImage(
      image,
      cell.x0 + cell.x,
      cell.y0 + cell.y,
      cell.width,
      cell.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
    return canvas;
  });
}

function ensureSmallCarnivoreFrames(onReady = null) {
  if (smallCarnivoreFrames) {
    onReady?.(smallCarnivoreFrames);
    return;
  }
  if (onReady) smallCarnivoreReadyCallbacks.push(onReady);
  if (smallCarnivoreLoadStarted || typeof document === 'undefined' || typeof Image === 'undefined') return;

  smallCarnivoreLoadStarted = true;
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    try {
      smallCarnivoreFrames = normalizeSmallCarnivoreSheet(image);
      for (const callback of smallCarnivoreReadyCallbacks.splice(0)) callback(smallCarnivoreFrames);
    } catch {
      smallCarnivoreReadyCallbacks.length = 0;
    }
  };
  image.onerror = () => { smallCarnivoreReadyCallbacks.length = 0; };
  image.src = SMALL_CARNIVORE_SHEET_SRC;
}

// Shared vector artwork for the editor, 2D fallback and WebGL sprite frames.
// Canvas is 160 x 140; the raptor's planted sole is always at y=132.
export function paintAnimeEnemy(ctx, type, frame = 0, state = 'walk') {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 3;
  const ink = '#392e45';
  const path = (d, color, stroke = ink, width = 3) => {
    const p = new Path2D(d); ctx.fillStyle = color; ctx.fill(p);
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke(p);}
  };
  const oval = (x,y,rx,ry,color,stroke=ink) => {
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
  };
  const eye = (x,y) => {
    oval(x,y,10,13,'#fff8df'); oval(x+3,y+1,5,9,'#853744',null);
    oval(x+4,y+1,2.8,7,'#302b3e',null);oval(x+2,y-4,2.5,3.5,'#fff',null);
  };
  if(type === 'trikeEnemy') {
    const flipped=state!=='walk';
    if(flipped){ctx.translate(0,169);ctx.scale(1,-1);}
    // Compact rust-orange body, scalloped neck frill and three ivory horns.
    path('M47 91Q23 80 12 99L48 110Z','#ba5e50');
    for(const [x,offset] of [[51,0],[78,1],[103,0]]) {
      const step=(frame+offset)%2?5:0;
      path(`M${x} 104L${x-step} 128Q${x+6-step} 135 ${x+15-step} 129L${x+16} 105Z`,'#ae514a');
    }
    oval(70,98,36,24,'#dc825b');
    oval(71,102,25,13,'#f2ba7c',null);
    path('M85 100L69 88L75 76L71 62L85 57L92 43L103 50L118 47L122 62L133 70L122 94Z','#b75055');
    oval(101,78,23,28,'#efac6d');
    oval(117,97,29,20,'#dc825b');
    path('M91 69Q89 50 101 37L104 73Z','#fff0c8');
    path('M110 73Q114 53 126 47L121 81Z','#fff0c8');
    path('M134 91L148 75L145 101Z','#fff0c8');
    if(flipped){
      path('M105 88L114 94M114 88L105 94','transparent',ink,3);
    }else{
      eye(109,87);
      path('M99 73L117 78','transparent',ink,3);
    }
    oval(137,102,2.5,2,ink,null);
    path('M119 110Q129 115 138 110','transparent',ink,2);
    oval(56,88,6,4,'#f8cf8e',null);
    ctx.restore();return;
  }
  if(type === 'flyingEnemy') {
    // A cheeky purple pterosaur: scalloped membranes, oversized eyes and crest.
    const raised=frame%2===0;
    path(raised?'M79 76Q52 31 18 14L29 54Q41 44 45 70Q60 61 67 87Z':'M79 70Q41 71 12 105L43 103Q43 91 59 106Q66 94 76 91Z','#9b70c8');
    path('M61 88Q42 91 29 77L42 101L67 103Z','#7857ad');
    oval(79,83,23,18,'#9270ca');
    oval(88,88,13,11,'#f5d8ae',null);
    path('M95 46L70 22Q72 46 81 60Z','#ce83cf');
    oval(101,62,22,23,'#a982d6');
    path('M110 66Q124 65 152 77L116 85Q105 83 107 76Z','#ffcc70');
    path('M118 77L145 78','#bd7c49',ink,2);
    eye(107,59);
    path('M95 44Q104 43 114 50','#a982d6',ink,3);
    oval(127,72,2,1.8,ink,null);
    path(raised?'M77 83Q50 63 40 16Q74 22 98 72L87 101Q80 82 65 86Q69 67 56 59Z':'M77 74Q49 77 29 123L64 110Q60 95 77 101Q76 89 94 93L99 79Z','#c99aeb');
    path(raised?'M81 77L48 29M70 69L64 48':'M82 82L40 111M69 89L59 105','transparent','#8460b2',2);
    path('M79 99L73 111L83 109M91 100L91 112L101 109','transparent','#634574',3);
    oval(94,40,8,3,'#e9c3f6',null);
  } else {
    // Vector fallback used until the sprite sheet finishes loading.
    path('M67 79Q42 97 9 72Q17 100 60 107Z','#db655b');
    path('M17 83Q35 99 56 98L56 104Q32 103 17 83Z','#ffd294',null);
    path(frame%2?'M87 99L92 116L108 121Q112 131 102 131L85 129L77 106Z':'M86 100L102 114L115 109Q124 113 117 121L102 128L80 111Z','#ae4954');
    for(const d of ['M55 78L51 66L65 72Z','M65 66L65 53L77 62Z','M77 55L82 40L92 52Z'])path(d,'#f4ac54');
    oval(77,91,26,23,'#ed7864');
    oval(87,93,15,19,'#ffe0a2',null);
    path('M73 87Q73 65 82 54Q90 48 103 57Q97 74 109 87Q94 99 73 87Z','#ed7864');
    oval(101,46,27,26,'#f4876c');
    path('M113 48Q142 44 147 60Q149 72 133 78L106 71Z','#f4876c');
    path('M106 70Q123 78 140 69Q135 92 119 87Q109 83 106 70Z','#723447');
    path('M115 76L120 84L125 78M129 77L134 82L137 73','#fff5d4',ink,1.5);
    path('M117 87Q131 92 139 83Q137 97 120 94L108 85Z','#ffba87');
    eye(107,44);
    path('M95 30Q106 29 117 37','transparent',ink,3.5);
    oval(137,58,2.5,2,ink,null);
    oval(90,29,9,3.5,'#ffc39b',null);
    path('M91 88Q102 88 108 95L116 91Q122 94 114 101Q109 105 99 99','#ed7864');
    path(frame%2?'M72 105Q69 116 58 121L50 121Q44 125 49 131L67 131L85 111Z':'M72 104Q68 115 71 124L82 124Q89 129 82 131L62 131Q54 121 58 112Z','#ed7864');
    path(frame%2?'M51 125L51 130M57 125L57 130':'M74 126L74 130M80 126L80 130','transparent','#fff0ca',2);
    for(const [x,y,r] of [[61,89,3.5],[69,81,3],[70,96,4],[43,94,2]])oval(x,y,r,r,'#c45255',null);
  }
  ctx.restore();
}

export function drawAnimeEnemy(ctx, type, x, y, width, height, time, direction = 1, state = 'walk') {
  if (type === 'enemy') {
    ensureSmallCarnivoreFrames();
    if (smallCarnivoreFrames) {
      const base = direction < 0 ? 4 : 0;
      const frame = base + 1 + (Math.floor(time * 7) % 2);
      ctx.drawImage(smallCarnivoreFrames[frame], x, y, width, height);
      return;
    }
  }
  if (type === 'flyingEnemy') direction = -1;
  ctx.save();ctx.translate(x+(direction<0?width:0),y);ctx.scale(direction*width/160,height/140);
  paintAnimeEnemy(ctx,type,Math.floor(time*(type==='flyingEnemy'?8:7))%2,state);
  ctx.restore();
}

export function makeAnimeEnemy(view,type) {
  const T=view.THREE;
  view.enemySpriteTextures ??= new Map();
  if(!view.enemySpriteTextures.has(type)){
    const frameCount = type === 'trikeEnemy' || type === 'enemy' ? 8 : 4;
    const frameCanvases=[];
    const frames=Array.from({length:frameCount},(_,index)=>{
      const frame=index%2;
      const c=document.createElement('canvas');c.width=480;c.height=420;
      frameCanvases.push(c);
      const ctx=c.getContext('2d');ctx.scale(3,3);
      if(type === 'enemy') {
        if(index >= 4){ctx.translate(160,0);ctx.scale(-1,1);}
        paintAnimeEnemy(ctx,type,frame,'walk');
      } else {
        if(index%4>=2){ctx.translate(160,0);ctx.scale(-1,1);}
        paintAnimeEnemy(ctx,type,frame,index>=4?'flipped':'walk');
      }
      const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
      view.animeTextures.push(t);return t;
    });
    if(type === 'enemy') {
      ensureSmallCarnivoreFrames(readyFrames => {
        readyFrames.forEach((source,index) => {
          const ctx=frameCanvases[index].getContext('2d');
          ctx.setTransform(1,0,0,1,0,0);
          ctx.clearRect(0,0,frameCanvases[index].width,frameCanvases[index].height);
          ctx.drawImage(source,0,0,frameCanvases[index].width,frameCanvases[index].height);
          frames[index].needsUpdate=true;
        });
      });
    }
    view.enemySpriteTextures.set(type,frames);
  }
  const frames=view.enemySpriteTextures.get(type);
  const material=new T.SpriteMaterial({map:frames[0],transparent:true,alphaTest:.02,depthWrite:false,toneMapped:false});
  const sprite=new T.Sprite(material);
  sprite.center.set(.55,type==='flyingEnemy'?.45:1-132/140);
  sprite.userData.ownedMaterial=material;sprite.userData.frames=frames;
  return sprite;
}

export function animateAnimeEnemy(view,node,enemy,time) {
  const flying=enemy.type==='flyingEnemy';
  const direction=flying?-1:enemy.vx<0?-1:enemy.vx>0?1:(node.userData.facing??1);
  node.userData.facing=direction;
  const width=ENEMY_VISUAL_WIDTH_TILES[enemy.type] ?? ENEMY_VISUAL_WIDTH_TILES.enemy;
  // Three.js sprites use scale magnitudes; use dedicated left/right frames when available.
  node.scale.set(width,width*140/160,1);
  node.center.set(enemy.type==='enemy'&&node.userData.frames.length>=8?.5:direction<0?.45:.55,flying?.45:1-132/140);
  node.position.set((enemy.x+enemy.w/2)/TILE,
    flying?view.stage.height-(enemy.y+enemy.h/2)/TILE:view.bodyBottom(enemy),.43);

  if(enemy.type==='enemy' && node.userData.frames.length>=8) {
    const base=direction<0?4:0;
    const running=enemy.grounded&&Math.abs(enemy.vx)>1;
    const frame=!enemy.grounded?3:running?1+(Math.floor(time*7)%2):0;
    node.material.rotation=0;
    node.material.map=node.userData.frames[base+frame];
    return;
  }

  const flipped=enemy.type==='trikeEnemy'&&enemy.state!=='walk';
  const moving=flipped||flying||(enemy.grounded&&Math.abs(enemy.vx)>1);
  // Inverted art has the same bottom anchor as walking art.
  node.material.rotation=enemy.state==='sliding'?Math.sin(time*35)*.055:0;
  node.material.map=node.userData.frames[(flipped?4:0)+(direction<0?2:0)+(moving?Math.floor(time*(flying?8:7))%2:0)];
}
