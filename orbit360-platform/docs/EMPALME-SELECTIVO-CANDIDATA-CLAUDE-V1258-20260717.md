# Empalme selectivo de candidata Claude v1.258

**Fecha:** 2026-07-17  
**Bloque:** 0 — baseline canónico sano y control de deltas  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open, sin merge, `main` ni producción

## 1. Fuente auditada

```txt
Prototype Development Request (9).zip
SHA-256: 78967f1e8736dc713691b43b4eeb1a3a18abc198c0d1cf7ba0c87d577de70387
Versión declarada: v1.258
Archivos: 114
JavaScript: 59
Errores node --check: 0
Referencias locales faltantes: 0
```

Archivos protegidos de la candidata confirmados sin alteración respecto de su base declarada:

```txt
data/store.js
core/auth.js
core/importa.js
core/router.js
core/legal.js
core/pwa.js
```

## 2. Decisión de auditoría

La candidata no se reemplaza de forma literal. Se empalma por propietarios.

### Deltas aceptados

- motor único `Orbit.access` + compatibilidad `Orbit.accessScope`;
- proyección reusable de aliases de clientes;
- consumo proyectado en Pólizas/Cobros;
- separación explícita Cotizador ≠ Comparativo;
- Academia y documentación de v1.258;
- copy técnico limpio.

### Hallazgos que impidieron el reemplazo literal

1. `can(module, action)` concedía `true` a acciones no listadas. Un Asesor podía recibir edición general, contrario al contrato vivo.
2. `filter()` filtraba por asesor, pero no aplicaba país mediante `canView()`.
3. `Orbit.access.dataScope()` devolvía valores UI (`propia/equipo/todo/ninguno`) y podía romper consumidores de la rama que usan el contrato canónico (`own/team/all/none`).
4. Pólizas/Cobros contenían un fallback recursivo:

```js
PC(id) || PC(id)
```

5. La prueba de búsqueda agregaba identificación al texto de prueba, pero el `rows()` real de Pólizas/Cobros todavía no la incluía.
6. Sustituir Cobros completo habría pisado copy honesto y decisiones vigentes de conciliación/recordatorios.

## 3. Cambios aplicados

### 3.1 Contrato propietario de acceso

Archivo:

```txt
core/access-scope.js
```

Commit:

```txt
5fd628e946ab73b38b3c50e41550bc47ee1b64ce
```

Se consolidó:

- `Orbit.access.dataScope()` canónico: `own/team/all/none`;
- `Orbit.accessScope.dataScope()` legacy/UI: `propia/equipo/todo/ninguno`;
- roles asignados;
- módulos base + extras - restringidos;
- restricciones > extras > matriz > regla base;
- Asesor limitado a completar, sin edición general;
- país por registro;
- asesor derivado por cliente/póliza;
- filtros mediante `canView()`;
- estados `pendiente_polizas`, `activo`, `activo_en_mora`, `reactivable`, `inactivo`;
- alta manual con tenant, país, moneda, trazabilidad y calidad;
- duplicados exactos/probables;
- `auditLog`, correcciones y facade de store con restauración en `finally`.

Prueba independiente ejecutada: 14/14 escenarios verdes.

### 3.2 Helper canónico de cliente

Archivo cargado por la rama:

```txt
core/client-canonical-view-projection-v20260716.js
```

Commit:

```txt
4eba80dcb9da86c406c38b75199618087decb7cb
```

Ahora expone:

```txt
Orbit.clientProjection.project(row)
Orbit.clientProjection.get(id)
Orbit.clientProjection.field(row, canon)
```

Estas funciones devuelven copias y no llaman `insert/update/remove`.

La proyección in-place anterior queda aislada y marcada explícitamente como puente temporal:

```txt
temporaryInPlaceBridge: true
```

Se retirará cuando Cliente 360 y Calidad consuman directamente el helper propietario.

### 3.3 Pólizas

Archivo:

```txt
modules/polizas.js
```

Commit:

```txt
4047a56c0dfe1c719e955bd2fdd893408957e26d
```

Cambios mínimos sobre el owner vivo:

- cliente visual mediante `Orbit.clientProjection.get()`;
- fallback no recursivo al store;
- búsqueda por nombre, identificación, correo y teléfono proyectados;
- desglose usa copia proyectada;
- se conservan prima neta, cartera, recibos, fuente y navegación existentes.

## 4. Pendiente inmediato del mismo empalme

### P0

1. Integrar Cobros sobre su owner vivo:
   - búsqueda;
   - detalle;
   - validación;
   - confirmación;
   - lote;
   - mensajes;
   - automatizaciones;
   - correo;
   sin alterar conciliación ni estados honestos.
2. Integrar el gate separado de Aseguradoras:
   - `Habilitado para Cotizador` no habilita Comparativo;
   - `Habilitado para Comparativo` no habilita Cotizador.
3. Ejecutar sintaxis/contratos/gate conjunto.

### P1 del Bloque 0

- migrar Cliente 360 y Calidad al helper copy-based;
- retirar `temporaryInPlaceBridge`;
- incorporar Academia v1.258 sin reemplazar progreso/configuración de la rama;
- actualizar baseline del PR después del gate.

## 5. Carriles

### Carril A — frontend/UX/Academia

Avance visible: acceso, helper canónico y Pólizas empalmados.

### Carril B — backend protegido

Sin cambios en store, Auth, Firestore, rules, importadores protegidos o herramientas backend.

### Carril C — datos reales

Sin escrituras, recargas o remapeos. Se mantienen:

```txt
clientes: 414
aseguradoras: 26
estado inicial: pendiente_polizas
```

Pólizas, vehículos, cobros y cartera todavía no se cargan desde fuentes reales.

## 6. Claude y Academia

### REPLICABLE_CLAUDE_ACUMULADO

- `dataScope` canónico separado de su label UI;
- regla base de permisos de Asesor;
- filtros deben aplicar país;
- fallback de proyección nunca puede ser recursivo;
- las pruebas deben invocar el `rows()/matchTxt()` real y no replicar manualmente su lógica.

### ACADEMIA_ACTUALIZAR

- diferencia entre módulo visible y datos accesibles;
- scope canónico frente a label UI;
- país como segundo gate;
- completar datos no equivale a editar registros operativos;
- proyección visual no modifica la fuente.

## 7. Estado

```txt
Candidata v1.258 auditada: CERRADO
Reemplazo literal: RECHAZADO CON CAUSA
Empalme selectivo: EN CURSO
Acceso: EMPALMADO
Proyección reusable: EMPALMADA CON PUENTE TEMPORAL IDENTIFICADO
Pólizas: EMPALMADO
Cobros: SIGUIENTE OWNER
Aseguradoras: PENDIENTE DEL MISMO BLOQUE
Gate LAB: PENDIENTE
```
