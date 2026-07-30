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
| Deploy multi-target incluía Storage inexistente | Antes de un deploy multi-target validar existencia/readiness real de cada target; un recurso opcional ausente se difiere fail-closed, no se crea para satisfacer el gate | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Causa raíz M6 cerrada |
| Verificación inmediata de Hosting devolvió 404 transitorio | Readiness post-deploy debe esperar propagación acotada y validar marcador/hash esperado antes de declarar fallo | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Owner implementado y validado estáticamente; run 30517683129 y revalidación 30520801419 |
| Smoke declaró 60 s pero Playwright usó 30 s | Al usar APIs con firma `(fn, arg?, options?)`, validar semánticamente la posición de argumentos; `waitForFunction` requiere `undefined` como segundo argumento cuando no hay `arg` | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | `VALIDATOR_STALE` cerrado; validatorRevision `20260730.2`; 6.1.5 PASS estático |
| `continue-on-error` hacía que la vista de Actions pareciera exitosa aunque el `outcome` real del smoke fuera failure | Los gates deben cerrar con `steps.<id>.outcome` y evidencia propia, no inferir éxito por presentación visual/conclusion | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Incorporado al cierre M6 y al diagnóstico de 6.1.4 |
| Un timeout de login sin contexto no permite distinguir lentitud de fallo funcional | Ante timeout, guardar diagnóstico sanitizado del estado de arranque: app presente/iniciada, status del store, noFallback y writeEnabled; nunca credenciales ni PII | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` | Implementado en smoke `20260730.2` |
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
- distinguir error funcional de error de validador, entorno o pipeline;
- validar firmas de APIs de automatización, especialmente argumentos opcionales y timeouts;
- no usar `continue-on-error` como señal de éxito: leer `outcome` y evidencia del gate.

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
10. Documentación y evidencia acompañan el avance; no sustituyen la implementación.

## 5. Regla de empalme futura

Antes de aceptar una nueva candidata Claude se debe comparar específicamente contra este ledger además del ledger acumulado 20260721. Ninguna candidata puede reintroducir:

- identidad demo en header;
- loaders LAB/seed en shell producto;
- fallback a almacenamiento local para tenant/sesión/config productiva;
- roles no asignados;
- integración visible como activa cuando el recurso real no existe;
- verificación de Hosting de un solo intento inmediatamente después del deploy;
- timeouts de automatización configurados en una posición de argumento incorrecta;
- gates que confundan `continue-on-error` con éxito contractual.
