# Female walk nobg frames - rembg ile alpha matting kullanarak tekrar işle
# Sorun: ayının göbek kısmı beyaza yakın olduğu için rembg siliyor

$PROJECT = "c:\Users\LinkinqArk\Desktop\Workspace\valentine-app"
$RAW = "$PROJECT\generated\frames\female_walk\raw"
$NOBG = "$PROJECT\generated\frames\female_walk\nobg"

# Mevcut nobg dosyalarını temizle
Write-Host "Mevcut nobg dosyalari temizleniyor..."
Remove-Item "$NOBG\*" -Force -ErrorAction SilentlyContinue

# rembg ile alpha matting kullanarak tekrar işle
# -m u2net: varsayılan model
# -a: alpha matting etkinleştir (daha hassas kenar tespiti)
# -ae/af/ab: alpha matting parametreleri
Write-Host "rembg ile alpha matting kullanarak tekrar isleniyor..."
Write-Host "Input: $RAW"
Write-Host "Output: $NOBG"

# Alpha matting ile rembg çalıştır
rembg p -m u2net -a -ae 10 -af 240 -ab 10 "$RAW" "$NOBG"

$count = (Get-ChildItem "$NOBG\*.png" -ErrorAction SilentlyContinue).Count
Write-Host "Islenen frame sayisi: $count"
Write-Host "Tamamlandi!"
