# CIERRE SOURCE RECONCILIATION — RECIBOS / CARTERA A&S — 2026-07-30

Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `SOURCE_RECONCILED_READY / FIRESTORE_PREWRITE_PENDING`  
Escrituras operativas: `0`

## 1. Autoridad funcional

El calendario operativo muestra todos los recibos conocidos del término contractual activo de pólizas `Vigente` / `Por renovar`, no solo los vencidos.

No alimentan el calendario operativo actual:

- pólizas canceladas;
- pólizas históricas;
- términos ya renovados/sustituidos;
- términos de vigencia futura que todavía no iniciaron.

El texto financiero de una fuente de cobro no sustituye el estado contractual canónico de `polizas`.

## 2. Fuente y reconciliación

SIGA aporta calendario, series, endosos y evidencia de pagos. Los balances/estados de cartera de aseguradoras refinan saldo, fecha, número de recibo/factura y estructura de cuotas cuando el término de póliza coincide de forma segura.

Reglas:

- no sumar snapshots de aseguradoras entre sí;
- conservar `fechaCorteFuente`;
- no mover deuda de una vigencia vieja a una renovación nueva solo por compartir número de póliza;
- no colapsar endosos con prima;
- cuando una programación SIGA es superada por el balance de la aseguradora, se excluye de la programación operativa pero queda trazada en el diff;
- un pago reportado no crea `cobros`; Cobros/conciliación sigue separado.

## 3. Resultado final del source dry-run reconciliado

```text
pólizas Vigente: 224
pólizas Vigente con calendario: 223
pólizas Vigente sin recibo fuente seguro: 1
términos Vigente futura excluidos: 7

recibosEsperados candidatos: 1261
carteraPrimas candidatos: 641
  exigibles/vencidos al corte: 99
  futuros: 542

pago_reportado: 365
sin saldo pendiente según aseguradora: 211
HOLD de estado: 44
alertas de calidad persistibles de cartera: 28
programaciones SIGA superadas y excluidas: 20
```

La única póliza activa sin recibo fuente seguro permanece en `REQUIERE_VALIDACION`; no se genera un recibo inferido.

## 4. Identidad y relaciones

Unidad de recibo:

`polizaId + vigencia + endoso + serie + fechaLimite`

Un endoso que genera prima se conserva como obligación separada aun cuando coincida en fecha o serie visual con otro recibo.

Cada candidato a `carteraPrimas` debe enlazar a un `reciboId` del mismo paquete y ambos deben conservar exactamente `polizaId`, `clienteId` y `aseguradoraId`.

## 5. Paquete privado congelado

Archivo privado fuera de GitHub:

`ORBIT360-AYS-RECIBOS-CARTERA-CANONICAL-PRIVATE-20260730`

Contiene datos reales y no se publica en el repositorio. El repo conserva únicamente hashes/digests y conteos sanitizados.

## 6. Siguiente gate

`block9-receipts-portfolio-static-v20260730`

Orden obligatorio:

1. gate canónico estático;
2. validación de owner/write guard/rollback sin secrets;
3. descarga privada exacta después del gate;
4. prewrite read-only contra Firestore;
5. `PREWRITE_READY`;
6. autorización macro independiente;
7. única escritura controlada;
8. revisión visual integrada antes de Cobros/conciliación.

## 7. Visualización posterior a WRITE_PASS

Debe mostrar:

- Cliente 360 → póliza activa → vehículo(s) → calendario completo;
- forma/frecuencia de pago;
- endosos y series;
- futuro / vence / vencido / pago reportado-en revisión;
- cartera pendiente total separada de cartera exigible/vencida;
- términos históricos/cancelados fuera del calendario operativo.

## 8. Reuso transversal

Se preservan como patrones reutilizables:

- separación estado contractual vs estado financiero fuente;
- calendario completo vs saldo exigible;
- reconciliación por alcance de fuente;
- identidad endoso-aware;
- corrección de programación por balance de aseguradora;
- HOLD en vez de inferencia;
- mismo pipeline para alta individual y masiva.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`. Mapeos concretos A&S son `TENANT_AYS_ONLY`; writer/Firestore/rollback permanecen `BACKEND_PROTEGIDO_NO_CLAUDE`.
