$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataFile = Join-Path $root "data.json"
$imageDir = Join-Path $root "images"
$allowedLogoTypes = @{
  ".gif" = "image/gif"
  ".jpeg" = "image/jpeg"
  ".jpg" = "image/jpeg"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
  ".webp" = "image/webp"
}
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:8765/")
$listener.Prefixes.Add("http://localhost:8765/")
$listener.Start()

Write-Host "BO7 overlay server running at http://localhost:8765"
Write-Host "Admin panel: http://localhost:8765/admin.html"

function Send-Bytes($context, [byte[]]$bytes, [string]$contentType, [int]$status = 200) {
  $context.Response.StatusCode = $status
  $context.Response.ContentType = $contentType
  $context.Response.Headers.Add("Cache-Control", "no-store")
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.OutputStream.Close()
}

function Get-ContentType([string]$path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    default { "application/octet-stream" }
  }
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $path = [Uri]::UnescapeDataString($request.Url.AbsolutePath)

  try {
    if ($request.HttpMethod -eq "GET" -and $path -eq "/api/data") {
      Send-Bytes $context ([System.IO.File]::ReadAllBytes($dataFile)) "application/json; charset=utf-8"
      continue
    }

    if ($request.HttpMethod -eq "POST" -and $path -eq "/api/data") {
      $reader = [System.IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
      $body = $reader.ReadToEnd()
      $null = $body | ConvertFrom-Json
      $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
      [System.IO.File]::WriteAllText($dataFile, ($body | ConvertFrom-Json | ConvertTo-Json -Depth 100), $utf8NoBom)
      Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')) "application/json; charset=utf-8"
      continue
    }

    if ($request.HttpMethod -eq "POST" -and $path -eq "/api/logo") {
      $originalName = [System.IO.Path]::GetFileName($request.Headers["X-File-Name"])
      if ([string]::IsNullOrWhiteSpace($originalName)) { $originalName = "logo.png" }
      $extension = [System.IO.Path]::GetExtension($originalName).ToLowerInvariant()
      $contentType = ($request.ContentType -split ";")[0].ToLowerInvariant()

      if (-not $allowedLogoTypes.ContainsKey($extension)) {
        Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes("Unsupported image format")) "text/plain; charset=utf-8" 400
        continue
      }
      if ($contentType -and $contentType -ne $allowedLogoTypes[$extension]) {
        Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes("Invalid image content type")) "text/plain; charset=utf-8" 400
        continue
      }
      if ($request.ContentLength64 -le 0 -or $request.ContentLength64 -gt 5242880) {
        Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes("Invalid image size")) "text/plain; charset=utf-8" 400
        continue
      }

      if (-not (Test-Path $imageDir -PathType Container)) { New-Item -ItemType Directory -Path $imageDir | Out-Null }
      $logoFile = Join-Path $imageDir ("logo" + $extension)
      $fileStream = [System.IO.File]::Create($logoFile)
      try { $request.InputStream.CopyTo($fileStream) } finally { $fileStream.Close() }

      $version = [DateTimeOffset]::Now.ToUnixTimeSeconds()
      $payload = @{ logoUrl = "images/$([System.IO.Path]::GetFileName($logoFile))?v=$version" } | ConvertTo-Json -Compress
      Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes($payload)) "application/json; charset=utf-8"
      continue
    }

    if ($request.HttpMethod -eq "DELETE" -and $path -eq "/api/logo") {
      foreach ($extension in $allowedLogoTypes.Keys) {
        $logoFile = Join-Path $imageDir ("logo" + $extension)
        if (Test-Path $logoFile -PathType Leaf) { Remove-Item $logoFile -Force }
      }
      Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')) "application/json; charset=utf-8"
      continue
    }

    if ($path -eq "/") { $path = "/index.html" }
    $relative = $path.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $file = Join-Path $root $relative
    $resolvedRoot = [System.IO.Path]::GetFullPath($root)
    $resolvedFile = [System.IO.Path]::GetFullPath($file)

    if (-not $resolvedFile.StartsWith($resolvedRoot) -or -not (Test-Path $resolvedFile -PathType Leaf)) {
      Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes("File not found")) "text/plain; charset=utf-8" 404
      continue
    }

    Send-Bytes $context ([System.IO.File]::ReadAllBytes($resolvedFile)) (Get-ContentType $resolvedFile)
  } catch {
    Send-Bytes $context ([System.Text.Encoding]::UTF8.GetBytes($_.Exception.Message)) "text/plain; charset=utf-8" 500
  }
}
