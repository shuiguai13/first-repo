#!/usr/bin/env bash
# Encode frames/ + build/mix.wav into the final MP4: two-pass H.264 (sized to stay
# under GitHub's 100 MB file limit) + AAC with loudness normalised to -16 LUFS.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-output/civilization_from_fire_to_stars.mp4}
VBITRATE=${VBITRATE:-1100k}
FPS=$(python3 -c "import json; print(json.load(open('build/timeline.json'))['fps'])")
PASSLOG=build/x264pass

# Measure integrated loudness and compute the gain that brings it to -16 LUFS.
GAIN=$(ffmpeg -hide_banner -nostats -i build/mix.wav -af loudnorm=print_format=json -f null - 2>&1 |
  python3 -c "import sys, json, re; d = json.loads(re.search(r'\{[^{}]*\}', sys.stdin.read()).group(0)); print(round(-16 - float(d['input_i']), 2))")
echo "audio gain: ${GAIN} dB"

VIDEO=(-c:v libx264 -preset slow -b:v "$VBITRATE" -maxrate 4M -bufsize 8M -pix_fmt yuv420p -g 60 -x264-params aq-mode=3)
ffmpeg -y -hide_banner -loglevel warning -stats -framerate "$FPS" -i frames/%06d.jpg \
  "${VIDEO[@]}" -pass 1 -passlogfile "$PASSLOG" -an -f mp4 /dev/null
ffmpeg -y -hide_banner -loglevel warning -stats \
  -framerate "$FPS" -i frames/%06d.jpg -i build/mix.wav \
  -filter_complex "[1:a]volume=${GAIN}dB,alimiter=limit=0.89:level=false[a]" \
  -map 0:v -map "[a]" \
  "${VIDEO[@]}" -pass 2 -passlogfile "$PASSLOG" \
  -c:a aac -b:a 128k -ar 48000 -movflags +faststart -shortest \
  -metadata title="从火种到星辰：人类文明进步史与未来三十年" \
  "$OUT"
ls -lh "$OUT"
