// Requires a running local backend; fetches public example documents. No AI or fake server.
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=p=>readFileSync(new URL('../src/'+p, import.meta.url),'utf8');
const html=source('integration/main.tsx').match(/const diagnosticDocument = `([\s\S]*?)`/)[1];
let jobId, posted, cleanup;
const calls=[];
const context=vm.createContext({URL,Blob,Response,FormData,CompressionStream,AbortSignal,DOMException,setTimeout,clearTimeout,
  fetch:async (url,init={})=>{
    const r=await fetch(url,init); calls.push({method:init.method??'GET',url,status:r.status});
    if(init.method==='POST'){posted=init; const b=await r.clone().json();jobId=b.analysisId;}
    if(init.method==='DELETE')cleanup=r;
    return r;
  }});
vm.runInContext(stripTypeScriptTypes(source('types/index.ts').replaceAll('export ',''))+'\n'+stripTypeScriptTypes(source('api/analyze.ts').replace(/^import[\s\S]*?from '\.\.\/types'\n/,'').replaceAll('export ','')),context);
const base=process.env.SCROLLFACT_TEST_API_URL || 'http://127.0.0.1:8080';
const snapshot={snapshotId:crypto.randomUUID(),url:'http://127.0.0.1:5173/integration.html',title:'ScrollFact 연결 점검 문서',html};
const result=await context.createDiagnosticAnalyzer(base)(snapshot,AbortSignal.timeout(60000),p=>console.log('PROGRESS',JSON.stringify(p)));
assert.equal(result.passages.length,4); assert.equal(result.sources.length,3);
assert.equal(result.htmlBytes,Buffer.byteLength(html)); assert.equal(result.overview,undefined);
assert.ok(result.sources.find(s=>s.url.includes('127.0.0.1')).failure);
console.log('RESULT',JSON.stringify({analysisId:result.analysisId,htmlBytes:result.htmlBytes,passages:result.passages.length,sources:result.sources}));
const replay=await fetch(base+'/v1/analyses',posted);assert.equal(replay.status,202);assert.equal((await replay.json()).analysisId,jobId);
const cors=await fetch(base+'/v1/analyses',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Idempotency-Key'}});
assert.equal(cors.status,200);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:5173');
const abort=new AbortController();
await assert.rejects(context.createDiagnosticAnalyzer(base)({...snapshot,snapshotId:crypto.randomUUID()},abort.signal,p=>{if(p.phase==='queued')abort.abort();}),{name:'AbortError'});
for(let i=0; !cleanup && i<40;i++) await new Promise(r=>setTimeout(r,50));
assert.equal(cleanup?.status,204);assert.equal((await fetch(base+'/v1/analyses/'+jobId)).status,404);
console.log('VERIFIED gzip upload, real polling/results, 4 passages, 3 deduplicated sources, private-address block, idempotency, CORS, cancel DELETE 204 then GET 404');
console.log('HTTP',JSON.stringify(calls));
