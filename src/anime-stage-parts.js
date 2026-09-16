import { ThreePlayRenderer } from './render3d.js?v=20260916-trike-direction-1';

// Adventure-anime stage skin for the 2.5D play renderer.
// Keep the already-stylized grass, collectibles, hazards, enemies and portals intact.
const originalMakePart = ThreePlayRenderer.prototype.makePart;

const addFaceBand = (view, group, color, y = .2, h = .08, z = .42) => {
  const band = view.box(.72, h, .035, color);
  band.position.set(-.06, y, z);
  group.add(band);
  return band;
};

const addTopCap = (view, group, color, y = .47, w = .91, d = .82) => {
  const cap = view.box(w, .10, d, color);
  cap.position.y = y;
  group.add(cap);
  return cap;
};

const makeAdventureBlock = (view, base, top, accent) => {
  const T = view.THREE;
  const group = new T.Group();
  const body = view.box(.94, .94, .76, base);
  body.position.y = -.01;
  group.add(body);
  addTopCap(view, group, top);
  addFaceBand(view, group, accent, .18, .07, .395);
  const lower = view.box(.48, .055, .03, accent);
  lower.position.set(.13, -.23, .395);
  group.add(lower);
  return group;
};

const makeCrackedBlock = view => {
  const group = makeAdventureBlock(view, '#d59661', '#f0bd79', '#b76d4c');
  const crack = (x, y, angle, h) => {
    const slash = view.box(.055, h, .035, '#754738');
    slash.position.set(x, y, .425);
    slash.rotation.z = angle;
    group.add(slash);
  };
  crack(-.13, .10, .72, .38);
  crack(.05, -.08, -.62, .33);
  crack(.20, .15, .88, .25);
  return group;
};

const makePlatform = (view, moving = false, props = null) => {
  const T = view.THREE;
  const group = new T.Group();

  if (!moving) {
    const shadow = view.box(.94, .15, .58, '#285f43');
    shadow.position.set(0, .255, -.015);
    group.add(shadow);

    const body = view.box(.98, .19, .64, '#4f9148');
    body.position.y = .34;
    group.add(body);

    const face = view.box(.88, .075, .035, '#69b951');
    face.position.set(0, .345, .342);
    group.add(face);

    const cap = view.box(1.02, .095, .69, '#a9dc55');
    cap.position.y = .485;
    group.add(cap);

    const highlight = view.box(.72, .028, .03, '#d9f27b');
    highlight.position.set(-.055, .523, .365);
    group.add(highlight);

    const blade = (x, angle, h) => {
      const leaf = view.box(.055, h, .045, '#79bd49');
      leaf.position.set(x, .565, .24);
      leaf.rotation.z = angle;
      group.add(leaf);
    };
    blade(-.33, -.32, .17);
    blade(-.24, .23, .13);
    blade(.33, .28, .15);
    return group;
  }

  // Moving platforms share the grassland palette with normal ledges, while a
  // bright mechanical band and bold chevrons make their motion readable at a glance.
  const shadow = view.box(.96, .16, .59, '#214f4b');
  shadow.position.set(0, .25, -.02);
  group.add(shadow);

  const body = view.box(.99, .20, .65, '#3f806f');
  body.position.y = .34;
  group.add(body);

  const lowerLip = view.box(.88, .055, .035, '#2d655d');
  lowerLip.position.set(0, .285, .345);
  group.add(lowerLip);

  const cap = view.box(1.04, .10, .70, '#a9dc55');
  cap.position.y = .49;
  group.add(cap);

  const grassHighlight = view.box(.74, .028, .03, '#dff58b');
  grassHighlight.position.set(-.045, .53, .37);
  group.add(grassHighlight);

  const motionBand = view.box(.72, .105, .045, '#ffd36f');
  motionBand.position.set(0, .36, .365);
  group.add(motionBand);

  const motionBandInner = view.box(.62, .052, .047, '#fff1ac');
  motionBandInner.position.set(0, .372, .39);
  group.add(motionBandInner);

  const arrowGroup = new T.Group();
  const makeChevron = (x, dir) => {
    const upper = view.box(.16, .038, .05, '#173b47');
    upper.position.set(x, .02, 0);
    upper.rotation.z = dir * .62;
    const lower = view.box(.16, .038, .05, '#173b47');
    lower.position.set(x, -.055, 0);
    lower.rotation.z = -dir * .62;
    arrowGroup.add(upper, lower);
  };
  makeChevron(-.19, -1);
  makeChevron(.19, 1);
  arrowGroup.position.set(0, .37, .42);
  if (props?.axis === 'y') arrowGroup.rotation.z = Math.PI / 2;
  group.add(arrowGroup);

  // Small end-caps keep the platform looking illustrated rather than like a drawer.
  for (const x of [-.43, .43]) {
    const rivet = view.sphere(.045, .045, .035, '#fff3c4');
    rivet.position.set(x, .36, .405);
    group.add(rivet);
  }

  return group;
};

const makeAnimeCrate = view => {
  const T = view.THREE;
  const group = new T.Group();
  const body = view.box(.82, .82, .72, '#b77b53');
  group.add(body);
  const top = view.box(.76, .09, .76, '#dda06a');
  top.position.y = .37;
  group.add(top);
  const slashA = view.box(.065, .68, .035, '#6e4938');
  slashA.position.z = .38;
  slashA.rotation.z = .76;
  const slashB = slashA.clone();
  slashB.rotation.z = -.76;
  group.add(slashA, slashB);
  return group;
};

const makePressurePlate = view => {
  const T = view.THREE;
  const group = new T.Group();
  const base = view.box(.88, .11, .68, '#587d87');
  base.position.y = -.39;
  group.add(base);
  const button = view.box(.72, .09, .61, '#a8d9df');
  button.position.y = -.31;
  group.add(button);
  group.userData.button = button;
  return group;
};

const makeCartoonCannon = (view, props) => {
  const T = view.THREE;
  const group = new T.Group();
  const body = view.sphere(.58, .52, .55, '#596a72');
  body.position.y = -.10;
  group.add(body);
  const cheek = view.sphere(.36, .30, .58, '#82929a');
  cheek.position.set(-.04, .02, .02);
  group.add(cheek);
  const barrel = view.cylinder(.20, .64, '#35464d', 12);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(.30, .08, 0);
  group.add(barrel);
  const rim = view.torus(.205, .045, '#a7b4b9');
  rim.rotation.y = Math.PI / 2;
  rim.position.set(.61, .08, 0);
  group.add(rim);
  const foot = view.box(.62, .12, .61, '#8e9da2');
  foot.position.y = -.43;
  group.add(foot);
  if (props?.direction === 'left') group.rotation.y = Math.PI;
  return group;
};

const makeAnimeSpring = view => {
  const T = view.THREE;
  const group = new T.Group();
  const base = view.box(.82, .17, .66, '#dc704c');
  base.position.y = -.36;
  group.add(base);
  const baseGlow = view.box(.66, .055, .69, '#ffb06b');
  baseGlow.position.y = -.26;
  group.add(baseGlow);
  const top = view.box(.72, .12, .64, '#ffd46f');
  top.position.y = .14;
  group.add(top);
  const shine = view.box(.48, .035, .67, '#fff1b0');
  shine.position.y = .215;
  group.add(shine);
  const coilGeometry = view.geometry('anime-stage-spring', () => {
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const angle = t * Math.PI * 6;
      points.push(new T.Vector3(Math.cos(angle) * .19, -.23 + t * .34, Math.sin(angle) * .12));
    }
    return new T.TubeGeometry(new T.CatmullRomCurve3(points), 48, .035, 6, false);
  });
  group.add(view.mesh(coilGeometry, view.material('#65506b')));
  return group;
};

const makeAnimeDoor = (view, enemy = false) => {
  const T = view.THREE;
  const group = new T.Group();
  const bodyColor = enemy ? '#725f91' : '#906750';
  const trimColor = enemy ? '#493c61' : '#644638';
  const body = view.box(.68, .90, .46, bodyColor);
  body.position.y = -.04;
  group.add(body);
  const crown = view.sphere(.68, .34, .46, bodyColor);
  crown.position.y = .38;
  group.add(crown);
  const inset = view.box(.47, .63, .035, trimColor);
  inset.position.set(0, -.07, .25);
  group.add(inset);
  const insetGlow = view.box(.34, .08, .04, enemy ? '#a994c7' : '#c99b78');
  insetGlow.position.set(0, .18, .275);
  group.add(insetGlow);
  if (enemy) {
    const gem = view.sphere(.12, .12, .055, '#e5c75e');
    gem.position.set(0, -.08, .29);
    group.add(gem);
  } else {
    const knob = view.sphere(.065, .065, .05, '#f2d9a6');
    knob.position.set(.18, -.08, .29);
    group.add(knob);
  }
  return group;
};

const makeAnimeSwitch = (view, timed = false) => {
  const T = view.THREE;
  const group = new T.Group();
  const base = view.box(.82, .22, .68, timed ? '#c58a50' : '#d86e5b');
  base.position.y = -.31;
  group.add(base);
  const lip = view.box(.68, .06, .70, timed ? '#f1c176' : '#f6a17f');
  lip.position.y = -.18;
  group.add(lip);
  const button = view.sphere(.34, .22, .34, timed ? '#ffe79a' : '#fff4d8');
  button.position.y = -.06;
  group.add(button);
  if (timed) {
    const ring = view.torus(.20, .035, '#7d5a39');
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, .22, .08);
    group.add(ring);
  }
  group.userData.button = button;
  return group;
};

ThreePlayRenderer.prototype.makePart = function makeAnimeStagePart(type, props = null) {
  if (type === 'block') return makeAdventureBlock(this, '#e29d57', '#ffd07b', '#b76a43');
  if (type === 'switchBlock') return makeAdventureBlock(this, '#d86f69', '#ffaaa3', '#934c51');
  if (type === 'pressureBlock') return makeAdventureBlock(this, '#65a9b9', '#a8e3e8', '#477783');
  if (type === 'timerBlock') return makeAdventureBlock(this, '#c68b55', '#f5c985', '#8c5c3e');
  if (type === 'breakable') return makeCrackedBlock(this);
  if (type === 'platform') return makePlatform(this, false, props);
  if (type === 'movingPlatform') return makePlatform(this, true, props);
  if (type === 'crate') return makeAnimeCrate(this);
  if (type === 'plate') return makePressurePlate(this);
  if (type === 'cannon') return makeCartoonCannon(this, props);
  if (type === 'spring') return makeAnimeSpring(this);
  if (type === 'door') return makeAnimeDoor(this, false);
  if (type === 'enemyDoor') return makeAnimeDoor(this, true);
  if (type === 'switch') return makeAnimeSwitch(this, false);
  if (type === 'timerSwitch') return makeAnimeSwitch(this, true);

  // ground already uses the dedicated anime grass renderer. Coins, keys, spikes,
  // warps, checkpoints, goals and enemies also keep their existing stylized art.
  return originalMakePart.call(this, type, props);
};
