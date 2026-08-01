# CLAUDE ACUMULADO — PLANILLAS Y COMISIONES — FUENTES VARIABLES

**Fecha:** 2026-08-01  
**Clasificación:** `REPLICABLE_CLAUDE_ACUMULADO`  
**Backend y datos reales:** `BACKEND_PROTEGIDO_NO_CLAUDE` / `TENANT_AYS_ONLY`

## Patrón reusable

Las planillas de comisiones varían por aseguradora, periodo y formato. El frontend debe representar un flujo reusable de importación y validación, no una plantilla rígida por tenant. La identidad de póliza, la relación con recibo y el registro de comisión son tres niveles distintos.

## Estados visibles

```text
Fuente no recibida
Paquete incompleto
Fuente detectada
Mapeo propuesto
Periodo mensual detectado
Requiere validar periodo
Dry-run listo
Póliza identificada
Póliza pendiente de identificar
Recibo identificado
Recibo pendiente de identificar
Comisión pendiente de registrar
Comisión pendiente de confirmar
Comisión confirmada
Fila omitida
Fila preservada por identidad débil
```

## Campos conceptuales

El flujo debe poder mapear aliases hacia:

- aseguradora;
- país;
- moneda;
- periodo;
- fecha exacta cuando la fuente la incluya;
- póliza y aliases documentados del número;
- vigencia de póliza;
- recibo o requerimiento;
- factura y serie;
- endoso y referencia de origen;
- relación de ingreso;
- número de pago;
- ramo/producto;
- prima neta;
- valor total;
- comisión por venta A&S;
- comisión por cobro A&S;
- comisión del vendedor;
- asesor o código de vendedor;
- referencia adicional;
- archivo, hoja/página y fila.

## Reglas UX

- mostrar el periodo detectado antes de confirmar;
- diferenciar `fecha exacta` y `solo periodo mensual`;
- nunca completar visualmente un día que la fuente no contiene;
- alertar cuando una fila coincide con póliza e importe, pero pertenece a otro mes;
- separar prima neta, impuestos, gastos y total;
- separar comisión A&S, comisión por cobro y comisión del vendedor;
- no mostrar una estimación como comisión confirmada;
- permitir corregir el mapeo sin alterar el archivo original;
- presentar dry-run con crear, actualizar, omitir, preservar y requiere validación;
- excluir cobros no conciliados o en HOLD;
- mantener historial de fuente y decisión;
- separar estado CRM de estado financiero;
- mostrar por separado la calidad de identidad de póliza y la calidad de relación con recibo.

## Identidad y duplicados

La interfaz no debe llamar “duplicada” a una fila solo porque se parece a otra.

```text
identidad fuerte:
  póliza + fecha o referencia documental

identidad débil:
  póliza e importes sin fecha/recibo/requerimiento suficiente
```

UX requerida:

- identidad fuerte repetida: proponer `Omitir duplicado`;
- identidad débil repetida: mostrar `Preservar hasta validar`;
- explicar qué campos forman la identidad;
- mostrar si retirar una fila rompe la conciliación con el total de la fuente.

## Identidad de póliza

Un número exacto no siempre representa una sola póliza porque las renovaciones pueden conservar el mismo número. La interfaz debe admitir:

```text
Coincidencia exacta única
Coincidencia por alias de aseguradora
Vigencia resuelta por calendario de recibos
Conflicto de asegurado
Varias vigencias sin evidencia suficiente
Número no mapeado
Fuente con número que requiere corrección
```

No elegir automáticamente la póliza más reciente ni usar la fecha de pago de la comisión como fecha de vigencia.

## Relación con recibos

Después de identificar la póliza, el recibo puede continuar pendiente.

Estados recomendados:

```text
Póliza identificada · Recibo identificado
Póliza identificada · Varias cuotas posibles
Póliza identificada · Sin recibo compatible
Póliza pendiente · Recibo no evaluado
```

Reglas:

- priorizar requerimiento, serie, endoso, número de recibo o referencia fuerte;
- usar prima neta y moneda como fallback solo cuando exista un único recibo compatible;
- varias cuotas con el mismo importe permanecen en HOLD;
- no usar proximidad de fechas para escoger una cuota;
- una relación read-only no equivale a comisión registrada.

## Periodo mensual

Algunas fuentes son estados mensuales y no incluyen fecha exacta por fila.

Estado recomendado:

```text
Periodo confirmado: junio 2026
Fecha exacta: no informada por la fuente
```

No presentar esto como error si país, moneda y periodo son confiables y el importador se encuentra en modo mensual explícito.

## CRM vs comisión vs finanzas

La misma fila puede tener estados diferentes:

```text
CRM: póliza identificada
Recibo: pendiente
Comisión: no registrada
Finanzas: no activadas
```

```text
CRM: póliza y recibo identificados
Comisión: candidato read-only
Finanzas: pendiente de factura, banco o gate
```

No usar un único indicador “Completado” para todos los procesos.

## Estados vacíos honestos

Cuando falta la fuente exacta:

```text
Planilla pendiente
Aún no hay comisión confirmada para este cobro
```

Cuando la póliza está identificada, pero faltan referencias del recibo:

```text
Póliza identificada
No pudimos determinar qué cuota corresponde
Necesitamos requerimiento, serie, endoso o recibo de la aseguradora
```

Cuando el archivo depende de recursos externos no recibidos:

```text
No pudimos leer el detalle porque el paquete está incompleto
Adjunta un XLSX, CSV, PDF autosuficiente o el paquete completo
```

No mostrar cero como si fuera una comisión calculada ni reutilizar una fila del periodo anterior.

## Liquidaciones de asesores

La UI debe separar:

- comisión confirmada de A&S;
- código de vendedor de origen;
- vendedor resuelto por configuración;
- comisión de vendedor;
- estado de liquidación.

Si el total del vendedor no reconcilia o el alias no está confirmado, mostrar `Liquidación pendiente de validar` sin bloquear el histórico de comisión A&S.

## Academia impactada

Incluir:

- cobro conciliado vs comisión liquidada;
- periodo exacto y periodo mensual;
- fecha ausente vs fecha inventada;
- prima neta recaudada;
- identidad fuerte vs débil;
- número de póliza vs vigencia;
- alias por aseguradora;
- póliza identificada vs recibo identificado;
- cuota única vs cuota repetida;
- fuentes separadas;
- CRM-ready, commission-ready y finance-ready;
- `SOURCE_MISSING` y paquete incompleto;
- diferencia entre defecto funcional y validador obsoleto.

## Qué no compartir con Claude

- datos reales de planillas;
- pólizas, clientes, facturas o importes;
- códigos reales de vendedores;
- hashes e IDs privados;
- adaptadores protegidos;
- workflows y secrets;
- reglas específicas de acceso a Firestore.

## Instrucción acumulada para futura candidata

```text
En Planillas y Comisiones, diseñar un importador reusable para formatos variables por aseguradora. Detectar aliases, país, moneda y periodo; diferenciar fecha exacta de periodo mensual sin inventar días; proponer mapeo corregible; separar prima neta, total, comisión por venta A&S, comisión por cobro y comisión de vendedor; mostrar dry-run y estados honestos. Deduplicar solo con identidad fuerte y preservar filas débiles. Resolver por separado identidad de póliza, vigencia y recibo: un número exacto puede corresponder a varias renovaciones; usar aliases documentados, asegurado, ramo y calendario de recibos; nunca la fecha de pago de la comisión para escoger vigencia o cuota. Priorizar referencias fuertes y usar prima neta solo cuando identifica un único recibo. Mostrar por separado CRM-ready, commission-ready y finance-ready. Los cobros HOLD quedan excluidos y toda operación futura usa Orbit.store.
```
