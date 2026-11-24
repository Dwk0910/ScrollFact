$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not $env:OPENAI_API_KEY) {
    $secret = Read-Host 'OpenAI API 키' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try { $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
if (-not $env:SCROLLFACT_OPENAI_MODEL) {
    $env:SCROLLFACT_OPENAI_MODEL = Read-Host '사용할 OpenAI 모델 ID'
}
if (-not $env:OPENAI_API_KEY -or -not $env:SCROLLFACT_OPENAI_MODEL) { throw 'API 키와 모델 ID가 모두 필요합니다.' }
$env:SCROLLFACT_AI_PROVIDER = 'openai'
& .\gradlew.bat :backend:bootRun
