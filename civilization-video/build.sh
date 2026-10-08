#!/usr/bin/env bash
# Full pipeline: assets -> narration -> soundtrack -> frames -> MP4.
set -euo pipefail
cd "$(dirname "$0")"

npm install --no-audit --no-fund
pip install edge-tts sherpa-onnx soundfile numpy scipy
bash tools/fetch_assets.sh

M=.cache/models
# Microsoft neural voice via edge-tts (needs access to speech.platform.bing.com).
# Offline fallback: --engine kokoro --model "$M/kokoro-multi-lang-v1_1"
python3 tools/tts.py --voice "${VOICE:-zh-CN-YunjianNeural}" --asr "$M/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17"
python3 tools/music.py
node render/render.mjs --workers "${WORKERS:-4}"
bash tools/encode.sh
