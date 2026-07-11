# AUDITORÍA Y CORRECCIÓN OPERATIVA — CIERRE CRM TRANSVERSAL v1.198

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, deploy ni producción.  
Carriles: A — UX/Academia; B — contratos, scope y seguridad; C — baseline A&S sanitizado.

## 1. Objetivo

Avanzar el cierre de:

```txt
Cliente360 → Pólizas → Vehículos → Recibos/Cobros → Conciliaciones
→ Portal → Calidad → Renovaciones/Cancelaciones → Comisiones → Historial
```

No se repitieron perfiles ni cruces. Se usó como contrato el baseline ya aceptado:

```txt
Clientes Siga CRM: 440 registros.
Dry-run sanitizado: crear 414 / requiere_validacion 26.
Pólizas, vehículos, recibos, cobros, cartera y comisiones: modelados/cruzados.
Escritura real: bloqueada.
```

## 2. Hallazgos concretos

### P0 — Scope no aplicado de forma transversal

`Cliente360` leía todos los clientes y permitía lista/deep-link sin filtrar propios/equipo/todos/ninguno. El patrón se repetía en Pólizas, Cobros, Conciliaciones, Calidad, Renovaciones, Cancelaciones, Comisiones, Historial y preview del Portal.

Impacto:

- un Asesor podía recibir datos fuera de su cartera;
- KPI y agregados podían incluir registros fuera de alcance;
- un deep-link conocido podía abrir un expediente ajeno;
- el selector de Portal podía mostrar clientes no autorizados.

### P0 — Alta manual sin contrato tenant

La alta de cliente escribía directamente sin:

```txt
tenantId
fuente canónica
actor/rol activo
trazabilidad
estado pendiente_polizas
deduplicación
calidad estructurada
```

La moneda se derivaba únicamente desde país y no desde configuración tenant.

### P0 — Asesor podía acceder a cambios críticos

La ficha exponía edición general, asesor responsable, país, segmento, link Drive, pólizas, renovación y otros controles sin separar:

```txt
completar faltantes
editar expediente
reasignar
modificar pólizas
aplicar cobros
ver auditoría interna
```

### P0 — KPI roto y moneda mezclada

- El KPI Clientes tenía un handler legacy hacia `mod-host`; el shell usa `host`. El bridge nuevo neutraliza ese handler y aplica navegación correcta.
- “Prima vigente” mezclaba GTQ y COP mediante una división arbitraria.
- Dos KPI no abrían detalle.

### P1 — Portal y visor

- El preview del Portal requería scope real.
- El botón administrativo no estaba condicionado por permiso.
- La apertura documental duplicaba lógica en vez de usar `documentRef` y visor transversal.

### P1 — Pendientes posteriores

- Auth/Equipo todavía no representan completamente usuarios multirol A&S y scope configurable por módulo.
- Session/tenant/catálogos mantienen persistencias frontend legacy; no se modificaron aquí para no mezclar el cierre CRM con un refactor transversal.
- Alta/edición de póliza para roles autorizados aún necesita transacción completa con motivo, validación, recibos y rollback.
- Mensajería de Cobros/Portal debe terminar de usar estados configurado/conectado/verificado.
- Portal real requiere aislamiento de identidad cliente en backend; hoy continúa como preview interno.
- Falta smoke visual y funcional consolidado con dataset sanitizado, sin escribir payload real.

## 3. Correcciones implementadas

### `core/access-scope.js`

Nuevo contrato reusable:

```txt
activeRole()
actorAdvisorId()
dataScope(module)
teamAdvisorIds()
canView(collection, record, module)
filter(collection, rows, module)
can(module, action)
deriveClientState(clientId)
duplicateCandidates(input)
prepareManual(collection, row)
audit(...)
correction(...)
scopedStore(module)
withScope(module, fn)
```

Scopes:

```txt
own / team / all / none
```

La configuración explícita del usuario prevalece. Un rol desconocido obtiene `none`, nunca acceso administrativo.

### `modules/crm-v1198-operational-bridge.js`

- aplica scope al render de diez módulos CRM;
- bloquea deep-links fuera de alcance;
- limita selectores y agregados;
- corrige los cuatro KPI de Cliente360;
- abre detalle real de KPI;
- separa GTQ/COP sin sumarlos;
- sustituye alta manual por flujo tenant-aware;
- detecta duplicado exacto/probable;
- inicia cliente en `pendiente_polizas`;
- Asesor solo completa campos vacíos;
- cambio crítico crea gestión de corrección;
- aplica guards a pólizas, cobros, calidad, comisiones, historial y cancelaciones;
- conserva módulos base, `Orbit.store` y backend protegido.

### `modules/portal-v1198-scope-viewer-bridge.js`

- oculta acción administrativa sin permiso;
- intercepta documentos del Portal;
- abre con `Orbit.documentViewer`;
- entrega `documentRef` y contexto;
- no llama Drive ni storage directamente.

## 4. Contrato de alta manual

Toda alta nueva pasa por:

```txt
tenantId
país
moneda desde configuración
asesor permitido
fuente = ingreso_manual_plataforma
actor y rol activo
fecha
trazabilidad
estado = pendiente_polizas
calidad
requiereValidacion
```

Reglas:

- identificación o correo exacto bloquean duplicado;
- coincidencia probable requiere confirmación y queda para revisión;
- campos faltantes generan alertas de calidad;
- no se crea póliza, cartera o cobro desde la alta del cliente;
- no se incorpora payload real al repositorio.

## 5. Pruebas

### Sintaxis

```txt
node --check de core/data/modules/tools: OK
```

### Validador CRM

```txt
node orbit360-platform/tools/orbit360-validar-cierre-crm-v1198.mjs
Resultado: OK
Errores: 0
Advertencias: 0
```

### Test de acceso

```txt
node orbit360-platform/tools/orbit360-test-access-scope-v1198.mjs
Resultado: OK
```

Cobertura:

- own/team/all;
- `activo_en_mora`;
- `reactivable`;
- `pendiente_polizas`;
- alta manual tenant-aware;
- moneda por configuración;
- fuente canónica;
- deduplicación exacta.

## 6. Seguridad y límites

No se modificaron:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
```

No se subieron:

```txt
PII real
clientes reales
pólizas reales
secretos
contraseñas
URLs privadas
cuentas bancarias reales
```

## 7. Impacto Claude/prototipo

¿Aplica a Claude/prototipo? **Sí.** La próxima candidata debe incorporar:

- `own/team/all/none` como contrato de UX;
- deep-link seguro;
- KPI con detalle y moneda separada;
- alta manual tenant-aware;
- Asesor completa faltantes y solicita corrección para cambios críticos;
- estado inicial `pendiente_polizas`;
- visor documental transversal;
- estados honestos de integraciones;
- Academia por rol activo.

No se comparte con Claude:

- provider real;
- secretos;
- payload A&S;
- reglas Firestore/Auth;
- implementación protegida.

## 8. Estado

```txt
CRM_SCOPE_CONTRACT: IMPLEMENTADO
CLIENTE360_KPI: CORREGIDO_EN_RUNTIME
ALTA_MANUAL_CLIENTE: CORREGIDA
PORTAL_PERMISOS_Y_VISOR: CORREGIDO
POLIZAS_COBROS_COMISIONES: GUARDS_INICIALES
DATOS_REALES: NO_ESCRITOS
SMOKE_VISUAL: PENDIENTE
CIERRE_CRM_TOTAL: EN_PROGRESO
```

## 9. Siguiente bloque operativo

```txt
1. Profundizar transacción Pólizas → Recibos/Cobros.
2. Confirmar estados derivados y relaciones con Cliente360.
3. Endurecer acciones internas de Conciliaciones/Comisiones.
4. Hacer mensajes honestos según integración.
5. Ejecutar smoke sanitizado consolidado.
6. Realizar validación visual única del grupo CRM.
7. En paralelo, aplicar directorios GT/CO al cierre de Aseguradoras.
```
