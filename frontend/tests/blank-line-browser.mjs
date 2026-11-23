import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.SCROLLFACT_PLAYWRIGHT_MODULE || 'playwright');
const html = await fs.readFile(process.env.SCROLLFACT_ETNEWS_HTML, 'utf8');
const passages = JSON.parse(await fs.readFile(process.env.SCROLLFACT_PASSAGES, 'utf8'));
const browser = await chromium.launch({executablePath:process.env.SCROLLFACT_BROWSER_PATH,headless:true});
try {
 const page=await browser.newPage({viewport:{width:1400,height:900}});
 await page.route('**/blank-line-fixture', r=>r.fulfill({contentType:'text/html',body:html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')}));
 await page.goto('http://127.0.0.1:5173/blank-line-fixture',{waitUntil:'domcontentloaded'});
 const snapshot=await page.evaluate(async()=>{
  const {mountContentController}=await import('/src/content/controller.ts');
  mountContentController({panelUrl:'/reader.html',listen:h=>{window.handler=h;return()=>{}},emit:m=>{window.lastEvent=m},loadSettings:async()=>({}),saveSettings:()=>{}});
  return await new Promise(r=>window.handler({type:'SF_CAPTURE_DOCUMENT'},r));
 });
 const result=await page.evaluate(({id,passages})=>new Promise(r=>window.handler({type:'SF_WATCH_SECTIONS',snapshotId:id,targets:passages},r)),{id:snapshot.snapshot.snapshotId,passages});
 assert.deepEqual(result.unmatchedIds,[]);
 for (const index of [0,3,9,1,8]) {
  await page.evaluate(({id,sectionId})=>new Promise(r=>window.handler({type:'SF_SCROLL_TO_SECTION',snapshotId:id,sectionId},r)),{id:snapshot.snapshot.snapshotId,sectionId:passages[index].id});
  const marked=await page.evaluate(()=>Array.from(CSS.highlights.get('scrollfact-paragraph'))[0].toString().replace(/\s+/g,' ').trim());
  assert.equal(marked,passages[index].text);
 }
 // Rerendering an unchanged container must restore a range on the replacement.
 await page.locator('[itemprop=articleBody] > p').evaluate(el=>el.replaceWith(el.cloneNode(true)));
 await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>Array.from(CSS.highlights.get('scrollfact-paragraph'))[0].startContainer.isConnected),true);
 console.log('PASS: 11 original anchors; five manual moves; range highlight restored after rerender');
} finally { await browser.close(); }
