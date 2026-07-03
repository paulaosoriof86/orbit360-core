# Bitácora de errores — PowerShell local A&S backend

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Ámbito:** ejecución local PowerShell / backend LAB A&S  
**Estado:** documentado para evitar reprocesos.

## 1. Error: ejecución desde ruta incorrecta

- **Módulo/área:** PowerShell local / scripts backend.
- **Síntoma:** Se ejecutó `tools/orbit360-run-flujo-ays-lab-v99.ps1` desde `C:\Users\paula` y PowerShell indicó que el archivo no existía.
- **Esperado:** El script debe ejecutarse desde el repo o con ruta absoluta.
- **Causa raíz:** Uso de ruta relativa `tools/...` fuera de `C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core`.
- **Fix aplicado:** Se entregó bloque con `$Repo` fijo y `$RunScript = Join-Path $Repo ...`.
- **Prevención:** Todo bloque PowerShell futuro debe usar ruta absoluta del repo o hacer `Set-Location $Repo` antes de llamar scripts.
- **Impacto:** Evita falsa alarma de script inexistente.
- **Estado:** DOCUMENTADO.

## 2. Error: bloque PowerShell largo quedó en modo continuación

- **Módulo/área:** PowerShell local / copiado de bloques.
- **Síntoma:** PowerShell mostró el prompt `>>` y luego el término `finally` apareció como comando no reconocido.
- **Esperado:** El bloque debe ejecutarse completo como una unidad.
- **Causa raíz:** El bloque se pegó o interpretó incompleto; `finally` quedó fuera de su estructura `try/catch/finally`.
- **Fix aplicado:** Se reemplazó por bloque más simple, sin `try/finally`, con validaciones lineales.
- **Prevención:** Evitar bloques largos con estructuras anidadas complejas para Paula. Preferir scripts versionados en repo y comandos cortos que llamen esos scripts.
- **Impacto:** Reduce errores de sintaxis y evita reprocesos por consola.
- **Estado:** DOCUMENTADO.

## 3. Error: reporte truncado antes de ejecutar run maestro

- **Módulo/área:** PowerShell local / reporte.
- **Síntoma:** El reporte `RUN-SIMPLE-AYS-LAB-V99` llegó hasta `== Verificar config local ==` y no registró estado de placeholders ni ejecución del run maestro.
- **Esperado:** El reporte debe indicar si existe config local, si tiene placeholders y si se ejecutó el run maestro.
- **Causa probable:** Bloque no llegó completo a PowerShell o se cortó antes del bloque condicional final.
- **Fix aplicado:** Se entregó un diagnóstico más corto con líneas explícitas: `RunScript existe`, `ConfigLocal existe`, `ConfigLocal contiene placeholders`.
- **Prevención:** Usar scripts del repo como fuente de verdad y bloques mínimos de invocación.
- **Impacto:** Evita interpretar como éxito un reporte incompleto.
- **Estado:** DOCUMENTADO.

## 4. Hallazgo: salida Git con caracteres espaciados

- **Módulo/área:** PowerShell local / salida Git / reporte.
- **Síntoma:** La rama se imprimió como `a y s / b a c k e n d ...` con espacios entre caracteres.
- **Esperado:** La rama debe registrarse como `ays/backend-tenant-lab-v99-20260703`.
- **Causa probable:** Diferencia de codificación o tratamiento de salida nativa al pasar por `Tee-Object`/reporte.
- **Fix recomendado:** En scripts versionados, capturar rama con `(git rev-parse --abbrev-ref HEAD).Trim()` y escribirla con `Add-Content`; evitar depender de salida visual de `Tee-Object` para validaciones críticas.
- **Impacto:** No necesariamente rompe ejecución, pero dificulta lectura/auditoría.
- **Estado:** DOCUMENTADO / pendiente endurecer scripts si se repite.

## 5. Hallazgo: config local existe pero no se confirmó estado final

- **Módulo/área:** Firebase LAB local / run maestro.
- **Síntoma:** El diagnóstico confirmó `RunScript existe: True` y `ConfigLocal existe: True`, pero no registró si contiene placeholders ni si ejecutó el run maestro.
- **Esperado:** Confirmar explícitamente estado de placeholders antes de ejecutar smoke.
- **Causa probable:** Bloque cortado o ejecución incompleta antes del `Get-Content` del archivo local.
- **Fix requerido:** Ejecutar bloque diagnóstico reducido o llamar directamente el run maestro desde el repo.
- **Impacto:** No se debe afirmar que smoke fue ejecutado hasta ver reporte `STABILITY-GATE` y `SMOKE`.
- **Estado:** ABIERTO HASTA PRÓXIMO REPORTE.

## Regla operativa futura

Para evitar reprocesos:

1. No volver a pedir comandos relativos desde `C:\Users\paula`.
2. No usar bloques grandes con `try/finally` pegados manualmente.
3. Usar scripts versionados en `tools/` como fuente principal.
4. Cada bloque manual debe ser corto y registrar `RunScript existe`, `ConfigLocal existe`, placeholders y reporte final.
5. No afirmar smoke aprobado sin reporte `RESULTADO SMOKE A&S LAB V99: COMPLETADO`.
6. No afirmar estabilidad aprobada sin reporte `STABILITY-GATE` con `APROBADO` o `APROBADO_CON_ADVERTENCIAS` revisado.
