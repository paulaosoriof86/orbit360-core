# CIERRE DE RECÁLCULO — CARTERA HISTÓRICA EXIGIBLE A&S

Fecha operativa: 2026-07-30  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Clasificación

`DATA_CONTRACT_FAILURE` del contrato 9.0.0 anterior, corregido de forma focal en Recibos/Cartera. Pólizas y Vehículos permanecen cerrados en `WRITE_PASS` y no se reimportan.

## Regla cerrada

- Los términos `Vigente` y `Por renovar` continúan siendo los únicos que generan calendario activo.
- Un término vencido reciente no genera cuotas nuevas ni se reactiva.
- Si una fuente vigente confirma que un recibo/saldo del término vencido sigue pendiente, se conserva como `cartera_historica_exigible`.
- `Reciente` lo determina el horizonte de la fuente vigente, no un número arbitrario de meses.
- La fecha de cobro de una cuota puede ser posterior al fin de cobertura; eso no invalida por sí solo la obligación. La exigibilidad depende de la fuente y del vínculo seguro al término/póliza.
- Cuando existe balance de aseguradora, esa fuente sustituye el calendario SIGA para saldo, fecha y monto; no se duplican ambas versiones.
- Si no existe una fuente de aseguradora superior para ese caso, SIGA con corte 2026-07-30 conserva autoridad operativa.
- La aplicación FIFO se reserva para Cobros/conciliación; este bloque no crea `cobros` ni `finmovs`.

## Evidencia privada reconciliada

Paquete privado delta en Drive, fuera del repositorio:

- nombre: `ORBIT360-AYS-CARTERA-HISTORICA-EXIGIBLE-DELTA-PRIVATE-20260730.xlsx`
- fileId: `1wrUcZpcGZxG0H-elPwOmSzAI_i5OSqqT`
- physicalSha256: `780436042d53cdec354f1bcc96a7a16e874c0c947454d121230f7cb7d9703317`
- logicalSha256: `abb4189778e3cb3f1ffcf7e4f249645dcad88bcf522e2039be517e512f8a9d46`
- receiptIdDigest: `431cccd46a3f05308e58d6597b68a5c43f7e7fcf00c403f24090fa91fff9f03e`
- portfolioIdDigest: `7bffffbb09e03eefcefccb860a633433d0b8e2554a3bd874289d68173e2ef8f7`

El repositorio conserva solo hashes, conteos y reglas; no conserva filas privadas.

## Recálculo sanitizado

El universo SIGA inicialmente excluido por estado contractual aportó 70 candidatos `Histórica/Renovada`.

- 65 correspondían a términos ya vencidos y recibos vencidos/al corte.
- 5 quedaron fuera por término aún no vencido o recibo todavía futuro al corte.
- 27 obligaciones permanecen bajo autoridad SIGA porque no existe una fuente superior para ese caso.
- 5 obligaciones se reconstruyen desde balances vigentes de aseguradora: 4 Mapfre y 1 El Roble.
- Los candidatos SIGA sustituidos o no confirmados por una fuente superior no se materializan en paralelo.
- La fuente vigente de La Ceiba no confirmó de forma exacta el candidato histórico revisado; no se fuerza.

Resultado final del delta:

```text
recibos_historicos_exigibles: 32
cartera_historica_exigible: 32
monto GTQ: 13,443.48
fuente SIGA: 27
fuente Mapfre: 4
fuente El Roble: 1
cobros: 0
finmovs: 0
```

## Universo combinado esperado para 9.1.0

El paquete activo 9.0.0 no se recalcula ni se altera; se reutiliza como baseline inmutable:

```text
activo recibos: 1261
activo cartera: 641
activo exigible/vencido: 99
activo futuro: 542
pago_reportado: 365
```

Con el delta histórico:

```text
recibosEsperados objetivo: 1293
carteraPrimas objetivo: 673
exigible/vencido total: 131
futuro activo: 542
histórico exigible: 32
```

## Gate y autorización

- Contrato siguiente: `9.1.0`.
- El gate sigue siendo único: `block9-receipts-portfolio-static-v20260730`.
- El prewrite 9.0.0 queda congelado como evidencia histórica y no puede escribirse.
- No existe request de escritura 9.1.0.
- La autorización anterior no se reutiliza porque cambiaron universo, hashes y conteos.
- Primero debe cerrar gate estático 9.1.0 y luego un nuevo prewrite read-only con cero escrituras.
- Solo un `PREWRITE_READY` 9.1.0 habilita solicitar una nueva autorización macro.

## Estado

`RECALC_SOURCE_RECONCILED_READY` — fuente y contrato funcional listos para actualización estática; cero escritura operativa, cero deploy, cero producción.
