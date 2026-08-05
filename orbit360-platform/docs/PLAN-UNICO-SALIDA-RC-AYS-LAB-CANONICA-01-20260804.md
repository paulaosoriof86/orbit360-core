# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-04 22:05 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento es el plan operativo rector para cerrar la primera candidata única, acumulativa y verificable de A&S. No crea un plan paralelo ni reemplaza las fuentes maestras. Las aplica y convierte en una secuencia ejecutable con gates de salida.

Precedencia:

1. fuentes maestras y addenda vigentes;
2. este plan único de salida;
3. ledger vivo `rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. HEAD incremental de la rama obligatoria;
5. evidencia reciente del microbloque activo.

Una conversación, comentario, workflow o candidata posterior no puede alterar este orden sin una decisión explícita documentada, causa raíz y actualización conjunta de este plan y del ledger.

## 2. Objetivo final invariable

Cerrar y presentar una sola candidata:

```text
RC-AYS-LAB-CANONICA-01
```

Debe integrar, sobre la mejor versión aprobada y sin reemplazo total:

- Cliente 360;
- Aseguradoras;
- Pólizas;
- Vehículos;
- Recibos;
- Cartera;
- Cobros;
- Conciliaciones;
- Comisiones;
- Equipo/onboarding;
- Ops;
- Leads;
- importador recurrente;
- Auth, memberships, multirol y scopes configurables por tenant.

La salida final del plan es una release candidate aprobada visualmente y preparada para una única autorización productiva macro. El rebranding GRAVICENTRA, nuevas integraciones y mejoras cosméticas no bloqueantes quedan fuera de la ruta crítica.

## 3. Hechos cerrados que no se reabren

### 3.1 Runtime funcional

El run LAB `30962756387` cerró:

- 18 escenarios PASS / 0 FAIL;
- Ops/Leads PASS;
- scopes de Asesor PASS;
- notificaciones PASS;
- importación recurrente PASS;
- Cobros/Conciliación sintético PASS;
- rollback sintético exacto;
- snapshot real A&S before/after idéntico.

No se repite esa batería salvo cambio funcional posterior en sus owners.

### 3.2 Baseline canónico

Microbloque 1.1 cerrado:

```text
PASS_CANONICAL_BASELINE
```

Owners fundacionales:

```text
Router       → core/router.js
Access       → core/access-scope.js
Cliente 360  → modules/cliente360.js
Aseguradoras → modules/aseguradoras.js
```

Las capas de bootstrap, sesión, ceilings, UX, importación, edición y directorio operativo quedaron clasificadas como soporte o compatibilidad, no como candidatas paralelas.

Conteos reconciliados:

```text
M1/M4: 414 clientes / 26 aseguradoras
Gate 7.8 create-only: +16 clientes / +4 aseguradoras
Baseline acumulativo: 430 clientes / 30 aseguradoras
Delta inexplicado: 0
Reimportación requerida: no
Pérdida de datos observada: no
```

### 3.3 Causa raíz visual vigente

El último fallo demostrado pertenece al instrumento de validación:

```text
PIPELINE_MECHANISM_FAILURE
ROUTE_ASEGURADORAS_NAVIGATION_TIMEOUT
```

Owner histórico: navegación por hash dentro de una SPA mantenida en una sola sesión.

El mecanismo reemplazante fue validado y cerrado en Microbloque 2.0:

```text
PASS_ISOLATED_ROUTE_HARNESS
run: 30971707956
ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
8/8 rutas PASS
```

No se vuelven a crear variantes basadas en `fullPage`, layout probes, CDP, hash navigation acumulativa o workflows visuales paralelos.

### 3.4 Cobros reales

El universo preservado es:

```text
pólizas vigentes: 224
pólizas con calendario: 223
recibos calendario: 1,261
cartera pendiente: 641
exigible/vencido: 99
futuro: 542
pagos reportados: 365
sin saldo pendiente según aseguradora: 211
HOLD: 44
programaciones superadas/excluidas: 20
cobros confirmados materializados en el corte source-only: 5
```

Cinco cobros escritos nunca vuelven a presentarse como el universo completo. Los 365 pagos reportados deben clasificarse y materializarse en sus colecciones correctas.

## 4. Soluciones de raíz obligatorias

### 4.1 Candidata inmutable

Se separan tres conceptos:

- `sourceBaseline`: commit funcional congelado;
- `documentationHead`: commits documentales y de control;
- `candidateHead`: commit acumulativo que solo avanza mediante microbloques cerrados.

Nunca se reemplaza una candidata por otra para corregir un validador. El validador se corrige contra la misma candidata.

### 4.2 Producto separado del instrumento de evidencia

Un fallo exclusivo de captura no invalida ni elimina automáticamente una candidata cuyo runtime, autenticación e integridad pasaron.

Solo se retira una candidata por:

- `SECURITY_FAILURE`;
- `FUNCTIONAL_DEFECT` demostrado;
- integridad before/after distinta;
- cross-tenant;
- escritura no autorizada.

### 4.3 Un owner y un gate

Cada ruta mantiene un owner único. Bridges y refinements se clasifican como soporte, compatibilidad o retiro temporal. Cada cierre usa un solo gate.

### 4.4 STOP_RETRY

Cuando reaparezca la misma etapa o familia de fallo:

1. detener reintentos;
2. conservar evidencia;
3. identificar owner;
4. corregir mecanismo, no producto distinto;
5. ejecutar primero prueba estática/sintética;
6. no crear otra candidata o workflow paralelo.

## 5. Secuencia y estado vivo

| Microbloque | Resultado/gate | Estado |
|---|---|---|
| 1.0 Plan y ledger persistentes | `PASS_PLAN_PERSISTED` | PASS |
| 1.1 Baseline/owners/conteos | `PASS_CANONICAL_BASELINE` | PASS |
| 2.0 Arnés sintético aislado | `PASS_ISOLATED_ROUTE_HARNESS` | PASS |
| 2.1 Visual LAB retenida | `GO_LAB_CANDIDATE_VISIBLE` | listo; requiere autorización explícita de deploy LAB |
| 3.0 Ops/Leads durable | `OPS_LEADS_BACKEND_LAB_COMPLETE` | pendiente |
| 4.0 Replay completo Cobros read-only | `PASS_COBROS_FULL_REPLAY` | pendiente |
| 4.1 Materialización durable Cobros | `COBROS_REAL_LEDGER_COMPLETE` | pendiente |
| 5.0 Integración acumulativa aprobada | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 Revisión visual humana | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 Go-live | `GO_PRODUCTION_A&S` | bloqueado hasta autorización productiva |

## 6. Microbloque activo: 2.1

Objetivo: entregar una URL LAB retenida de la misma RC.

Ejecución exacta:

1. preflight contractual antes de secretos;
2. cuatro Functions LAB allowlisted;
3. un solo Hosting preview LAB;
4. snapshot A&S before;
5. ocho rutas mediante contexto aislado y URL directa;
6. snapshot A&S after;
7. integridad idéntica y cero escrituras;
8. retener URL si producto e integridad pasan;
9. no repetir los 18 escenarios funcionales;
10. no eliminar la candidata por un fallo exclusivo de captura.

Prohibiciones:

- Rules;
- reimportación;
- escrituras reales;
- producción;
- `main`;
- merge;
- nuevo workflow visual;
- navegación por hash acumulativa.

Este microbloque usa Firebase Functions/Hosting LAB. No se ejecuta sin autorización explícita de deploy LAB.

## 7. Continuidad posterior obligatoria

Después de la URL LAB retenida:

1. dejar Ops/Leads durable y conectado a la UI real;
2. ejecutar el replay completo read-only de los 365 pagos;
3. sellar diff de crear/actualizar/omitir/HOLD/requiere validación;
4. materializar por operación atómica e idempotente las colecciones correctas;
5. integrar visualmente todos los módulos aprobados sobre la misma RC;
6. presentar revisión Dirección/Operativo/Asesor;
7. solicitar una única autorización macro de producción.

No se abre un bloque periférico entre estas etapas.

## 8. Regla de actualización por iteración

Toda iteración debe dejar simultáneamente:

- avance visible;
- fuente/base;
- implementación o evidencia;
- gate y estado;
- pendiente único;
- siguiente acción exacta;
- actualización del ledger;
- actualización del PR cuando cambie el microbloque activo.

Una conversación futura debe leer este plan, el ledger y el PR antes de actuar.
