param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$ImportRoot = Join-Path $Repo "_orbit360_imports\ays_real"
$Reports = Join-Path $Repo "_orbit360_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "PREPARAR-IMPORTACION-AYS-V104-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function Write-CsvTemplate([string]$Path, [string[]]$Headers) {
  $line = ($Headers | ForEach-Object { '"' + ($_ -replace '"','""') + '"' }) -join ','
  Set-Content -Path $Path -Value $line -Encoding UTF8
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - PREPARAR IMPORTACION A&S v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Restricciones: no deploy, no produccion, no secretos, no datos reales en repo, no commit/push automatico"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Cambia a $ExpectedBranch antes de preparar importacion." }

  New-Item -ItemType Directory -Force -Path $ImportRoot | Out-Null
  Add-Report "Carpeta local creada/verificada: $ImportRoot"

  $templates = @{
    "asesores.csv" = @("id","nombre","email","telefono","whatsapp","rol","pais","activo","modulos","metaMensual")
    "aseguradoras.csv" = @("id","nombre","pais","codigo","contacto","telefono","email","portal","drive","nit","diasCredito","activo")
    "clientes.csv" = @("id","nombre","pais","tipo","documento","nit","email","telefono","whatsapp","direccion","asesorId","estado","origen","drive")
    "vehiculos.csv" = @("id","clienteId","placa","marca","linea","modelo","anio","vin","motor","uso","pais","estado")
    "polizas.csv" = @("id","clienteId","aseguradoraId","numero","ramo","estado","pais","moneda","primaNeta","fechaInicio","fechaFin","formaPago","asesorId","vehiculoId","primaTotal","iva","comisionPct","renovable","documentoUrl")
    "cobros.csv" = @("id","polizaId","clienteId","estado","fechaVencimiento","monto","moneda","pais","numeroRecibo","cuota","formaPago","fechaPago","medioPago","banco","referencia")
    "comisiones.csv" = @("id","polizaId","aseguradoraId","estado","monto","moneda","pais","facturaId","fechaDevengo","fechaCobro","asesorId","porcentaje","basePrimaNeta")
    "facturas.csv" = @("id","tipo","estado","monto","moneda","pais","aseguradoraId","clienteId","numero","fechaEmision","fechaVencimiento","fechaPago","referencia")
    "finmovs.csv" = @("id","tipo","fecha","monto","moneda","pais","categoria","cuenta","banco","referencia","facturaId","polizaId","clienteId","descripcion")
    "reclamos.csv" = @("id","clienteId","polizaId","estado","fecha","pais","numero","ramo","aseguradoraId","descripcion","montoEstimado","montoPagado","responsable","bitacora")
    "documentos.csv" = @("id","entidad","entidadId","tipo","url","nombre","fecha","pais","estado","origen")
    "gestiones.csv" = @("id","tipo","estado","clienteId","fecha","asesorId","polizaId","ramo","prioridad","canal","descripcion","proximaAccion")
    "negocios.csv" = @("id","clienteId","estado","etapa","fecha","asesorId","ramo","primaEstimada","moneda","pais","origen","probabilidad")
  }

  foreach ($name in $templates.Keys) {
    $path = Join-Path $ImportRoot $name
    if (-not (Test-Path $path)) {
      Write-CsvTemplate -Path $path -Headers $templates[$name]
      Add-Report "Plantilla creada: $path"
    } else {
      Add-Report "Existe, no se reemplaza: $path"
    }
  }

  $Readme = Join-Path $ImportRoot "LEEME_IMPORTACION_AYS_V104.txt"
  Set-Content -Path $Readme -Encoding UTF8 -Value @"
ORBIT 360 - IMPORTACION REAL A&S v1.104

Esta carpeta esta ignorada por Git. Aqui puedes poner CSV/JSON reales para validar antes de cargar al LAB.

Reglas:
- No poner estos archivos en orbit360-platform/data.
- No subir datos reales al repo.
- No hardcodear clientes, polizas ni cobros.
- Convertir Excel a CSV por hoja si el validador aun no lee xlsx directo.
- Ejecutar: node tools/orbit360-validar-importacion-ays-v104.mjs _orbit360_imports/ays_real

Orden sugerido:
1 clientes/base inicial
2 aseguradoras
3 polizas
4 vehiculos
5 estados de cuenta/cobros
6 comisiones/facturas
7 finmovs
8 reclamos
"@
  Add-Report "LEEME creado/actualizado: $Readme"

  Add-Report ""
  Add-Report "RESULTADO: IMPORTACION_AYS_PREPARADA"
  Add-Report "Siguiente paso: copiar/exportar datos reales a CSV dentro de _orbit360_imports\ays_real y ejecutar validador."
} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: no deploy, no produccion, no secretos, no datos reales en repo, no commit/push automatico."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
