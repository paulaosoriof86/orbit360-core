param([string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core")
$ErrorActionPreference = "Stop"
$App = Join-Path $Repo "orbit360-platform"
$Server = Join-Path $Repo "tools\orbit360-static-server.cjs"
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match "orbit360-static-server.cjs.*5178" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
try { Get-NetTCPConnection -LocalPort 5178 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}
Start-Process -FilePath "node" -ArgumentList @($Server, $App, "5178", "index.html") -WindowStyle Hidden | Out-Null
Start-Sleep -Seconds 2
$Url = "http://127.0.0.1:5178/index.html?preview=visualClienteSinBackendLab"
Start-Process $Url
Write-Host "Preview visual abierto:"
Write-Host $Url
