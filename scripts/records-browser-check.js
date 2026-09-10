// Run against node scripts/serve.js; optionally set PLAYWRIGHT_PATH.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true});
try {
  for(const [width,height] of [[390,844],[844,390]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    // Deterministic offline 2D fallback: records do not depend on WebGL/CDN.
    await page.route('https://**',route=>route.abort());
    await page.goto('http://localhost:5173');
    await page.evaluate(async()=>{
      const {StageStore,createStage}=await import('/src/stage.js');
      const s=createStage();s.name='Record test';s.width=10;
      s.playerStart={x:1,y:10};s.objects=[];
      for(let x=0;x<10;x++)s.objects.push({type:'ground',x,y:12});
      s.objects.push({type:'goal',x:4,y:11},{type:'coin',x:3,y:11});
      new StageStore().save(s);
    });
    await page.reload();await page.locator('[data-play]').click();
    await page.waitForFunction(()=>document.querySelector('#hud')?.textContent.includes('⏱'));
    await page.locator('#pause').click();
    const frozen=await page.locator('#hud').textContent();
    await page.waitForTimeout(180);
    assert.equal(await page.locator('#hud').textContent(),frozen);
    await page.locator('#resume').click();
    await page.keyboard.down('ArrowRight');
    await page.locator('.clear-overlay').waitFor();await page.keyboard.up('ArrowRight');
    assert.match(await page.locator('.clear-stats').textContent(),/クリアタイム/);
    assert.match(await page.locator('.clear-badges').textContent(),/ノーミス達成/);
    const dialog=await page.locator('.clear-overlay .modal').boundingBox();
    assert.ok(dialog.x>=0&&dialog.y>=0&&dialog.x+dialog.width<=width+1&&dialog.y+dialog.height<=height+1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jomaker.records.v1'))[0].clears),1);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jomaker.records.v1'))[0].clears),1);
    await page.locator('#again').click();assert.equal(await page.locator('.clear-overlay').count(),0);
    await page.keyboard.down('ArrowRight');await page.locator('.clear-overlay').waitFor();await page.keyboard.up('ArrowRight');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jomaker.records.v1'))[0].clears),2);
    await page.locator('#return').click();await page.locator('#play').waitFor();
    await page.reload();assert.match(await page.locator('.record-summary').textContent(),/2回クリア/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log(`Records UI passed: ${width}x${height}`);
    await context.close();
  }
}finally{await browser.close();}
