# Cierre read-only — replay real Cobros/Conciliación

Fecha operativa: 2026-07-31  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`REAL_PAYLOAD_REPLAY_SANITIZED_READY`

Los tres archivos entregados coinciden exactamente, por hash y tamaño, con fuentes ya registradas. No constituyen un corte nuevo y no deben reimportarse como un lote distinto. Su nueva disponibilidad permitió ejecutar el replay de filas reales en modo read-only.

## Fuentes

| Fuente | Hash registrado | Formato | Filas de datos | Rol |
|---|---|---:|---:|---|
| Cobranza Efectuada desde 2024.xlsx | `727665170572143979b5f274190e200da397e7b32965d1809b1b9be6a8495302` | XLSX | 2157 | CRM: pago reportado |
| Reporte de Ingresos Aseguradora General.xls | `61574cc18b9200af438a49985e58deea635243f8808eac97470789df0db5b5ed` | XLS BIFF | 5 | aseguradora: ingreso/pago |
| Cobros Mapfre.xls | `d19559b7d5ad80930ad10f88d30ae7e0015b1647a5c0840867cf76e32c617ad8` | HTML XLS | 4 | aseguradora: cobro/pago |

Los payloads reales no se incorporaron al repositorio. La evidencia persistida contiene solo hashes, formatos, conteos y resultados agregados.

## Resultado del replay

```text
filas de aseguradora: 9
candidatas one-to-one: 5
HOLD: 4
vincular recibo existente: 4
proponer recibo histórico exigible: 1
```

Causas de HOLD:

- `IDENTIDAD_INSUFICIENTE`: 2;
- `DIFERENCIA_MONTO`: 1;
- `SIN_CONTRAPARTE_CRM`: 1.

Las diferencias no fueron borradas ni forzadas:

- tres candidatas conservan diferencia de centavos;
- cuatro conservan diferencia de fecha de vencimiento;
- tres conservan diferencia de fecha de pago.

## Causa raíz y corrección

Clasificación: `DATA_CONTRACT_FAILURE`.

El engine anterior exigía igualdad exacta de monto y fecha. Además, no modelaba suficientemente:

- endosos;
- distintas representaciones de cuota;
- recibos de vigencias recientes vencidas que continúan siendo exigibles;
- riesgo de emparejar una cuota de otra vigencia.

Corrección reusable:

- engine `20260801.2-real-payload-replay`;
- tolerancia controlada de centavos sin ocultar el delta;
- normalización de endoso y cuota;
- diferencias de fechas preservadas;
- prioridad del recibo exacto sobre FIFO genérico;
- cuota de otra vigencia bloqueada;
- recibo histórico faltante se propone, no se crea ni se aplica;
- ninguna póliza vencida se reactiva.

Commit de corrección: `cb299fc9e1bd8d8bb6b3378e28c162cc26a97abd`.

## Estado de los demás archivos

La expresión “procesado” se distingue por dominio:

- Pólizas, Vehículos y Recibos/Cartera: procesamiento de filas y cierre LAB completados;
- reportes de saldo pendiente de aseguradoras: procesados para cartera y autoridad de saldo, no como prueba de pago;
- CRM de cobranza: procesado previamente como evidencia de pago reportado, pero nunca materializado como cobro conciliado;
- planillas de comisiones, banco y financiero histórico: permanecen en dominios separados y no escriben Cobros ni `finmovs` desde este bloque.

Por lo tanto, no todos los archivos registrados están “procesados como Cobros”; hacerlo violaría la separación de fuentes.

## Cobertura de julio y fuentes faltantes

El CRM contiene 68 pagos reportados en julio de 2026, distribuidos entre diez aseguradoras. Los dos reportes de pago recibidos cubren Aseguradora General y Mapfre. Para las demás aseguradoras existen principalmente reportes de saldo/cartera, que no sustituyen un reporte de ingresos o cobros pagados.

Las contrapartes de pago pendientes corresponden a:

- El Roble;
- Aseguradora Guatemalteca;
- Columna;
- La Ceiba;
- Universales;
- Bantrab;
- Ficohsa;
- Seguros Múltiples de Inversión.

Solo deben solicitarse sus reportes de cobros/ingresos pagados de julio de 2026. Estados bancarios o documentos se reservan para HOLD específicos y no se usan como autoridad única.

## Invariantes

```text
Pago reportado ≠ reporte de aseguradora ≠ soporte bancario ≠ cobro conciliado
```

- un match one-to-one solo crea propuesta;
- HOLD no aplica pago;
- recibo histórico exigible se atiende antes cuando corresponde, sin reactivar póliza;
- banco y documentos son soporte, no autoridad única;
- no existe doble aplicación;
- no se crean `finmovs` desde Cobros.

## Seguridad y escritura

```text
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
operational writes: 0
deploy: 0
production: untouched
```

Evidencia agregada:

`orbit360-platform/docs/AUDITORIA-READONLY-COBROS-PAYLOAD-REPLAY-SANITIZADA-20260801.json`
