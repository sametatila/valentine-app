"""
Kontur bazlı background removal.

Mantık:
1. Siyah outline pikselleri tespit et (RGB < threshold)
2. Karenin kenarlarından flood fill yap — siyah outline'a çarpana kadar
3. Fill edilen alan = arka plan → transparent yap
4. Geri kalan (outline + iç kısım) = ayı → koru

Bu yöntem renk bazlı değil şekil bazlı çalışır,
beyaz göbek gibi açık renkli alanlar korunur.
"""

import sys
import os
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

def remove_bg_outline(input_path: str, output_path: str,
                      dark_threshold: int = 80,
                      dilate_outline: int = 1,
                      expand_bg: int = 2):
    """
    Siyah kontur bazlı arka plan kaldırma.

    1. Siyah pikselleri tespit et (outline maskesi)
    2. Outline'ı hafifçe genişlet (dilate) — boşlukları kapat
    3. Kenarlardan flood fill → outline'a çarpmayan alan = arka plan
    4. Arka plan maskesini expand_bg kadar genişlet — kontur çevresindeki beyaz halo'yu temizle
    5. Outline piksellerin kendisini de arka plana dahil etme (koru)
    6. Arka planı transparent yap
    """
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)

    # RGB kanalları
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]

    # Siyah pikseller (outline) — RGB hepsi threshold altında
    is_dark = (r.astype(int) + g.astype(int) + b.astype(int)) < (dark_threshold * 3)

    # Outline'ı dilate et — küçük boşlukları kapat (flood fill bariyeri için)
    struct = ndimage.generate_binary_structure(2, 2)  # 8-connectivity
    if dilate_outline > 0:
        barrier = ndimage.binary_dilation(is_dark, structure=struct, iterations=dilate_outline)
    else:
        barrier = is_dark

    # Fillable alan: barrier olmayan yerler
    fillable = ~barrier

    # Label connected components
    labeled, num_features = ndimage.label(fillable)

    # Hangi label'lar kenarda var?
    edge_labels = set()
    edge_labels.update(labeled[0, :].flatten())      # üst
    edge_labels.update(labeled[-1, :].flatten())      # alt
    edge_labels.update(labeled[:, 0].flatten())       # sol
    edge_labels.update(labeled[:, -1].flatten())      # sağ
    edge_labels.discard(0)  # 0 = barrier/no label

    # Arka plan maskesi: kenardaki label'lara ait pikseller
    background = np.zeros(fillable.shape, dtype=bool)
    for lbl in edge_labels:
        background |= (labeled == lbl)

    # Arka plan maskesini genişlet — kontur dışındaki beyaz halo'yu temizle
    if expand_bg > 0:
        background = ndimage.binary_dilation(background, structure=struct, iterations=expand_bg)

    # Outline'ın iç tarafını koru: is_dark pikseller arka plana dahil edilmemeli
    # Ama sadece ayının parçası olan outline'lar — yani kenar arka planına ait olmayanlar
    # Basit yaklaşım: arka plan genişletilse bile, orijinal ayı iç alanını koru
    # Ayı iç alanı = kenardaki label'lara ait OLMAYAN non-barrier pikseller + orijinal outline
    interior_labels = set(range(1, num_features + 1)) - edge_labels
    interior = np.zeros(fillable.shape, dtype=bool)
    for lbl in interior_labels:
        interior |= (labeled == lbl)

    # İç alan + orijinal siyah outline = korunacak alan (arka plan genişletmesi bunu ezemez)
    protected = interior | is_dark

    # Final arka plan: genişletilmiş arka plan - korunan alan
    background = background & ~protected

    # Alpha kanalı: arka plan = 0 (transparent), geri kalan = 255 (opaque)
    alpha = np.where(background, 0, 255).astype(np.uint8)

    # Sonucu kaydet
    data[:, :, 3] = alpha
    result = Image.fromarray(data)
    result.save(output_path)


def process_directory(input_dir: str, output_dir: str, dark_threshold: int = 80):
    """Bir dizindeki tüm PNG frame'lerini işle."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    frames = sorted(input_path.glob("frame_*.png"))
    total = len(frames)

    if total == 0:
        print(f"  [!] {input_dir} dizininde frame bulunamadı")
        return

    print(f"  {total} frame işlenecek...")

    for i, frame_file in enumerate(frames):
        out_file = output_path / frame_file.name
        remove_bg_outline(str(frame_file), str(out_file), dark_threshold=dark_threshold)

        # Progress
        if (i + 1) % 10 == 0 or (i + 1) == total:
            print(f"  [{i+1}/{total}] tamamlandı")


def main():
    project_dir = Path(__file__).parent.parent
    frames_dir = project_dir / "generated" / "frames"

    videos = ["male_idle", "female_idle", "male_walk", "female_walk", "hug", "heart"]

    # CLI arg filtresi
    if len(sys.argv) > 1:
        filter_names = sys.argv[1:]
        videos = [v for v in videos if v in filter_names]

    print("=== Kontur Bazlı Background Removal ===")
    print(f"Dark threshold: 80")
    print()

    for name in videos:
        raw_dir = frames_dir / name / "raw"
        nobg_dir = frames_dir / name / "nobg"

        if not raw_dir.exists():
            print(f"[SKIP] {raw_dir} bulunamadı")
            continue

        print(f"--- {name} ---")
        process_directory(str(raw_dir), str(nobg_dir), dark_threshold=80)
        print()

    print("=== Tamamlandı ===")


if __name__ == "__main__":
    main()
