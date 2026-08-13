# Product query planner por tenant, rol y scope — P0

Fecha: 2026-07-13  
Carril: B — backend y seguridad  
Estado: contrato implementado y validado; no conectado

## Objetivo

Unir la membresía multirol y la política de acceso con el store productivo read-only. El planner genera filtros Firestore antes de adjuntar snapshots y bloquea cualquier consulta que no esté limitada por tenant.

## Archivo

```txt
core/product-query-planner-contract-p0.js
```

## Conversión de scopes

```txt
own  -> tenantId + advisorId + país
team -> tenantId + teamId + país
all  -> tenantId + país
none -> __deny__, sin consulta
```

El país usa `==` cuando existe uno y `in` cuando existen varios, con máximo 10 valores por consulta.

## Gates

- membresía activa;
- rol activo asignado;
- módulo visible;
- una única restricción exacta `tenantId == tenant actual`;
- ownership requerido para `own` y `team`;
- `scope none` convertido en denegación explícita;
- operadores Firestore limitados a `==`, `in` y `array-contains`;
- consultas abiertas bloqueadas;
- cero filtrado cross-tenant en cliente;
- cero ejecución o escritura desde el contrato.

## Integración futura

```txt
membership
→ tenantAccessPolicyP0.queryConstraints
→ productQueryPlannerP0
→ store-firestore-product-readonly-p0
→ snapshots read-only
```

La conexión real sigue dependiendo del entorno productivo, Auth, membresía y readiness.

## ¿Aplica a Claude/prototipo?

Solo como comportamiento visible ya documentado: la vista debe reflejar el rol y alcance activo, no mostrar datos fuera del scope y no sugerir que el usuario puede ampliar su acceso desde la pantalla.
