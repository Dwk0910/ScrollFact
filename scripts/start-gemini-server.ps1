$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not $env:GEMINI_API_KEY) {
    $secret = Read-Host 'Gemini API 키' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try { $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
if (-not $env:SCROLLFACT_GEMINI_MODEL) {
    $env:SCROLLFACT_GEMINI_MODEL = Read-Host '사용할 Gemini 모델 ID'
}
if (-not $env:GEMINI_API_KEY -or -not $env:SCROLLFACT_GEMINI_MODEL) { throw 'API 키와 모델 ID가 모두 필요합니다.' }
$env:SCROLLFACT_AI_PROVIDER = 'gemini'
& .\gradlew.bat :backend:bootRun
