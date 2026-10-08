#!/usr/bin/env bash
# Download fonts (Google Fonts) and the offline speech models (sherpa-onnx releases)
# into .cache/. Everything here is reproducible, so none of it is committed.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache/fonts .cache/models

fetch_font() {  # fetch_font <OutName> <css2 family query>
  local out=".cache/fonts/$1.ttf"
  [[ -s "$out" ]] && return
  local url
  url=$(curl -sS --max-time 30 "https://fonts.googleapis.com/css2?family=$2" | grep -o 'https://[^)]*' | head -1)
  curl -sS --max-time 300 -o "$out" "$url"
  echo "font  $out"
}
for w in 400 700 900; do fetch_font "NotoSerifSC-$w" "Noto+Serif+SC:wght@$w"; done
for w in 300 400 500 700; do fetch_font "NotoSansSC-$w" "Noto+Sans+SC:wght@$w"; done
for w in 300 400 600 800; do fetch_font "Inter-$w" "Inter:wght@$w"; done
for w in 400 700; do fetch_font "Cinzel-$w" "Cinzel:wght@$w"; fetch_font "JetBrainsMono-$w" "JetBrains+Mono:wght@$w"; done
fetch_font "MaShanZheng-400" "Ma+Shan+Zheng"
fetch_font "NotoSansDevanagari-400" "Noto+Sans+Devanagari"
fetch_font "NotoNaskhArabic-400" "Noto+Naskh+Arabic"

REL=https://github.com/k2-fsa/sherpa-onnx/releases/download
fetch_model() {  # fetch_model <dir> <release-tag>
  [[ -d ".cache/models/$1" ]] && return
  curl -sSL --max-time 1200 "$REL/$2/$1.tar.bz2" | tar xj -C .cache/models
  echo "model .cache/models/$1"
}
fetch_model kokoro-multi-lang-v1_1 tts-models
fetch_model sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17 asr-models
