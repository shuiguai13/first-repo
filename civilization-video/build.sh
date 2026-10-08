#!/usr/bin/env bash
# Full pipeline: assets -> narration -> soundtrack -> frames -> MP4.
set -euo pipefail
cd "$(dirname "$0")"

npm install --no-audit --no-fund
pip install sherpa-onnx soundfile numpy scipy
bash tools/fetch_assets.sh

M=.cache/models
python3 tools/tts.py --model "$M/kokoro-multi-lang-v1_1" --asr "$M/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17"
python3 tools/music.py
node render/render.mjs --workers "${WORKERS:-4}"
bash tools/encode.sh
