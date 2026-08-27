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

1. probar identidad de baseline source-only;
2. probar owner/wiring/contrato semántico vigente cuando exista owner específico;
3. abrir el módulo en la sesión humana productiva;
4. comparar lo visible contra el aprobado, no contra una reconstrucción nueva;
5. si coincide, conservar `PASS_PRESERVED` y avanzar;
6. si no coincide, clasificar la primera divergencia;
7. corregir únicamente la capa causal;
8. volver a visualizar ese módulo antes de avanzar.

No se acumulan módulos invisibles para revisarlos todos al final. La validación es incremental y visible.

## Regla congelada de velocidad y estabilidad

La ruta debe optimizar simultáneamente **tiempo hasta la siguiente visualización** y **no repetición de causas**:

- no se construye un hardening transversal especulativo antes de poder volver a visualizar el módulo actual;
- antes de browser/runtime se usa el preflight/gate-contract vigente requerido por las reglas maestras;
- se traza únicamente la primera divergencia real;
- se corrige una sola capa causal;
- se hace una verificación acotada;
- se vuelve a visualización humana inmediatamente;
- solo una causa real ya demostrada se incorpora después al guard transversal reutilizable.

Un síntoma de rendimiento no autoriza a inflar timeouts. Debe medirse por fronteras: Auth → membership/sesión → store/readiness → router → módulo → proveedor específico. Si una superficie finalmente carga, la lentitud sigue abierta como defecto de rendimiento, pero no convierte por sí sola el módulo en “no construido” ni obliga a detener la revisión visual de otros módulos cuando la visualización sigue siendo utilizable.

## Secuencia inicial

`Aseguradoras → Cliente 360 → Pólizas → Vehículos → Recibos/cartera → Cobros → Ops → Leads → resto de superficies`.

Aseguradoras ya cuenta además con guard semántico específico del owner `20260723.2`.

## Precisión congelada — Aseguradoras

**Aseguradoras SÍ se visualiza.** El pendiente observado actualmente no es reconstruir el directorio ni recuperar la ficha completa. El alcance puntual es:

1. **acceso seguro a las contraseñas de las plataformas de las aseguradoras** para roles autorizados;
2. estado/wiring real del proveedor seguro que resuelve los `credentialRef`;
3. latencia perceptible del módulo como síntoma de rendimiento separado.

Por seguridad, la contraseña real **no debe persistirse ni mostrarse como dato normal de la ficha o de `Orbit.store`**. El contrato vigente exige `credentialRef` y proveedor seguro; la experiencia esperada es recuperación/copiar/revelar de forma controlada, auditada y temporal para el rol autorizado. Por tanto:

- “la contraseña no aparece como texto guardado en la ficha” **no es un defecto**;
- “el rol autorizado no puede recuperar/copiar/revelar la contraseña mediante el proveedor seguro” **sí es una anomalía a diagnosticar**;
- no se vuelve a importar el directorio para resolverlo;
- no se escriben contraseñas reales en código, documentación, `Orbit.store` ni módulos genéricos.

Clasificación por primera divergencia:

- contrato presente + proveedor/configuración real no disponible en runtime → `ENVIRONMENT_FAILURE`;
- proveedor disponible + wiring/registro/acción del frontend no llega al proveedor → `FUNCTIONAL_DEFECT`;
- `credentialRef` ausente, inválido o no resoluble respecto del dato canónico → `DATA_CONTRACT_FAILURE`;
- gate que declara PASS sin comprobar recuperación segura real → `VALIDATOR_STALE`;
- exposición indebida, bypass de rol o secreto persistido → `SECURITY_FAILURE` y fail-closed.

Hasta que se trace la primera divergencia, no se asigna una causa por intuición.

### Criterio de cierre de Aseguradoras para avanzar

Aseguradoras puede marcarse `PASS_PRESERVED` cuando:

- directorio/ficha continúan visibles respecto de la baseline aprobada;
- los roles autorizados pueden usar el mecanismo seguro de credenciales conforme al contrato, o el proveedor pendiente queda identificado honestamente como capacidad externa no materializada sin falsear un PASS;
- no se expone ninguna contraseña fuera del canal seguro;
- el rendimiento queda medido y, si excede el umbral operativo aceptable, con causa clasificada y corrección causal acotada;
- Paula vuelve a visualizar el módulo después de la corrección causal aplicable.

No se espera a reconstruir otros módulos para realizar esta visualización.

## Siguiente módulo: Cliente 360

Cliente 360 ya dispone de contrato diferencial post-go-live específico. Al llegar a él se conserva la misma candidata, no se reimportan clientes, no se reabre el gate histórico y se corrige únicamente la primera divergencia entre conteos canónicos/scopes/store/render si existiera.

## Regla sobre gates y falsos PASS

Un PASS histórico conserva valor, pero si se demuestra que el validador no comprobaba el comportamiento exigido se clasifica `VALIDATOR_STALE` y se corrige el mecanismo antes de tocar producto. El PASS técnico previo no se usa para negar una anomalía visual reproducible ni la anomalía visual se usa para reconstruir el módulo.

La verificación humana de correo + contraseña ya demostrada no debe reabrirse por un marcador histórico obsoleto. Si un paquete o proyección secundaria vuelve a declarar `HUMAN-LOGIN-VERIFICATION` como pendiente mientras la evidencia vigente ya lo cerró, esa discrepancia se trata como sincronización/validador obsoleto y no como orden para repetir recuperación de acceso.

## Anti-desencarrilamiento entre conversaciones

Ante una conversación nueva, antes de decidir la siguiente acción se debe mantener esta jerarquía:

1. reglas maestras/addenda;
2. estado vivo único del ledger y HEAD actual;
3. esta regla congelada de preservación y visualización;
4. contrato diferencial del módulo actual;
5. evidencia humana más reciente del mismo módulo.

No se vuelve a una investigación global por perder contexto conversacional. Si aparece una contradicción documental, se clasifica y corrige la contradicción; no se reinicia el producto.

## Impacto Academia

La Academia debe enseñar esta distinción: **módulo visible vs capacidad protegida pendiente**, credenciales por referencia segura, recuperación controlada por rol, diferencia entre defecto funcional/contrato de datos/entorno/validador obsoleto y regla de no reimportar para resolver problemas de wiring o visualización.

## Estado operativo

Este documento no replica fase, revisión, autorización ni siguiente acción. El estado vivo continúa exclusivamente en `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`.

No autoriza runtime, browser, secrets, Firestore, writes, deploy, producción, `main` ni merge.
