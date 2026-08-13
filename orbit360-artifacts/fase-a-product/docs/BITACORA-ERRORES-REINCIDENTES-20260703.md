# Bitácora de errores reincidentes · Orbit 360

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 / A&S / Backend LAB  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Motivo:** errores operativos repetidos en ejecución local que generan reproceso y ya habían sido advertidos en sesiones anteriores.

---

## E-REC-001 · Uso de `git clean -fd` en repo dentro de OneDrive

- **Fecha:** 2026-07-03
- **Módulo/área:** Backend LAB / scripts PowerShell / Git local
- **Síntoma:** `git clean -fd` intenta borrar carpetas no rastreadas como `.agents/`, `.codex/` y subdirectorios `.git/objects/*`, queda preguntando `Should I try again? (y/n)` y bloquea la consola.
- **Esperado:** no usar comandos interactivos/destructivos en una carpeta sincronizada por OneDrive o usada por Codex/agentes.
- **Causa raíz:** se repitió un patrón ya problemático: limpiar toda la working tree con `git clean -fd`, aunque el proyecto contiene carpetas no rastreadas bloqueadas por Windows/OneDrive/agentes.
- **Archivo/función:** scripts de recuperación/aplicación generados para v1.88/v1.97.
- **Fix o mejora aplicada:** se debe reemplazar por flujos sin `git clean`; usar `git reset --hard origin/<branch>` solo para archivos tracked, ignorando no rastreados, o respaldar y pedir confirmación explícita antes de limpieza.
- **Impacto:** alto; bloquea la consola, confunde a Paula y retrasa el empalme.
- **Estado:** ABIERTO COMO REGLA OPERATIVA / NO REPETIR.
- **Regla:** en Orbit 360 no volver a entregar bloques que incluyan `git clean -fd` salvo autorización expresa y explicación del riesgo.

---

## E-REC-002 · Pegar bloques mientras Git espera respuesta interactiva `(y/n)`

- **Fecha:** 2026-07-03
- **Módulo/área:** PowerShell / ejecución local
- **Síntoma:** Git pregunta `Should I try again? (y/n)`; al pegar un bloque entero, Git interpreta cada línea como respuesta inválida y repite `Sorry, I did not understand your answer`.
- **Esperado:** si aparece una pregunta interactiva, responder solo `n` o cancelar con `Ctrl + C`; no pegar bloques completos.
- **Causa raíz:** se dieron instrucciones de continuar con nuevos bloques sin aislar suficientemente el estado interactivo de Git.
- **Archivo/función:** instrucciones operativas de chat, no código de app.
- **Fix o mejora aplicada:** cuando la consola esté en prompt `(y/n)`, la única instrucción válida debe ser `n` + Enter o `Ctrl + C`. No se debe enviar ningún bloque hasta recuperar el prompt `PS ...>`.
- **Impacto:** alto; la consola queda inundada de errores y el usuario pierde confianza.
- **Estado:** ABIERTO COMO REGLA OPERATIVA / NO REPETIR.

---

## E-REC-003 · Scripts de smoke dependientes de Python sin verificar herramienta disponible

- **Fecha:** 2026-07-03
- **Módulo/área:** Smoke local / servidor estático
- **Síntoma:** el smoke v1.97 falló con `No encontré py ni python para levantar servidor local`.
- **Esperado:** usar una herramienta confirmada previamente en el entorno de Paula. En este proyecto ya se había validado Node disponible.
- **Causa raíz:** script de smoke usó `py/python -m http.server` aunque Node ya estaba validado y Python no.
- **Archivo/función:** `tools/orbit360-smoke-v197-demo-lab.ps1`.
- **Fix o mejora aplicada:** crear nuevo smoke que use Node para servidor local o incluya fallback Node primero. No depender de Python.
- **Impacto:** medio-alto; todas las validaciones críticas pasaron, pero el flujo se detuvo al levantar servidor.
- **Estado:** ABIERTO / CORREGIR SCRIPT.
- **Regla:** scripts locales de Orbit 360 deben usar Node cuando ya está validado; no asumir Python.

---

## E-REC-004 · `$ErrorActionPreference='Stop'` con comandos Git que escriben progreso por stderr

- **Fecha:** 2026-07-03
- **Módulo/área:** PowerShell / Git
- **Síntoma:** `git fetch` imprimió progreso por stderr y PowerShell lo trató como `NativeCommandError`, deteniendo el script aunque Git sí avanzó.
- **Esperado:** no tratar automáticamente stderr de Git como fallo; validar por `$LASTEXITCODE`.
- **Causa raíz:** combinación de `$ErrorActionPreference='Stop'` + redirección/pipeline de comandos nativos Git.
- **Archivo/función:** `tools/orbit360-smoke-v197-demo-lab.ps1` y bloques PowerShell derivados.
- **Fix o mejora aplicada:** encapsular Git con helper que capture salida y revise exit code, o evitar Git en scripts de smoke cuando la rama ya está sincronizada.
- **Impacto:** alto; generó falso error y otra ronda de instrucciones.
- **Estado:** ABIERTO / CORREGIR SCRIPTS.
- **Regla:** en bloques para Paula, los comandos Git deben manejar stderr explícitamente y no depender de `$ErrorActionPreference` para éxito/fallo.

---

## E-REC-005 · Reportes con codificación ilegible al copiar/pegar

- **Fecha:** 2026-07-03
- **Módulo/área:** PowerShell / reportes
- **Síntoma:** el reporte copiado aparece con espacios entre caracteres: `F e c h a  l o c a l...`.
- **Esperado:** reportes legibles en Notepad y al pegar en ChatGPT.
- **Causa raíz:** mezcla de codificación/salida de PowerShell 5.1, `Set-Content -Encoding UTF8`, clipboard y caracteres especiales; posible lectura como UTF-16/UTF-8 cruzado.
- **Archivo/función:** scripts de reporte local.
- **Fix o mejora aplicada:** simplificar reportes ASCII cuando sea posible, evitar emojis/caracteres especiales, usar `Out-File -Encoding utf8`, y si se pega ilegible, pedir solo el contenido relevante del reporte o captura.
- **Impacto:** medio; no afecta app, pero dificulta auditoría y genera frustración.
- **Estado:** ABIERTO / MEJORAR PLANTILLA DE REPORTES.

---

## E-REC-006 · Empalme de prototipo Claude sobre backend sin preservar `core/auth.js` LAB

- **Fecha:** 2026-07-03
- **Módulo/área:** Auth / Backend LAB
- **Síntoma:** el empalme v1.97 reemplazó `core/auth.js` por versión demo pura de Claude y eliminó lógica Firebase LAB (`loginFirebase`, `onAuthStateChanged`, etc.).
- **Esperado:** preservar modo dual demo + Firebase LAB al empalmar prototipos Claude.
- **Causa raíz:** los archivos de prototipo puro no conocen los hooks backend LAB; se aplicó el archivo de Claude y luego se detectó la regresión.
- **Archivo/función:** `orbit360-platform/core/auth.js`.
- **Fix o mejora aplicada:** commit `2361a1ac55bb9f28236eddc684ae4282c6fffa54` restauró Auth dual demo + Firebase LAB conservando identidad ficticia v1.97.
- **Impacto:** P0; habría roto login backend LAB.
- **Estado:** RESUELTO EN BACKEND LAB / REGLA PERMANENTE.
- **Regla:** `core/auth.js` es archivo protegido en empalmes; si Claude lo modifica, se debe hacer merge manual, no reemplazo directo.

---

## Reglas consolidadas de no repetición

1. No usar `git clean -fd` en el repo local de Paula salvo autorización expresa.
2. No pegar bloques mientras Git pregunte `(y/n)`.
3. No asumir Python; usar Node para servidor local si ya está validado.
4. No dejar que stderr de Git detenga scripts por falso error; validar `$LASTEXITCODE`.
5. No reemplazar `core/auth.js`, `data/store.js`, `data/store-firestore-lab.local.js`, `core/backend-lab-loader.js` ni `core/backend-lab-init.js` sin merge manual.
6. Reportes PowerShell deben ser legibles, sin caracteres innecesarios y con codificación estable.
7. Antes de entregar un bloque local, revisar si contradice una regla ya documentada.
