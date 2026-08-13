# Orbit 360 A&S — cierre humano M1 y arranque controlado M2

Fecha: 2026-07-23
Repositorio: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open

## Aprobación humana M1

Paula confirma que:

- la aplicación carga con CSS completo;
- el directorio de Aseguradoras y los flujos probados son satisfactorios;
- el retraso inicial de carga no impide el uso;
- los títulos en celular todavía no son completamente responsive;
- ese hallazgo no bloquea el cierre de M1 ni el inicio de M2.

Resultado:

```text
M1: APROBADO Y CERRADO
M2: ELEGIBLE PARA INICIO CONTROLADO
M2 NO SIGNIFICA PÓLIZAS
```

## Deuda visual aceptada

Hallazgo: títulos móviles no completamente responsive.

Clasificación:

- FUNCTIONAL_DEFECT no bloqueante para M2;
- REPLICABLE_CLAUDE_ACUMULADO;
- ACADEMIA_ACTUALIZAR;
- pendiente del siguiente corte visual;
- cierre obligatorio antes de la release candidate productiva del Bloque 5.

No se abre un frente paralelo durante el bootstrap productivo read-only.

## Siguiente bloque vinculante

M2 corresponde al Bloque 2 del Plan Maestro: Bootstrap productivo read-only.

Objetivo:

- auditar y conectar los componentes productivos existentes;
- mantener todas las escrituras bloqueadas;
- resolver tenant desde membership, nunca desde query string;
- validar Auth, membership, multirol, scopes y aislamiento;
- instalar explícitamente el store productivo read-only;
- confirmar cero fallback a LAB, demo, seed o localStorage.

## Primera acción exacta de M2

Ejecutar una auditoría estática del baseline vivo para localizar y clasificar:

1. store-firestore-product-readonly-p0;
2. bootstrap productivo existente;
3. readiness fail-closed;
4. Auth/membership productivos;
5. query planner y aislamiento por tenant;
6. reglas y smokes existentes, sin aplicarlos todavía;
7. divergencias frente al Plan Maestro y HEAD actual.

Salida requerida:

- inventario de componentes reutilizables;
- gaps reales;
- archivos protegidos;
- contrato y gateId de M2;
- secuencia mínima de implementación;
- cero secretos, cero Firebase productivo, cero deploy, cero Rules, cero escrituras.

## Pólizas

Pólizas no es la siguiente acción inmediata. El orden vigente exige completar primero Bloques 2, 3, 4, 5 y 6. Después del primer go-live controlado, Pólizas es la primera fuente funcional de continuidad.

La prioridad operativa de Paula —Clientes 360, CRM, Pólizas, Cobros, Ops y Leads— queda preservada para la secuencia posterior, sin mezclar fuentes ni adelantar escrituras antes del bootstrap productivo seguro.

## Restricciones

- no main;
- no merge;
- no producción ni deploy por inferencia;
- no Functions ni Rules;
- no reimportación;
- no tocar datos reales durante la auditoría M2;
- no abrir Pólizas mientras el bootstrap productivo read-only no tenga contrato y preflight.

## Siguiente acción exacta

Auditar estáticamente el bootstrap productivo read-only existente contra el Plan Maestro, el registro de gates y HEAD; documentar el gap mínimo y preparar el contrato M2 sin usar capacidades externas.
