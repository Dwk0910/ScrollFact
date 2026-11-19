import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

const root = readFileSync(new URL('../src/feed/main.tsx', import.meta.url), 'utf8')
const context = vm.createContext({ window: {} })
vm.runInContext(root.slice(root.indexOf('window.SCROLLFACT_FEED_DEMO ='), root.indexOf('\ncreateRoot(')), context)
vm.runInContext(stripTypeScriptTypes(readFileSync(new URL('../src/feed/context.ts', import.meta.url), 'utf8').replaceAll('export ', '')), context)
const data = context.window.SCROLLFACT_FEED_DEMO
const match = (post, draft, caption = post.captions.join('\n')) => context.matchExample({postId:post.id, caption, draft}, data.responses)

test('a mobile question is attached only to its owning post', () => {
  assert.equal(match(data.posts[0], '모바일로 되나요?')?.id, 'mobile')
  assert.equal(match(data.posts[1], '모바일로 되나요?'), null)
  assert.equal(match(data.posts[2], '모바일로 되나요?'), null)
  assert.equal(match(data.posts[1], '신청해야 하나요?')?.id, 'signup')
})
test('missing or changed evidence prevents the prepared answer from appearing', () => {
  assert.equal(match(data.posts[0], '모바일로 되나요?', 'Minecraft 서버입니다.'), null)
  assert.equal(match(data.posts[1], '신청해야 하나요?', '사전 신청 후에만 참여할 수 있습니다.'), null)
})
test('ordinary comments and empty drafts do not trigger a correction', () => {
  assert.equal(match(data.posts[0], ''), null)
  assert.equal(match(data.posts[0], '모바일 게임 좋아해요'), null)
  assert.equal(match(data.posts[2], '사진 너무 좋네요!'), null)
})

test('publish review preserves normal questions, disagreement and quoted criticism', () => {
  for (const example of data.reviewExamples) {
    const findings = context.reviewComment(example.draft, data.reviewRules)
    assert.equal(findings.length > 0, example.shouldReview, example.label)
    for (const finding of findings) {
      assert.equal(example.draft.slice(finding.start, finding.end), finding.evidence)
    }
  }
})
test('review highlights multiple direct attacks without changing the draft', () => {
  const draft = '  너는 눈이 없냐?\n 모르면 닥쳐. 설명을 읽어봐.'
  const findings = context.reviewComment(draft, data.reviewRules)
  assert.equal(findings.length, 2)
  assert.equal(findings[0].evidence, '너는 눈이 없냐?')
  assert.equal(findings[1].evidence, '모르면 닥쳐.')
  for (const finding of findings) assert.equal(draft.slice(finding.start, finding.end), finding.evidence)
  assert.equal(context.reviewComment('', data.reviewRules).length, 0)
})

// Both entry points must stay attached to the original post and visible quote.
test('a scroll trail requires both the owning post and its current evidence', () => {
  const post = data.posts.find(post => post.id === data.focusPostId)
  const captured = { postId: post.id, caption: post.captions.join('\n'), draft: '' }
  assert.equal(context.findTrail(captured, data.trails)?.id, data.trails[0].id)
  assert.equal(context.findTrail({ ...captured, postId: 'unrelated' }, data.trails), null)
  assert.equal(context.findTrail({ ...captured, caption: 'Minecraft 서버입니다.' }, data.trails), null)
})
