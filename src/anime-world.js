// Procedural artwork: shared textures/geometry keep the mobile scene lightweight.
export function initAnimeStyle(view) {
  const T = view.THREE;
  view.animeTextures = [];
  const ramp = new T.DataTexture(new Uint8Array([110, 180, 235, 255]), 4, 1, T.RedFormat);
  ramp.minFilter = ramp.magFilter = T.NearestFilter;
  ramp.needsUpdate = true;
  view.toonRamp = ramp;
  view.animeTextures.push(ramp);
  view.outlineMaterial = new T.MeshBasicMaterial({ color: '#284839', side: T.BackSide });
}

export function makeGrassBlock(view) {
  const T = view.THREE;
  if (!view.grassMaterial) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d');
    c.fillStyle = '#bd8051'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#d99b61'; c.fillRect(0, 28, 128, 53);
    c.fillStyle = '#a36948';
    for (const [x,y] of [[12,61],[83,47],[49,101],[110,111]]) {
      c.beginPath(); c.ellipse(x,y,9,5,-.25,0,Math.PI*2); c.fill();
    }
    c.strokeStyle = '#f2bc7b'; c.lineWidth = 4; c.lineCap = 'round';
    for (const [x,y] of [[27,43],[70,86],[109,68],[12,115]]) {
      c.beginPath(); c.moveTo(x,y); c.lineTo(x+9,y-2); c.stroke();
    }
    c.fillStyle = '#36583b'; c.beginPath(); c.moveTo(0,0); c.lineTo(128,0); c.lineTo(128,25);
    for(let x=128;x>=0;x-=16) c.quadraticCurveTo(x-8,43,x-16,25);
    c.closePath(); c.fill();
    c.fillStyle = '#73c844'; c.beginPath(); c.moveTo(0,0); c.lineTo(128,0); c.lineTo(128,20);
    for(let x=128;x>=0;x-=16) c.quadraticCurveTo(x-8,34,x-16,20);
    c.closePath(); c.fill();
    c.fillStyle = '#b8ed70'; c.fillRect(0,0,128,8);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    view.animeTextures.push(texture);
    view.grassMaterial = new T.MeshToonMaterial({map:texture, gradientMap:view.toonRamp});
    view.materials.set('anime-grass',view.grassMaterial);
  }
  const sides=view.grassMaterial;
  const top=view.material('#a1df5d');
  const mesh=new T.Mesh(view.geometry('box',()=>new T.BoxGeometry(1,1,1)),[sides,sides,top,sides,sides,sides]);
  mesh.scale.set(1,1,.8); mesh.receiveShadow=false;
  return mesh;
}

export function buildAnimeBackdrop(view) {
  const T=view.THREE;
  const sunset=view.stage.background==='sunsetCoast';
  const sky=sunset?'#ffc1a0':'#9ae5f5';
  view.scene.background=new T.Color(sky);
  view.scene.fog=new T.Fog(sky,32,85);
  const flat=color=>{
    const key='scenery:'+color;
    if(!view.materials.has(key))view.materials.set(key,new T.MeshBasicMaterial({color}));
    return view.materials.get(key);
  };
  const oval=(parent,x,y,z,w,h,color)=>{
    const m=new T.Mesh(view.geometry('scenery-sphere',()=>new T.SphereGeometry(.5,20,12)),flat(color));
    m.position.set(x,y,z);m.scale.set(w,h,.35);parent.add(m);return m;
  };
  const silhouette=(points,color,x,z)=>{
    const shape=new T.Shape(); points.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();
    const geometry=new T.ShapeGeometry(shape);view.geometries.set('scenery-'+view.geometries.size,geometry);
    const m=new T.Mesh(geometry,flat(color));m.position.set(x,0,z);view.backdrop.add(m);
  };
  const width=view.stage.width;
  // Pale distant peaks, overlapping green foothills and low jungle canopy.
  silhouette([[-30,-18],[width+35,-18],[width+35,1],[-30,1]],sunset?'#ccaf99':'#92d0aa',0,-17);
  for(let x=-18,i=0;x<width+25;x+=9,i++){
    const peak=6+(i%3)*1.6;
    silhouette([[-7,0],[-4,peak*.45],[-1,peak],[1,peak+.35],[5,peak*.36],[8,0]],sunset?'#b99db2':'#83bdc6',x,-16);
    silhouette([[-1,peak],[1,peak+.35],[5,peak*.36],[2,peak*.5]],sunset?'#d1b1c4':'#b3d9d0',x,-15.9);
    oval(view.backdrop,x+4,1.5,-10,13,6,sunset?'#a4b482':'#73b995');
    oval(view.backdrop,x,0,-6,10,4,sunset?'#9faa6c':'#57aa80');
    // Puffy clouds have a pale underside and warm white lobes.
    const cloud=new T.Group(); cloud.position.set(x+2,10+(i%3)*2,-14);view.backdrop.add(cloud);
    oval(cloud,0,0,0,5.2,1.15,'#d4edf0');
    oval(cloud,-1,.35,.1,2.5,1.4,'#fffbed');
    oval(cloud,.3,.7,.1,2.8,2.1,'#fffbed');
    oval(cloud,1.6,.2,.1,2.2,1.2,'#fffbed');
  }
  for(let x=-5,i=0;x<width+10;x+=8,i++){
    // Broad-leaf prehistoric trees stay behind the playable plane.
    const tree=new T.Group();tree.position.set(x,.2,-3.8-(i%2));view.backdrop.add(tree);
    oval(tree,0,1.7,0,.42,3.7,'#745940');
    oval(tree,.09,1.7,.2,.12,3.5,'#be915b');
    for(const [lx,ly,w,h] of [[-1.05,3.25,2.5,1.15],[1.0,3.35,2.5,1.2],[0,3.9,2.5,1.5]]){
      oval(tree,lx,ly,0,w+.12,h+.12,'#32664b');
      oval(tree,lx,ly+.09,.15,w,h,'#5eac57');
      oval(tree,lx-.15,ly+.25,.3,w*.65,h*.42,'#9bd568');
    }
    for(let j=0;j<3;j++)oval(tree,-1.5+j*.65,.35,.4,1.0,.8,'#43885b');
  }
}
