import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.SCROLLFACT_PLAYWRIGHT_MODULE||'playwright');
const completion=JSON.parse(await fs.readFile(process.env.SCROLLFACT_RESULT,'utf8'));
const original=JSON.parse(await fs.readFile(process.env.SCROLLFACT_PASSAGES,'utf8'));
const blocks=completion.output.blocks.filter(b=>b.kind!=='auxiliary');
const result={schemaVersion:'2.0',kind:'reader',analysisId:'quality-test',snapshotId:'quality-snapshot',document:{url:'https://www.etnews.com/20261103000313',title:'전자신문 멘토링 기사'},htmlBytes:40,passages:original.filter(p=>blocks.some(b=>b.id===p.id)),blocks,perspectives:completion.output.perspectives,excludedBlocks:original.length-blocks.length,model:completion.model,inputTokens:completion.inputTokens,outputTokens:completion.outputTokens};
const browser=await chromium.launch({executablePath:process.env.SCROLLFACT_BROWSER_PATH,headless:true});
try{
 const page=await browser.newPage({viewport:{width:440,height:1000}});
 await page.addInitScript(({snapshotId,document})=>{window.chrome={runtime:{id:'qa',sendMessage:async()=>({tabId:1}),onMessage:{addListener:()=>{},removeListener:()=>{}}},tabs:{sendMessage:async(_id,m)=>m.type==='SF_CAPTURE_DOCUMENT'?{ok:true,snapshot:{snapshotId,...document,html:'<html><body><p>기사</p></body></html>'}}:{ok:true,unmatchedIds:[]}}};},result);
 await page.route('**/v1/**',route=>route.fulfill({status:route.request().method()==='POST'?202:200,json:route.request().url().includes('/reader/')?{id:null}:route.request().url().endsWith('/result')?result:{analysisId:result.analysisId,snapshotId:result.snapshotId,status:'completed',phase:'summarizing'}}));
 await page.goto('http://127.0.0.1:5173/reader.html');
 await page.getByRole('button',{name:'이 페이지 분석하기',exact:true}).click();
 await page.getByText('AI 분석 완료 · 10개 문단',{exact:true}).waitFor();
 assert.equal(await page.locator('.opinions').getAttribute('open'),null);
 assert.equal(await page.locator('.opinion-gauge').count(),0);
 assert.ok(await page.getByText('확인하지 않음',{exact:true}).count()>0);
 assert.equal(await page.getByText('확인 자료 부족',{exact:true}).count(),0);
 for(let i=0;i<5;i++)await page.getByRole('button',{name:'다음 문단',exact:true}).click();
 assert.ok((await page.locator('.explanation').innerText()).includes('챙겨드림'));
 await page.screenshot({path:'/private/tmp/sf-live-qa/reader.png',fullPage:true});
 console.log('PASS: actual AI output, 10 paragraphs, collapsed opinions, no gauge, unverified label, navigation');
}finally{await browser.close();}
