# Registro control maestro — P0.9h historial reanudable del lote

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `CONTRATO_IMPLEMENTADO / HISTORIAL_LAB_NO_EJECUTADO / CERO_HABILITACION`

## Carril A — Prototipo/UX/Claude

Avance:

- panel de solo lectura ampliado;
- runs, ítems y reanudables visibles;
- requisitos de diff y reanudación documentados;
- roles y Academia definidos.

Pendiente:

- acciones administrativas;
- detalle visual de run;
- diff interactivo;
- confirmación reforzada;
- candidata Claude.

Claude no se solicita todavía.

## Carril B — Backend/contratos

Avance:

```text
core/aseguradoras-batch-history-p09h.js
core/aseguradoras-lab-collections-p09e.js
core/aseguradoras-runtime-bootstrap-p09f.js
modules/aseguradoras-knowledge-panel-p09f.js
```

Cerrado:

- colecciones de runs e ítems;
- sanitización;
- contrato de referencias;
- diff por documento;
- reanudación selectiva;
- plan metadata-only;
- gate LAB;
- rollback;
- auditoría;
- confirmación del read model;
- bootstrap;
- panel de solo lectura.

Pendiente:

- CI visible;
- bridge/provider real;
- ejecución LAB;
- historial real;
- reanudación real.

## Carril C — Fuentes reales

Avance:

- el lote de once fuentes ya puede conservar continuidad por run;
- una interrupción futura no obligará a repetir documentos verificados;
- AseGuate, BAM, Bantrab, Columna, Rural y Universales conservan separación por documento.

Pendiente:

- resolver referencias reales;
- ejecutar el primer dry-run;
- registrar run real;
- reanudar fuente fallida o pendiente;
- continuar revisión de reglas/presentaciones/bindings.

## Estado exacto

```text
lote configurado: sí
historial contractual: sí
snapshots de historial: sí
bootstrap actualizado: sí
panel actualizado: sí
smokes/workflow configurados: sí
index aplicado: no
provider conectado: no
run real ejecutado: no
historial Firestore LAB escrito: no
reanudación real ejecutada: no
Cotizador habilitado: no
Comparativo habilitado: no
```

## Colecciones

```text
aseguradora_batch_runs
aseguradora_batch_items
```

No contienen referencias, rutas, secretos, binarios o PII.

## Próxima acción

P0.9i:

1. preparar contrato de acciones administrativas del lote;
2. autorizar dry-run sin persistencia de conocimiento;
3. mantener persistencia de historial separada;
4. integrar bridge real;
5. ejecutar primer run LAB;
6. comprobar historial tras recarga;
7. reanudar únicamente pendientes;
8. continuar con bindings AseGuate;
9. mantener segundo gate cerrado.

## No reabrir

- CRM/Clientes;
- dry-run clientes;
- Pólizas/Activos;
- Cobros/Recibos/Cartera;
- Comisiones/CxC/CxP;
- auditoría general v110.
