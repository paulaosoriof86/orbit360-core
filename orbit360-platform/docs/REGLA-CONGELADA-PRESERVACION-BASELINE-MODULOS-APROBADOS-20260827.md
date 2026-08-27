# REGLA CONGELADA — PRESERVACIÓN DE BASELINE Y VALIDACIÓN VISUAL POR MÓDULO

Fecha: 2026-08-27  
Proyecto: Orbit 360 / A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Regla vinculante

La referencia de producto para la validación post-go-live es la candidata certificada y desplegada:

- artifactId `9504702901`;
- sourceHead `8c9668d6d423e82826b0295431ec699390d79b4b`;
- manifest SHA-256 `b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c`;
- ZIP SHA-256 `4a3660a18229a923412aa5a1bffc0817b1d5666c83ba96c81c92cea0fce9491c`;
- 194 archivos certificados, 189 públicos y 53 scripts bajo `modules/`.

> **Módulo trabajado/aprobado + misma baseline certificada = preservar, no reconstruir.**

Una anomalía visual no autoriza a:

- rediseñar o reconstruir el módulo;
- reimportar sus datos;
- volver a investigar desde cero su proceso funcional;
- sustituir owners o contratos ya cerrados;
- reabrir un gate histórico.

Primero se diagnostica el delta contemporáneo entre la baseline aprobada y lo que se visualiza: acceso, rol/scope, wiring, owner, store/readiness, proyección, cache/service worker, contrato de datos o validador.

## Protección mecánica

Autoridad de preservación:

- registry: `orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json`;
- guard: `tools/orbit360-certified-product-preservation-v20260827.mjs`;
- workflow canónico: `.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml`;
- invariant: `tools/orbit360-single-state-invariant-v20260827.mjs`.

El guard falla cerrado si detecta un cambio no aprobado desde `8c9668d6...` en:

- `orbit360-platform/modules/`;
- `orbit360-platform/core/`;
- `orbit360-platform/data/`;
- `orbit360-platform/styles/`;
- `orbit360-platform/index.html`;
- `orbit360-platform/product-runtime-config.js`;
- `orbit360-platform/sw.js`.

Un cambio funcional intencional solo puede continuar cuando se convierta explícitamente en una nueva baseline aceptada; no se absorbe silenciosamente.

## Qué significa “aprobado” en esta regla

Todos los módulos y bridges presentes en la candidata certificada se consideran **baseline aprobada para preservación y regresión visual**. Esta regla no reescribe retrospectivamente la madurez histórica de integraciones/backend que la documentación haya marcado como posterior; evita que un módulo trabajado sea tratado como vacío o vuelva a diseñarse por una falla de visualización.

La última visualización humana aprobada de agosto y el trabajo profundo previo se usan como referencia de regresión. Una diferencia observada ahora se trata como **delta contemporáneo** hasta demostrar lo contrario; no como ausencia histórica de construcción.

## Método de validación post-go-live

Para cada módulo:

1. recuperar primero la última conclusión forense/funcional ya cerrada del módulo;
2. probar identidad de baseline source-only;
3. probar owner/wiring/contrato semántico vigente cuando exista owner específico;
4. abrir el módulo en la sesión humana productiva;
5. comparar lo visible contra el aprobado, no contra una reconstrucción nueva;
6. si coincide, conservar `PASS_PRESERVED` y avanzar;
7. si no coincide, clasificar la primera divergencia contemporánea sin reabrir causas históricas descartadas;
8. corregir únicamente la capa causal;
9. volver a visualizar ese módulo antes de avanzar.

No se acumulan módulos invisibles para revisarlos todos al final. La validación es incremental y visible.

## Regla congelada de velocidad y estabilidad

La ruta debe optimizar simultáneamente **tiempo hasta la siguiente visualización** y **no repetición de causas**:

- no se construye un hardening transversal especulativo antes de poder volver a visualizar el módulo actual;
- antes de browser/runtime se usa el preflight/gate-contract vigente requerido por las reglas maestras;
- se recuperan y preservan las conclusiones recientes ya demostradas antes de formular nuevas hipótesis;
- se traza únicamente la primera divergencia real todavía abierta;
- se corrige una sola capa causal;
- se hace una verificación acotada;
- se vuelve a visualización humana inmediatamente;
- solo una causa real ya demostrada se incorpora después al guard transversal reutilizable.

Un síntoma de rendimiento no autoriza a inflar timeouts. Debe medirse por fronteras: Auth → membership/sesión → store/readiness → router → módulo → capacidad específica. Si una superficie finalmente carga, la lentitud sigue abierta como defecto de rendimiento, pero no convierte por sí sola el módulo en “no construido” ni obliga a reinvestigar su proceso funcional.

## Secuencia inicial

`Aseguradoras → Cliente 360 → Pólizas → Vehículos → Recibos/cartera → Cobros → Ops → Leads → resto de superficies`.

Aseguradoras ya cuenta además con guard semántico específico del owner `20260723.2`.

## Precisión congelada — Aseguradoras

**Aseguradoras SÍ se visualiza.** El pendiente observado actualmente no es reconstruir el directorio ni recuperar la ficha completa. El delta puntual observado es el acceso seguro a las contraseñas de las plataformas para los roles autorizados, más la latencia perceptible como problema de rendimiento separado.

### Conclusiones históricas ya cerradas que NO se vuelven a investigar desde cero

1. Las contraseñas no se guardan ni se muestran como dato normal de la ficha o de `Orbit.store`. La arquitectura aprobada usa referencias/guardas seguras y acceso controlado por rol.
2. El bridge/proveedor seguro recibe contexto de permiso y entidad; el navegador no debe recibir ni persistir secretos en claro.
3. `TARGET_MAPPING_EMPTY_BEFORE_PROVIDER` ya fue diagnosticado: el mapeo destino quedó vacío **antes** de invocar al proveedor.
4. `REQUEST_DID_NOT_REACH_PROVIDER` ya fue diagnosticado: la solicitud **no alcanzó al proveedor**.
5. Esos dos hallazgos prueban una falla pre-proveedor y **no prueban** ausencia, rechazo ni incapacidad del proveedor.
6. El cierre histórico clasificó esa ruta como `DATA_CONTRACT_FAILURE / PROVIDER_NOT_INVOKED`; no corresponde degradarla retrospectivamente a una hipótesis genérica de “proveedor ausente”.
7. Existió bridge seguro trabajado/validado en LAB; la evidencia posterior no confirmó por sí sola una entrega productiva completa de valores protegidos. Por tanto, el problema actual debe compararse contra ese linaje y contra la promoción/wiring efectivo de la candidata, no diseñarse de nuevo.

### Regla para el síntoma actual

La ausencia actual de contraseñas en la visualización **no autoriza** a concluir a priori que el proveedor no existe, no está registrado o no fue materializado. La primera comprobación debe responder únicamente:

> ¿El síntoma post-go-live actual reproduce la causa histórica pre-proveedor (`TARGET_MAPPING_EMPTY_BEFORE_PROVIDER` / `REQUEST_DID_NOT_REACH_PROVIDER`) o existe una divergencia posterior de promoción/wiring respecto del bridge ya trabajado?

Solo si la evidencia contemporánea demuestra una divergencia distinta se abre una clasificación nueva. No se repite la investigación del proveedor ni se reimporta el directorio para resolverlo.

Por seguridad:

- “la contraseña no aparece como texto guardado en la ficha” **no es un defecto**;
- “el rol autorizado no puede obtener el acceso por el mecanismo seguro ya diseñado” **sí es el síntoma vigente a resolver**;
- no se escriben contraseñas reales en código, documentación, `Orbit.store` ni módulos genéricos;
- no se atribuye el fallo al proveedor sin evidencia de que la solicitud efectivamente llegó a él.

### Criterio de cierre de Aseguradoras para avanzar

Aseguradoras se conserva como módulo visualmente recuperado y no se reconstruye. Para cerrar el delta de credenciales antes de avanzar se debe:

- comparar el camino actual `credentialRef/mapping → bridge seguro → solicitud protegida` contra el linaje ya trabajado;
- identificar la primera diferencia respecto del root cause/fix histórico, sin reabrir lo ya probado;
- corregir solo esa diferencia si existe;
- verificar el acceso autorizado sin exponer secretos;
- volver a visualizar Aseguradoras después de la corrección aplicable.

La latencia de Aseguradoras y del login se mide y diagnostica por separado; no se usa para reabrir la arquitectura de credenciales.

## Siguiente módulo: Cliente 360

Cliente 360 no parte de una hipótesis abierta desde cero. La investigación post-go-live reciente ya confirmó una divergencia concreta: el render base recibe una colección vacía y muestra `0 de 0`, mientras un bridge posterior reescribe los KPIs con el universo cargado. Esa evidencia descarta “ausencia de datos” como explicación suficiente y no autoriza reimportación.

La siguiente acción al entrar a Cliente 360 es continuar desde esa conclusión: localizar/corregir el owner productivo de `Orbit.clientProjection` y el bootstrap/readiness que alimenta el primer render vacío, validar lista/ficha/calidad y volver a visualización humana. No se reinicia el diagnóstico de clientes.

## Regla sobre gates y falsos PASS

Un PASS histórico conserva valor, pero si se demuestra que el validador no comprobaba el comportamiento exigido se clasifica `VALIDATOR_STALE` y se corrige el mecanismo antes de tocar producto. El PASS técnico previo no se usa para negar una anomalía visual reproducible ni la anomalía visual se usa para reconstruir el módulo.

La verificación humana de correo + contraseña ya demostrada no debe reabrirse por un marcador histórico obsoleto. Si un paquete o proyección secundaria vuelve a declarar `HUMAN-LOGIN-VERIFICATION` como pendiente mientras la evidencia vigente ya lo cerró, esa discrepancia se trata como sincronización/validador obsoleto y no como orden para repetir recuperación de acceso. La lentitud del login permanece como síntoma de rendimiento distinto de la validez de las credenciales humanas.

## Anti-desencarrilamiento entre conversaciones

Ante una conversación nueva, antes de decidir la siguiente acción se debe mantener esta jerarquía:

1. reglas maestras/addenda;
2. estado vivo único del ledger y HEAD actual;
3. conclusiones forenses/funcionales recientes ya cerradas del módulo;
4. esta regla congelada de preservación y visualización;
5. contrato diferencial del módulo actual;
6. evidencia humana más reciente del mismo módulo.

No se vuelve a una investigación global por perder contexto conversacional. Si aparece una contradicción documental, se clasifica y corrige la contradicción; no se reinicia el producto ni se resucitan hipótesis ya descartadas.

## Impacto Academia

La Academia debe enseñar esta distinción: **módulo visible vs capacidad protegida pendiente**, credenciales por referencia segura, recuperación controlada por rol, diferencia entre falla pre-proveedor y falla del proveedor, diferencia entre defecto funcional/contrato de datos/entorno/validador obsoleto y regla de no reimportar para resolver problemas de wiring o visualización.

## Estado operativo

Este documento no replica fase, revisión, autorización ni siguiente acción. El estado vivo continúa exclusivamente en `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`.

No autoriza runtime, browser, secrets, Firestore, writes, deploy, producción, `main` ni merge.
