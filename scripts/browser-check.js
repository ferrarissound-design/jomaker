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
    await page.locator('#share').click();assert.match(await page.locator('.share-code').inputValue(),/^JO1\./);await page.locator('[data-close]').click();
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('jomaker.stages.v1')));assert.equal(stored.length,1);assert.ok(stored[0].data.objects.some(o=>o.type==='enemy'));
    await page.screenshot({path:`artifacts/${name}-editor.png`});
    await page.locator('#play').click();
    if(name==='portrait'){
      const hud=await page.locator('#hud').boundingBox(),hint=await page.locator('.play-top-ui .hint').boundingBox(),portraitTip=await page.locator('.play-top-ui .portrait').boundingBox();
      assert.ok(hud.y+hud.height<=hint.y,'portrait HUD and hint must not overlap');
      assert.ok(hint.y+hint.height<=portraitTip.y,'portrait hint and rotation tip must not overlap');
      const leftControl=await page.locator('[data-input="left"]').boundingBox();
      assert.ok(portraitTip.y+portraitTip.height<leftControl.y,'top UI must stay above touch controls');
      assert.ok((await page.locator('.playing .toolbar').boundingBox()).height<130,'portrait toolbar must stay compact');
      const selectionGuard=await page.evaluate(()=>{
        const tip=document.querySelector('.play-top-ui .portrait'),viewport=document.querySelector('.playing .viewport'),style=getComputedStyle(tip);
        const contextAllowed=viewport.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
        const selectAllowed=viewport.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}));
        return {userSelect:style.userSelect,webkitUserSelect:style.webkitUserSelect,contextAllowed,selectAllowed};
      });
      assert.equal(selectionGuard.userSelect,'none');
      assert.equal(selectionGuard.webkitUserSelect,'none');
      assert.equal(selectionGuard.contextAllowed,false,'play viewport context menu must be blocked');
      assert.equal(selectionGuard.selectAllowed,false,'play viewport text selection must be blocked');
    }
    await page.keyboard.down('KeyD');await page.keyboard.press('Space');await page.waitForTimeout(150);await page.keyboard.up('KeyD');
    const session=await context.newCDPSession(page);
    const right=await page.locator('[data-input="right"]').boundingBox(),jump=await page.locator('[data-input="jump"]').boundingBox();
    const t1={x:right.x+right.width/2,y:right.y+right.height/2,id:1},t2={x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t1]});
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t1,t2]});
    assert.equal(await page.locator('.pressed').count(),2);
    await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert.equal(await page.locator('.pressed').count(),0);
    const beforeRelease=await page.evaluate(()=>document.querySelector('[data-input="right"]').classList.contains('pressed'));
    assert.equal(beforeRelease,false);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t1]});
    assert.equal(await page.locator('.pressed').count(),1);
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...t1,x:4,y:4}]});
    await page.waitForTimeout(30);
    assert.equal(await page.locator('.pressed').count(),0,'sliding off a control must release it');
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.locator('.pressed').count(),0);
    await page.screenshot({path:`artifacts/${name}-play.png`});await page.locator('#edit').click();assert.equal(await page.locator('#name').inputValue(),`Test ${name}`);
    await page.locator('#back').click();await page.reload();await page.locator('[data-edit]').click();assert.equal(await page.locator('#name').inputValue(),`Test ${name}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
    console.log(`${name}: edit, undo/redo, pan, save/reload, play/return, layout passed`);await context.close();
  }
} finally {await browser.close();}
