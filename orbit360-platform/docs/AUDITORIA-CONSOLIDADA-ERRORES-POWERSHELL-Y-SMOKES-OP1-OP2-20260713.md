# Auditoría consolidada de errores PowerShell y smokes OP1/OP2

Fecha: 2026-07-13
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Carril: B — pipeline, validación y seguridad

## Objetivo

Detener el patrón de reprocesos causado por errores de runners, validadores y harnesses. PowerShell no es la metodología principal: debe limitarse a lanzar scripts versionados cuando una comprobación depende del computador local. La aplicación, el backend, la documentación y la automatización deben resolverse primero en GitHub.

## Errores y hallazgos confirmados

### 1. Ruta relativa o rígida

- Se ejecutaron scripts desde una carpeta distinta al repositorio.
- También se usaron rutas fijas dependientes del nombre de usuario.
- Corrección obligatoria: autodetectar `orbit360-core` por `.git` y `origin`, o resolver desde `$PSScriptRoot`.

### 2. Bloques largos pegados en consola

- PowerShell quedó en prompt de continuación `>>` y estructuras `try/finally` se cortaron.
- Corrección obligatoria: lógica en scripts versionados; el bloque visible debe ser un lanzador corto.

### 3. Reportes truncados o genéricos

- Se reportó `Exit code: 1` sin copiar el detalle del runner interno.
- Corrección obligatoria: copiar siempre stdout, stderr, reporte interno y `results.jsonl`; indicar etapa, archivo, escenario y causa exacta.

### 4. `stderr` nativo interpretado como error

- Git escribe progreso normal en stderr y Windows PowerShell 5.1 lo convirtió en excepción.
- Corrección obligatoria: `Start-Process`, redirecciones separadas y decisión exclusiva por `ExitCode`.

### 5. Archivo remoto asumido como local

- Se intentó ejecutar un `.ps1` que aún no existía en el checkout local.
- Corrección obligatoria: obtener el script desde `origin/<rama>` o sincronizar de forma segura antes de invocarlo.

### 6. Sincronización repetida o riesgosa

- Se repitieron fetch/pull y validaciones ya superadas.
- Corrección obligatoria: preservar el worktree original; si hay cambios locales y HEAD remoto distinto, usar clon/worktree aislado. Nunca `reset`, `clean` ni descarte automático.

### 7. Comparaciones frágiles por subcadena

- Una versión nueva contenía como prefijo la anterior y el integrador concluyó falsamente que el índice seguía viejo.
- Corrección obligatoria: comparar etiquetas HTML completas y conteos exactos.

### 8. Hashes protegidos viejos

- Validadores copiaron SHA-256 de otra candidata y reportaron cambios inexistentes en archivos protegidos.
- Corrección obligatoria: baseline central por Git blob SHA con filtros del repositorio.

### 9. Pruebas estáticas demasiado literales

- Validadores buscaron palabras o frases exactas aunque la función real ya existía.
- El lector de evidencia OP2 buscó estructuras antiguas del runner y falló después de que este fue endurecido.
- Corrección obligatoria: comprobar contratos semánticos, no textos de implementación, idiomas ni nombres de pasos.

### 10. Continuar después del primer fallo

- Algunos runners ejecutaron validadores dependientes después de fallar una etapa crítica.
- Corrección obligatoria: fail-fast y conservar lo ya aprobado.

### 11. Validadores duplicados

- El runner común y los smokes repetían los mismos gates.
- Corrección obligatoria: cada control tiene un único dueño; los reintentos ejecutan solo el delta.

### 12. Codificación y mojibake

- Salidas UTF-8 se leyeron con otra página de códigos.
- Corrección obligatoria: UTF-8 explícito, salida nativa a archivos y mensajes del runner en ASCII cuando sea necesario.

### 13. Copia de perfiles de navegador

- El clon aislado intentó copiar `profile-*`, `Service Worker` y `CacheStorage`, superando la longitud de ruta de Windows.
- Corrección obligatoria: evidencia mínima = `results.jsonl`, PNG y TXT. Perfiles y cachés nunca son evidencia.

### 14. Perfiles dentro de la carpeta de evidencia

- El smoke guardaba `--user-data-dir` dentro de `VISUAL-*`.
- Corrección obligatoria: perfiles en `%TEMP%` con ruta corta y eliminación automática al cerrar Chrome/Edge.

### 15. Limpieza de junctions

- Una unión temporal de `node_modules` podía permanecer durante la eliminación recursiva.
- Corrección obligatoria: desmontar explícitamente el junction antes de borrar el espacio temporal; si no se desmonta, conservar el temporal y reportar.

### 16. Falso negativo visual actual

Resultado real de Dirección y Operativo:

- `roleAvailable=true`
- `platform=true`
- `present=true`
- `enabled=true`
- `direct=true`
- `secretVisible=true`
- política de credenciales visible y copiable correcta
- sin overflow y sin errores de página

El único valor falso fue `revealed=false`.

La aplicación pinta usuario y contraseña dentro de la misma tarjeta de plataforma y los oculta después de 15 segundos. El harness usó selectores globales después del clic; cuando hay más de una instancia o nodo transitorio puede leer otra tarjeta, aunque la credencial correcta ya esté visible en la tarjeta accionada.

Corrección obligatoria:

- capturar `row = button.closest('[data-op2-platform]')` antes del clic;
- comprobar usuario y contraseña dentro de esa misma `row`;
- aceptar revelado visual solo si coinciden ambos valores, la llamada directa fue autorizada y la política del rol permite credenciales;
- no modificar la aplicación para satisfacer un selector defectuoso.

### 17. `detached HEAD` incompatible con integradores que validan rama

- El runner aislado cambió a `git checkout --detach origin/<rama>`.
- El integrador seguro ejecuta `git branch --show-current` y exige la rama `ays/backend-tenant-lab-v99-20260703`.
- En modo detached, el comando devolvió vacío y PowerShell intentó aplicar `.Trim()` sobre un valor nulo.
- No falló la integración, la aplicación ni la rama original; falló la preparación del clon temporal.
- Corrección obligatoria: cuando un script hijo valida la rama activa, el clon aislado debe usar `git checkout -B <rama> origin/<rama>` y confirmar tanto el HEAD como `branch --show-current` antes de invocarlo.

## Reglas nuevas obligatorias

1. Antes de dar PowerShell, revisar esta auditoría y las bitácoras anteriores.
2. PowerShell solo puede ser un lanzador corto de un script versionado.
3. Nunca repetir CRM, matrices completas ni validadores aprobados sin regresión demostrada.
4. Clasificar el fallo antes de corregir: aplicación, backend, validador, harness, entorno o runner.
5. Un fallo del harness no autoriza cambios en la aplicación.
6. La evidencia visual debe quedar fuera de perfiles y cachés.
7. Todo error debe copiar automáticamente el diagnóstico exacto al portapapeles.
8. El worktree con cambios locales no se toca; el delta se ejecuta en aislamiento.
9. Ningún runner puede hacer deploy, importación, reglas, commit, push, merge o escrituras reales.
10. Cuando Hosting productivo quede configurado, los despliegues se harán por canal automatizado; PowerShell dejará de ser flujo normal.
11. Antes de lanzar un script hijo, el runner debe verificar sus precondiciones reales: rama activa, HEAD, archivos requeridos y entorno esperado.

## Estado después de esta auditoría

- CRM OP1: cerrado 10/10; no repetir.
- Aseguradoras OP2: 13/15 técnicamente demostrados; Asesor aprobado y Dirección/Operativo con acceso correcto pero falso negativo del harness anterior.
- Aplicación/backend: sin cambio requerido por estos hallazgos.
- Smoke v1.222: limitado a Dirección desktop y Operativo tablet, con selectores por tarjeta.
- Runner v1.222: corregido para mantener activa la rama obligatoria en el clon aislado antes del integrador.
- Próxima ejecución permitida: solo Dirección desktop y Operativo tablet; después combinar evidencia 15/15.
