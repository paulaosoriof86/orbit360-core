param([string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core")

$ErrorActionPreference = "Stop"

$App = Join-Path $Repo "orbit360-platform"
$Reports = Join-Path $Repo "_orbit360_reports"
$Backups = Join-Path $Repo "_orbit360_backups"
$Tmp = Join-Path $Repo "_orbit360_tmp"
$Target = Join-Path $App "core\auth-firebase.config.local.js"
$ExpectedBranch = "backend/v99-clean-claude-lab-20260701"

New-Item -ItemType Directory -Force -Path $Reports, $Tmp | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "RECUPERAR-CONFIG-FIREBASE-LAB-$Stamp.txt"

function Add-Report($Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function Is-ValidConfig($Path) {
  try {
    $txt = Get-Content $Path -Raw -ErrorAction Stop
    return ($txt -match "firebase" -or $txt -match "initializeApp" -or $txt -match "apiKey") -and ($txt -match "projectId" -or $txt -match "ays-orbit-360-lab")
  } catch { return $false }
}

Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - RECUPERAR CONFIG FIREBASE LAB LOCAL"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Restricciones: no deploy, no Hosting, no secretos a GitHub"
Add-Report "============================================================"
Add-Report ""

try {
  Set-Location $Repo

  Add-Report "== 1. Sincronizar rama =="
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Esperada: $ExpectedBranch" }
  git pull | ForEach-Object { Add-Report $_ }
  Add-Report "HEAD: $((git rev-parse --short HEAD).Trim())"
  Add-Report ""

  Add-Report "== 2. Verificar .gitignore =="
  $GitIgnore = Join-Path $Repo ".gitignore"
  $Ignored = $false
  if (Test-Path $GitIgnore) {
    $gi = Get-Content $GitIgnore -Raw
    $Ignored = ($gi -match "auth-firebase\.config\.local\.js")
  }
  if ($Ignored) { Add-Report "OK: auth-firebase.config.local.js está ignorado por Git." }
  else { Add-Report "ALERTA: no se detectó regla .gitignore para auth-firebase.config.local.js." }
  Add-Report ""

  Add-Report "== 3. Revisar si config ya existe =="
  if (Test-Path $Target) {
    if (Is-ValidConfig $Target) {
      Add-Report "OK: config local ya existe y parece válida: $Target"
      Add-Report "RESULTADO: CONFIG_LOCAL_OK"
    } else {
      Add-Report "ALERTA: config existe pero no parece válida. Se buscará en backups."
    }
  } else {
    Add-Report "INFO: config local no existe en destino. Se buscará en backups."
  }

  if ((Test-Path $Target) -and (Is-ValidConfig $Target)) {
    $status = git status --short -- $Target
    if ($status) { Add-Report "ALERTA: Git muestra estado para config local: $status" } else { Add-Report "OK: Git no rastrea la config local." }
    Add-Report ""
    Add-Report "FIN: ya puedes reejecutar Fase 9."
    Get-Content $Report -Raw | Set-Clipboard
    notepad $Report
    exit 0
  }

  Add-Report "== 4. Buscar config en backups/local =="
  $Roots = @($Backups, $Tmp, $Repo) | Where-Object { Test-Path $_ }
  $Candidates = @()
  foreach ($Root in $Roots) {
    $Files = Get-ChildItem -Path $Root -Recurse -Filter "auth-firebase.config.local.js" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "\\.git\\" }
    foreach ($File in $Files) {
      if (Is-ValidConfig $File.FullName) { $Candidates += $File }
    }
  }

  $Candidates = $Candidates | Sort-Object LastWriteTime -Descending

  if (-not $Candidates -or $Candidates.Count -eq 0) {
    Add-Report "BLOQUEO: no se encontró auth-firebase.config.local.js válido en backups/local."
    Add-Report "Acción necesaria: recuperar el archivo local desde una copia anterior o crearlo con la configuración web de Firebase LAB ays-orbit-360-lab. No pegar secretos en el chat ni subir a GitHub."
    Add-Report "RESULTADO: BLOQUEADO_CONFIG_NO_ENCONTRADA"
    throw "Config local no encontrada"
  }

  $Chosen = $Candidates | Select-Object -First 1
  Add-Report "Config encontrada: $($Chosen.FullName)"
  Add-Report "Última modificación: $($Chosen.LastWriteTime)"

  New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
  Copy-Item -Path $Chosen.FullName -Destination $Target -Force
  Add-Report "OK: config restaurada en $Target"

  Add-Report "== 5. Validar que Git no la rastree =="
  $GitStatus = git status --short -- "orbit360-platform/core/auth-firebase.config.local.js"
  if ($GitStatus) {
    Add-Report "ERROR: Git intenta rastrear la config local: $GitStatus"
    throw "Config local no está protegida por .gitignore"
  } else {
    Add-Report "OK: config local restaurada y no rastreada por Git."
  }

  Add-Report "RESULTADO: CONFIG_LOCAL_RESTAURADA"
  Add-Report "Siguiente paso: reejecutar Fase 9."

} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "FIN RECUPERAR CONFIG FIREBASE LAB. Reporte: $Report"
  Get-Content $Report -Raw | Set-Clipboard
  notepad $Report
}