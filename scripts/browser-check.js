// Optional browser integration check: PLAYWRIGHT_PATH points to an installed playwright package.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true});
await mkdir('artifacts',{recursive:true});
try {
  for(const [name,width,height] of [['phone',844,390],['tablet',1024,768],['portrait',390,844],['desktop',1440,900]]) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:name!=='desktop'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:5173');await page.locator('#new').click();
    await page.locator('#name').fill(`Test ${name}`);await page.locator('#name').press('Tab');
    const bounds=await page.locator('canvas').boundingBox();
    await page.locator('[data-tool="enemy"]').click();await page.mouse.click(bounds.x+220,bounds.y+bounds.height-70);
    await page.locator('#undo').click();await page.locator('#redo').click();
    await page.locator('[data-tool="pan"]').click();await page.mouse.move(bounds.x+width*.65,bounds.y+80);await page.mouse.down();await page.mouse.move(bounds.x+width*.3,bounds.y+80,{steps:10});await page.mouse.up();
    assert.ok(Number(await page.locator('#scroll').inputValue())>0);
    await page.locator('#save').click();
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('jomaker.stages.v1')));assert.equal(stored.length,1);assert.ok(stored[0].data.objects.some(o=>o.type==='enemy'));
    await page.screenshot({path:`artifacts/${name}-editor.png`});
    await page.locator('#play').click();await page.keyboard.down('KeyD');await page.keyboard.press('Space');await page.waitForTimeout(150);await page.keyboard.up('KeyD');
    const session=await context.newCDPSession(page);
    const right=await page.locator('[data-input="right"]').boundingBox(),jump=await page.locator('[data-input="jump"]').boundingBox();
    const t1={x:right.x+right.width/2,y:right.y+right.height/2,id:1},t2={x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t1]});
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t1,t2]});
    assert.equal(await page.locator('.pressed').count(),2);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.locator('.pressed').count(),0);
    await page.screenshot({path:`artifacts/${name}-play.png`});await page.locator('#edit').click();assert.equal(await page.locator('#name').inputValue(),`Test ${name}`);
    await page.locator('#back').click();await page.reload();await page.locator('[data-edit]').click();assert.equal(await page.locator('#name').inputValue(),`Test ${name}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
    console.log(`${name}: edit, undo/redo, pan, save/reload, play/return, layout passed`);await context.close();
  }
} finally {await browser.close();}
