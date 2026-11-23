// Run against a public article and a running diagnostic backend. Uses a real loaded extension.
const { chromium } = await import(process.env.SCROLLFACT_PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import fs from 'node:fs/promises';
const extension=fileURLToPath(new URL('../dist', import.meta.url));
const article=process.env.SCROLLFACT_ARTICLE_URL;
if(!article)throw new Error('Set SCROLLFACT_ARTICLE_URL to the public article to test');
const target=Number(process.env.SCROLLFACT_TARGET_PASSAGE || 10);
const profile=await fs.mkdtemp(join(tmpdir(),'scrollfact-native-'));
const ctx=await chromium.launchPersistentContext(profile,{executablePath:process.env.SCROLLFACT_BROWSER_PATH || undefined,headless:true,viewport:{width:1550,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--no-sandbox']});
try {
const worker=ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker',{timeout:20000});
console.log('WORKER',worker.url());
const page=await ctx.newPage();
await page.goto(article,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(4000);
await worker.evaluate(async article=>{const tabs=await chrome.tabs.query({});const t=tabs.find(t=>t.url===article);await chrome.tabs.sendMessage(t.id,{type:'SF_TOGGLE_PANEL'});},article);
await page.waitForTimeout(1500);
const frame=page.frames().find(f=>f.url().includes('reader.html'));
if(!frame)throw new Error('Panel iframe absent '+page.frames().map(f=>f.url()));
if(process.env.SCROLLFACT_UI_DIR) {
  await fs.mkdir(process.env.SCROLLFACT_UI_DIR,{recursive:true});
  await frame.locator('body').screenshot({path:join(process.env.SCROLLFACT_UI_DIR,'01-welcome.png')});
  await frame.getByRole('button',{name:'ScrollFact란?'}).click();
  await frame.locator('dialog').screenshot({path:join(process.env.SCROLLFACT_UI_DIR,'02-about.png')});
  await frame.getByRole('button',{name:'닫기',exact:true}).click();
}
await frame.getByRole('button',{name:'설정',exact:true}).click();
await frame.getByRole('button',{name:/고급 설정/}).click();
await frame.getByRole('radio',{name:'페이지 전송 점검',exact:true}).check();
if(process.env.SCROLLFACT_TEST_API_URL) { await frame.locator('#server').fill(process.env.SCROLLFACT_TEST_API_URL); await frame.getByRole('button',{name:'적용',exact:true}).click(); }
if(process.env.SCROLLFACT_UI_DIR) {
  await frame.getByRole('button',{name:'설정으로 돌아가기'}).click();
  await frame.getByRole('button',{name:/AI 연결/}).click();
  await frame.getByRole('button',{name:'연결 확인',exact:true}).click();
  await frame.getByText('API 키 또는 모델이 설정되지 않았어요',{exact:true}).waitFor();
  await frame.locator('dialog').screenshot({path:join(process.env.SCROLLFACT_UI_DIR,'03-settings.png')});
}
await frame.getByRole('button',{name:'닫기',exact:true}).click();
await frame.getByRole('button',{name:'이 페이지 분석하기',exact:true}).click();
await frame.getByText(/서버 수신 완료/).waitFor({timeout:90000});
console.log('STATUS',await frame.locator('.status').innerText());
for(let i=1;i<=target;i++) {
 if(i>1)await frame.getByRole('button',{name:'다음 문단',exact:true}).click();
 await page.waitForTimeout(1000);
 if(i>1) {
   assert.equal(await page.locator('.scrollfact-active').count(),1);
   const text=await page.locator('.scrollfact-active').textContent();
   assert.equal(text.replace(/\s+/g,' ').trim(),(await frame.locator('blockquote').innerText()).replace(/\s+/g,' ').trim());
 }

}
if(process.env.SCROLLFACT_SCREENSHOT)await page.screenshot({path:process.env.SCROLLFACT_SCREENSHOT});
await page.locator('.scrollfact-active').evaluate(el=>{const replacement=el.cloneNode(true);replacement.classList.remove('scrollfact-active');el.replaceWith(replacement);});
await page.waitForTimeout(600);
assert.equal(await page.locator('.scrollfact-active').count(),1,'same-text DOM replacement must retain highlight');
console.log('PASS: installed extension, actual upload, panel navigation and matching source text through passage '+target+', highlight restored after same-text DOM replacement');

}finally{await ctx.close();await fs.rm(profile,{recursive:true,force:true})}
