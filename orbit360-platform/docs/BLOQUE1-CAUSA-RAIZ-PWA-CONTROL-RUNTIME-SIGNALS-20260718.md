# BLOQUE 1 · CAUSA RAÍZ Y CIERRE CONTROLADO 1.0.20

Fecha: 2026-07-18
Gate: block1-client360-insurers-lab-v20260717
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Producción: no autorizada

## Clasificación 1.0.19

PIPELINE_MECHANISM_FAILURE

No se clasificó como defecto funcional de Cliente 360 ni de Aseguradoras. El resultado 1.0.18 confirmó 414 clientes, 26 aseguradoras, 7 asesores, proyección canónica lista, respuesta HTTP 200, finalización y parseo del contrato de aseguradoras, y presencia del owner funcional.

## Primera etapa real fallida en 1.0.19

canonical_tenant_insurer_core_ready con PIPELINE_STEP_TIMEOUT.

El artefacto observó owner canónico y API funcional, solicitud del contrato siguiente, ausencia de error de página y falta de observabilidad del Router desde el evaluador.

## Corrección 1.0.19

1. Confirmar controlador PWA actual antes de cargar contratos runtime.
2. Emitir señales sanitizadas de PWA, contratos y Router.
3. Registrar por separado request, requestfinished, response y parse.
4. Limitar evaluaciones del navegador con timeout externo.
5. Reconocer transición canónica por owner funcional, señal o solicitud del contrato siguiente.
6. Mantener fail-closed ante estados terminales.
7. Conservar watchdog global 900000 ms y presupuesto de proyección 450000 ms.

## Carriles preservados

- Carril A: Cliente 360 y Aseguradoras sin rediseño ni reimportación.
- Carril B: backend protegido, Auth, Router, Store y reglas preservados.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores; sin pólizas, vehículos, cobros ni cartera.

## Claude y Academia

- Claude: BACKEND_PROTEGIDO_NO_CLAUDE para PWA, gates y observadores.
- Patrón reusable: la UI solo renderiza estados funcionales cuando los owners canónicos están listos y nunca muestra copy técnico de bootstrap.
- Academia: distinguir defectos funcionales, fallos del pipeline y validadores obsoletos.

## Reconciliación 1.0.20

Clasificación: VALIDATOR_STALE.

La corrida 1.0.19 aprobó preflight, owners estáticos, credenciales LAB, conteos, publicación del canal, PWA controlada, proveedor Auth e interfaz Auth. El fallo ocurrió en un evaluador que volvió a comprobar Store, Router y Auth después de que canonical_auth_ui_ready ya había probado la secuencia canónica Orbit.store.init → Orbit.router.init → Orbit.auth.init.

El producto quedó congelado. La versión 1.0.20 modifica únicamente el gate: amplía el observador CDP instalado antes de la navegación para registrar por separado data/store.js, core/router.js y core/auth.js; combina esa evidencia con canonical_auth_ui_ready; y elimina el evaluador duplicado. Cualquier fallo de parseo o ausencia de evidencia permanece fail-closed.

## Estado de publicación

- Contrato 1.0.20 publicado y preflight vinculante aprobado antes del commit.
- Scripts de transformación retirados.
- Workflow de aplicación retirado.
- HEAD limpio previo a esta solicitud: 4e80c6975f4970a61afab6f54b0e1677cebd0a56.
- No se modificó producción, main, Auth, Router, Orbit.store, reglas ni datos.

## Solicitud única de salida

Ejecutar mediante workflow_dispatch exactamente una vez el workflow existente Orbit 360 Clientes y Aseguradoras Runtime Gate 20260717 sobre la rama autorizada. El preflight contractual debe correr primero. Aceptar exclusivamente evidencia sanitizada con ok:true; si falla la misma etapa, detener reintentos y diagnosticar solo ownerHandoffDiagnostic y browserParseDiagnostics.

## Reconciliación 1.0.21

Clasificación: VALIDATOR_STALE.

La corrida 1.0.20 superó preflight, arquitectura, datos, publicación LAB y ejecución del navegador. La primera etapa fallida fue canonical_auth_ui_ready. La evidencia sanitizada registró data/store.js, core/router.js y core/auth.js parseados sin errores; el proveedor Auth disponible; cero pageErrors; y progreso real de Router mediante solicitudes y señales de contratos. En el bootstrap canónico, Orbit.auth.init se invoca inmediatamente después de Orbit.router.init. El page.waitForFunction duplicó esa evidencia y quedó sin respuesta mientras la carga de contratos continuaba.

La versión 1.0.21 mantiene congelados producto, Auth, Router, Store, reglas y datos. Solo reemplaza el evaluador de canonical_auth_ui_ready por evidencia externa correlacionada: scripts owner parseados, proveedor Auth aprobado, progreso de Router y ausencia de errores de página. La comprobación permanece fail-closed ante cualquier parse failure, pageError o falta de progreso.

Carriles: A sin cambios en Cliente 360/Aseguradoras; B solo gate, registro y evidencia; C conserva 414 clientes, 26 aseguradoras y 7 asesores sin reimportación. Claude: BACKEND_PROTEGIDO_NO_CLAUDE. Academia: documentar que un hito UI puede probarse por orden canónico y señales externas cuando Runtime.evaluate queda congestionado.

Salida: preflight vinculante primero; mismo gate una sola vez; cierre exclusivamente con evidencia sanitizada ok:true.
