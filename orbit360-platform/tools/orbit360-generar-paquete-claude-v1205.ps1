param(
  [string]$OutputDirectory = ''
)

$ErrorActionPreference = 'Stop'
try {
  $utf8 = [Text.UTF8Encoding]::new($false)
  [Console]::InputEncoding = $utf8
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
  chcp 65001 | Out-Null
} catch {}

$Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$RequiredBranch = 'ays/backend-tenant-lab-v99-20260703'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
if (-not $OutputDirectory) {
  $OutputDirectory = Join-Path $HOME 'Downloads'
}
$PackageName = "ORBIT360_CLAUDE_RECONCILIADO_V1205_$Stamp"
$Work = Join-Path $env:TEMP $PackageName
$ZipPath = Join-Path $OutputDirectory ($PackageName + '.zip')
$CodeRoot = Join-Path $Work 'CODIGO_RAMA_VIVA_REFERENCIA_SOLO_LECTURA'
$DocsRoot = Join-Path $Work 'DOCUMENTACION_RAMA_VIVA'
$TestsRoot = Join-Path $Work 'PRUEBAS_Y_VALIDADORES_REFERENCIA'
$EvidenceRoot = Join-Path $Work 'EVIDENCIA_Y_REFERENCIAS_V1204'

function Write-Step([string]$Text) { Write-Host ("`n=== " + $Text + " ===") -ForegroundColor Cyan }
function Fail([string]$Message) {
  Write-Host ''
  Write-Host ('BLOQUEADO: ' + $Message) -ForegroundColor Red
  try { ('BLOQUEADO: ' + $Message) | Set-Clipboard } catch {}
  exit 1
}
function Copy-Required([string]$RelativePath, [string]$DestinationRoot) {
  $Source = Join-Path $Repo $RelativePath
  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { Fail "Falta archivo requerido: $RelativePath" }
  $Destination = Join-Path $DestinationRoot $RelativePath
  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}
function Copy-Optional([string]$Source, [string]$Destination) {
  if (Test-Path -LiteralPath $Source -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
    return $true
  }
  return $false
}

Write-Step 'Preflight'
if (-not (Test-Path (Join-Path $Repo '.git'))) { Fail "No se encontró repositorio Git en $Repo" }
Set-Location $Repo
$Branch = (& git branch --show-current 2>$null).Trim()
$Head = (& git rev-parse HEAD 2>$null).Trim()
if ($Branch -ne $RequiredBranch) { Fail "Rama incorrecta. Actual: $Branch. Requerida: $RequiredBranch" }
Write-Host "Repo: $Repo"
Write-Host "Rama: $Branch"
Write-Host "HEAD: $Head"
Write-Host 'No se hará commit, push, merge, deploy ni escritura de datos.'

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Work,$CodeRoot,$DocsRoot,$TestsRoot,$EvidenceRoot | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

Write-Step 'Copiar instrucciones reconciliadas'
$instructionFiles = @(
  'orbit360-platform\docs\PAQUETE-CLAUDE-RECONCILIADO-CODIGO-REAL-V1205-20260711.md',
  'orbit360-platform\docs\MANIFIESTO-ARCHIVOS-FISICOS-CLAUDE-V1205-20260711.md',
  'orbit360-platform\docs\PROMPT-CLAUDE-RECONCILIADO-V1205-20260711.txt'
)
foreach ($file in $instructionFiles) {
  $src = Join-Path $Repo $file
  if (-not (Test-Path $src)) { Fail "Falta instrucción: $file" }
  Copy-Item $src (Join-Path $Work (Split-Path $file -Leaf)) -Force
}
Copy-Item (Join-Path $Repo $instructionFiles[0]) (Join-Path $Work '00_LEER_PRIMERO.md') -Force

Write-Step 'Copiar código real v1.198-v1.203'
$codeFiles = @(
  'orbit360-platform\core\access-scope.js',
  'orbit360-platform\core\access-ceilings-v1199.js',
  'orbit360-platform\core\policy-receipts-engine.js',
  'orbit360-platform\core\policy-receipts-v1199-refinements.js',
  'orbit360-platform\core\issuance-workflow-v1201.js',
  'orbit360-platform\core\issuance-workflow-v1201-refinements.js',
  'orbit360-platform\core\endorsement-workflow-v1201.js',
  'orbit360-platform\core\importa-dryrun-p0.js',
  'orbit360-platform\core\insurer-directory-import-v1202.js',
  'orbit360-platform\core\insurer-directory-import-v1202-security.js',
  'orbit360-platform\core\secure-resource-fields-v1202.js',
  'orbit360-platform\core\backend-resource-contracts.js',
  'orbit360-platform\core\document-viewer.js',
  'orbit360-platform\core\credential-vault.js',
  'orbit360-platform\core\quote-comparison-contracts-v1203.js',
  'orbit360-platform\core\quote-comparison-contracts-v1203-refinements.js',
  'orbit360-platform\modules\crm-v1198-operational-bridge.js',
  'orbit360-platform\modules\portal-v1198-scope-viewer-bridge.js',
  'orbit360-platform\modules\policy-receipts-v1199-bridge.js',
  'orbit360-platform\modules\policy-receipts-v1199-detail-guard.js',
  'orbit360-platform\modules\renewals-v1200-operational-bridge.js',
  'orbit360-platform\modules\renewals-v1200-permission-guard.js',
  'orbit360-platform\modules\issuance-endosos-v1201-bridge.js',
  'orbit360-platform\modules\issuance-endosos-v1201-refinements.js',
  'orbit360-platform\modules\ops-workflows-v1201-bridge.js',
  'orbit360-platform\modules\renewals-v1201-issued-filter.js',
  'orbit360-platform\modules\aseguradoras-v1197-ux-bridge.js',
  'orbit360-platform\modules\aseguradoras-v1202-import-bridge.js',
  'orbit360-platform\modules\aseguradoras-v1202-resources-bridge.js',
  'orbit360-platform\modules\cotizador-v1203-source-gate.js',
  'orbit360-platform\modules\comparativo-v1203-operational-bridge.js',
  'orbit360-platform\data\academia-v1197-bridge.js',
  'orbit360-platform\data\academia-v1199-policy-receipts.js',
  'orbit360-platform\data\academia-v1200-renewals.js',
  'orbit360-platform\data\academia-v1201-emision-endosos.js',
  'orbit360-platform\data\academia-v1202-directorios-aseguradoras.js',
  'orbit360-platform\data\academia-v1203-cotizador-comparativo.js',
  'orbit360-platform\index.html',
  'orbit360-platform\modules\aseguradoras.js',
  'orbit360-platform\modules\cotizador.js',
  'orbit360-platform\modules\comparativo.js',
  'orbit360-platform\modules\cliente360.js',
  'orbit360-platform\modules\polizas.js',
  'orbit360-platform\modules\academia.js',
  'orbit360-platform\styles\base.css',
  'orbit360-platform\styles\infra.css',
  'orbit360-platform\styles\v1197-empalme.css'
)
foreach ($file in $codeFiles) { Copy-Required $file $CodeRoot }

Write-Step 'Copiar documentación acumulada'
$docNames = @(
  'INSTRUCCIONES-MAESTRAS-CONTINUIDAD-ORBIT360-AYS-20260704.md',
  'ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md',
  'ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md',
  'ADDENDUM-MAESTRO-CONTINUIDAD-CLIENTES-MULTIROL-IMPORTADORES-20260709.md',
  'ACTUALIZACION-DELTA-CLAUDE-CRM-V1198-20260711.md',
  'ACTUALIZACION-DELTA-CLAUDE-POLIZA-RECIBOS-V1199-20260711.md',
  'ACTUALIZACION-DELTA-CLAUDE-RENOVACIONES-V1200-20260711.md',
  'ACTUALIZACION-DELTA-CLAUDE-CRM-V1201-20260711.md',
  'ACTUALIZACION-DELTA-CLAUDE-ASEGURADORAS-V1202-20260711.md',
  'ACTUALIZACION-DELTA-CLAUDE-COTIZADOR-COMPARATIVO-V1203-20260711.md',
  'AUDITORIA-CIERRE-CRM-TRANSVERSAL-V1198-20260711.md',
  'AUDITORIA-CIERRE-POLIZA-RECIBOS-COBROS-V1199-20260711.md',
  'AUDITORIA-Y-CORRECCION-RENOVACIONES-V1200-20260711.md',
  'AUDITORIA-CIERRE-RENOVACION-EMISION-ENDOSOS-V1201-20260711.md',
  'AUDITORIA-OPERATIVA-DIRECTORIOS-ASEGURADORAS-GT-CO-V1202-20260711.md',
  'AUDITORIA-OPERATIVA-COTIZADOR-COMPARATIVO-V1203-20260711.md',
  'AUDITORIA-VISUAL-REAPERTURA-ASEGURADORAS-COTIZADOR-COMPARATIVO-V1203-20260711.md',
  'CONTROL-CONTINUIDAD-OPERATIVA-HASTA-V1203-20260711.md',
  'DECISION-FRONTERA-V110-ASEGURADORAS-ORBIT-COTIZADOR-COMPARATIVO-20260709.md',
  'MAPA-INTEGRACION-ASEGURADORAS-ORBIT-COTIZADOR-COMPARATIVO-V110-20260709.md',
  'MATRIZ-EMPALME-COTIZADOR-COMPARATIVO-ORBIT-V110-20260710.md',
  'AUDITORIA-FORENSE-PROFUNDA-COTIZADOR-COMPARATIVO-V110-CONTRATO-AYS-20260709.md'
)
foreach ($name in $docNames) {
  Copy-Required (Join-Path 'orbit360-platform\docs' $name) $DocsRoot
}

Write-Step 'Copiar pruebas de referencia'
$testNames = @(
  'orbit360-test-access-scope-v1198.mjs',
  'orbit360-validar-cierre-crm-v1198.mjs',
  'orbit360-test-policy-receipts-v1199b.mjs',
  'orbit360-validar-policy-receipts-v1199b.mjs',
  'orbit360-validar-renovaciones-v1200b.mjs',
  'orbit360-test-issuance-endosos-v1201.mjs',
  'orbit360-validar-emision-endosos-v1201.mjs',
  'orbit360-test-directorio-aseguradoras-v1202.mjs',
  'orbit360-validar-directorio-aseguradoras-v1202.mjs',
  'orbit360-test-cotizador-comparativo-v1203.mjs',
  'orbit360-validar-cotizador-comparativo-v1203.mjs'
)
foreach ($name in $testNames) {
  Copy-Required (Join-Path 'orbit360-platform\tools' $name) $TestsRoot
}

Write-Step 'Incorporar paquete v1.204, evidencia y referencias si existen'
$searchRoots = @(
  (Join-Path $HOME 'Downloads'),
  (Join-Path $HOME 'OneDrive\Documentos'),
  (Join-Path $HOME 'OneDrive\Documents'),
  $Repo
) | Where-Object { Test-Path $_ }

$oldPackagePatterns = @(
  'ORBIT360_CLAUDE_PAQUETE_ACUMULADO_V1204_20260711.zip',
  'PAQUETE_CLAUDE_ORBIT360_AYS_ACUMULADO_20260711.zip'
)
$oldPackage = $null
foreach ($root in $searchRoots) {
  foreach ($pattern in $oldPackagePatterns) {
    $candidate = Get-ChildItem -LiteralPath $root -Filter $pattern -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($candidate) { $oldPackage = $candidate; break }
  }
  if ($oldPackage) { break }
}
if ($oldPackage) {
  Write-Host "Paquete v1.204 localizado: $($oldPackage.FullName)"
  Expand-Archive -LiteralPath $oldPackage.FullName -DestinationPath $EvidenceRoot -Force
} else {
  Write-Host 'AVISO: no se localizó el ZIP v1.204; el paquete v1.205 continúa con código y documentos reales.' -ForegroundColor Yellow
}

$referenceCandidates = @(
  @{ Name='comparativo_final_v110.html'; Target='REFERENCIAS\comparativo_final_v110.html' },
  @{ Name='Logo V. 2026.jpeg'; Target='REFERENCIAS\Logo_AyS_2026.jpeg' },
  @{ Name='Manual de Identidad Básica – Versión 1 – Vigente.docx'; Target='REFERENCIAS\Manual_Identidad_AyS_V1_Vigente.docx' }
)
foreach ($item in $referenceCandidates) {
  $found = $null
  foreach ($root in $searchRoots) {
    $found = Get-ChildItem -LiteralPath $root -Filter $item.Name -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { break }
  }
  if ($found) {
    $dest = Join-Path $Work $item.Target
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $found.FullName $dest -Force
  }
}

Write-Step 'Generar manifiesto'
$metadata = @"
PAQUETE: $PackageName
FECHA: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
REPO: $Repo
RAMA: $Branch
HEAD: $Head
REGLA: Continuar sobre Claude v1.198; código rama viva solo lectura; sin backend real ni datos reales.
"@
[IO.File]::WriteAllText((Join-Path $Work 'METADATA-PAQUETE.txt'), $metadata, [Text.UTF8Encoding]::new($false))

$manifestRows = Get-ChildItem -LiteralPath $Work -File -Recurse | Sort-Object FullName | ForEach-Object {
  $relative = $_.FullName.Substring($Work.Length + 1)
  $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  [pscustomobject]@{ Ruta = $relative; Bytes = $_.Length; SHA256 = $hash }
}
$manifestRows | Export-Csv -LiteralPath (Join-Path $Work 'MANIFIESTO-SHA256.csv') -NoTypeInformation -Encoding UTF8

Write-Step 'Comprimir paquete final'
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path (Join-Path $Work '*') -DestinationPath $ZipPath -CompressionLevel Optimal -Force
$ZipHash = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$summary = @"
PAQUETE CLAUDE GENERADO CORRECTAMENTE
Ruta: $ZipPath
SHA256: $ZipHash
Rama: $Branch
HEAD: $Head

Enviar únicamente este ZIP a Claude y pegar PROMPT-PARA-PEGAR-EN-CLAUDE.txt.
Este paquete sustituye v1.204.
"@
Write-Host ''
Write-Host $summary -ForegroundColor Green
try { $summary | Set-Clipboard } catch {}
try { Start-Process explorer.exe -ArgumentList "/select,`"$ZipPath`"" | Out-Null } catch {}
Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue
