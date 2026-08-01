# Cierre estático — Source intake Cobros/Conciliación

Fecha técnica UTC: 2026-08-01  
Corte operativo solicitado: 2026-07-31  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`GO_STATIC_COBROS_SOURCE_INTAKE`

Gate:

- gateId: `block10.1-cobros-source-intake-static-v20260801`;
- contrato: `10.1.0`;
- run: `30679260507`;
- artifact: `8811617211`;
- digest: `sha256:b0403a1181db544e3f91437d4978ba001f485d4c9b217908513d0e9fbd080e16`;
- checks: 49/49 PASS.

Predecesor:

- gate 10.0.0: 40/40 PASS;
- run `30678802532`;
- artifact `8811458432`.

## Motor listo

`core/importa-cobros-conciliacion-p0.js` quedó incorporado al bootstrap transversal.

Capacidades:

- normaliza `cobros_realizados` como autoridad CRM;
- normaliza `planilla_aseguradora` como autoridad aseguradora;
- trata `estado_cuenta_bancario` como soporte no autoritativo por sí solo;
- trata `documentos_soporte` como soporte no autoritativo por sí solo;
- omite duplicados exactos antes del matcher;
- propone `CREATE_PROPOSAL`, `UPDATE_PROPOSAL`, `SKIP_EXACT_DUPLICATE` o `HOLD`;
- ejecuta simulación FIFO usando el owner read-only;
- no aplica pagos ni genera cobros.

Prueba sintética:

- create: 1;
- update: 1;
- skip: 1;
- hold: 2;
- banco solo soporte: PASS;
- documentos solo soporte: PASS;
- contrato dry-run corregido: PASS;
- cobros/finmovs/Firestore/operational writes: 0.

## Manifiestos fail-closed

El validador de fuentes exige:

- tenant correcto;
- tipo de fuente autorizado;
- referencia y hash del archivo;
- país y moneda coherentes;
- periodo y fecha de corte;
- trazabilidad de columnas;
- destinos canónicos de staging y `conciliaciones`.

Bloquea:

- filas reales embebidas en el manifest;
- banderas de escritura;
- destino directo `cobros`;
- destino directo `finmovs`;
- mezcla GT/COP o CO/GTQ;
- destinos operativos fuera del contrato.

## Fuentes registradas pero payload no disponible

Registro al 31 de julio de 2026:

1. `Cobranza Efectuada desde 2024.xlsx`
   - hash `727665170572143979b5f274190e200da397e7b32965d1809b1b9be6a8495302`;
   - 2,157 filas de datos estimadas;
   - autoridad CRM;
   - payload no está en el repo ni accesible al runtime actual.

2. `Reporte de Ingresos Aseguradora General.xls`
   - hash `61574cc18b9200af438a49985e58deea635243f8808eac97470789df0db5b5ed`;
   - autoridad aseguradora;
   - requiere perfilado XLS BIFF.

3. `Cobros Mapfre.xls`
   - hash `d19559b7d5ad80930ad10f88d30ae7e0015b1647a5c0840867cf76e32c617ad8`;
   - autoridad aseguradora;
   - requiere perfilado HTML-XLS.

La cobertura de aseguradoras aún no está cerrada. El CRM permitirá identificar cuáles informes adicionales faltan.

## Fuente expresamente excluida

`Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` no es estado de cuenta bancario autoritativo ni prueba de cobro. No se utilizará para crear, confirmar o conciliar pagos.

## Frontera material

Toda preparación genérica está cerrada. El dry-run real requiere ahora los bytes de las fuentes vigentes.

Entrada mínima:

1. export CRM `Cobranza Efectuada desde 2024.xlsx` actualizado hasta el 31 de julio de 2026;
2. `Reporte de Ingresos Aseguradora General.xls` con corte al 31 de julio de 2026, si continúa vigente;
3. `Cobros Mapfre.xls` con corte al 31 de julio de 2026, si continúa vigente.

Después del perfil CRM se solicitarán únicamente los reportes de aseguradoras adicionales que realmente aparezcan sin contraparte. Estados bancarios de julio 2026 y documentos se pedirán solo para HOLD específicos.

No se requiere que Paula convierta archivos, prepare CSV, mapee columnas ni ejecute comandos.

## Estado de seguridad

- registry: `OPEN_PENDING_MORE_FILES`;
- real payloads attached: false;
- cobros writes: 0;
- finmovs writes: 0;
- Firestore read/write: 0;
- browser: 0;
- deploy: 0;
- producción: false;
- PII/secrets en evidencia: false.
