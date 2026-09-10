import { TILE, PARTS } from './stage.js';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
let threePromise = null;

export async function createPlayRenderer(canvas, stage) {
  threePromise ??= import(THREE_CDN);
  const THREE = await threePromise;
  return new ThreePlayRenderer(THREE, canvas, stage);
}

class ThreePlayRenderer {
  constructor(THREE, canvas, stage) {
    this.THREE = THREE;
    this.stage = stage;
    this.canvas = canvas;
    this.materials = new Map();
    this.geometries = new Map();
    this.staticEntries = [];
    this.enemySignature = '';
    this.enemyNodes = [];
    this.crateNodes = [];
    this.platformNodes = [];
    this.projectileNodes = [];
    this.effects = [];
    this.lastLandingSerial = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, .1, 140);
    this.scene.add(this.camera);

    const hemi = new THREE.HemisphereLight(0xf6fbff, 0x44605a, 1.65);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3d6, 2.4);
    sun.position.set(8, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 55;
    sun.shadow.bias = -.00045;
    sun.shadow.normalBias = .025;
    this.sun = sun;
    this.scene.add(sun);

    this.world = new THREE.Group();
    this.dynamic = new THREE.Group();
    this.backdrop = new THREE.Group();
    this.scene.add(this.backdrop, this.world, this.dynamic);

    this.buildBackdrop();
    this.buildStaticStage();
    this.playerNode = this.makeDinosaur('#82d98a', '#5caf69', 1);
    this.playerNode.position.z = .72;
    this.dynamic.add(this.playerNode);
    this.playerShadow = this.makeContactShadow();
    this.dynamic.add(this.playerShadow);
  }

  geometry(name, factory) {
    if (!this.geometries.has(name)) this.geometries.set(name, factory());
    return this.geometries.get(name);
  }

  material(color, roughness = .72, metalness = .02, emissive = 0x000000) {
    const key = `${color}:${roughness}:${metalness}:${emissive}`;
    if (!this.materials.has(key)) {
      this.materials.set(key, new this.THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        emissive,
        emissiveIntensity: emissive ? .35 : 0
      }));
    }
    return this.materials.get(key);
  }

  mesh(geometry, material, cast = true, receive = true) {
    const mesh = new this.THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    return mesh;
  }

  box(w, h, d, color, roughness = .72, metalness = .02) {
    const m = this.mesh(
      this.geometry('box', () => new this.THREE.BoxGeometry(1, 1, 1)),
      this.material(color, roughness, metalness)
    );
    m.scale.set(w, h, d);
    return m;
  }

  sphere(w, h, d, color) {
    const m = this.mesh(
      this.geometry('sphere', () => new this.THREE.SphereGeometry(.5, 16, 10)),
      this.material(color)
    );
    m.scale.set(w, h, d);
    return m;
  }

  cylinder(radius, height, color, segments = 12) {
    const key = `cylinder-${segments}`;
    const m = this.mesh(
      this.geometry(key, () => new this.THREE.CylinderGeometry(.5, .5, 1, segments)),
      this.material(color)
    );
    m.scale.set(radius * 2, height, radius * 2);
    return m;
  }

  cone(radius, height, color, segments = 12) {
    const key = `cone-${segments}`;
    const m = this.mesh(
      this.geometry(key, () => new this.THREE.ConeGeometry(.5, 1, segments)),
      this.material(color)
    );
    m.scale.set(radius * 2, height, radius * 2);
    return m;
  }

  torus(radius, tube, color) {
    const key = `torus-${radius}-${tube}`;
    return this.mesh(
      this.geometry(key, () => new this.THREE.TorusGeometry(radius, tube, 10, 24)),
      this.material(color)
    );
  }

  makeContactShadow() {
    const material = new this.THREE.MeshBasicMaterial({
      color: 0x244b46,
      transparent: true,
      opacity: .2,
      depthWrite: false
    });
    const shadow = this.mesh(
      this.geometry('contact-shadow', () => new this.THREE.CircleGeometry(.42, 24)),
      material,
      false,
      false
    );
    shadow.scale.set(1.05, .3, 1);
    shadow.renderOrder = 3;
    shadow.userData.ownedMaterial = material;
    return shadow;
  }

  block(base, top = null) {
    const g = new this.THREE.Group();
    g.add(this.box(.98, .98, .8, base));
    if (top) {
      const cap = this.box(.94, .08, .84, top);
      cap.position.y = .46;
      g.add(cap);
    }
    return g;
  }

  makePart(type, props = null) {
    const T = this.THREE;
    const g = new T.Group();
    const color = PARTS[type]?.[2] ?? '#ffffff';

    if (type === 'ground') return this.block('#4a8978', '#8bc8a0');
    if (type === 'block') return this.block('#eda85c', '#ffd28a');
    if (type === 'switchBlock') return this.block('#d86f69', '#ffd1cd');
    if (type === 'pressureBlock') return this.block('#5e9fb0', '#c9e8ee');
    if (type === 'timerBlock') return this.block('#c68b55', '#f4dec0');

    if (type === 'breakable') {
      g.add(this.box(.98, .98, .8, '#d99a67'));
      const slashA = this.box(.06, .78, .04, '#8a5d42');
      slashA.position.z = .42;
      slashA.rotation.z = .62;
      const slashB = slashA.clone();
      slashB.rotation.z = -.62;
      g.add(slashA, slashB);
      return g;
    }

    if (type === 'platform' || type === 'movingPlatform') {
      const slab = this.box(.98, .22, .76, type === 'movingPlatform' ? '#65aebc' : '#81b6bc');
      slab.position.y = .38;
      g.add(slab);
      const shine = this.box(.76, .035, .79, '#d8f5ed');
      shine.position.y = .505;
      g.add(shine);
      if (type === 'movingPlatform') {
        const rail = this.box(.45, .06, .79, '#315f69');
        rail.position.set(0, .28, 0);
        if (props?.axis === 'y') rail.rotation.z = Math.PI / 2;
        g.add(rail);
      }
      return g;
    }

    if (type === 'crate') {
      g.add(this.box(.82, .82, .82, '#b9875f'));
      const frameA = this.box(.08, .72, .87, '#74543d');
      frameA.rotation.z = .76;
      const frameB = frameA.clone();
      frameB.rotation.z = -.76;
      g.add(frameA, frameB);
      return g;
    }

    if (type === 'plate') {
      const plate = this.box(.86, .13, .72, '#91abb1');
      plate.position.y = -.36;
      g.add(plate);
      g.userData.button = plate;
      return g;
    }

    if (type === 'cannon') {
      const base = this.sphere(.5, .5, .58, '#596a72');
      base.position.y = -.12;
      g.add(base);
      const barrel = this.cylinder(.19, .62, '#394b53');
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(.25, .04, 0);
      g.add(barrel);
      const foot = this.box(.58, .12, .65, '#8a9aa0');
      foot.position.y = -.42;
      g.add(foot);
      if (props?.direction === 'left') g.rotation.y = Math.PI;
      return g;
    }

    if (type === 'spring') {
      const base = this.box(.78, .17, .68, '#f08f52');
      base.position.y = -.35;
      const top = this.box(.7, .11, .66, '#ffd07a');
      top.position.y = .12;
      const coil = this.torus(.21, .045, '#7f6256');
      coil.rotation.x = Math.PI / 2;
      coil.scale.y = 1.7;
      coil.position.y = -.08;
      g.add(base, top, coil);
      return g;
    }

    if (type === 'coin') {
      const coin = this.cylinder(.27, .08, '#ffd572', 20);
      coin.rotation.x = Math.PI / 2;
      g.add(coin);
      g.userData.spin = true;
      return g;
    }

    if (type === 'key') {
      const ring = this.torus(.19, .055, '#f1c35b');
      ring.position.set(-.12, .12, 0);
      const shaft = this.box(.48, .075, .09, '#b8892d');
      shaft.position.set(.17, -.12, 0);
      shaft.rotation.z = -.55;
      const tooth = this.box(.16, .08, .1, '#b8892d');
      tooth.position.set(.36, -.28, 0);
      g.add(ring, shaft, tooth);
      return g;
    }

    if (type === 'door' || type === 'enemyDoor') {
      const door = this.box(.68, .96, .48, type === 'enemyDoor' ? '#765f8f' : '#8c6c58');
      g.add(door);
      const inset = this.box(.48, .68, .025, type === 'enemyDoor' ? '#4c3e61' : '#6c5142');
      inset.position.z = .255;
      g.add(inset);
      if (type === 'door') {
        const knob = this.sphere(.07, .07, .07, '#f2d9a6');
        knob.position.set(.19, 0, .29);
        g.add(knob);
      }
      return g;
    }

    if (type === 'switch' || type === 'timerSwitch') {
      const base = this.box(.82, .22, .7, type === 'timerSwitch' ? '#d79c58' : '#ef8a68');
      base.position.y = -.3;
      const button = this.sphere(.34, .22, .34, '#fff7df');
      button.position.y = -.08;
      g.add(base, button);
      g.userData.button = button;
      return g;
    }

    if (type === 'warp') {
      const outer = this.torus(.38, .07, '#7994db');
      const inner = this.torus(.22, .035, '#d9dcff');
      g.add(outer, inner);
      g.userData.pulse = true;
      return g;
    }

    if (type === 'spike') {
      for (let i = 0; i < 3; i++) {
        const spike = this.cone(.14, .75, '#e98283', 10);
        spike.position.set(-.3 + i * .3, -.08, 0);
        g.add(spike);
      }
      return g;
    }

    if (type === 'checkpoint' || type === 'goal') {
      const pole = this.cylinder(.035, .9, type === 'goal' ? '#d2aa4b' : '#4d8296', 8);
      pole.position.set(-.27, 0, 0);
      const flag = this.box(.48, .28, .055, type === 'goal' ? '#f4d67a' : '#6fb8d7');
      flag.position.set(.01, .26, 0);
      g.add(pole, flag);
      g.userData.flag = flag;
      return g;
    }

    if (type === 'start') {
      const pole = this.cylinder(.035, .9, '#4d8e82', 8);
      pole.position.set(-.27, 0, 0);
      const flag = this.box(.44, .25, .055, '#77cfbf');
      flag.position.set(0, .26, 0);
      g.add(pole, flag);
      return g;
    }

    g.add(this.box(.78, .78, .58, color));
    return g;
  }

  makeDinosaur(bodyColor, accentColor, scale = 1) {
    const T = this.THREE;
    const g = new T.Group();
    g.userData.baseScale = scale;

    const tail = this.cone(.22, .78, accentColor, 14);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-.58, -.01, 0);
    g.add(tail);

    const body = this.sphere(.78, .52, .56, bodyColor);
    body.position.set(-.08, -.01, 0);
    g.add(body);

    const belly = this.sphere(.42, .34, .42, '#dff2c9');
    belly.position.set(.11, -.09, .2);
    g.add(belly);

    const neck = this.sphere(.38, .46, .44, bodyColor);
    neck.position.set(.2, .18, 0);
    neck.rotation.z = -.16;
    g.add(neck);

    const head = this.sphere(.54, .47, .49, bodyColor);
    head.position.set(.38, .3, 0);
    g.add(head);

    const snout = this.sphere(.5, .27, .41, bodyColor);
    snout.position.set(.65, .2, 0);
    snout.rotation.z = -.04;
    g.add(snout);

    const lowerJaw = this.sphere(.42, .15, .36, accentColor);
    lowerJaw.position.set(.65, .105, 0);
    lowerJaw.rotation.z = -.025;
    g.add(lowerJaw);

    const brow = this.sphere(.29, .095, .4, accentColor);
    brow.position.set(.45, .43, 0);
    brow.rotation.z = -.16;
    g.add(brow);

    const eye = this.sphere(.082, .1, .06, '#f5d46f');
    eye.position.set(.5, .35, .255);
    const pupil = this.sphere(.03, .064, .023, '#273a32');
    pupil.position.set(.515, .35, .292);
    const nostril = this.sphere(.03, .024, .017, '#355348');
    nostril.position.set(.76, .245, .215);
    g.add(eye, pupil, nostril);

    const mouth = this.sphere(.3, .025, .025, '#355348');
    mouth.position.set(.68, .137, .21);
    mouth.rotation.z = -.02;
    g.add(mouth);

    const makeLeg = (x, z, footX) => {
      const leg = new T.Group();
      leg.position.set(x, -.19, z);
      const thigh = this.sphere(.19, .3, .2, accentColor);
      thigh.position.set(0, -.075, 0);
      const foot = this.sphere(.28, .12, .27, accentColor);
      foot.position.set(footX, -.215, .025);
      leg.add(thigh, foot);
      return leg;
    };

    const leftLeg = makeLeg(-.18, .14, .07);
    const rightLeg = makeLeg(.13, -.09, .09);
    g.add(leftLeg, rightLeg);

    const arm = new T.Group();
    arm.position.set(.31, .01, .255);
    arm.rotation.z = -.5;
    const upperArm = this.sphere(.24, .085, .085, accentColor);
    upperArm.position.x = .08;
    const hand = this.sphere(.11, .09, .09, accentColor);
    hand.position.set(.2, -.015, 0);
    arm.add(upperArm, hand);
    g.add(arm);

    const ridgeA = this.sphere(.13, .1, .16, accentColor);
    ridgeA.position.set(-.25, .245, -.03);
    const ridgeB = this.sphere(.12, .095, .15, accentColor);
    ridgeB.position.set(-.04, .275, -.035);
    const ridgeC = this.sphere(.1, .085, .14, accentColor);
    ridgeC.position.set(.13, .31, -.04);
    g.add(ridgeA, ridgeB, ridgeC);

    g.userData.leftLeg = leftLeg;
    g.userData.rightLeg = rightLeg;
    g.userData.tail = tail;
    g.userData.neck = neck;
    g.userData.head = head;
    g.userData.arm = arm;
    g.scale.setScalar(scale);
    return g;
  }

  wingGeometry(side) {
    const key = `wing-${side}`;
    return this.geometry(key, () => {
      const s = side === 'left' ? -1 : 1;
      const geo = new this.THREE.BufferGeometry();
      geo.setAttribute('position', new this.THREE.Float32BufferAttribute([
        0, 0, 0,
        s * .95, .38, 0,
        s * .72, -.17, 0,
        s * .18, -.08, 0
      ], 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      return geo;
    });
  }

  makePteranodon(scale = .92) {
    const T = this.THREE;
    const g = new T.Group();
    g.userData.baseScale = scale;

    const body = this.sphere(.48, .28, .28, '#718fa3');
    body.position.y = -.03;
    g.add(body);

    const head = this.sphere(.34, .27, .28, '#9bb4c3');
    head.position.set(.36, .12, 0);
    g.add(head);

    const beak = this.cone(.11, .62, '#b9c9d2', 10);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(.68, .09, 0);
    g.add(beak);

    const crest = this.cone(.13, .42, '#6f8795', 8);
    crest.rotation.z = Math.PI / 2;
    crest.position.set(.18, .27, 0);
    g.add(crest);

    const eye = this.sphere(.055, .065, .04, '#f1d66e');
    eye.position.set(.44, .18, .17);
    g.add(eye);

    const wingMat = new T.MeshStandardMaterial({
      color: '#8aa6b8',
      roughness: .78,
      metalness: 0,
      side: T.DoubleSide
    });
    const leftWing = new T.Group();
    const rightWing = new T.Group();
    const leftMesh = this.mesh(this.wingGeometry('left'), wingMat);
    const rightMesh = this.mesh(this.wingGeometry('right'), wingMat);
    leftWing.add(leftMesh);
    rightWing.add(rightMesh);
    leftWing.position.set(-.02, .04, 0);
    rightWing.position.set(.02, .04, 0);
    g.add(leftWing, rightWing);
    g.userData.leftWing = leftWing;
    g.userData.rightWing = rightWing;
    g.userData.ownedMaterial = wingMat;

    g.scale.setScalar(scale);
    return g;
  }

  buildBackdrop() {
    const id = this.stage.background ?? 'tropicalSea';
    const palette = id === 'sunsetCoast'
      ? { sky: 0xf5a26f, fog: 0xf4b38b, water: '#557f9c', hill: '#765d69', hill2: '#9b6b65' }
      : id === 'classic'
        ? { sky: 0xbfe4dc, fog: 0xd7eee8, water: '#7ebc9e', hill: '#6fa47b', hill2: '#8fbd82' }
        : { sky: 0x9edff2, fog: 0xd8f2f2, water: '#58acc3', hill: '#4c9d78', hill2: '#76b56d' };

    this.scene.background = new this.THREE.Color(palette.sky);
    this.scene.fog = new this.THREE.Fog(palette.fog, 20, 62);

    const water = this.box(this.stage.width + 35, .16, 28, palette.water);
    water.position.set(this.stage.width / 2, -.72, -9);
    water.receiveShadow = false;
    this.backdrop.add(water);

    for (let x = -8, i = 0; x < this.stage.width + 12; x += 11, i++) {
      const hill = this.sphere(6.5, 3.2 + (i % 3) * .45, 3.6, i % 2 ? palette.hill : palette.hill2);
      hill.position.set(x, 1.1 + (i % 2) * .45, -12 - (i % 3) * 2);
      hill.castShadow = false;
      hill.receiveShadow = false;
      this.backdrop.add(hill);
      if (id === 'tropicalSea' && i % 2 === 0) {
        const island = this.sphere(2.6, .5, 1.9, '#d8bf7d');
        island.position.set(x + 2.8, -.25, -6.5);
        island.castShadow = false;
        this.backdrop.add(island);
      }
    }
  }

  buildStaticStage() {
    for (const o of this.stage.objects) {
      if (['enemy', 'flyingEnemy', 'movingPlatform', 'crate'].includes(o.type)) continue;
      const node = this.makePart(o.type, o.props);
      node.position.set(o.x + .5, this.stage.height - o.y - .5, this.depthFor(o.type));
      this.world.add(node);
      this.staticEntries.push({ o, key: `${o.x},${o.y}`, node });
    }
  }

  depthFor(type) {
    if (['ground', 'block', 'breakable', 'switchBlock', 'pressureBlock', 'timerBlock', 'platform'].includes(type)) return 0;
    if (['door', 'enemyDoor', 'cannon'].includes(type)) return .24;
    return .48;
  }

  resize(width, height) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  hidden(o, key, game) {
    if (!game) return false;
    if (o.type === 'coin' && game.coins.has(key)) return true;
    if (o.type === 'key' && game.collectedKeys.has(key)) return true;
    if (o.type === 'door' && game.openedDoors.has(key)) return true;
    if (o.type === 'breakable' && game.brokenBlocks.has(key)) return true;
    if (o.type === 'switchBlock' && game.switchOn) return true;
    if (o.type === 'pressureBlock' && game.pressureActive) return true;
    if (o.type === 'timerBlock' && game.timerGate > 0) return true;
    if (o.type === 'enemyDoor' && game.enemies.length === 0) return true;
    return false;
  }

  updateStatic(game, time) {
    for (const entry of this.staticEntries) {
      const { o, key, node } = entry;
      node.visible = !this.hidden(o, key, game);
      if (!node.visible) continue;
      if (node.userData.spin) node.rotation.y = time * 4.2;
      if (node.userData.pulse) {
        const pulse = 1 + Math.sin(time * 4.2) * .07;
        node.scale.setScalar(pulse);
      }
      if (o.type === 'checkpoint' && node.userData.flag) {
        const active = game?.checkpoint?.x === o.x && game?.checkpoint?.y === o.y;
        node.userData.flag.scale.y = active ? 1.25 : 1;
      }
      if (['switch', 'timerSwitch', 'plate'].includes(o.type) && node.userData.button) {
        const active = o.type === 'switch' ? game?.switchOn
          : o.type === 'timerSwitch' ? game?.timerGate > 0
            : game?.pressureActive;
        node.userData.button.position.y = active ? -.18 : (o.type === 'plate' ? -.36 : -.08);
      }
    }
  }

  releaseDynamicNode(node) {
    if (!node) return;
    this.dynamic.remove(node);
    if (node.userData.ownedMaterial) {
      node.userData.ownedMaterial.dispose();
      node.userData.ownedMaterial = null;
    }
  }

  ensureEnemies(game) {
    const signature = game.enemies.map(e => e.type ?? 'enemy').join('|');
    if (signature === this.enemySignature) return;
    for (const node of this.enemyNodes) this.releaseDynamicNode(node);
    this.enemyNodes = game.enemies.map(e => {
      const node = e.type === 'flyingEnemy'
        ? this.makePteranodon()
        : this.makeDinosaur('#d59a72', '#b97857', .78);
      this.dynamic.add(node);
      return node;
    });
    this.enemySignature = signature;
  }

  ensureCount(list, targetCount, factory) {
    while (list.length < targetCount) {
      const node = factory();
      this.dynamic.add(node);
      list.push(node);
    }
    while (list.length > targetCount) {
      const node = list.pop();
      this.releaseDynamicNode(node);
    }
  }

  bodyPosition(node, body, z, yOffset = 0) {
    node.position.set(
      (body.x + body.w / 2) / TILE,
      this.stage.height - (body.y + body.h / 2) / TILE + yOffset,
      z
    );
  }

  bodyBottom(body) {
    return this.stage.height - (body.y + body.h) / TILE;
  }

  face(node, vx, fallback = 1) {
    const dir = vx < 0 ? -1 : vx > 0 ? 1 : fallback;
    const s = node.userData.baseScale ?? 1;
    node.scale.set(s * dir, s, s);
  }

  animateDinosaur(node, time, vx, grounded = true) {
    const running = grounded && Math.abs(vx) > 1;
    const stride = running ? Math.sin(time * 12) * .3 : 0;
    const idle = Math.sin(time * 2.35);
    const sway = running ? Math.sin(time * 12 + .8) : idle;

    if (node.userData.leftLeg) node.userData.leftLeg.rotation.z = stride;
    if (node.userData.rightLeg) node.userData.rightLeg.rotation.z = -stride;
    if (node.userData.tail) node.userData.tail.rotation.z = Math.PI / 2 + sway * (running ? .105 : .045);
    if (node.userData.neck) node.userData.neck.rotation.z = -.16 - stride * .08 + idle * .012;
    if (node.userData.head) node.userData.head.rotation.z = running ? Math.sin(time * 12 + Math.PI) * .032 : idle * .012;
    if (node.userData.arm) node.userData.arm.rotation.z = -.5 - stride * .42 + idle * .018;

    if (grounded) node.position.y += running ? Math.abs(Math.sin(time * 12)) * .018 : idle * .009;
    node.rotation.z = grounded ? 0 : -.06 * Math.sign(vx || 1);
  }

  spawnLandingDust(body, time) {
    const T = this.THREE;
    const material = new T.MeshBasicMaterial({
      color: 0xeaf0d8,
      transparent: true,
      opacity: .3,
      depthWrite: false
    });
    const group = new T.Group();
    const geometry = this.geometry('landing-dust', () => new T.SphereGeometry(.5, 8, 6));
    for (const [x, y, s] of [[-.23, .015, .12], [0, .04, .15], [.23, .015, .11]]) {
      const puff = this.mesh(geometry, material, false, false);
      puff.position.set(x, y, 0);
      puff.scale.set(s * 1.6, s, s);
      group.add(puff);
    }
    group.position.set((body.x + body.w / 2) / TILE, this.bodyBottom(body) + .035, .78);
    group.renderOrder = 4;
    this.dynamic.add(group);
    this.effects.push({ node: group, material, born: time, baseY: group.position.y });
  }

  updateEffects(time) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      const age = time - effect.born;
      if (age >= .38) {
        this.dynamic.remove(effect.node);
        effect.material.dispose();
        this.effects.splice(i, 1);
        continue;
      }
      const t = age / .38;
      effect.node.position.y = effect.baseY + t * .16;
      const grow = 1 + t * 1.35;
      effect.node.scale.set(grow, grow, grow);
      effect.material.opacity = .3 * (1 - t);
    }
  }

  updateDynamic(game, time) {
    this.bodyPosition(this.playerNode, game.player, .72, .07);
    this.face(this.playerNode, game.player.vx, game.player.facing ?? 1);
    this.animateDinosaur(this.playerNode, time, game.player.vx, game.player.grounded);

    this.playerShadow.visible = Boolean(game.player.grounded);
    if (this.playerShadow.visible) {
      this.playerShadow.position.set(
        (game.player.x + game.player.w / 2) / TILE,
        this.bodyBottom(game.player) + .045,
        .415
      );
      const speedSquash = Math.min(.16, Math.abs(game.player.vx) / (TILE * 16));
      this.playerShadow.scale.set(1.05 + speedSquash, .3 - speedSquash * .35, 1);
      this.playerShadow.material.opacity = .2;
    }

    if (this.lastLandingSerial === null) {
      this.lastLandingSerial = game.landingSerial;
    } else if (game.landingSerial !== this.lastLandingSerial) {
      this.lastLandingSerial = game.landingSerial;
      if (game.player.grounded) this.spawnLandingDust(game.player, time);
    }
    this.updateEffects(time);

    this.ensureEnemies(game);
    for (let i = 0; i < game.enemies.length; i++) {
      const enemy = game.enemies[i];
      const node = this.enemyNodes[i];
      this.bodyPosition(node, enemy, .62);
      this.face(node, enemy.vx, 1);
      if (enemy.type === 'flyingEnemy') {
        const flap = Math.sin(time * 10.5 + i * .7) * .62;
        if (node.userData.leftWing) node.userData.leftWing.rotation.x = flap;
        if (node.userData.rightWing) node.userData.rightWing.rotation.x = flap;
        node.rotation.z = Math.sin(time * 3.2 + i) * .04;
      } else {
        this.animateDinosaur(node, time + i * .35, enemy.vx, enemy.grounded);
      }
    }

    this.ensureCount(this.platformNodes, game.movingPlatforms.length, () => this.makePart('movingPlatform'));
    for (let i = 0; i < game.movingPlatforms.length; i++) {
      const p = game.movingPlatforms[i];
      const node = this.platformNodes[i];
      node.position.set((p.x + p.w / 2) / TILE, this.stage.height - (p.y + p.h / 2) / TILE, .12);
    }

    this.ensureCount(this.crateNodes, game.crates.length, () => this.makePart('crate'));
    for (let i = 0; i < game.crates.length; i++) {
      this.bodyPosition(this.crateNodes[i], game.crates[i], .46);
      this.crateNodes[i].scale.setScalar(.84);
    }

    this.ensureCount(this.projectileNodes, game.projectiles.length, () => this.sphere(.3, .22, .24, '#344950'));
    for (let i = 0; i < game.projectiles.length; i++) {
      const shot = game.projectiles[i];
      this.bodyPosition(this.projectileNodes[i], shot, .62);
      this.projectileNodes[i].rotation.z = time * 8;
    }
  }

  updateCamera(cameraPx, cameraYPx, scale, width, height, player = null) {
    const visibleW = width / scale / TILE;
    const visibleH = height / scale / TILE;
    const baseTargetX = (cameraPx + width / scale / 2) / TILE;
    const baseTargetY = this.stage.height - (cameraYPx + height / scale / 2) / TILE;
    const portrait = height > width * 1.08;
    const focusBlend = portrait ? .2 : .08;
    const playerX = player ? (player.x + player.w / 2) / TILE : baseTargetX;
    const playerY = player ? this.stage.height - (player.y + player.h / 2) / TILE : baseTargetY;
    const targetX = baseTargetX * (1 - focusBlend) + playerX * focusBlend;
    const targetY = baseTargetY * (1 - focusBlend) + playerY * focusBlend;
    const fov = this.camera.fov * Math.PI / 180;
    const baseDistance = visibleH / (2 * Math.tan(fov / 2));
    const distance = Math.max(portrait ? 6.6 : 7.2, baseDistance * (portrait ? .88 : .96));

    this.camera.position.set(
      targetX + visibleW * (portrait ? .045 : .055),
      targetY + visibleH * (portrait ? .055 : .075),
      distance
    );
    this.camera.lookAt(targetX, targetY + (portrait ? .02 : 0), .08);
    this.sun.position.set(targetX + 7, targetY + 13, 11);
    this.sun.target.position.set(targetX, targetY, 0);
    if (!this.sun.target.parent) this.scene.add(this.sun.target);
  }

  render(game, cameraPx, cameraYPx, scale, width, height, time) {
    this.updateStatic(game, time);
    this.updateDynamic(game, time);
    this.updateCamera(cameraPx, cameraYPx, scale, width, height, game?.player);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const node of this.enemyNodes) this.releaseDynamicNode(node);
    this.enemyNodes = [];
    for (const effect of this.effects) {
      this.dynamic.remove(effect.node);
      effect.material.dispose();
    }
    this.effects = [];
    if (this.playerShadow?.userData.ownedMaterial) {
      this.playerShadow.userData.ownedMaterial.dispose();
      this.playerShadow.userData.ownedMaterial = null;
    }
    if (this.playerNode?.userData.ownedMaterial) {
      this.playerNode.userData.ownedMaterial.dispose();
      this.playerNode.userData.ownedMaterial = null;
    }
    for (const material of this.materials.values()) material.dispose();
    for (const geometry of this.geometries.values()) geometry.dispose();
    this.renderer.dispose();
  }
}
