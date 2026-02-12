#!/bin/bash
# Video → Frames → RemoveBG → Video pipeline
# Kullanım: bash process-videos.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WAN_DIR="$SCRIPT_DIR/../generated/wan"
FRAMES_DIR="$SCRIPT_DIR/../generated/frames"
OUTPUT_DIR="$SCRIPT_DIR/../generated/processed"

VIDEOS=("male_idle" "female_idle" "male_walk" "female_walk" "hug" "heart")

echo "=== Video Processing Pipeline ==="
echo ""

for name in "${VIDEOS[@]}"; do
  INPUT="$WAN_DIR/${name}.mp4"
  FRAME_RAW="$FRAMES_DIR/${name}/raw"
  FRAME_NOBG="$FRAMES_DIR/${name}/nobg"
  OUTPUT_VIDEO="$OUTPUT_DIR/${name}.mp4"

  if [ ! -f "$INPUT" ]; then
    echo "[SKIP] $INPUT not found"
    continue
  fi

  echo "--- Processing: $name ---"

  # Step 1: Extract frames
  mkdir -p "$FRAME_RAW" "$FRAME_NOBG"
  echo "  [1/3] Extracting frames..."
  ffmpeg -y -i "$INPUT" -vf "fps=16" -start_number 0 "$FRAME_RAW/frame_%03d.png" -loglevel error
  FRAME_COUNT=$(ls "$FRAME_RAW"/frame_*.png 2>/dev/null | wc -l)
  echo "        $FRAME_COUNT frames extracted"

  # Step 2: Remove background with rembg
  echo "  [2/3] Removing backgrounds (rembg)..."
  rembg p "$FRAME_RAW" "$FRAME_NOBG"
  echo "        Done"

  # Step 3: Reassemble video (transparent — using mov+png codec for alpha)
  mkdir -p "$OUTPUT_DIR"
  echo "  [3/3] Reassembling video..."
  ffmpeg -y -framerate 16 -start_number 0 -i "$FRAME_NOBG/frame_%03d.png" \
    -c:v png -pix_fmt rgba \
    "$OUTPUT_VIDEO" -loglevel error
  echo "        Saved: $OUTPUT_VIDEO"

  echo ""
done

echo "=== Pipeline Complete ==="
echo "Processed videos in: $OUTPUT_DIR"
echo "Transparent frames in: $FRAMES_DIR/*/nobg/"
