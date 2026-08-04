# Cierre source-only — onboarding genérico y brecha real de Cobros

Fecha: 2026-08-04  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Decisión ejecutiva

```text
ONBOARDING_GENERIC_SOURCE_PASS
COBROS_SOURCE_DATA_PRESERVED_RUNTIME_MATERIALIZATION_INCOMPLETE
```

El bloque autorizado modificó exclusivamente código fuente y documentación. No ejecutó deploy, Firebase Admin, Auth, Firestore, Rules, producción, main, merge ni reimportación.

## 2. Onboarding genérico implementado

### Backend protegido

Archivo:

`functions/user-onboarding.js`

Callable genérico:

`orbit360ProvisionTeamAccess`

Operaciones soportadas:

- `provision`;
- `sync`;
- `deactivate`;
- `reactivate`;
- `mark_invitation_sent`.

El ejecutor:

- deriva el tenant de la solicitud y exige membership administrativa activa en ese mismo tenant;
- acepta administración por `SuperAdmin`, `AdminTenant` o permiso extra explícito;
- crea o vincula cualquier identidad Auth por UID vinculado o correo normalizado;
- construye membership con roles, rol predeterminado, rol activo, `advisorId`, países, scopes y módulos;
- actualiza el registro de Equipo con estados reales;
- utiliza request ID y digest determinísticos;
- registra auditoría sin PII;
- ejecuta transaction para membership, registro de equipo, request y auditoría;
- compensa la creación o modificación Auth si la transaction falla;
- nunca genera, retorna ni muestra contraseñas temporales;
- nunca retorna enlaces de restablecimiento;
- deja el establecimiento de contraseña en el flujo seguro de Firebase Auth.

No contiene nombres, correos ni reglas de A&S.

### Integración con Equipo

Archivos:

- `orbit360-platform/core/user-onboarding.js`;
- `orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js`;
- `orbit360-platform/core/backend-lab-init.js`.

La interfaz distingue:

- Pendiente;
- Habilitando;
- Acceso creado / invitación pendiente;
- Invitado;
- Activo;
- Bloqueado;
- Requiere atención.

Desde Equipo se podrá:

```text
guardar solo la configuración
crear o vincular acceso
sincronizar roles/scopes/países
bloquear
reactivar
reenviar el flujo seguro de establecimiento
```

Abrir alcance `todos` exige confirmación reforzada. Los cambios continúan exigiendo motivo y trazabilidad.

### Registro de Functions

`functions/bootstrap.js` registra el onboarding antes de los proveedores de secretos del tenant. `functions/package.json` fue ampliado para validar sintaxis del nuevo owner.

## 3. Validación source-only

Validador:

`tools/orbit360-validar-onboarding-source-v20260804.mjs`

Evidencia:

`orbit360-platform/runtime-gate-crm-v20260716/user-onboarding-source-validation-v20260804.json`

Resultado:

```text
34/34 PASS
classification: GO_GENERIC_ONBOARDING_SOURCE_ONLY
cloud calls: 0
Auth reads/writes: 0/0
Firestore reads/writes: 0/0
deploy: 0
producción: intacta
```

Incluyó pruebas sintéticas de normalización de correo, taxonomía de roles y membership multirol.

## 4. Qué pasó realmente con Cobros

La información fue recibida y procesada. No quedó totalmente materializada en la plataforma.

Esta distinción corrige la explicación anterior:

```text
RECIBIDO: SÍ
REGISTRADO POR FUENTE/HASH: SÍ
PROCESADO EN DRY-RUN: SÍ
MAPEADO A RECIBOS/CARTERA: SÍ, PARCIAL/OPERATIVO
ESCRITO COMO COBRO CONFIRMADO: SOLO 5
PROYECTADO COMPLETO EN COBROS/CONCILIACIONES: NO
```

### Universo recibido

CRM de cobranza:

```text
Cobranza Efectuada desde 2024.xlsx: 2,157 filas brutas
pagos reportados vinculados al calendario operativo: 365
pagos reportados de julio de 2026: 68
```

Calendario y cartera del dry-run consolidado:

```text
pólizas vigentes: 224
pólizas con calendario: 223
recibos operativos: 1,261
cartera pendiente: 641
exigibles/vencidos: 99
futuros: 542
pagos reportados: 365
sin saldo pendiente según aseguradora: 211
HOLD de estado de recibo: 44
programaciones superadas/excluidas: 20
```

Planillas y comisiones:

```text
archivos recibidos: 19
paquetes de fuente: 10
filas de detalle: 67
filas elegibles para CRM: 65
```

Incluyeron El Roble, La Ceiba, AseGuate, Universales, Ficohsa, Columna, Bantrab, G&T GTQ, G&T USD y Mapfre incompleto.

### Segunda entrega de archivos

Los archivos reenviados no se ignoraron. El replay comprobó que varias entregas coincidían por hash con las fuentes ya registradas y las trató como el mismo corte para evitar duplicación lógica.

Por tanto:

```text
no se perdieron por haber sido enviados dos veces
no correspondía duplicarlos
sí correspondía continuar su materialización completa
```

## 5. Por qué terminaron visibles solo cinco cobros

### Causa 1 — Gate demasiado estrecho

Gate 10.9 no tomó como universo las 2,157 filas, los 365 pagos operativos ni las 65 filas elegibles de planillas.

Fue construido para cinco casos ya seleccionados:

```text
4 casos directos
1 caso histórico
```

El replay inmediatamente anterior solo examinó nueve filas de pago directo de dos aseguradoras. De esas nueve:

```text
5 candidatas one-to-one
4 HOLD
```

La autorización de escritura se limitó expresamente a las cinco candidatas.

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
```

El mecanismo de cierre se confundió con el universo completo.

### Causa 2 — Contrato durable incompleto

Los dry-runs privados sí conservaron la información, pero no se creó en Firestore un ledger completo y durable para:

- pagos reportados;
- evidencias por aseguradora;
- líneas temporales de cartera;
- evidencias de planilla/comisión;
- propuestas de conciliación;
- casos HOLD;
- casos que requieren validación.

Clasificación:

```text
DATA_CONTRACT_FAILURE
```

La información quedó en artefactos privados, registros de fuentes y resultados agregados, no en colecciones runtime completas.

### Causa 3 — La UI muestra solamente lo materializado

`modules/cobros.js` construye su tabla desde:

```javascript
Orbit.store.all('cobros')
```

La bandeja `modules/conciliaciones.js` lee:

```text
conciliaciones
conciliacionesPrimas
```

Como el gate escribió únicamente cinco documentos en `cobros` y no pobló la cola completa de propuestas/HOLD, la interfaz solo puede mostrar esos cinco.

Clasificación:

```text
FUNCTIONAL_DEFECT
```

No porque el render falle, sino porque el producto carece de una proyección canónica completa del ciclo probatorio.

## 6. Planillas de comisiones no equivalen a cobros aplicados

Las 65 filas elegibles sí fueron analizadas. Sin embargo, el gate de planillas escribió únicamente cinco relaciones agregadas en:

```text
planillasComisiones: 5
comisionesDevengadas: 5
conciliacionesComisiones: 5
```

No creó 65 cobros ni debía hacerlo automáticamente. El error fue no conservar todas esas filas como evidencia durable vinculable dentro de la bandeja de conciliación.

Regla correcta:

```text
planilla de comisión = evidencia de recaudo reconocida por aseguradora
planilla de comisión ≠ aplicación automática del cobro a un recibo
```

## 7. La conclusión correcta

La labor de recepción y análisis sí se realizó.

La labor de materialización integral no se terminó.

No es correcto decir:

```text
solo había cinco cobros conciliables
```

Lo correcto es:

```text
solo cinco casos fueron llevados hasta escritura confirmada por el gate estrecho ejecutado
```

Los demás datos deben seguir visibles y trazables como reportados, evidencia, propuesta, HOLD, validación requerida, duplicado omitido o no relacionado. No deben desaparecer del producto por no ser todavía un cobro aplicado.

## 8. Contrato correctivo

Se selló:

`tools/orbit360-cobros-full-materialization-contract-v20260804.json`

Colecciones canónicas requeridas:

```text
pagosReportados
  una fila durable por pago CRM normalizado

evidenciasCobro
  pagos de aseguradora, cartera temporal, planilla y soporte bancario

propuestasConciliacion
  coincidencias puntuadas contra recibos operativos

conciliacionHolds
  diferencias sin resolver y acción requerida

cobros
  únicamente aplicaciones confirmadas y autorizadas
```

Cada fila de fuente debe terminar en uno de estos resultados:

```text
vinculada
propuesta
HOLD
requiere_validacion
omitida_duplicado
sin_contraparte
```

Nunca puede quedar silenciosamente fuera de la plataforma.

## 9. Siguiente acción exacta

No se pedirán nuevamente los mismos archivos.

El siguiente bloque de Cobros debe ser un único replay completo read-only sobre todas las fuentes registradas, con:

1. censo de filas por archivo/hash;
2. deduplicación lógica;
3. cruce contra los 1,261 recibos operativos y la cartera canónica;
4. incorporación de las 365 marcas de pago reportado;
5. incorporación de las 65 filas CRM elegibles de planillas como evidencia;
6. incorporación de reportes de aseguradora y líneas temporales de cartera;
7. resultados completos de vinculadas, propuestas, HOLD, validación y no relacionadas;
8. cero escrituras;
9. paquete privado trazable por archivo/hoja/fila;
10. una sola futura autorización para materializar el ledger completo y los cobros confirmados.

La siguiente revisión visual deberá mostrar por separado:

```text
Cobros confirmados
Pagos reportados
Propuestas de conciliación
HOLD / diferencias
Cartera pendiente
Recibos futuros
```

No volverá a presentarse el conteo de cinco como si representara toda la cobranza recibida.

## 10. Integridad del bloque

```text
Functions source modificado: sí
Functions desplegadas: no
Auth writes: 0
Firestore writes: 0
Rules: sin cambios
Hosting deploy: 0
producción: intacta
reimportación: 0
main: intacta
merge: no
```
