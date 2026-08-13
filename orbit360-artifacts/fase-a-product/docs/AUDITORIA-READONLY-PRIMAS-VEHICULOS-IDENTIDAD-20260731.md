# Auditoría read-only · primas, vehículos, identidad y estados de recibo

Fecha: 2026-07-31

## Alcance

Auditoría agregada y sanitizada sobre fuentes ya registradas en el manifiesto vigente. No contiene PII, números de póliza, nombres, teléfonos ni credenciales.

No ejecuta reimportación, enriquecimiento persistente, Cobros, Rules, Functions, Storage, producción, main ni merge.

## 1. Calendario de recibos / componentes de prima

Fuente canónica read-only de Recibos/Cartera vigente:

- pólizas con calendario: **223**;
- recibos activos auditados: **1,261**;
- filas con detalle de prima neta: **955**;
- filas con expedición: **955**;
- filas con financiamiento: **955**;
- filas con ajuste/descuento de fuente: **955**;
- filas con IVA/impuestos: **955**;
- filas con prima total: **1,261**.

Cobertura por póliza:

- calendario con componentes completos en todos sus recibos: **176 pólizas**;
- detalle parcial: **43 pólizas**;
- solo total / sin componentes suficientes: **4 pólizas**.

### Diferencias póliza ↔ calendario

Sobre 223 pólizas con match:

- diferencia absoluta de total ≥ 0.005: **84**;
- ≥ 0.05: **36**;
- ≥ 1 unidad monetaria: **29**.

Para prima neta:

- diferencia absoluta ≥ 0.005: **72**;
- ≥ 0.05: **54**;
- ≥ 1 unidad monetaria: **52**.

### Decisión

`DATA_CONTRACT_FAILURE / HOLD` para enriquecimiento persistente.

El calendario contiene detalle suficiente para **proyección read-only**, pero no es seguro sobrescribir silenciosamente la póliza canónica. Orbit debe mostrar por separado:

1. prima neta de póliza;
2. componentes disponibles de fuente/calendario;
3. prima total de póliza;
4. total del calendario;
5. diferencia cuando exista.

Los campos ambiguos, como descuento/ajuste de fuente, conservan semántica neutral hasta existir contrato contable explícito.

## 2. Cobertura real de la fuente de Vehículos

Fuente de vehículos auditada: **1,058 filas**.

Disponibilidad:

- póliza: 1,058 · 100%;
- modelo/año: 1,045 · 98.8%;
- inciso: 1,057 · 99.9%;
- placa: 1,040 · 98.3%;
- marca: 1,050 · 99.2%;
- tipo/línea: 1,023 · 96.7%;
- concepto: 1,053 · 99.5%;
- plan: 58 · 5.5%;
- chasis/serie: 1 · 0.1%;
- motor: 2 · 0.2%;
- descripción: 24 · 2.3%;
- comentarios: 4 · 0.4%.

### Decisión

No es correcto exigir que la migración produzca chasis/motor cuando la fuente casi nunca los contiene. Sí es obligatorio mostrar marca, tipo/línea, modelo, placa y concepto cuando existan.

Chasis, motor, uso, color, suma asegurada u otros campos ausentes se muestran como **Pendiente de completar**, nunca como cero ni como información validada.

## 3. Identidad probable duplicada

La cola canónica contiene **1 par de identidad probable duplicada** relevante para la revisión humana actual. Las dos entidades comparten un identificador de contacto de origen, pero conservan nombres y relaciones de póliza distintos.

Estado: `NO_AUTO_MERGE`.

### Decisión

- no fusionar automáticamente;
- no mover ni reasignar pólizas;
- no resolver desde coincidencia telefónica;
- requiere validación tenant y gestión de corrección antes de cualquier escritura.

La visual debe reflejar las relaciones del `clienteId` exacto actual mientras el HOLD siga abierto.

## 4. Estados del calendario ≠ Cobros

Distribución de 1,261 recibos activos:

- `futuro_pendiente`: **542**;
- `pago_reportado`: **365**;
- `no_pendiente_segun_aseguradora`: **211**;
- `pendiente_vencido`: **97**;
- `requiere_validacion_estado`: **44**;
- `pendiente_vence_corte`: **2**.

### Decisión

Ninguno de estos estados crea por sí mismo un documento en `cobros`.

- `pago_reportado` = evidencia pendiente de conciliación;
- `no_pendiente_segun_aseguradora` = evidencia de estado en fuente de aseguradora;
- Cobro aplicado/conciliado pertenece al siguiente bloque y exige sus propias fuentes, matching y autorización.

El baseline continúa con `cobros=0` y `finmovs=0`.

## 5. Efecto sobre la siguiente publicación

El frontend corregido puede publicarse sin esperar enriquecimiento persistente porque ahora:

- muestra faltantes de forma honesta;
- proyecta componentes read-only cuando existen;
- separa póliza y calendario;
- separa recibo esperado y cobro;
- no auto-fusiona identidades;
- no inventa chasis/motor ni montos.

Persisten bloqueados hasta cierre del manifiesto + autorización específica:

- enriquecimiento de campos de Póliza;
- cualquier fusión/reasignación de identidad;
- migración/aplicación de Cobros.

## Gate asociado

Candidato estático actual:

- run `30664793625`;
- artifact `8806512775`;
- digest `sha256:184fd69bd6a67bd2e63536680e0c31df463302f0963b874f8f261a9e9ace0f69`;
- visual base: 39/39 PASS;
- read-model: PASS;
- contrato humano v3: 16/16 PASS;
- browser: 0;
- deploy: 0;
- writes: 0.

Esta auditoría no autoriza Hosting ni escrituras. Su objetivo es evitar otra ronda de reproceso antes de la siguiente publicación integral LAB.
