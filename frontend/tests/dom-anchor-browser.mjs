import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.SCROLLFACT_PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.SCROLLFACT_BROWSER_PATH,headless:true,args:['--disable-web-security']});
const dir=process.env.SCROLLFACT_QA_DIR || '/private/tmp/sf-live-qa';
await fs.mkdir(dir,{recursive:true});
await fs.writeFile(`${dir}/ParsePage.java`, `import java.nio.file.*;
class ParsePage { public static void main(String[] args)throws Exception {
 var page=new org.onamhs.scrollfact.analysis.HtmlParser().parse(Files.readString(Path.of(args[0])),args[1]);
 System.out.println(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(page));
} }`);
const urls=process.env.SCROLLFACT_ARTICLE_URLS?.split(',') || ['https://www.etnews.com/20261103000313','https://n.news.naver.com/article/215/0001273805?cds=news_media_pc'];
try {
 for (let i=0;i<urls.length;i++) {
  const page=await browser.newPage({viewport:{width:1440,height:960},bypassCSP:true});
  await page.goto(urls[i],{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(5000);
  // Isolated test browser permits importing the local controller on the publisher origin.
  await page.addStyleTag({path:new URL('../src/content/highlight.css',import.meta.url).pathname});
  const snapshot=await page.evaluate(async()=>{
   const {mountContentController}=await import('http://127.0.0.1:5173/src/content/controller.ts');
   mountContentController({panelUrl:'/reader.html',listen:h=>{window.handler=h;return()=>{}},emit:m=>{window.lastEvent=m},loadSettings:async()=>({}),saveSettings:()=>{}});
   return await new Promise(r=>window.handler({type:'SF_CAPTURE_DOCUMENT'},r));
  });
  assert.equal(snapshot.ok,true);
  const file=`${dir}/source-${i}.xml`;
  await fs.writeFile(file,snapshot.snapshot.html);
  const parsed=JSON.parse(execFileSync('java',['--class-path',process.env.SCROLLFACT_JAVA_CLASSPATH,`${dir}/ParsePage.java`,file,urls[i]],{encoding:'utf8'}));
  const passages=parsed.passages;
  await fs.writeFile(`${dir}/passages-${i}.json`,JSON.stringify(passages));
  assert.ok(passages.length>1);
  if(i===0){assert.equal(passages.length,10);assert.ok(passages.at(-1).text.includes('정우성'));}
  if(i===1)assert.equal(parsed.sourceUrls.length,0);
  const result=await page.evaluate(({id,passages})=>new Promise(r=>window.handler({type:'SF_WATCH_SECTIONS',snapshotId:id,targets:passages},r)),{id:snapshot.snapshot.snapshotId,passages});
  assert.deepEqual(result.unmatchedIds,[]);
  for (const p of passages) {
   const moved=await page.evaluate(({id,sectionId})=>new Promise(r=>window.handler({type:'SF_SCROLL_TO_SECTION',snapshotId:id,sectionId},r)),{id:snapshot.snapshot.snapshotId,sectionId:p.id});
   assert.equal(moved.ok,true);
   assert.equal(await page.locator('.scrollfact-active,.scrollfact-range-overlay').count(),1);
   await page.locator('.scrollfact-active,.scrollfact-range-overlay').waitFor({state:'visible',timeout:3000});
   const rect=await page.locator('.scrollfact-active,.scrollfact-range-overlay').boundingBox();
   assert.ok(rect && rect.width > 0 && rect.height > 0);
  }
  // A same-text rerender must restore the selected range; ordinary wheel scrolling resumes tracking.
  await page.evaluate(selector=>{
   const element=document.querySelector(selector.replace(/::sf-paragraph\(\d+\)$/,''));
   element.replaceWith(element.cloneNode(true));
  },passages.at(-1).selector);
  await page.waitForTimeout(400);
  await page.locator('.scrollfact-active,.scrollfact-range-overlay').waitFor({state:'visible'});
  assert.equal(await page.locator('.scrollfact-active,.scrollfact-range-overlay').count(),1);
  await page.mouse.move(400,400); await page.mouse.wheel(0,-500);
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.scrollfact-active,.scrollfact-range-overlay').count(),1);
  await page.evaluate(({id,sectionId})=>new Promise(r=>window.handler({type:'SF_SCROLL_TO_SECTION',snapshotId:id,sectionId},r)),{id:snapshot.snapshot.snapshotId,sectionId:passages.at(-1).id});
  await page.waitForTimeout(500);
  await page.screenshot({path:`${dir}/source-${i}-highlight.png`});
  console.log(JSON.stringify({url:urls[i],paragraphs:passages.length,sources:parsed.sourceUrls.length,unmatched:result.unmatchedIds.length,manualMoves:passages.length}));
  await page.close();
 }
} finally {await browser.close();}
