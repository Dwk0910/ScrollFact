#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  read -r -s -p 'OpenAI API 키 (화면에 표시하지 않음): ' OPENAI_API_KEY
  printf '\n'
fi
if [[ -z "${SCROLLFACT_OPENAI_MODEL:-}" ]]; then
  read -r -p '사용할 OpenAI 모델 ID: ' SCROLLFACT_OPENAI_MODEL
fi
if [[ -z "$OPENAI_API_KEY" || -z "$SCROLLFACT_OPENAI_MODEL" ]]; then
  printf 'API 키와 모델 ID가 모두 필요합니다.\n' >&2
  exit 1
fi
export OPENAI_API_KEY SCROLLFACT_OPENAI_MODEL
# No keys are written to disk. Gradle inherits this process environment.
export SCROLLFACT_AI_PROVIDER=openai
exec ./gradlew :backend:bootRun
