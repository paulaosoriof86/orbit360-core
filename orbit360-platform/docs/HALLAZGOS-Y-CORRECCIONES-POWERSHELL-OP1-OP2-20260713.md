# Hallazgos y correcciones del pipeline PowerShell OP1/OP2

Fecha: 2026-07-13  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carril: B — pipeline, validación y seguridad

## Contexto

La ejecución `RUN-OPERACION-OP1-OP2-20260713_105111.txt` quedó bloqueada antes de los smokes visuales. No hubo deploy, producción, merge, escritura de datos reales ni alteración deliberada de archivos protegidos.

## Causa raíz 1 — el archivo no existía todavía en la copia local

### Síntoma

```txt
El argumento para -File no existe
```

### Causa

El comando asumía que el ejecutor recién creado en la rama remota ya estaba presente en el repositorio local.

### Corrección

- sincronización previa antes de invocar el archivo;
- el nuevo ejecutor detecta si se actualizó durante `pull` y se relanza una sola vez;
- no vuelve a ejecutar lógica antigua después de actualizarse.

## Causa raíz 2 — salida informativa de Git tratada como excepción

### Síntoma

```txt
ERROR: From https://github.com/...
```

Aunque `git fetch` no había reportado un exit code de fallo.

### Causa

Windows PowerShell 5.1, con `$ErrorActionPreference = 'Stop'`, puede convertir texto escrito por una aplicación nativa en `stderr` en un registro de error cuando se mezcla con `2>&1`.

Git usa `stderr` para progreso e información normal.

### Corrección

El ejecutor usa `Start-Process` con:

```txt
RedirectStandardOutput
RedirectStandardError
Wait
PassThru
```

La decisión depende únicamente de `ExitCode`. `stderr` se conserva en el reporte, pero no bloquea por sí solo.

## Causa raíz 3 — comparación por subcadena en upgrade del index

### Síntoma

```txt
Falló el upgrade OP-2 de styles/aseguradoras-op2-v1217.css?v=20260713-op2
```

### Causa

La referencia nueva:

```txt
...v=20260713-op2-v1218
```

contiene como prefijo la referencia vieja:

```txt
...v=20260713-op2
```

El verificador usaba `Contains(old)`, por lo que concluía falsamente que la versión vieja seguía presente y restauraba `index.html`.

### Corrección

- comparación de etiquetas HTML completas;
- conteo exacto por referencia;
- grupos de inserción deterministas;
- eliminación y reinserción idempotente en orden conocido;
- backup y restauración únicamente ante una inconsistencia real;
- verificación de orden físico:
  - source guard antes de import UI guard;
  - access policy antes de provider guard;
  - closure antes de permission y operational resources.

## Causa raíz 4 — hashes SHA-256 viejos en tres validadores

### Síntoma

```txt
PROTECTED_core_auth_js: fail
PROTECTED_core_importa_js: fail
```

El mismo fallo apareció en CRM, Cotizador/Comparativo y Aseguradoras.

### Causa

Los validadores copiaron hashes SHA-256 de otra candidata o baseline, no del estado protegido vivo de la rama.

La comparación Git entre el baseline `051fa9b...` y el HEAD previo a esta corrección mostró que `data/store.js`, `core/auth.js` y `core/importa.js` no fueron modificados por los 77 commits del bloque OP1/OP2.

### Corrección

Se centralizó el control en:

```txt
tools/orbit360-protected-baseline.mjs
```

Ahora compara Git blob SHA con filtros del repositorio:

```txt
data/store.js  -> cec636757725dea975a63b4aa98fb859baba7316
core/auth.js   -> 965d033d8cc5955724609b64ad8219b80ea26b3b
core/importa.js-> 6624112ec85e2d89d26456a98478dcc8b9725f18
```

Esto evita falsos fallos por:

- line endings de Windows;
- codificación/BOM;
- hashes copiados de candidatas antiguas;
- checkout shallow de CI.

Los tres validadores consumen la misma fuente central; no vuelven a duplicar hashes.

## Causa raíz 5 — prueba estática demasiado literal

### Síntoma

```txt
ALIAS_CANONICAL: fail
```

### Causa

El código implementaba `v(?:ersion)?`, pero el validador buscaba la palabra literal `version` como texto plano. La función existía; la afirmación de prueba era incorrecta.

### Corrección

El validador comprueba el patrón real y conserva los gates de:

- canonicalización;
- sufijo copia;
- distancia de una letra;
- bloqueo dentro del archivo;
- bloqueo contra directorio existente;
- ausencia de autofusión.

## Causa raíz 6 — ejecución continuaba después de un fallo crítico

### Síntoma

Después de fallar sincronización e integración, el runner ejecutó cuatro validadores. Esto produjo un reporte largo con fallos derivados, no independientes.

### Corrección

El runner ahora es fail-fast:

```txt
sync falla       -> no integra
integración falla-> no valida
policy falla     -> no abre smokes
CRM smoke falla  -> no ejecuta Aseguradoras
```

Siempre registra estado Git final y reporte, pero no continúa trabajo que depende de una etapa fallida.

## Causa raíz 7 — mojibake en reporte

### Síntoma

```txt
validaciÃ³n
DirecciÃ³n
P├│lizas
```

### Causa

PowerShell 5.1 interpretó texto UTF-8 de scripts y procesos nativos con otra página de códigos.

### Corrección

- runner PowerShell escrito con mensajes ASCII;
- consola configurada a UTF-8;
- salida de Node/Git redirigida a archivos;
- lectura explícita con `Get-Content -Encoding UTF8`;
- reporte escrito en UTF-8.

## Causa raíz 8 — validaciones duplicadas

### Síntoma

El runner ejecutaba validadores generales y después cada smoke volvía a ejecutarlos.

### Corrección

El runner común ahora ejecuta:

1. sincronización;
2. integración;
3. gate específico de cuentas/credenciales;
4. smoke CRM, que incluye backend + CRM + Cotizador/Comparativo;
5. smoke Aseguradoras, que incluye backend + Aseguradoras.

Se eliminó la ronda estática duplicada del runner común.

## Archivos corregidos

```txt
tools/orbit360-run-operacion-op1-op2-visual.ps1
tools/orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1
tools/orbit360-protected-baseline.mjs
tools/orbit360-validar-crm-op1.mjs
tools/orbit360-validar-cierre-cotizador-comparativo-v1215.mjs
tools/orbit360-validar-aseguradoras-op2.mjs
```

## Reglas obligatorias para próximos PowerShell

1. No asumir que un archivo remoto ya existe localmente.
2. No decidir éxito de un programa nativo por `stderr`; usar exit code.
3. No usar `Contains()` para validar versiones donde una cadena puede ser prefijo de otra.
4. No duplicar hashes protegidos entre validadores.
5. No usar búsquedas literales frágiles cuando el código usa expresiones regulares.
6. Detener el pipeline en el primer fallo crítico.
7. Capturar salida nativa en UTF-8.
8. No repetir validadores que ya ejecutará el smoke.
9. No borrar cambios locales ni carpetas no rastreadas.
10. No declarar módulo cerrado sin capturas y gate visual.

## Estado

```txt
Causas diagnosticadas: 8
Correcciones remotas aplicadas: SÍ
Index local alterado por intento fallido: NO; fue restaurado
Archivos protegidos modificados por OP1/OP2: NO
Smokes visuales ejecutados: NO
Siguiente acción: sincronizar correcciones y ejecutar una sola vez el runner actualizado
```
