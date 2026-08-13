# Auditoría read-only de entrada — Cobros/Conciliación

Fecha: 2026-08-01  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Alcance

Auditoría de owners, contratos y rutas existentes después del cierre de Recibos/Cartera. No se ejecutaron importaciones, conciliaciones, aplicaciones de pago ni escrituras en `cobros` o `finmovs`.

## Baseline

- recibosEsperados: 1293
- carteraPrimas: 673
- cobros: 0
- finmovs: 0

## Contrato de negocio vigente

- Recibo esperado ≠ Cartera ≠ Pago reportado ≠ Cobro conciliado.
- Una sola fuente no auto-concilia.
- Ausencia de saldo de aseguradora no crea pago.
- Match de cobro exige dos fuentes autoritativas y relación one-to-one.
- Diferencias de fechas y centavos se conservan.
- Empate/conflicto/identidad insuficiente pasa a HOLD.
- Un pago no puede utilizarse dos veces.
- FIFO aplica al requerimiento pendiente aplicable más antiguo, incluida cartera exigible de vigencias recientemente vencidas. Esto no reactiva la póliza vencida.

## Owner reusable ya disponible

`core/importa-cartera-p0.js` contiene:

- autoridad CRM separada de autoridad aseguradora;
- matcher one-to-one;
- tolerancia de monto y fechas;
- cuota/serie y recibo canónico como desambiguadores;
- preservación de diferencias de fuente;
- separación entre conciliación de saldo y conciliación de pago;
- una fuente no auto-concilia;
- modo balance sin `autoApply`.

`core/importa-cartera-p0-wire.js` redirige entradas de estado de cuenta de aseguradora fuera de `cobros` hacia entidades separadas y usa upsert por identidad de fuente.

## Hallazgo 1 — DATA_CONTRACT_FAILURE

El wire del importador crea/actualiza propuestas en:

`conciliacionesPrimas`

La bandeja visual `modules/conciliaciones.js` lee exclusivamente:

`conciliaciones`

Consecuencia: una propuesta generada por la ruta canónica de cartera puede no aparecer en la bandeja de revisión. No debe resolverse duplicando propuestas ni escribiendo en ambas colecciones sin contrato de compatibilidad.

Acción requerida:

- definir un owner canónico de propuestas;
- establecer alias de lectura o migración controlada;
- conservar identidad y trazabilidad;
- impedir doble propuesta para el mismo match;
- actualizar importador, bandeja, validadores, docs y Academia juntos.

## Hallazgo 2 — riesgo FUNCTIONAL_DEFECT en módulo legado de Cobros

`modules/cobros.js` se presenta como “Cobros y cartera” y opera directamente sobre `cobros`.

Contiene acciones que:

- validan reportes del cliente;
- cambian estados directamente;
- confirman pagos;
- marcan conciliado por carga de factura;
- invocan `Orbit.q.postRecaudo`;
- insertan actividades;
- disparan automatizaciones.

Además, su vista de cartera se calcula sobre `cobros`, mientras la cartera canónica vigente está en `carteraPrimas` y los recibos en `recibosEsperados`.

Con `cobros=0` no materializa efectos hoy, pero no puede convertirse en owner del nuevo bloque sin corrección transversal. Debe mantenerse congelado para escritura hasta que el flujo canónico sea:

fuente → propuesta → revisión/HOLD → match one-to-one → autorización → aplicación FIFO → cobro → post-recaudo/finanzas.

## Hallazgo 3 — bandeja de conciliaciones segura solo como propuesta

`modules/conciliaciones.js` declara correctamente que no aplica pagos ni toca `cobros`; solo cambia el estado de la propuesta.

Sin embargo, antes de habilitar sus acciones se debe resolver el owner de colección y confirmar:

- permisos y rol activo;
- motivo y auditoría antes/después;
- idempotencia de transición;
- bloqueo de VALIDADA cuando falte fuente, país, moneda, recibo canónico o match one-to-one;
- ninguna transición debe ejecutar pago implícito.

## Estado de fuentes previas

Dry-run anterior sobre dos reportes de aseguradora:

- filas pagadas revisadas: 9;
- candidatas one-to-one: 5;
- sin match suficiente: 4;
- cobros escritos: 0;
- finmovs escritos: 0.

No se extrapola a aseguradoras no auditadas.

## Gates del bloque

Antes de cualquier browser de Cobros, secreto, importación o escritura se requiere un gate propio que valide:

1. colección canónica de propuestas;
2. `cobros=0` y `finmovs=0` preservados durante dry-run;
3. matcher one-to-one sin reutilización de pagos;
4. FIFO con cartera activa e histórica exigible;
5. pago parcial, pago excedente y múltiples monedas sin mezcla;
6. HOLD para ambigüedad;
7. rollback exacto;
8. módulo legado sin acciones de escritura durante etapa read-only;
9. trazabilidad archivo/hoja/fila/país/moneda/periodo;
10. cero inferencia desde banco o ausencia de saldo.

## Clasificación para Claude y Academia

- matcher, UX de propuesta/HOLD/FIFO: `REPLICABLE_CLAUDE_ACUMULADO`;
- discrepancia `conciliacionesPrimas` vs `conciliaciones`: backend/contrato protegido, no entregar como parche visual;
- datos y resultados A&S: `TENANT_AYS_ONLY` / `SECRETO_DATO_REAL`;
- Academia debe enseñar la diferencia entre recibo, cartera, pago reportado, propuesta, cobro conciliado y finmov.

## Siguiente acción exacta

1. definir contrato canónico de propuesta de conciliación;
2. construir prueba estática de compatibilidad de colecciones;
3. congelar por contrato las acciones directas del módulo legado durante read-only;
4. inventariar todas las fuentes de pago disponibles sin cargar nuevas fuentes desactualizadas;
5. ejecutar dry-run de las 9 filas ya auditadas contra recibos/cartera canónicos;
6. simular FIFO sin escribir `cobros` ni `finmovs`;
7. presentar resultados crear/actualizar/omitir/HOLD y rollback antes de cualquier frontera de escritura.
