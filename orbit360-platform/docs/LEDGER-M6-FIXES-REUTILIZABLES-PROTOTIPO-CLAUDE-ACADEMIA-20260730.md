# LEDGER M6 — FIXES REUTILIZABLES PARA PROTOTIPO, CLAUDE Y ACADEMIA

Fecha: 2026-07-30  
Proyecto: Orbit 360 — A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

Este documento extiende el ledger acumulado de fixes locales y evita que los aprendizajes M6 queden únicamente en la implementación productiva.

## 1. Inventario reusable

| Hallazgo / fix | Aplicación reusable | Clasificación | Estado |
|---|---|---|---|
| Validador confundía menciones textuales de `localStorage` en comentarios con uso operativo | Los validadores deben detectar llamadas/expresiones operativas, no palabras en comentarios o mensajes | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Incorporado al criterio de validación |
| Header conservaba identidad placeholder | La identidad visible debe hidratarse desde Auth/membership y nunca desde persona demo fija | `REPLICABLE_CLAUDE_INMEDIATO` | Corregido en owner productivo; preservar en próximas candidatas |
| Shell productivo no puede reutilizar seed/demo/LAB | Construir shell derivado que retire loaders LAB, seed y Auth demo sin duplicar toda la UI | `REPLICABLE_CLAUDE_ACUMULADO` | Patrón reusable; implementación backend protegida |
| Configuración Web productiva | Derivar configuración pública en runner desde entorno reconciliado; no guardar secreto ni tenant real en owner genérico | `REPLICABLE_CLAUDE_ACUMULADO` + `BACKEND_PROTEGIDO_NO_CLAUDE` | Vigente |
| Store productivo | `read-only`, sin fallback local, tenant desde membership, escritura local bloqueada | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Vigente |
| Colección no migrada no se inventa para satisfacer smoke | Distinguir fuente vs colección canónica; Asesor se resuelve desde membership y no obliga a migrar 7 asesores por conveniencia | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Vigente |
| Manifiesto runtime incluía colecciones no promovidas canónicamente | La lista de colecciones productivas debe ser intersección exacta entre fuentes migradas/aprobadas y política de acceso; módulos futuros no se agregan “por anticipado” | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | `DATA_CONTRACT_FAILURE` 6.1.6 cerrado; runtime M6 = clientes + aseguradoras |
| Colección sin política bloqueaba todo el bootstrap | Un manifiesto debe validarse contra `COLLECTION_POLICY` antes de adjuntar snapshots; una colección desconocida permanece fail-closed y no se promueve | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Preflight 6.1.7 incorporado |
| Política lógica usaba `country`, pero el documento canónico físico usa `pais` | Separar nombres lógicos de acceso de campos físicos de persistencia; el adaptador productivo traduce aliases contra el esquema canónico antes de construir la query | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | `DATA_CONTRACT_FAILURE` 6.1.8 cerrado; alias productivo `country → pais` |
| Firestore devolvió snapshots válidos pero vacíos por un campo físico equivocado | Una consulta exitosa con cero documentos no prueba contrato correcto; contrastar siempre contra baseline esperado y campos físicos del esquema | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Smoke `20260730.4` exige 414/26 y verifica fields del query plan |
| App podía mostrar producto después del primer snapshot, no después de todas las colecciones activas | Readiness de store debe esperar todas las colecciones obligatorias o un estado explícitamente denied; cualquier snapshot error bloquea la UI | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Barrera `waitActiveCollections` incorporada |
| Diagnóstico runtime se asignaba después de assertions | Persistir primero el estado sanitizado observado y luego validar; así un fallo conserva evidencia útil de counts, plans y readiness | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Smoke `20260730.4` |
| Deploy multi-target incluía Storage inexistente | Antes de un deploy multi-target validar existencia/readiness real de cada target; un recurso opcional ausente se difiere fail-closed, no se crea para satisfacer el gate | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Causa raíz M6 cerrada |
| Verificación inmediata de Hosting devolvió 404 transitorio | Readiness post-deploy debe esperar propagación acotada y validar marcador/hash esperado antes de declarar fallo | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Owner implementado y validado estáticamente; run 30517683129 y revalidación 30520801419 |
| Smoke declaró 60 s pero Playwright usó 30 s | Al usar APIs con firma `(fn, arg?, options?)`, validar semánticamente la posición de argumentos; `waitForFunction` requiere `undefined` como segundo argumento cuando no hay `arg` | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | `VALIDATOR_STALE` cerrado; validatorRevision `20260730.2`; 6.1.5 PASS estático |
| Playwright no despachaba click porque la tarjeta con transición visual nunca satisfacía su actionability interna | No convertir una falsa negativa del automatizador en cambio de producto; separar estabilidad geométrica, hit-test y despacho del evento antes de declarar defecto funcional | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | `VALIDATOR_STALE` 6.1.10 cerrado; validator `20260730.5` |
| Hit-test semántico usó `elementFromPoint()` sin reproducir el scroll automático de Playwright | `visible` no equivale a `dentro del viewport`; antes del hit-test se debe centrar el target, estabilizar geometría post-scroll y probar coordenadas in-bounds | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | `VALIDATOR_STALE` 6.1.12 cerrado; validator `20260730.6`; 6.1.13 PASS estático |
| Gate legal aparecía 520 ms después de `showApp`, pero el smoke comprobaba su ausencia una sola vez | La readiness de navegador debe usar ventana de llegada + resolución de gates bloqueantes + ventana de quietud antes de entrar a cualquier módulo; la ausencia instantánea no prueba ausencia durante la transición | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | `VALIDATOR_STALE` 6.1.14 cerrado estáticamente; helper reusable + prueba sintética 520 ms PASS; validator `20260730.7` |
| `continue-on-error` hacía que la vista de Actions pareciera exitosa aunque el `outcome` real del smoke fuera failure | Los gates deben cerrar con `steps.<id>.outcome` y evidencia propia, no inferir éxito por presentación visual/conclusion | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Incorporado al cierre M6 y confirmado nuevamente en 6.1.14 |
| Un timeout de login sin contexto no permite distinguir lentitud de fallo funcional | Ante timeout, guardar diagnóstico sanitizado del estado de arranque: app presente/iniciada, status del store, noFallback y writeEnabled; nunca credenciales ni PII | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Ampliado desde smoke `20260730.3`; revisiones posteriores agregan plans/actionability |
| Salida del deploy no estaba en primer artifact | Toda etapa de riesgo debe conservar resultado sanitizado del proveedor para diagnóstico de causa raíz | `BACKEND_PROTEGIDO_NO_CLAUDE` + `ACADEMIA_ACTUALIZAR` | Corregido desde 6.1.2 |
| Request disparador no debe modificarse para marcar consumo | Trigger inmutable; consumo/estado se registra fuera del path disparador | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Regla permanente |
| Rollback dependía del mismo recurso que causó el fallo | El rollback debe minimizar dependencias y poder cerrar el sistema aunque falle un servicio opcional | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Corregido: Firestore deny-all + Hosting neutro; Storage diferido |
| Identidad/rol del usuario en UI | Nombre/email real desde Auth; roles y scope desde membership; sin placeholder ni rol inventado | `REPLICABLE_CLAUDE_INMEDIATO` | Preservar en prototipo/candidatas |

## 2. Lo que sí debe viajar al prototipo / próxima candidata Claude

- identidad visible derivada de sesión real/proyección, nunca persona fija;
- estados fail-closed honestos y sin copy técnico;
- separación visual entre UI aprobada y owners de entorno;
- responsive de Dirección, Operativo y Asesor;
- selector de rol limitado a roles asignados;
- ausencia de seed/demo en cualquier shell que represente producto real;
- readiness explícito antes de mostrar una integración o servicio como activo;
- no crear datos o colecciones para hacer pasar un smoke;
- el manifiesto de colecciones activas debe provenir de migración/contrato vigente, no de módulos futuros;
- validar que toda colección activa tenga política conocida antes del bootstrap;
- separar campo lógico de política y campo físico de persistencia mediante aliases explícitos y auditables;
- validar queries contra el esquema real de migración, no contra nombres conceptuales;
- no interpretar snapshot vacío como éxito funcional si existe un baseline canónico esperado;
- esperar snapshots de todas las colecciones activas antes de mostrar la aplicación;
- guardar diagnóstico sanitizado antes de ejecutar assertions que pueden fallar;
- distinguir error funcional de error de validador, entorno, pipeline o contrato de datos;
- validar firmas de APIs de automatización, especialmente argumentos opcionales y timeouts;
- no usar `continue-on-error` como señal de éxito: leer `outcome` y evidencia del gate;
- validar actionability por capas: DOM → visible → scroll → estabilidad → viewport → hit-test → evento → resultado funcional;
- resolver gates bloqueantes diferidos mediante ventana de llegada y ventana de quietud antes de probar cualquier módulo;
- reutilizar la misma primitiva de browser readiness en Pólizas, Vehículos, Cobros, Siniestros, Comisiones, Documentos y módulos posteriores;
- no usar `force:true` ni alterar CSS aprobado para ocultar falsos negativos del automatizador.

## 3. Lo que NO se envía a Claude

- nombres de proyectos Firebase;
- tenant real A&S;
- service accounts;
- nombres de secrets;
- IAM;
- Rules completas;
- credenciales de login;
- scripts de diagnóstico/deploy con infraestructura real;
- hashes/digests que puedan actuar como evidencia interna sensible.

Clasificación: `BACKEND_PROTEGIDO_NO_CLAUDE`, `TENANT_AYS_ONLY` o `SECRETO_DATO_REAL` según corresponda.

## 4. Impacto Academia

La Academia debe enseñar con el caso M6:

1. `FUNCTIONAL_DEFECT` no es lo mismo que `VALIDATOR_STALE`.
2. Un recurso inexistente es `ENVIRONMENT_FAILURE`, no justificación para crearlo automáticamente.
3. Una release creada con un GET 404 inmediato puede ser `PIPELINE_MECHANISM_FAILURE` de readiness/propagación.
4. Después de dos fallos en la misma etapa se aplica `STOP_RETRY`.
5. Rollback debe reducir capacidades y dependencias.
6. Un smoke debe probar datos/roles/comportamiento reales, no forzar migraciones artificiales.
7. Un timeout configurado en el lugar equivocado puede ser un defecto del validador, no del producto.
8. Con `continue-on-error`, `conclusion` visible y `outcome` contractual no son equivalentes.
9. Un timeout debe producir diagnóstico sanitizado suficiente para clasificar causa raíz sin exponer secretos.
10. Un manifiesto runtime que excede las fuentes canónicamente migradas es `DATA_CONTRACT_FAILURE`, aunque las colecciones futuras sean válidas conceptualmente.
11. Un alias lógico/físico incorrecto puede devolver una query técnicamente exitosa y funcionalmente vacía.
12. El baseline canónico debe formar parte del smoke: 0 resultados no es aceptable si el contrato exige 414/26.
13. Readiness de aplicación significa que todas las dependencias obligatorias están listas, no que una sola haya respondido.
14. Documentación y evidencia acompañan el avance; no sustituyen la implementación.
15. Un automatizador que no llega a despachar el evento no ha demostrado un defecto funcional del producto.
16. Un elemento `visible` puede estar fuera del viewport; un hit-test semántico debe reproducir scroll, estabilidad post-scroll y coordenadas válidas antes de `elementFromPoint()`.
17. Un gate asíncrono puede aparecer después de un chequeo de ausencia; la readiness correcta espera una ventana de llegada, resuelve bloqueadores y exige quietud antes de probar funcionalidad.
18. Una corrección de infraestructura de validación debe viajar a todos los módulos posteriores, no duplicarse por dominio.

## 5. Regla de empalme futura

Antes de aceptar una nueva candidata Claude se debe comparar específicamente contra este ledger además del ledger acumulado 20260721. Ninguna candidata puede reintroducir:

- identidad demo en header;
- loaders LAB/seed en shell producto;
- fallback a almacenamiento local para tenant/sesión/config productiva;
- roles no asignados;
- integración visible como activa cuando el recurso real no existe;
- colecciones futuras dentro del manifiesto productivo antes de migrarlas/autorizar su política;
- queries productivas que usen directamente un nombre lógico sin validar su campo físico canónico;
- readiness basado en la primera colección en lugar de todas las colecciones obligatorias;
- verificación de Hosting de un solo intento inmediatamente después del deploy;
- timeouts de automatización configurados en una posición de argumento incorrecta;
- gates que confundan `continue-on-error` con éxito contractual;
- click/hit-test que asuma que `visible` implica estar dentro del viewport;
- chequeos instantáneos de ausencia para overlays/gates que pueden aparecer de forma diferida;
- harnesses separados por módulo que dupliquen readiness, integridad o rollback ya resueltos transversalmente;
- `force:true` o cambios de animación usados para hacer pasar una prueba sin demostrar un defecto del producto.
