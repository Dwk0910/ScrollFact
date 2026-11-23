import { useEffect, useRef, useState } from 'react'
import { isRecord } from '../types'
import { asProfile, profileRequest, type Profile } from './profile'

type Model = { id: string; name: string }
export default function AiConnection({ server, disabled, saved, profile, updateProfile, login }: { profile: Profile | null; updateProfile: (p: Profile) => void; login: () => void; server: string; disabled: boolean; saved: () => Promise<void> }) {
  const [provider, setProvider] = useState(profile?.provider || 'gemini')
  const [key, setKey] = useState('')
  const [models, setModels] = useState<Model[]>([])
  const [model, setModel] = useState(profile?.model || '')
  const hasStored = !!profile?.hasKey && profile.provider === provider
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
      const response = await fetch(`${url.href.replace(/\/$/, '')}/v1/reader/${save ? 'configuration' : 'models'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey: key, model, profileId: profile?.id }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]) })
      const data: unknown = await response.json()
      if (!response.ok) throw new Error(isRecord(data) && typeof data.detail === 'string' ? data.detail : '연결 요청이 실패했어요.')
      if (controller.signal.aborted) return
      if (save) { setKey(''); setModels([]); setModel(''); setMessage('계정에 안전하게 저장했어요.'); updateProfile(asProfile(await profileRequest(server, 'profile'))); await saved() }
      else {
        if (!Array.isArray(data) || !data.every(m => isRecord(m) && typeof m.id === 'string' && typeof m.name === 'string')) throw new Error('모델 목록 형식을 확인하지 못했어요.')
        setModels(data as Model[]); setModel(data.some(m => m.id === profile?.model) ? profile!.model! : ''); setMessage(data.length ? '모델을 선택한 뒤 적용해 주세요.' : '이 키로 조회되는 분석 후보 모델이 없어요.')
      }
    } catch (e) { if (!controller.signal.aborted) setMessage(e instanceof Error ? e.message : '연결에 실패했어요.') }
    finally { if (task.current === controller) setPending(false) }
  }
  async function forget() {
    setPending(true)
    try { await profileRequest(server, 'profile/forget-key', { id: profile?.id }); setKey(''); setModels([]); setModel(''); updateProfile(asProfile(await profileRequest(server, 'profile'))); setMessage('저장된 키를 삭제했어요.'); await saved() }
    catch (e) { setMessage(e instanceof Error ? e.message : '삭제하지 못했어요.') }
    finally { setPending(false) }
  }
  if (!profile?.id) return <><p className="settings-footnote">계정에 로그인하면 API 키와 모델을 안전하게 저장할 수 있어요.</p><button className="settings-action-row" onClick={login}>ID로 로그인</button></>
  return <><p className="settings-section-label">AI 설정</p><div className="settings-group ai-form">
    <label htmlFor="ai-provider">제공자</label><select id="ai-provider" value={provider} disabled={disabled || pending} onChange={e => { reset(); setProvider(e.target.value); setKey('') }}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select>
    <label htmlFor="ai-key">API 키</label><input id="ai-key" type="password" autoComplete="off" spellCheck={false} value={key} disabled={disabled || pending} placeholder={hasStored ? '저장된 키 사용 · 변경할 때만 입력' : '키 값을 붙여 넣어 주세요'} onChange={e => { reset(); setKey(e.target.value) }} />
    <button disabled={disabled || pending || (!key.trim() && !hasStored)} onClick={() => void request(false)}>{pending ? '확인 중…' : '모델 목록 불러오기'}</button>
    <label htmlFor="ai-model">모델</label><select id="ai-model" value={model} disabled={disabled || pending || !models.length} onChange={e => setModel(e.target.value)}><option value="">모델을 선택해 주세요</option>{models.map(m => <option key={m.id} value={m.id}>{m.name} · {m.id}</option>)}</select>
    {profile.model && <p className="caption">현재 저장된 모델 · {profile.model}</p>}
    <button disabled={disabled || pending || !model || (!key && !hasStored)} onClick={() => void request(true)}>연결 적용</button>
  {hasStored && <button disabled={disabled || pending} onClick={() => void forget()}>저장된 키 삭제</button>}
  </div><p className="settings-footnote" role="status">{message}</p><p className="settings-footnote">목록은 제공자가 반환한 모델이에요. Gemini 연결 적용 시 짧은 JSON 생성 요청으로 호출 가능 여부를 확인해요. 소량의 API 사용량이 발생하며, 실패하면 기존 설정을 유지해요. 전체 분석 품질은 별도로 확인해야 해요. 키는 운영체제 보안 저장소로 보호해 저장해요. 같은 컴퓨터·OS 계정에서 서버를 다시 시작해도 유지돼요. 브라우저에는 키를 저장하지 않아요.</p></>
}
