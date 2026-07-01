param([string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core")
$ErrorActionPreference = "Stop"
$App = Join-Path $Repo "orbit360-platform"
$Server = Join-Path $Repo "tools\orbit360-static-server.cjs"
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match "orbit360-static-server.cjs.*5177" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
try { Get-NetTCPConnection -LocalPort 5177 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}
Start-Process -FilePath "node" -ArgumentList @($Server, $App, "5177", "index-dev-firestore.html") -WindowStyle Hidden | Out-Null
Start-Sleep -Seconds 2
$Url = "http://127.0.0.1:5177/index-dev-firestore.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones"
Start-Process $Url
Write-Host "Backend LAB abierto:"
Write-Host $Url
Write-Host "Si aparece login, es correcto: esta entrada exige Firebase Auth real."
