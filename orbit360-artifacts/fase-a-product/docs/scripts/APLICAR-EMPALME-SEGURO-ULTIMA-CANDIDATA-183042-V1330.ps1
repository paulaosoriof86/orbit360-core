Param(
  [Parameter(Mandatory=$true)]
  [string]$ZipPath,
  [switch]$UpdateIndexCacheBust
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$ExpectedSha256 = "94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add"
$Root = (Get-Location).Path
$Ts = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportDir = Join-Path $Root "_orbit360_reports"
$BackupDir = Join-Path $Root "_backups\pre_empalme_ultima_candidata_183042_$Ts"
$ExtractDir = Join-Path $ReportDir "_extract_ultima_candidata_183042_$Ts"
$ReportFile = Join-Path $ReportDir "empalme_seguro_ultima_candidata_183042_$Ts.md"

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Add-Line([string]$Text){ Add-Content -Path $ReportFile -Value $Text -Encoding UTF8 }
function Fail([string]$Msg){ Add-Line "`n## BLOQUEADO`n$Msg"; throw $Msg }
function Rel([string]$Path){ return $Path.Replace($Root + [System.IO.Path]::DirectorySeparatorChar, '').Replace('\\','/') }
function Copy-WithBackup([string]$Source,[string]$RelTarget){
  $Target = Join-Path $Root $RelTarget
  if(!(Test-Path $Source)){ Fail "No existe fuente candidata: $Source" }
  if(!(Test-Path $Target)){ Fail "No existe destino en repo: $RelTarget" }
  $Bk = Join-Path $BackupDir $RelTarget
  New-Item -ItemType Directory -Force -Path (Split-Path $Bk -Parent) | Out-Null
  Copy-Item -Force $Target $Bk
  Copy-Item -Force $Source $Target
  Add-Line "- Copiado con backup: `$RelTarget`"
}
function Replace-Text([string]$RelPath,[string]$Old,[string]$New){
  $P = Join-Path $Root $RelPath
  $T = Get-Content $P -Raw -Encoding UTF8
  if($T.Contains($Old)){
    $T = $T.Replace($Old,$New)
    Set-Content -Path $P -Value $T -Encoding UTF8
    Add-Line "- Patch aplicado en `$RelPath`: texto exacto reemplazado."
  } else { Add-Line "- Patch omitido en `$RelPath`: patrón exacto no encontrado." }
}
function Regex-Replace([string]$RelPath,[string]$Pattern,[string]$Replacement,[string]$Label){
  $P = Join-Path $Root $RelPath
  $T = Get-Content $P -Raw -Encoding UTF8
  $N = [regex]::Replace($T,$Pattern,$Replacement,[System.Text.RegularExpressions.RegexOptions]::Singleline)
  if($N -ne $T){ Set-Content -Path $P -Value $N -Encoding UTF8; Add-Line "- Patch regex aplicado en `$RelPath`: $Label" }
  else { Add-Line "- Patch regex omitido en `$RelPath`: $Label" }
}

"# Empalme seguro ultima candidata Claude 183042 v1330`n`nFecha: $(Get-Date -Format o)`nRepo: $Root`nZIP: $ZipPath`n" | Set-Content -Path $ReportFile -Encoding UTF8

$Branch = (git rev-parse --abbrev-ref HEAD).Trim()
Add-Line "## Rama`n- Detectada: `$Branch`n- Esperada: `$ExpectedBranch`"
if($Branch -ne $ExpectedBranch){ Fail "Rama incorrecta. No aplicar empalme." }
if(!(Test-Path $ZipPath)){ Fail "No existe ZIP: $ZipPath" }
$Sha = (Get-FileHash -Algorithm SHA256 -Path $ZipPath).Hash.ToLower()
Add-Line "`n## ZIP`n- SHA256 detectado: `$Sha`n- SHA256 esperado: `$ExpectedSha256`"
if($Sha -ne $ExpectedSha256){ Fail "SHA256 no coincide. No aplicar empalme." }

New-Item -ItemType Directory -Force -Path $ExtractDir | Out-Null
Expand-Archive -Force -Path $ZipPath -DestinationPath $ExtractDir
$CandRoot = Get-ChildItem -Path $ExtractDir -Directory -Recurse | Where-Object { $_.Name -eq 'orbit360-platform' } | Select-Object -First 1
if(!$CandRoot){ Fail "No se encontró orbit360-platform dentro del ZIP." }
$Cand = $CandRoot.FullName
Add-Line "`n## Candidata`n- Root: `$Cand`"

Add-Line "`n## Copia incremental desde ultima candidata"
$Files = @(
  'orbit360-platform\modules\cliente360.js',
  'orbit360-platform\modules\cobros.js',
  'orbit360-platform\modules\configuracion.js',
  'orbit360-platform\modules\portal.js',
  'orbit360-platform\docs\BITACORA-CAMBIOS.md',
  'orbit360-platform\docs\REPORTE-SMOKE.md'
)
foreach($Rel in $Files){
  $Source = Join-Path $Cand ($Rel -replace '^orbit360-platform\\','')
  Copy-WithBackup $Source $Rel
}

Add-Line "`n## Patches de seguridad post-candidata"

# Cliente360: aceptar estado anterior y contrato nuevo; aclaracion al estado del contrato.
Replace-Text 'orbit360-platform\modules\cliente360.js' "p.estado === 'pendiente'" "(p.estado === 'pendiente' || p.estado === 'pendiente_revision')"
Replace-Text 'orbit360-platform\modules\cliente360.js' "estado: 'aclaracion_solicitada'" "estado: 'requiere_aclaracion'"

$aprobarReplacement = @'
function aprobarPropuesta(pid, cid) {
    const p = S().get('parchesPendientes', pid); if (!p) return;
    const motivo = (window.prompt('Motivo de la aprobación (obligatorio · queda en la trazabilidad interna):', '') || '').trim();
    if (!motivo) { Orbit.ui.toast('Se requiere motivo para aprobar'); return; }
    const accion = (window.prompt('Para aplicar cambios al expediente escribe APLICAR. Deja vacío para aprobar sin aplicar todavía:', '') || '').trim().toUpperCase();
    const upd = {}; Object.entries(p.diff || {}).forEach(([k, v]) => { if (v && v.propuesto != null) upd[k] = v.propuesto; });
    if (accion === 'APLICAR') {
      if (Object.keys(upd).length) S().update('clientes', cid, upd);
      S().update('parchesPendientes', pid, { estado: 'aplicado', motivo, aplicadoPor: _quien(), aplicadoFecha: Orbit.ui.today(), historialInterno: _histInterno(p, 'aplicar', motivo) });
      Orbit.ui.toast('✓ Propuesta aplicada · ' + Object.keys(upd).length + ' dato(s) actualizado(s)');
    } else {
      S().update('parchesPendientes', pid, { estado: 'aprobado', motivo, aprobadoPor: _quien(), aprobadoFecha: Orbit.ui.today(), historialInterno: _histInterno(p, 'aprobar_sin_aplicar', motivo) });
      Orbit.ui.toast('✓ Propuesta aprobada · pendiente de aplicación');
    }
    reabrir(cid, 'documentos');
  }
'@
Regex-Replace 'orbit360-platform\modules\cliente360.js' "function aprobarPropuesta\(pid, cid\) \{.*?\n  \}\r?\n  function rechazarPropuesta" ($aprobarReplacement + "`n  function rechazarPropuesta") "Cliente360 aprobar/aplicar con gate reforzado"

# Cobros: factura metadata-only no concilia automaticamente; comentarios sin palabras prohibidas.
Replace-Text 'orbit360-platform\modules\cobros.js' "const conciliado = !!factName;" "const conciliado = false;"
Replace-Text 'orbit360-platform\modules\cobros.js' "// METADATA-ONLY: no se lee el binario (sin readAsDataURL/base64). Solo la referencia." "// METADATA-ONLY: solo se conserva nombre/referencia del archivo, sin contenido del documento."

# Portal: soporte en revision coherente y comentario limpio.
Replace-Text 'orbit360-platform\modules\portal.js' "// Soporte de pago = documento METADATA-ONLY vinculado al cobro (sin binario/base64)." "// Soporte de pago = documento METADATA-ONLY vinculado al cobro, sin contenido del documento."
Replace-Text 'orbit360-platform\modules\portal.js' "enRevision:false" "enRevision:true"
Replace-Text 'orbit360-platform\modules\portal.js' "enRevision: false" "enRevision: true"

# Configuracion: limpiar UI de secretos visibles y nombre interno ci-key.
Replace-Text 'orbit360-platform\modules\configuracion.js' "id=\"ci-key\"" "id=\"ci-ref\""
Replace-Text 'orbit360-platform\modules\configuracion.js' "#ci-key" "#ci-ref"
Replace-Text 'orbit360-platform\modules\configuracion.js' "cfg.credentialRef || cfg.key || cfg.url" "cfg.credentialRef || cfg.url"
Replace-Text 'orbit360-platform\modules\configuracion.js' "El secreto real (API key/token) lo administra el backend de forma segura. Aquí solo se registra una <b>referencia</b>; nunca se almacena la clave en el navegador." "La credencial real se administra en una bóveda segura. Aquí solo se registra una <b>referencia</b>; nunca se almacena la clave en el navegador."
Replace-Text 'orbit360-platform\modules\configuracion.js' "Ingresa al menos la cuenta o credenciales para validar los parámetros." "Ingresa al menos la cuenta o una referencia para validar los parámetros."

if($UpdateIndexCacheBust){
  Add-Line "`n## Cache-bust controlado index"
  $IndexTarget = Join-Path $Root 'orbit360-platform\index.html'
  $IndexSource = Join-Path $Cand 'index.html'
  $Bk = Join-Path $BackupDir 'orbit360-platform\index.html'
  New-Item -ItemType Directory -Force -Path (Split-Path $Bk -Parent) | Out-Null
  Copy-Item -Force $IndexTarget $Bk
  $Current = Get-Content $IndexTarget -Raw -Encoding UTF8
  $Candidate = Get-Content $IndexSource -Raw -Encoding UTF8
  foreach($m in @('cliente360','cobros','configuracion','portal')){
    $Pat = "modules/$m.js\?v=[0-9A-Za-z._-]+"
    $Hit = [regex]::Match($Candidate,$Pat)
    if($Hit.Success){ $Current = [regex]::Replace($Current,$Pat,$Hit.Value); Add-Line "- Cache-bust actualizado para $m => $($Hit.Value)" }
  }
  Set-Content -Path $IndexTarget -Value $Current -Encoding UTF8
} else {
  Add-Line "`n## Index`n- No se modificó index.html. Para cache-bust controlado ejecutar con -UpdateIndexCacheBust."
}

Add-Line "`n## Validaciones"
$CheckFiles = @(
  'orbit360-platform\modules\cliente360.js',
  'orbit360-platform\modules\cobros.js',
  'orbit360-platform\modules\configuracion.js',
  'orbit360-platform\modules\portal.js'
)
foreach($F in $CheckFiles){
  $r = & node --check $F 2>&1
  if($LASTEXITCODE -ne 0){ Add-Line "- ERROR node --check `$F`"; Add-Line '```txt'; Add-Line ($r | Out-String); Add-Line '```'; Fail "node --check falló en $F" }
  Add-Line "- OK node --check `$F`"
}
if(Test-Path 'tools\orbit360-validar-backend-lab-contrato.mjs'){
  $r = & node tools\orbit360-validar-backend-lab-contrato.mjs 2>&1
  Add-Line "`n### backend LAB contrato"
  Add-Line '```txt'; Add-Line ($r | Out-String); Add-Line '```'
  if($LASTEXITCODE -ne 0){ Fail "Validador backend LAB falló" }
}

$ForbiddenHits = @()
foreach($pair in @(
  @('orbit360-platform\modules\cobros.js','readAsDataURL|base64|factData'),
  @('orbit360-platform\modules\portal.js','base64'),
  @('orbit360-platform\modules\configuracion.js','ci-key|saved\.key|key:\s*back\.querySelector')
)){
  $Text = Get-Content (Join-Path $Root $pair[0]) -Raw -Encoding UTF8
  if($Text -match $pair[1]){ $ForbiddenHits += "$($pair[0]) :: $($pair[1])" }
}
Add-Line "`n## Patrones prohibidos"
if($ForbiddenHits.Count){ foreach($h in $ForbiddenHits){ Add-Line "- BLOQUEADO: $h" }; Fail "Quedaron patrones prohibidos" }
else { Add-Line "- OK: sin patrones prohibidos principales." }

$Status = git status --short
Add-Line "`n## Git status"
Add-Line '```txt'
Add-Line ($Status | Out-String)
Add-Line '```'

$result = [ordered]@{
  ok = $true
  status = 'empalme_aplicado_pendiente_revision_git'
  branch = $Branch
  zipSha256 = $Sha
  backupDir = (Rel $BackupDir)
  reportFile = (Rel $ReportFile)
  indexUpdated = [bool]$UpdateIndexCacheBust
}
$result | ConvertTo-Json -Depth 5
Add-Line "`n## Resultado`n```json`n$($result | ConvertTo-Json -Depth 5)`n```"
