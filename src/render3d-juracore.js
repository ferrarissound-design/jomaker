import { createPlayRenderer as createBasePlayRenderer } from './render3d.js?v=20260917-juracore-base-1';
import { JURACORE_WARNING } from './juracore-runtime.js?v=20260917-juracore-1';

function decorateJuracoreEntries(renderer) {
  const T = renderer.THREE;
  for (const entry of renderer.staticEntries) {
    if (entry.o.type !== 'juracore') continue;
    const group = entry.node;

    const coreGeometry = new T.DodecahedronGeometry(.3, 0);
    const coreMaterial = new T.MeshToonMaterial({
      color: 0xe79032,
      emissive: 0x8b3e12,
      emissiveIntensity: .52,
      gradientMap: renderer.toonRamp
    });
    const core = new T.Mesh(coreGeometry, coreMaterial);
    core.scale.set(1, 1.15, .72);
    group.add(core);

    const centerMaterial = new T.MeshBasicMaterial({
      color: 0xfff3bc,
      transparent: true,
      opacity: .92,
      depthWrite: false
    });
    const center = new T.Mesh(new T.OctahedronGeometry(.1, 0), centerMaterial);
    center.position.z = .24;
    center.scale.set(.7, 1.7, .55);
    group.add(center);

    const moteMaterial = new T.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: .9,
      depthWrite: false
    });
    const moteGeometry = new T.OctahedronGeometry(.045, 0);
    const motes = [];
    for (let i = 0; i < 5; i++) {
      const mote = new T.Mesh(moteGeometry, moteMaterial);
      group.add(mote);
      motes.push(mote);
    }

    group.userData.juracore = { core, center, motes, coreGeometry, coreMaterial, centerMaterial, moteGeometry, moteMaterial };
  }
}

function makePowerAura(renderer) {
  const T = renderer.THREE;
  const group = new T.Group();
  group.renderOrder = 8;

  const ringMaterial = new T.MeshBasicMaterial({
    color: 0xffb43c,
    transparent: true,
    opacity: .58,
    depthWrite: false,
    side: T.DoubleSide
  });
  const ringGeometry = new T.RingGeometry(.48, .56, 32);
  const ring = new T.Mesh(ringGeometry, ringMaterial);
  group.add(ring);

  const moteMaterial = new T.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: .95,
    depthWrite: false
  });
  const moteGeometry = new T.OctahedronGeometry(.055, 0);
  const motes = [];
  for (let i = 0; i < 7; i++) {
    const mote = new T.Mesh(moteGeometry, moteMaterial);
    group.add(mote);
    motes.push(mote);
  }

  renderer.dynamic.add(group);
  return { group, ring, ringMaterial, ringGeometry, motes, moteMaterial, moteGeometry };
}

function installJuracoreVisuals(renderer) {
  decorateJuracoreEntries(renderer);
  const aura = makePowerAura(renderer);
  renderer.juracoreAura = aura;

  const baseHidden = renderer.hidden.bind(renderer);
  renderer.hidden = (o, key, game) =>
    (o.type === 'juracore' && game?.collectedJuraCores?.has(key)) || baseHidden(o, key, game);

  const baseUpdateStatic = renderer.updateStatic.bind(renderer);
  renderer.updateStatic = (game, time) => {
    baseUpdateStatic(game, time);
    for (const entry of renderer.staticEntries) {
      const data = entry.node.userData.juracore;
      if (!data || !entry.node.visible) continue;
      entry.node.position.y += Math.sin(time * 3.2 + entry.o.x * .17) * .045;
      data.core.rotation.x = time * .7;
      data.core.rotation.y = time * 1.3;
      const pulse = 1 + Math.sin(time * 5.2) * .07;
      data.core.scale.set(pulse, 1.15 * pulse, .72 * pulse);
      data.center.scale.set(.7 * pulse, 1.7 * pulse, .55 * pulse);
      data.motes.forEach((mote, i) => {
        const a = time * 1.7 + i * Math.PI * 2 / data.motes.length;
        const r = .48 + (i % 2) * .06;
        mote.position.set(Math.cos(a) * r, Math.sin(a) * r * .68, .12 + Math.sin(a * 1.4) * .05);
        mote.rotation.z = -time * 2 + i;
      });
    }
  };

  const baseUpdateDynamic = renderer.updateDynamic.bind(renderer);
  renderer.updateDynamic = (game, time) => {
    baseUpdateDynamic(game, time);
    const powered = game?.juracoreTimer > 0;
    aura.group.visible = Boolean(powered);
    renderer.playerNode.material.color.setHex(powered ? 0xffe3a1 : 0xffffff);
    renderer.playerNode.material.opacity = 1;

    if (!powered) return;

    const warning = game.juracoreTimer <= JURACORE_WARNING;
    const flicker = warning && Math.floor(time * 12) % 2 === 0;
    const alpha = flicker ? .22 : .62;
    const cx = (game.player.x + game.player.w / 2) / 48;
    const cy = renderer.stage.height - (game.player.y + game.player.h / 2) / 48;
    aura.group.position.set(cx, cy, .44);
    aura.group.rotation.z = -time * .35;
    const pulse = 1 + Math.sin(time * 8) * .08;
    aura.ring.scale.setScalar(pulse);
    aura.ringMaterial.opacity = alpha;
    aura.moteMaterial.opacity = flicker ? .38 : .95;
    aura.motes.forEach((mote, i) => {
      const a = -time * (2.1 + i * .025) + i * Math.PI * 2 / aura.motes.length;
      const r = .66 + (i % 3) * .07;
      mote.position.set(Math.cos(a) * r, Math.sin(a) * r * .78, .04 + (i % 2) * .03);
      const s = .8 + Math.sin(time * 5 + i) * .18;
      mote.scale.setScalar(s);
    });
    renderer.playerNode.material.opacity = flicker ? .72 : 1;
  };

  const baseDispose = renderer.dispose.bind(renderer);
  renderer.dispose = () => {
    renderer.dynamic.remove(aura.group);
    aura.ringGeometry.dispose();
    aura.ringMaterial.dispose();
    aura.moteGeometry.dispose();
    aura.moteMaterial.dispose();
    for (const entry of renderer.staticEntries) {
      const data = entry.node.userData.juracore;
      if (!data) continue;
      data.coreGeometry.dispose();
      data.coreMaterial.dispose();
      data.center.geometry.dispose();
      data.centerMaterial.dispose();
      data.moteGeometry.dispose();
      data.moteMaterial.dispose();
    }
    baseDispose();
  };

  return renderer;
}

export async function createPlayRenderer(canvas, stage) {
  const renderer = await createBasePlayRenderer(canvas, stage);
  return installJuracoreVisuals(renderer);
}

export { ThreePlayRenderer } from './render3d.js?v=20260917-juracore-base-1';
