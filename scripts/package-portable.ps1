Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json
$version = [string]$package.version
$releaseRoot = Join-Path $projectRoot "release"
$stagingName = "QLayer-v$version-windows-x64-portable"
$stagingPath = Join-Path $releaseRoot $stagingName
$zipName = "$stagingName.zip"
$zipPath = Join-Path $releaseRoot $zipName
$checksumPath = Join-Path $releaseRoot "SHA256SUMS.txt"
$releaseExecutable = Join-Path $projectRoot "src-tauri\target\release\qlayer.exe"

$resolvedProjectRoot = [System.IO.Path]::GetFullPath($projectRoot)
$resolvedReleaseRoot = [System.IO.Path]::GetFullPath($releaseRoot)
if (-not $resolvedReleaseRoot.StartsWith($resolvedProjectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Release output must stay inside the project directory."
}

Push-Location $projectRoot
try {
  & corepack pnpm desktop:build
  if ($LASTEXITCODE -ne 0) {
    throw "The desktop release build failed."
  }

  if (-not (Test-Path -LiteralPath $releaseExecutable -PathType Leaf)) {
    throw "The release executable was not produced at $releaseExecutable."
  }

  New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
  if (Test-Path -LiteralPath $stagingPath) {
    Remove-Item -LiteralPath $stagingPath -Recurse -Force
  }
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }

  New-Item -ItemType Directory -Path $stagingPath | Out-Null
  Copy-Item -LiteralPath $releaseExecutable -Destination (Join-Path $stagingPath "QLayer.exe")
  Copy-Item -LiteralPath (Join-Path $projectRoot "LICENSE") -Destination $stagingPath
  Copy-Item -LiteralPath (Join-Path $projectRoot "RELEASE_NOTES.md") -Destination $stagingPath

  $portableReadme = @"
QLayer v$version - Windows x64 portable

1. Extract this ZIP to a stable folder.
2. Run QLayer.exe. No installation or administrator access is required.
3. If Windows SmartScreen appears, review the publisher warning before continuing.

Requirements:
- Windows 10 or Windows 11 x64
- Microsoft Edge WebView2 Runtime
- Codex or ChatGPT for Windows for Voice Flow and chat actions

QLayer stores preferences locally in Windows AppData. Moving the executable after enabling launch at startup can invalidate the saved startup path.
"@
  [System.IO.File]::WriteAllText(
    (Join-Path $stagingPath "PORTABLE_README.txt"),
    $portableReadme,
    [System.Text.UTF8Encoding]::new($false)
  )

  Compress-Archive -LiteralPath $stagingPath -DestinationPath $zipPath -CompressionLevel Optimal
  $hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
  $checksumLine = "$($hash.Hash.ToLowerInvariant())  $zipName`n"
  [System.IO.File]::WriteAllText($checksumPath, $checksumLine, [System.Text.UTF8Encoding]::new($false))

  Write-Output "Portable release: $zipPath"
  Write-Output "SHA-256: $($hash.Hash.ToLowerInvariant())"
} finally {
  Pop-Location
}
