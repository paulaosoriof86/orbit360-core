param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$ExcelDir = Join-Path $Repo "_orbit360_imports\ays_real\_excel"
$OutDir = Join-Path $Repo "_orbit360_imports\ays_real\_convertidos"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "CONVERTIR-EXCEL-IMPORTACION-AYS-V104-$Stamp.txt"
$Venv = Join-Path $Repo "_orbit360_tmp\venv-importacion-ays-v104"
$PyScript = Join-Path $Repo "tools\orbit360-convertir-excel-importacion-ays-v104.py"
$JsonReport = Join-Path $Reports "CONVERTIR-EXCEL-IMPORTACION-AYS-V104.json"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function Find-Python {
  $candidates = @("py", "python", "python3")
  foreach ($c in $candidates) {
    try {
      $v = & $c --version 2>$null
      if ($LASTEXITCODE -eq 0 -and $v) { return $c }
    } catch {}
  }
  return $null
}

New-Item -ItemType Directory -Force -Path $Reports, $ExcelDir, $OutDir | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - CONVERTIR EXCEL IMPORTACION A&S v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "ExcelDir: $ExcelDir"
Add-Report "OutDir: $OutDir"
Add-Report "Restricciones: NO deploy, NO produccion, NO Firestore write, NO secretos, NO datos reales en repo, NO commit, NO push"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Cambia a $ExpectedBranch antes de convertir Excel." }
  if (-not (Test-Path $PyScript)) { throw "Falta script Python: $PyScript" }

  $Python = Find-Python
  if (-not $Python) { throw "No se encontro Python local. Instala Python o ejecuta desde un entorno que lo tenga." }
  Add-Report "Python detectado: $Python"

  if (-not (Test-Path $Venv)) {
    Add-Report "Creando entorno virtual local ignorado: $Venv"
    & $Python -m venv $Venv | ForEach-Object { Add-Report $_ }
  }

  $VenvPython = Join-Path $Venv "Scripts\python.exe"
  if (-not (Test-Path $VenvPython)) { throw "No se encontro python del venv: $VenvPython" }

  Add-Report "Instalando/verificando openpyxl en venv local..."
  & $VenvPython -m pip install --quiet --upgrade pip openpyxl | ForEach-Object { Add-Report $_ }

  Add-Report "Ejecutando conversion Excel -> CSV..."
  & $VenvPython $PyScript --input $ExcelDir --output $OutDir --report $JsonReport | ForEach-Object { Add-Report $_ }
  $Code = $LASTEXITCODE
  Add-Report "ExitCode conversion: $Code"
  if ($Code -ne 0) { throw "Conversion Excel fallo." }

  Add-Report ""
  Add-Report "RESULTADO: EXCEL_CONVERTIDO_A_CSV"
  Add-Report "Coloca archivos .xlsx/.xlsm en $ExcelDir y vuelve a ejecutar si no habia archivos."
  Add-Report "Luego revisa CSV generados en $OutDir y muevelos/renombralos a la coleccion correspondiente si aplica."
} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO produccion, NO Firestore write, NO secretos, NO datos reales en repo, NO commit, NO push."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
