# Bloque 1 · VALIDATOR_STALE en proyección Cliente 360 · 2026-07-19

## Clasificación

- Tipo: `VALIDATOR_STALE`.
- Gate: `block1-client360-insurers-lab-v20260717`.
- Fuente: run oficial `29668369152`, contrato base `1.0.25`.
- Primer fallo: `desktop_direction_client360`.
- Código: `CLIENT_CANONICAL_PROJECTION_MISSING`.

## Evidencia observada

El runtime confirmó:

- 414 clientes en Store;
- scope Dirección = `all`;
- 414 filas visibles;
- KPI coincidente;
- ficha real abierta;
- nombre, tipo, estado y etiquetas completos;
- estado `pendiente_polizas`;
- helper `Orbit.clientProjection.version = 20260717.1`;
- marcador temporal `20260717.1-temporal`;
- `temporaryInPlaceBridge = true`.

El validador seguía exigiendo literalmente `20260716.1`. El producto no carecía de proyección; el literal esperado estaba obsoleto.

## Causa raíz

La proyección canónica evolucionó el 17 de julio y mantuvo un puente temporal para renderers antiguos. El validador del 16 de julio no evolucionó junto con el owner y confundió una versión vigente con ausencia de proyección.

## Corrección contractual 1.0.26

1. Congelar Cliente 360, Aseguradoras, Store, Auth, Router, reglas y datos.
2. Validar por separado el owner `20260717.1` y el puente `20260717.1-temporal`.
3. Exigir que el puente temporal esté declarado explícitamente.
4. Mantener sin relajación las pruebas de campos, estado, pestañas, scopes y conteos.
5. Actualizar overlay efectivo, preflight, validador, CHANGELOG, Claude y Academia juntos.
6. Ejecutar el gate oficial una sola vez después de retirar los workflows temporales.
7. Aceptar únicamente evidencia sanitizada `ok:true`.

## Alcance e impacto

- Producto: sin cambios.
- Cliente 360 renderer: sin cambios.
- Aseguradoras renderer: sin cambios.
- Datos: sin cambios; 414 clientes, 26 aseguradoras y 7 asesores preservados.
- Backend protegido: sin cambios.
- Producción, `main` y merge: no.

## Claude

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Regla reusable: los validadores deben comprobar contratos semánticos y versiones declaradas por el owner. Un puente temporal vigente debe validarse como puente; no debe interpretarse como proyección ausente. Owner, bridge, validator, registro efectivo, workflow y Academia deben evolucionar juntos.

## Academia

Clasificación: `ACADEMIA_ACTUALIZAR`.

Enseñar la diferencia entre defecto funcional y validador obsoleto. Un gate rojo no autoriza modificar producto cuando la evidencia funcional, los datos y los campos canónicos están correctos y solo el literal del validador quedó atrás.

## Estado

Pendiente únicamente la evidencia sanitizada `ok:true` del contrato efectivo 1.0.26.
