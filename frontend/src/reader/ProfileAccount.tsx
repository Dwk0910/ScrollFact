import { useState, useEffect, useRef } from 'react'
import { asProfile, profileRequest, type Profile } from './profile'
export default function ProfileAccount({ server, profile, update, disabled }: { server: string; profile: Profile | null; update: (p: Profile | null) => void; disabled: boolean }) {
  const [id, setId] = useState('')
  const task = useRef<AbortController | null>(null)
  useEffect(() => () => task.current?.abort(), [])
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function login(logout = false) {
    task.current?.abort(); const controller = new AbortController(); task.current = controller
    setPending(true); setMessage('')
    try { const result = await profileRequest(server, logout ? 'profile/logout' : 'profile/login', { id }, controller.signal); if (controller.signal.aborted) return; update(logout ? null : asProfile(result)); setId(''); setMessage(logout ? '로그아웃했어요.' : '계정 설정을 불러왔어요.') }
    catch (e) { if (!controller.signal.aborted) setMessage(e instanceof Error ? e.message : '계정에 연결하지 못했어요.') }
    finally { if (task.current === controller) setPending(false) }
  }
  return <><p className="settings-section-label">로컬 계정</p><div className="settings-group ai-form">
    {profile?.id && <p>현재 계정 · <strong>{profile.id}</strong></p>}
    <label htmlFor="profile-id">사용자 ID</label><input id="profile-id" value={id} maxLength={32} disabled={disabled || pending} placeholder="ID를 입력해 주세요" onChange={e => setId(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && id.trim() && !disabled && !pending) void login() }} />
    <button disabled={disabled || pending || !id.trim()} onClick={() => void login()}>{profile?.id ? '계정 전환' : '로그인'}</button>
    {profile?.id && <button disabled={disabled || pending} onClick={() => void login(true)}>로그아웃</button>}
  </div><p className="settings-footnote" role="status">{message || profile?.error}</p><p className="settings-footnote">ID별로 AI 연결과 읽기 설정을 저장해요. 비밀번호 없는 로컬 프로필이며, 같은 컴퓨터에서 ID를 아는 사람은 전환할 수 있어요. 현재 서버의 모든 탭에 같은 계정이 적용돼요.</p></>
}
