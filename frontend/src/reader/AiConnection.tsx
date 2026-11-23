import { useEffect, useRef, useState } from 'react'
import { isRecord } from '../types'

type Model = { id: string; name: string }
export default function AiConnection({ server, disabled, saved }: { server: string; disabled: boolean; saved: () => Promise<void> }) {
  const [provider, setProvider] = useState('gemini')
  const [key, setKey] = useState('')
  const [models, setModels] = useState<Model[]>([])
  const [model, setModel] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const task = useRef<AbortController | null>(null)
  useEffect(() => () => task.current?.abort(), [])
  function reset() { task.current?.abort(); setModels([]); setModel(''); setMessage(''); setPending(false) }
  async function request(save: boolean) {
    task.current?.abort(); const controller = new AbortController(); task.current = controller
    setPending(true); setMessage('')
    try {
      const url = new URL(server)
      if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) throw new Error('API 키 설정은 로컬 서버 주소에서만 사용할 수 있어요.')
      const response = await fetch(`${url.href.replace(/\/$/, '')}/v1/reader/${save ? 'configuration' : 'models'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey: key, model }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]) })
      const data: unknown = await response.json()
      if (!response.ok) throw new Error(isRecord(data) && typeof data.detail === 'string' ? data.detail : '연결 요청이 실패했어요.')
      if (controller.signal.aborted) return
      if (save) { setKey(''); setModels([]); setModel(''); setMessage('서버에 적용했어요. 바로 분석할 수 있어요.'); await saved() }
      else {
        if (!Array.isArray(data) || !data.every(m => isRecord(m) && typeof m.id === 'string' && typeof m.name === 'string')) throw new Error('모델 목록 형식을 확인하지 못했어요.')
        setModels(data as Model[]); setModel(''); setMessage(data.length ? '모델을 선택한 뒤 적용해 주세요.' : '이 키로 조회되는 분석 후보 모델이 없어요.')
      }
    } catch (e) { if (!controller.signal.aborted) setMessage(e instanceof Error ? e.message : '연결에 실패했어요.') }
    finally { if (task.current === controller) setPending(false) }
  }
  return <><p className="settings-section-label">AI 설정</p><div className="settings-group ai-form">
    <label htmlFor="ai-provider">제공자</label><select id="ai-provider" value={provider} disabled={disabled || pending} onChange={e => { reset(); setProvider(e.target.value); setKey('') }}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select>
    <label htmlFor="ai-key">API 키</label><input id="ai-key" type="password" autoComplete="off" spellCheck={false} value={key} disabled={disabled || pending} placeholder="키 값을 붙여 넣어 주세요" onChange={e => { reset(); setKey(e.target.value) }} />
    <button disabled={disabled || pending || !key.trim()} onClick={() => void request(false)}>{pending ? '확인 중…' : '모델 목록 불러오기'}</button>
    <label htmlFor="ai-model">모델</label><select id="ai-model" value={model} disabled={disabled || pending || !models.length} onChange={e => setModel(e.target.value)}><option value="">모델을 선택해 주세요</option>{models.map(m => <option key={m.id} value={m.id}>{m.name} · {m.id}</option>)}</select>
    <button disabled={disabled || pending || !model || !key} onClick={() => void request(true)}>연결 적용</button>
  </div><p className="settings-footnote" role="status">{message}</p><p className="settings-footnote">목록은 제공자가 반환한 모델이에요. 구조화 분석 지원과 사용 한도는 실제 분석 시 확인돼요. 키는 브라우저·파일에 저장하지 않고 서버 메모리에만 유지해요. 서버 재시작 후에는 다시 설정해 주세요.</p></>
}
