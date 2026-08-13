# DRY-RUN Recibos / Cartera A&S — 2026-07-30

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `SOURCE_DRYRUN_READY / FIRESTORE_PREWRITE_NOT_RUN`  
Escrituras operativas: 0

## 1. Regla operativa confirmada

El calendario operativo NO muestra recibos de pólizas canceladas, históricas, ya renovadas o vencidas sin vigencia contractual activa.

Autoridad:

- `polizas.estado = Vigente | Por renovar` → elegible para calendario/cartera;
- `Vigente futura` → se mantiene fuera del calendario operativo actual hasta iniciar vigencia;
- `Renovada` → versión histórica sustituida, no genera calendario vigente;
- `Cancelada`, `Histórica`, `No Renovada`, `Reexpedida` → fuera del calendario operativo;
- el texto fuente `Vencida` en SIGA puede ser condición de pago y no sustituye el estado contractual canónico.

Semántica destino:

- `recibosEsperados`: calendario completo de la vigencia activa, incluyendo pagados/reportados, pendientes exigibles y cuotas futuras;
- `carteraPrimas`: obligaciones todavía pendientes de pólizas activas, con `exigibilidad=futura|al_corte|vencida`;
- `cobros`: NO se materializa en este bloque; una fecha de pago es `pago_reportado` hasta conciliación.

## 2. Fuente SIGA deduplicada

Fuentes lógicas usadas:

- `Todos los recibos a partir de 2025.xlsx`: 2,098 filas de calendario;
- `Recibos por fecha límite.xlsx`: 1,698 filas de estado;
- `Cobranza Efectuada desde 2024.xlsx`: 2,157 filas de pagos reportados;
- `Cobranza vencida.xlsx`: 325 filas raw.

Las exportaciones equivalentes con branding (`Reporte-2026-07-30-183043`, `CobranzaCendoso (23)`, `CobranzaCendoso (22)`) no se cuentan dos veces.

## 3. Filtro contractual sobre pendientes raw

SIGA marca 937 filas como `Pendiente` en `Recibos por fecha límite`.

Cruce por `numero de póliza + vigencia + nombre cuando es necesario` contra el paquete canónico de 1,373 pólizas:

```text
Vigente:              826
Vigente futura:        39
Renovada histórica:    34
Histórica:              36
Sin póliza canónica:     2
TOTAL:                 937
```

Resultado: únicamente 826 obligaciones pertenecen al universo operativo actual. Las otras 111 no entran al calendario/cartera vigente.

Las 2 filas sin póliza canónica quedan como gestión de corrección; no se crea una póliza a partir de un recibo.

## 4. Calendario canónico de pólizas activas

Pólizas canónicas `Vigente` al corte: 224.  
Pólizas `Vigente futura`: 7, fuera del calendario operativo actual.

La fuente calendario contiene:

```text
1,235 filas asociadas a pólizas Vigente
223 pólizas con calendario fuente seguro
1 póliza Vigente sin calendario fuente suficiente
1,235 identidades únicas al incluir endoso + serie + vencimiento
```

La póliza activa sin calendario no se completa por inferencia porque tiene forma/frecuencia de pago faltante. Queda `REQUIERE_VALIDACION`.

La identidad segura de recibo es:

`polizaId + vigencia + endoso + serie + fechaLimite`

No se colapsan endosos. Se comprobó que existen pólizas con múltiples `1/1` en la misma fecha pero endosos y primas diferentes; cada uno representa una obligación distinta.

## 5. Estado operacional de los 1,235 recibos activos

```text
Futuro pendiente (> 30/07/2026):       573
Pendiente vencido (< 30/07/2026):      250
Pendiente vence al corte (=30/07):        3
Pago reportado:                         365
Requiere validar estado:                 44
TOTAL:                                 1,235
```

No hay recibos `Cancelado` dentro del universo contractual Vigente; los cancelados raw pertenecen a versiones no operativas y quedaron filtrados antes de construir calendario.

### Cartera pendiente preliminar SIGA

Pendiente total de pólizas activas: 826 recibos.

- exigible/vencida al corte: 253;
- futura: 573.

Montos preliminares por moneda, todavía sujetos a conciliación con aseguradoras:

```text
GTQ exigible/vencida: Q 192,245.21
GTQ futura:           Q 254,287.84
COP exigible/vencida: COP 11,618,854.17
COP futura:           COP 0.00 en el calendario activo pendiente detectado
```

Los 44 recibos con estado no resoluble NO entran a cartera hasta validar. Exposición de esos 44:

```text
GTQ: Q 29,883.43 (39 recibos)
COP: COP 22,864,011.00 (5 recibos)
```

## 6. Evidencia de la regla `Vencida` vs vigencia

Dentro de `Recibos por fecha límite`, 704 filas vinculadas a pólizas canónicas `Vigente` llegan con `Estatus póliza = Vencida` en la fuente SIGA.

Esto confirma la decisión funcional: el texto `Vencida` de la fuente de cobro se conserva como provenance/condición financiera y NO desactiva una póliza cuya vigencia canónica sigue activa.

## 7. Cruce con aseguradoras — regla de conciliación

Los reportes de aseguradoras son snapshots con cortes diferentes y se concilian por recibo; no se suman ni sustituyen a SIGA.

Hallazgos iniciales:

- La Ceiba incluye al menos una deuda de una vigencia 2025–2026 cuyo mismo número ya tiene versión canónica renovada 2026–2027. Esa deuda vieja no se reasigna al término vigente solo por compartir número.
- Universales reporta cartera al 27/07; AseGuate al 28/07; La Ceiba al 31/07. Las diferencias de fecha obligan a conservar `fechaCorteFuente`.
- Universales y AseGuate incluyen cuotas futuras dentro de su saldo total; por eso Orbit separa `carteraPendienteTotal` de `carteraExigibleVencida`.

Matching de aseguradora debe aceptar aliases por fuente sin hardcode genérico: número visible, prefijos internos, vigencia, asegurado, recibo/factura y monto.

## 8. Quality gates antes de PREWRITE

Antes de tocar Firestore se debe cerrar:

1. cruce por recibo con las aseguradoras recibidas;
2. resolución o HOLD explícito de los 44 estados faltantes;
3. explicación de la única póliza Vigente sin calendario fuente;
4. diff de 1,235 `recibosEsperados` y 826 candidatos a `carteraPrimas`;
5. cero pólizas/vehículos/clientes/aseguradoras modificados;
6. cero `cobros` y cero `finmovs`;
7. gate contractual canónico antes de secrets/Firestore;
8. prewrite read-only con baseline real.

Solo después podrá declararse `PREWRITE_READY` y pedirse una autorización macro de escritura.

## 9. Visualización

Checkpoint obligatorio: inmediatamente después de `Recibos/Cartera WRITE_PASS`, antes de Cobros/conciliación.

Debe permitir comprobar:

- Cliente 360 → póliza Vigente/Por renovar → vehículo(s) → calendario completo de esa vigencia;
- forma/frecuencia de pago;
- endosos y series sin colapsar;
- futuro / por vencer / vencido / pago reportado-en revisión;
- cartera pendiente total y cartera vencida/exigible separadas;
- pólizas históricas/canceladas fuera del calendario operativo.

## 10. Réplica / producto comercializable

Los fixes de esta etapa se documentan como patrón reusable:

- autoridad contractual separada de estado financiero fuente;
- identity de recibo endoso-aware;
- filtro de términos históricos antes de calendario;
- calendario completo vs cartera exigible;
- aliases por importador/fuente, no hardcode tenant;
- HOLD en vez de inferencia cuando falta estado;
- mismo pipeline para importación individual o masiva.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`; mapeos concretos A&S son `TENANT_AYS_ONLY`; writer/Firestore/rollback permanecen `BACKEND_PROTEGIDO_NO_CLAUDE`.
