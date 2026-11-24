// Requires a built frontend served on 5173 and a backend on 8080.
// Browser messaging is bridged; upload/polling use the real server.
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.SCROLLFACT_PLAYWRIGHT_MODULE || 'playwright');
const frontend = fileURLToPath(new URL('../', import.meta.url));
import {readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.SCROLLFACT_BROWSER_PATH || undefined,headless:true,args:['--no-sandbox']});
try {
const context=await browser.newContext({viewport:{width:1400,height:1000},deviceScaleFactor:1});
const page=await context.newPage();
await context.exposeBinding('sfTransport',async ({page},message)=>page.mainFrame().evaluate(message=>new Promise(resolve=>window.sfHandler(message,resolve)),message));
await context.addInitScript(()=>{
 const listeners=[];
 window.sfListeners=listeners;
 window.chrome={runtime:{id:'test-extension-transport',sendMessage:async()=>({tabId:1}),onMessage:{addListener:f=>listeners.push(f),removeListener:f=>{const i=listeners.indexOf(f);if(i>=0)listeners.splice(i,1)}}},tabs:{sendMessage:(_id,msg)=>window.sfTransport(msg)}};
});
await page.route('**/framing-fixture',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="ko"><head><meta charset="UTF-8"><link rel="stylesheet" href="/src/content/highlight.css"><title>실제 페이지 전송 점검</title><style>body{font-family:sans-serif;padding:50px}article{max-width:680px}p{margin-bottom:350px;font-size:22px}</style></head><body><article><h1>학교 축제 운영 안내</h1><p id="one">학교 축제 부스 운영 방법을 학생들과 함께 논의합니다.</p><p id="two">학생회는 통로 확보를 위해 운영 공간을 조정한다고 설명했습니다.</p><p id="three">참여 동아리들은 발표 기회를 보장해 달라고 요청했습니다.</p></article><input value="PRIVATE_INPUT"><textarea>PRIVATE_DRAFT</textarea><div hidden>PRIVATE_HIDDEN</div><script type="application/json">{"token":"PRIVATE_SCRIPT"}</script></body></html>`}));
await page.goto('http://127.0.0.1:5173/framing-fixture');
const bundle=readdirSync(frontend + 'dist/assets').find(f=>f.startsWith('controller-')&&f.endsWith('.js'));
await page.evaluate(async bundle=>{
 const exports=await import('/assets/'+bundle); const mount=Object.values(exports)[0];
 mount({panelUrl:'/reader.html',shadowMode:'open',listen:h=>{window.sfHandler=h;return()=>{}},emit:msg=>{const f=document.querySelector('#scrollfact-root').shadowRoot.querySelector('iframe');f.contentWindow.sfListeners?.forEach(h=>h(msg,{tab:{id:1}}))},loadSettings:async()=>({width:480}),saveSettings:()=>{}});
 window.sfHandler({type:'SF_TOGGLE_PANEL'},()=>{});
},bundle);
const panel=page.frameLocator('iframe');
await panel.getByRole('button',{name:'설정',exact:true}).click();
await panel.getByRole('button',{name:/고급 설정/}).click();
await panel.getByRole('radio',{name:'페이지 전송 점검',exact:true}).check();
if(process.env.SCROLLFACT_TEST_API_URL) { await panel.locator('#server').fill(process.env.SCROLLFACT_TEST_API_URL); await panel.getByRole('button',{name:'적용',exact:true}).click(); }
await panel.getByRole('button',{name:'닫기',exact:true}).click();
await panel.getByRole('button',{name:'이 페이지 분석하기',exact:true}).click();
await panel.getByText('서버 수신 완료 · 3개 문단',{exact:true}).waitFor({timeout:60000});
await panel.getByRole('button',{name:'다음 문단',exact:true}).click();
await panel.getByText('2 / 3 문단',{exact:true}).waitFor();
assert.equal(await page.locator('#two.scrollfact-active').count(),1);
if (process.env.SCROLLFACT_SCREENSHOT) await page.screenshot({path:process.env.SCROLLFACT_SCREENSHOT});
assert.equal(await panel.locator('blockquote').textContent(), '학생회는 통로 확보를 위해 운영 공간을 조정한다고 설명했습니다.');
const capture=await page.evaluate(()=>new Promise(resolve=>window.sfHandler({type:'SF_CAPTURE_DOCUMENT'},resolve)));
for(const privateText of ['PRIVATE_INPUT','PRIVATE_DRAFT','PRIVATE_HIDDEN','PRIVATE_SCRIPT'])assert.ok(!capture.snapshot.html.includes(privateText),privateText);
assert.ok(capture.snapshot.html.includes('학교 축제 부스 운영 방법'));
// Text mismatch must not bind to a different paragraph at the same selector.
const mismatch=await page.evaluate(id=>new Promise(resolve=>window.sfHandler({type:'SF_WATCH_SECTIONS',snapshotId:id,targets:[{id:'bad',selector:'#one',text:'different text'}]},resolve)),capture.snapshot.snapshotId);
assert.deepEqual(mismatch.unmatchedIds,['bad']);
await panel.getByRole('button',{name:'다시 분석',exact:true}).click();
await panel.getByText('서버 수신 완료 · 3개 문단',{exact:true}).waitFor();
await page.locator('#one').evaluate(el=>el.textContent='원문 내용이 변경되었습니다.');
await panel.getByText('원문이 변경되었습니다. 현재 페이지를 다시 보내 주세요.',{exact:true}).waitFor();
// Tight final paragraphs cannot all be centered at the bottom of a page.
// Explicit navigation must win over the automatic 45%-of-viewport tracker.
await page.locator('article').evaluate(el => {
  el.innerHTML = '<div style="height:1300px"></div>' + Array.from({length:13}, (_,i) =>
    `<p id="short-${i+1}" style="margin:0;height:24px;font-size:14px">짧은 문단 ${i+1}</p>`).join('');
});
const shortCapture = await page.evaluate(() => new Promise(resolve => window.sfHandler({type:'SF_CAPTURE_DOCUMENT'},resolve)));
await page.evaluate(id => new Promise(resolve => window.sfHandler({type:'SF_WATCH_SECTIONS',snapshotId:id,
  targets:Array.from({length:13},(_,i)=>({id:`short-${i+1}`,selector:`#short-${i+1}`}))},resolve)),shortCapture.snapshot.snapshotId);
for (let attempt=0;attempt<2;attempt++) {
  await page.evaluate(id => new Promise(resolve => window.sfHandler({type:'SF_SCROLL_TO_SECTION',snapshotId:id,sectionId:'short-11'},resolve)),shortCapture.snapshot.snapshotId);
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#short-11.scrollfact-active').count(),1);
  assert.equal(await page.locator('.scrollfact-active').count(),1);
}
// Framework rerenders must preserve a selected paragraph with unchanged text.
await page.locator('#short-11').evaluate(el => {
  const replacement = el.cloneNode(true);
  replacement.classList.remove('scrollfact-active');
  el.replaceWith(replacement);
});
await page.waitForFunction(() => document.querySelector('#short-11').classList.contains('scrollfact-active'));
await page.mouse.move(200,400);
await page.mouse.wheel(0,-100);
await page.waitForFunction(() => !document.querySelector('#short-11').classList.contains('scrollfact-active') && document.querySelectorAll('.scrollfact-active').length===1);
console.log('PASS: real HTTP gzip upload, 3 server passages, source navigation, scrubbed input/script text, stale text rejection, mutation invalidation. Chrome messaging bridged for test; not a loaded extension.');
} finally {await browser.close()}
