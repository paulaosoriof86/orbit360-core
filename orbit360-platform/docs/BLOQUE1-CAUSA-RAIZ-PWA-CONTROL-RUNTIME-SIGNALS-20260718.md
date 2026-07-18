# BLOQUE 1 · CAUSA RAÍZ Y CIERRE CONTROLADO 1.0.19

Fecha: 2026-07-18
Gate: block1-client360-insurers-lab-v20260717
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Producción: no autorizada

## Clasificación

PIPELINE_MECHANISM_FAILURE

No se clasificó como defecto funcional de Cliente 360 ni de Aseguradoras. El resultado 1.0.18 confirmó 414 clientes, 26 aseguradoras, 7 asesores, proyección canónica lista, respuesta HTTP 200, finalización y parseo del contrato de aseguradoras, y presencia del owner funcional.

## Primera etapa real fallida

canonical_tenant_insurer_core_ready con PIPELINE_STEP_TIMEOUT.

El artefacto observó simultáneamente:

- owner canónico presente;
- API funcional presente;
- solicitud del siguiente contrato tenant-runtime-config-index.js;
- ausencia de error de página;
- Router no observable desde el evaluador al agotarse la etapa.

## Causa raíz

El gate dependía de evaluaciones dentro de una página cuyo bootstrap podía estar congestionado y no exigía que el Service Worker recién activado controlara esa misma página antes de iniciar Router. Por eso podía existir progreso real sin que el evaluador devolviera la señal a tiempo.

## Corrección 1.0.19

1. Confirmar controlador PWA actual antes de cargar contratos runtime.
2. Emitir señales sanitizadas de PWA, contratos y Router.
3. Registrar por separado request, requestfinished, response y parse.
4. Limitar cada evaluación del navegador con timeout externo.
5. Reconocer transición canónica por owner funcional, señal explícita o solicitud del siguiente contrato.
6. Mantener fail-closed ante estados terminales.
7. Conservar watchdog global 900000 ms y presupuesto de proyección 450000 ms.

## Carriles

- Carril A: renderers de Cliente 360 y Aseguradoras preservados; no rediseño ni reimportación.
- Carril B: corrección limitada a PWA, Router y observabilidad del gate; backend protegido y reglas preservados.
- Carril C: se preservan 414 clientes, 26 aseguradoras y 7 asesores; no se escriben pólizas, vehículos, cobros ni cartera.

## Claude y Academia

- Clasificación Claude: BACKEND_PROTEGIDO_NO_CLAUDE para el mecanismo PWA/gate.
- Patrón reusable: la UI solo debe renderizar estados funcionales cuando los owners canónicos estén listos; nunca mostrar copy técnico de bootstrap.
- Academia: documentar la diferencia entre defecto funcional y fallo del pipeline/validador; no cambia contenido operativo visible hasta cerrar el gate.

## Regla de salida

Ejecutar el mismo gate una sola vez después de GO_GATE_CONTRACT. Aceptar exclusivamente evidencia sanitizada con ok:true. Si falla 1.0.19, detener reintentos y diagnosticar únicamente la primera etapa real con la evidencia de esa corrida.

## Publicación y retiro del mecanismo temporal

El contenido 1.0.19 fue validado y publicado sin mutar workflows mediante GITHUB_TOKEN. El workflow temporal y los scripts de transformación quedaron retirados antes de ejecutar el gate. No quedan staging, parches ni ejecutores de un solo uso activos en la rama.

## Solicitud única de ejecución

HEAD limpio previo: 6ee7f69f4740ca73d37422f521e842c1c420c23d.

Esta actualización documental solicita una única ejecución del workflow existente Orbit 360 Clientes y Aseguradoras Runtime Gate 20260717. El preflight contractual debe ejecutarse primero y solo una evidencia sanitizada con ok:true permite cerrar M1 y pasar a la revisión visual.

## Reconciliación 1.0.20

Clasificación: VALIDATOR_STALE.

La corrida 1.0.19 aprobó preflight, owners estáticos, credenciales LAB, conteos, publicación del canal, PWA controlada, proveedor Auth e interfaz Auth. El fallo ocurrió en un evaluador que volvió a comprobar Store, Router y Auth después de que canonical_auth_ui_ready ya había probado la secuencia canónica Orbit.store.init → Orbit.router.init → Orbit.auth.init.

El producto queda congelado. La versión 1.0.20 modifica únicamente el gate: amplía el observador CDP instalado antes de la navegación para registrar por separado data/store.js, core/router.js y core/auth.js; combina esa evidencia con canonical_auth_ui_ready; y elimina el evaluador duplicado. Cualquier fallo de parseo o ausencia de evidencia permanece fail-closed.

Carriles: Cliente 360 y Aseguradoras sin cambios; backend protegido preservado; 414 clientes, 26 aseguradoras y 7 asesores sin reimportación. Claude: BACKEND_PROTEGIDO_NO_CLAUDE. Academia: distinguir VALIDATOR_STALE de FUNCTIONAL_DEFECT y congelar producto cuando la evidencia previa ya demuestra el contrato funcional.

Salida: preflight vinculante primero; después el mismo gate una sola vez; cierre únicamente con resultado sanitizado ok:true.
