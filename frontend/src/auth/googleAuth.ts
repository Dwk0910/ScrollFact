import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config'

const MISSING_CLIENT_ID = 'VITE_GOOGLE_CLIENT_ID를 .env에 설정한 뒤 다시 빌드해 주세요.'
const NOT_EXTENSION = '확장 프로그램에서만 로그인할 수 있습니다.'
const LOGIN_CANCELED = '로그인 창이 닫혀 인증이 취소되었습니다.'
const LOGIN_FAILED = 'Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

async function codeChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

export function isExtensionPage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
}

export function googleRedirectUrl(): string | null {
  if (!isExtensionPage() || typeof chrome.identity?.getRedirectURL !== 'function') return null
  return chrome.identity.getRedirectURL()
}

export async function requestAuthorizationCode(): Promise<{ code: string; codeVerifier: string }> {
  if (!isExtensionPage() || typeof chrome.identity?.launchWebAuthFlow !== 'function') {
    throw new Error(NOT_EXTENSION)
  }
  if (GOOGLE_CLIENT_ID.trim() === '') {
    throw new Error(MISSING_CLIENT_ID)
  }

  const state = randomBase64Url(32)
  const codeVerifier = randomBase64Url(32)
  const redirectUri = chrome.identity.getRedirectURL()
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', GOOGLE_SCOPES)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', await codeChallengeS256(codeVerifier))
  authUrl.searchParams.set('code_challenge_method', 'S256')

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
  if (returned.searchParams.get('error') === 'access_denied') {
    throw new Error(LOGIN_CANCELED)
  }
  if (returned.searchParams.get('state') !== state) {
    throw new Error(LOGIN_FAILED)
  }
  if (returned.searchParams.get('error')) {
    throw new Error(LOGIN_FAILED)
  }

  const code = returned.searchParams.get('code')
  if (!code) {
    throw new Error('authorization_code를 받지 못했습니다.')
  }

  return { code, codeVerifier }
}
