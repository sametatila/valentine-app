$PROJECT = "c:\Users\LinkinqArk\Desktop\Workspace\valentine-app"
$FRAMES = "$PROJECT\generated\frames"
$PUBLIC = "$PROJECT\public\anim"

$mappings = @{
    "male_idle"   = "male\idle"
    "female_idle" = "female\idle"
    "male_walk"   = "male\walk"
    "female_walk" = "female\walk"
    "hug"         = "hug"
    "heart"       = "heart"
}

foreach ($entry in $mappings.GetEnumerator()) {
    $src = "$FRAMES\$($entry.Key)\nobg"
    $dst = "$PUBLIC\$($entry.Value)"

    if (-Not (Test-Path $src)) {
        Write-Host "[SKIP] $src bulunamadi"
        continue
    }

    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    $files = Get-ChildItem "$src\frame_*.png"
    Copy-Item $files.FullName -Destination $dst -Force
    Write-Host "[OK] $($entry.Key) -> $dst ($($files.Count) frame)"
}

Write-Host ""
Write-Host "Tamamlandi!"
