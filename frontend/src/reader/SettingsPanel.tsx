import { useEffect, useRef, useState, type ReactNode } from 'react'
import ProfileAccount from './ProfileAccount'
import type { Profile } from './profile'
import AiConnection from './AiConnection'
import { ChevronLeft, ChevronRight, X, Cpu, SlidersHorizontal, AlignLeft, Check } from 'lucide-react'

type Preferences = { server: string; follow: boolean; mode: 'reader' | 'diagnostic' }
type Props = { initialPage?: Page; profile: Profile | null; updateProfile: (p: Profile | null) => void; preferences: Preferences; change: (next: Partial<Preferences>) => void; busy: boolean; checking: boolean; connection: string; saveNotice: string; checkConnection: () => Promise<void>; close: () => void }
type Page = 'home' | 'account' | 'ai' | 'reading' | 'advanced'
const titles: Record<Page, string> = { home: '설정', account: '계정', ai: 'AI 연결', reading: '읽기 동작', advanced: '고급 설정' }
function Row({ icon, title, value, onClick }: { icon: ReactNode; title: string; value: string; onClick: () => void }) {
  return <button className="settings-nav-row" onClick={onClick}><span className="settings-row-icon">{icon}</span><span>{title}</span><span className="settings-value">{value}</span><ChevronRight size={15} aria-hidden="true" /></button>
}
export default function SettingsPanel({ initialPage = 'home', profile, updateProfile, preferences, change, busy, checking, connection, saveNotice, checkConnection, close }: Props) {
  const [page, setPage] = useState<Page>(initialPage)
  const [server, setServer] = useState(preferences.server)
  const [error, setError] = useState('')
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus() }, [page])
  function saveServer() {
    try {
      const url = new URL(server)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error()
      change({ server: url.href.replace(/\/$/, '') }); setError('')
    } catch { setError('http:// 또는 https://로 시작하는 서버 주소를 입력해 주세요.') }
  }
  return <div className="settings-page">
    <header className="settings-header">
      {page !== 'home' ? <button className="icon-button" aria-label="설정으로 돌아가기" onClick={() => setPage('home')}><ChevronLeft size={20} /></button> : <span className="settings-header-spacer" />}
      <h2 ref={title} tabIndex={-1}>{titles[page]}</h2><button className="icon-button" aria-label="닫기" onClick={close}><X size={18} /></button>
    </header>
    <div className="settings-body">
      {page === 'home' && <><p className="settings-section-label">환경 설정</p><div className="settings-group">
        <Row icon={<Cpu size={17} />} title="계정" value={profile?.id || '로그인'} onClick={() => setPage('account')} />
        <Row icon={<Cpu size={17} />} title="AI 연결" value="제공자 · 모델" onClick={() => setPage('ai')} />
        <Row icon={<AlignLeft size={17} />} title="읽기 동작" value={preferences.follow ? '자동 따라가기' : '수동 이동'} onClick={() => setPage('reading')} />
        <Row icon={<SlidersHorizontal size={17} />} title="고급 설정" value={preferences.mode === 'reader' ? 'AI 분석' : '전송 점검'} onClick={() => setPage('advanced')} />
      </div><p className="settings-footnote">로그인하면 계정별로 설정을 불러와요.</p></>}
      {page === 'account' && <ProfileAccount key={preferences.server} server={preferences.server} profile={profile} update={updateProfile} disabled={busy} />}
      {page === 'ai' && <><AiConnection key={preferences.server} profile={profile} updateProfile={updateProfile} login={() => setPage('account')} server={preferences.server} disabled={busy} saved={checkConnection} /><p className="settings-section-label">연결된 AI</p><div className="settings-group"><div className="settings-info-row"><span>지원 제공자</span><span>OpenAI · Gemini</span></div><div className="settings-info-row"><span>연결 방식</span><span>서버 API 키</span></div><button className="settings-action-row" onClick={() => void checkConnection()} disabled={checking}>{checking ? '확인 중…' : '연결 확인'}<ChevronRight size={15} /></button></div><p className="settings-footnote connection-status" role="status">{connection}</p>
        <p className="settings-footnote">연결 확인은 서버 설정 유무를 확인해요. 실제 API 인증은 분석할 때 진행돼요.</p>

      </>}
      {page === 'reading' && <><p className="settings-section-label">문단 이동</p><div className="settings-group"><label className="settings-toggle-row"><span>원문 스크롤 따라가기</span><input className="switch" type="checkbox" role="switch" checked={preferences.follow} onChange={e => change({ follow: e.target.checked })} /></label></div><p className="settings-footnote">원문을 스크롤하면 현재 읽는 문단의 분석으로 전환해요. 끄면 이전·다음 버튼으로 이동해요.</p></>}
      {page === 'advanced' && <><p className="settings-section-label">실행 모드</p><div className="settings-group settings-radio-group" role="radiogroup" aria-label="실행 모드">
        {(['reader', 'diagnostic'] as const).map(mode => <label className="settings-radio-row" key={mode}><input type="radio" name="execution-mode" value={mode} checked={preferences.mode === mode} disabled={busy} onChange={() => change({ mode })} /><span>{mode === 'reader' ? 'AI 분석' : '페이지 전송 점검'}</span>{preferences.mode === mode && <Check size={17} aria-hidden="true" />}</label>)}
      </div><p className="settings-footnote">{preferences.mode === 'reader' ? '추출한 본문과 근거 자료를 선택한 AI 제공자로 보내요.' : '페이지 전송과 문단 추출만 확인해요. AI를 호출하지 않아요.'}</p>
        <label className="settings-section-label" htmlFor="server">서버 주소</label><div className="settings-group settings-server"><input id="server" type="url" value={server} disabled={busy} spellCheck={false} onChange={e => setServer(e.target.value)} /><button disabled={busy || server === preferences.server} onClick={saveServer}>적용</button></div>{error && <p className="settings-footnote settings-error" role="alert">{error}</p>}<p className="settings-footnote">현재 페이지를 처리할 서버 주소예요. 분석 중에는 변경할 수 없어요.</p>
      </>}
      <p className="settings-save-notice" role="status">{saveNotice}</p>
    </div>
  </div>
}
