import { ThreePlayRenderer } from './render3d.js?v=20260916-enemy-direction-1';

// Final readability pass for moving platforms on small phone screens.
// The physics footprint is untouched: only the rendered artwork gets a little
// wider and thicker so it reads as a safe place to land at a glance.
const PATCH_FLAG = '__jomakerMovingPlatformPresencePolished';

if (!ThreePlayRenderer.prototype[PATCH_FLAG]) {
  const previousMakePart = ThreePlayRenderer.prototype.makePart;

  const makeMovingPlatform = (view, props = null) => {
    const T = view.THREE;
    const group = new T.Group();

    // Wider silhouette, with extra thickness extending downward. The top edge
    // stays at the same height as before so the art continues to line up with
    // the existing collision surface.
    const shadow = view.box(1.10, .19, .61, '#214f4b');
    shadow.position.set(0, .205, -.02);
    group.add(shadow);

    const body = view.box(1.14, .25, .67, '#3f806f');
    body.position.y = .315;
    group.add(body);

    const lowerLip = view.box(1.02, .065, .04, '#2d655d');
    lowerLip.position.set(0, .245, .355);
    group.add(lowerLip);

    const cap = view.box(1.18, .10, .72, '#a9dc55');
    cap.position.y = .49;
    group.add(cap);

    const grassHighlight = view.box(.86, .03, .035, '#dff58b');
    grassHighlight.position.set(-.045, .53, .382);
    group.add(grassHighlight);

    // The yellow motion strip now occupies more of the face, making the part
    // recognizable as a moving platform even when the camera is zoomed out.
    const motionBand = view.box(.86, .12, .05, '#ffd36f');
    motionBand.position.set(0, .355, .382);
    group.add(motionBand);

    const motionBandInner = view.box(.75, .058, .052, '#fff1ac');
    motionBandInner.position.set(0, .37, .412);
    group.add(motionBandInner);

    const arrowGroup = new T.Group();
    const makeChevron = (x, dir) => {
      const upper = view.box(.18, .042, .055, '#173b47');
      upper.position.set(x, .024, 0);
      upper.rotation.z = dir * .62;
      const lower = view.box(.18, .042, .055, '#173b47');
      lower.position.set(x, -.06, 0);
      lower.rotation.z = -dir * .62;
      arrowGroup.add(upper, lower);
    };
    makeChevron(-.22, -1);
    makeChevron(.22, 1);
    arrowGroup.position.set(0, .365, .448);
    if (props?.axis === 'y') arrowGroup.rotation.z = Math.PI / 2;
    group.add(arrowGroup);

    // Chunkier end hardware visually anchors the platform without turning it
    // back into a box or drawer.
    for (const x of [-.50, .50]) {
      const endCap = view.box(.085, .14, .045, '#2b625b');
      endCap.position.set(x, .33, .382);
      group.add(endCap);
      const rivet = view.sphere(.047, .047, .038, '#fff3c4');
      rivet.position.set(x, .37, .414);
      group.add(rivet);
    }

    return group;
  };

  ThreePlayRenderer.prototype.makePart = function makePartWithReadableMovingPlatform(type, props = null) {
    if (type === 'movingPlatform') return makeMovingPlatform(this, props);
    return previousMakePart.call(this, type, props);
  };

  Object.defineProperty(ThreePlayRenderer.prototype, PATCH_FLAG, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
}
