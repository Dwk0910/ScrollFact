import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config'

const MISSING_CLIENT_ID =
  'Google Cloud에서 받은 클라이언트 ID를 src/auth/config.ts에 넣어 주세요.'
const NOT_EXTENSION = '확장 프로그램에서만 로그인할 수 있습니다.'
const LOGIN_CANCELED = '로그인 창이 닫혀 인증이 취소되었습니다.'
const LOGIN_FAILED = 'Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'

export function isExtensionPage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
}

export function googleRedirectUrl(): string | null {
  if (!isExtensionPage() || typeof chrome.identity?.getRedirectURL !== 'function') return null
  return chrome.identity.getRedirectURL()
}

export async function requestAuthorizationCode(): Promise<string> {
  if (!isExtensionPage() || typeof chrome.identity?.launchWebAuthFlow !== 'function') {
    throw new Error(NOT_EXTENSION)
  }
  if (GOOGLE_CLIENT_ID.trim() === '') {
    throw new Error(MISSING_CLIENT_ID)
  }

  const redirectUri = chrome.identity.getRedirectURL()
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', GOOGLE_SCOPES)

  let responseUrl: string | undefined
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.href,
      interactive: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/cancel|closed|did not approve/i.test(message)) {
      throw new Error(LOGIN_CANCELED, { cause: error })
    }
    throw new Error(LOGIN_FAILED, { cause: error })
  }

  if (!responseUrl) {
    throw new Error(LOGIN_CANCELED)
  }

  const returned = new URL(responseUrl)
  if (returned.searchParams.get('error')) {
    throw new Error(LOGIN_FAILED)
  }

  const code = returned.searchParams.get('code')
  if (!code) {
    throw new Error('authorization_code를 받지 못했습니다.')
  }

  console.log(code)
  return code
}
