import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.SCROLLFACT_PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.SCROLLFACT_BROWSER_PATH,headless:true});
try {
 const page=await browser.newPage({viewport:{width:440,height:1000},deviceScaleFactor:2});
 const original='행사에는 학생 45팀이 참여해요.';
 const result={schemaVersion:'2.0',kind:'reader',analysisId:'markdown-job',snapshotId:'markdown-snapshot',document:{url:'https://example.org/article',title:'문단 해설 가독성 확인'},htmlBytes:100,passages:[{id:'section-1',selector:'article > p',text:original}],blocks:[{id:'section-1',kind:'body',title:'통합 멘토링',summary:'**학생 45팀**이 참여해요. 학생들은 강연을 듣고, 각 팀의 아이디어를 구체화해요.\n\n활동은 다음 순서로 이어져요.\n\n1. 문제를 살피고 해결 방향을 정해요.\n2. 멘토와 함께 개선할 점을 찾아요.\n\n다음 단계에서는 결과물을 완성해 발표해요.',checks:[{quote:original,status:'needs_verification',reason:'외부 자료와 아직 대조하지 않았어요.',evidence:[]}]}],perspectives:[],excludedBlocks:0,model:'test-model',inputTokens:10,outputTokens:10};
 let failed=true, configurations=0, lookups=0;
 const profile={id:'test-profile',hasKey:true,provider:'gemini',model:'original-model',follow:true,mode:'reader'};
 await page.addInitScript(result=>{window.chrome={runtime:{id:'qa',sendMessage:async()=>({tabId:1}),onMessage:{addListener:()=>{},removeListener:()=>{}}},tabs:{sendMessage:async(_id,m)=>m.type==='SF_CAPTURE_DOCUMENT'?{ok:true,snapshot:{snapshotId:result.snapshotId,...result.document,html:'<article><p>본문</p></article>'}}:{ok:true,unmatchedIds:[]}}};},result);
 await page.route('**/v1/**',async route=>{
  const url=route.request().url();let json;
  if(url.endsWith('/profile'))json=profile;
  else if(url.endsWith('/models')){lookups++;assert.equal(route.request().postDataJSON().apiKey,'');json=[{id:'original-model',name:'Original'},{id:'other-model',name:'Other'}];}
  else if(url.endsWith('/configuration')){configurations++;profile.model=route.request().postDataJSON().model;json=profile;}
  else if(url.endsWith('/status'))json={configured:true,provider:'Gemini',model:profile.model};
  else if(url.endsWith('/result'))json=result;
  else json={analysisId:result.analysisId,snapshotId:result.snapshotId,status:failed?'failed':'completed',phase:'summarizing',...(failed?{error:'Gemini HTTP 503 · UNAVAILABLE: 총 6회 시도했습니다.'}:{})};
  await route.fulfill({status:route.request().method()==='POST'&&!url.includes('/reader/')?202:200,json});
 });
 await page.goto('http://127.0.0.1:5173/reader.html');
 await page.getByRole('button',{name:'이 페이지 분석하기',exact:true}).click();
 await page.getByRole('button',{name:'다른 모델 선택',exact:true}).click();
 await page.getByRole('heading',{name:'AI 연결',exact:true}).waitFor();
 assert.equal(configurations,0);assert.equal(lookups,0);
 assert.equal(await page.locator('#ai-key').inputValue(),'');
 await page.getByRole('button',{name:'모델 목록 불러오기',exact:true}).click();
 await page.locator('#ai-model').selectOption('other-model');
 await page.getByRole('button',{name:'연결 적용',exact:true}).click();
 await page.getByText('계정에 안전하게 저장했어요.',{exact:true}).waitFor();
 assert.equal(configurations,1);
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 failed=false;
 await page.getByRole('button',{name:'이 페이지 분석하기',exact:true}).click();
 await page.locator('.reading-context strong').waitFor();
 assert.equal(await page.locator('.reading-context strong').innerText(),'학생 45팀');
 assert.equal(await page.locator('.reading-context ol>li').count(),2);
 assert.equal(await page.locator('.reading-context .reader-markdown>p').count(),3);
 assert.equal(await page.locator('.original').getAttribute('open'),null);
 assert.equal(await page.locator('.article-evidence').getAttribute('open'),null);
 assert.ok(await page.locator('.reading-context').evaluate(e=>!!(e.compareDocumentPosition(document.querySelector('.article-evidence'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 await fs.mkdir(process.env.SCROLLFACT_UI_DIR || '/private/tmp/sf-live-qa',{recursive:true});
 await page.screenshot({path:(process.env.SCROLLFACT_UI_DIR || '/private/tmp/sf-live-qa')+'/markdown-reader.png',fullPage:true});
 // Untrusted model output must not create executable HTML, tracking images, or javascript links.
 result.blocks[0].summary='**안전한 문장**\n\n[위험 링크](javascript:alert(1))\n\n<img src="https://example.org/tracker" onerror="alert(1)">\n<script>alert(1)</script>\n\n| 항목 | 내용 |\n| --- | --- |\n| 확인 | 필요 |';
 await page.getByRole('button',{name:'다시 분석',exact:true}).click();
 await page.locator('.reading-context table').waitFor();
 assert.equal(await page.locator('.reading-context img,.reading-context script,.reading-context a[href^="javascript:"]').count(),0);
 await page.setViewportSize({width:320,height:900});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS: final order; collapsed source; Markdown emphasis/paragraphs/lists/tables; unsafe output blocked; 503 model choice with saved key and no automatic switch. Synthetic rendering fixture, not a new AI completion.');
} finally {await browser.close();}
