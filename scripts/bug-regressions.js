import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Exercise the supported offline Canvas fallback without relying on a CDN.
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.goto('http://localhost:5173');
  for (const [width, height] of [[20, 14], [100, 14], [10, 8]]) {
    await page.evaluate(async ({ width, height }) => {
      const { createStage, StageStore } = await import('/src/stage.js');
      localStorage.clear();
      new StageStore().save({ ...createStage(), name: 'Reset regression', background: 'classic', width, height,
        playerStart: { x: 1, y: 1 }, objects: [{ type: 'coin', x: 4, y: 2 }] });
    }, { width, height });
    await page.reload();
    await page.locator('[data-edit]').click();
    await page.locator('#reset').click();
    await page.locator('[data-ok]').click();
    await page.locator('#save').click();
    const stage = await page.evaluate(() => JSON.parse(localStorage.getItem('jomaker.stages.v1'))[0].data);
    assert.equal(stage.objects.filter(o => o.type === 'ground').length, width, 'reset must save a floor matching the current width');
    assert.equal(stage.height, height);
    assert.equal(stage.background, 'classic');
    assert.equal(stage.name, 'Reset regression');
    assert.ok(stage.objects.some(o => o.type === 'goal'));
    assert.ok(stage.objects.every(o => o.x < width && o.y < height));
    await page.locator('#undo').click();
    await page.locator('#save').click();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('jomaker.stages.v1'))[0].data.objects), [{ type: 'coin', x: 4, y: 2 }]);
  }
  await page.evaluate(async () => {
    const { createStage, StageStore } = await import('/src/stage.js');
    localStorage.clear();
    const stage = createStage();
    stage.objects.find(o => o.type === 'goal').x = 4;
    new StageStore().save(stage);
  });
  await page.reload();
  await page.locator('[data-play]').click();
  await page.waitForFunction(() => document.querySelector('#hud')?.textContent.includes('●'));
  await page.keyboard.down('KeyD');
  await page.locator('#again').waitFor();
  await page.locator('#restart').click();
  await page.keyboard.up('KeyD');
  assert.equal(await page.locator('#again').count(), 0, 'toolbar retry must dismiss the clear dialog');
  await page.locator('#pause').click();
  await page.locator('#pause-restart').click();
  assert.equal(await page.locator('.pause-overlay').count(), 0);
  assert.equal(await page.locator('#pause').getAttribute('aria-pressed'), 'false');
  await page.keyboard.down('KeyD');
  await page.locator('#again').waitFor();
  await page.locator('#again').click();
  await page.keyboard.up('KeyD');
  assert.equal(await page.locator('#again').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Portrait browser: resized reset/save/undo and all retry paths passed (Canvas fallback).');
} finally {
  await browser.close();
}
