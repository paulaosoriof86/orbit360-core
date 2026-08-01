# Cierre estático — Matriz real Cobros/Conciliación

Fecha: 2026-08-01  
Corte principal: julio de 2026  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`REAL_PAYMENT_MATRIX_STATIC_READY`

La matriz se construyó en modo read-only cruzando:

- exportación CRM de pagos reportados;
- paquete canónico de pólizas;
- paquete canónico de recibos/cartera;
- reportes directos de pagos de aseguradora;
- estados de cartera por fecha de corte;
- proyectado posterior de Mapfre;
- planilla de comisión de Ficohsa;
- estado histórico de Bantrab.

No se solicitaron planillas, estados bancarios ni archivos financieros adicionales.

## Hallazgo de causa raíz

```text
pagos CRM de julio: 68
pagos conservados en paquete canónico: 63
pagos omitidos: 5
```

Los cinco omitidos no son duplicados ni errores de fecha:

- tres corresponden a cuotas de vigencias recientes vencidas de El Roble;
- dos corresponden a operaciones de una vigencia no renovada de Aseguradora General.

Clasificación: `DATA_CONTRACT_FAILURE`.

El paquete canónico había aplicado el filtro válido para generar cartera activa también a la evidencia histórica de pago. Esa reutilización del filtro era incorrecta:

```text
solo Vigente/Por renovar genera cartera futura
≠
solo Vigente/Por renovar puede recibir o conservar un pago
```

Corrección:

- los 68 pagos permanecen en la matriz;
- los 63 ya vinculados conservan su recibo canónico;
- los cinco restantes conservan la póliza y la vigencia histórica correcta;
- ninguno reactiva la póliza;
- ninguno se aplica automáticamente;
- el recibo exacto prevalece sobre FIFO genérico;
- si falta el recibo histórico, se propone y se autoriza antes de materializar.

## Resolución de los cinco omitidos

```text
1 · contraparte directa lista + propuesta de recibo histórico
1 · HOLD por diferencia de monto
3 · propuesta de recibo histórico pendiente de contraparte
```

## Cobertura multievidencia

La unión contiene 70 casos de evidencia de pago:

```text
68 · pagos reportados en CRM
 2 · pagos de aseguradora sin contraparte CRM
```

Los nueve renglones de reportes directos de aseguradora se resolvieron así:

```text
5 · match one-to-one
4 · HOLD
    1 diferencia de monto
    1 identidad insuficiente
    2 sin contraparte CRM
```

No se reutilizó ninguna fila de fuente.

## Resultado de la matriz sobre los 68 pagos CRM

| Estado | Casos |
|---|---:|
| Match directo de aseguradora listo | 4 |
| Match directo + recibo histórico propuesto | 1 |
| Recibo histórico pendiente de contraparte | 3 |
| HOLD directo por diferencia de monto | 1 |
| HOLD directo por identidad insuficiente | 1 |
| HOLD corroborado por comisión con conflicto de datos | 1 |
| HOLD porque continúa pendiente después del pago reportado | 1 |
| Desaparición del recibo con póliza aún presente; requiere autorización | 24 |
| Desaparición completa de la póliza; requiere validación | 7 |
| Fuente disponible tiene corte anterior al pago; requiere evidencia posterior | 14 |
| Sin contraparte de evidencia todavía | 11 |
| **Total** | **68** |

## Lectura correcta de los estados temporales

### Desaparición con póliza presente — 24

El estado posterior conserva la póliza y otros requerimientos, pero no el recibo pagado. Es una señal fuerte de clearing temporal. Todavía no crea el cobro por sí sola; pasa a propuesta para autorización.

### Desaparición completa — 7

La obligación y la póliza no aparecen en el snapshot posterior. Puede representar pago, ajuste, exclusión de alcance o cambio de vigencia. Permanece en validación.

### Corte anterior al pago — 14

La fuente disponible describe un momento anterior. Un pago posterior a ese corte es válido, pero la fuente no puede confirmar el estado posterior. No se interpreta como contradicción.

### Sin contraparte — 11

No existe todavía otra evidencia identificable para ese pago. En este grupo se concentran Columna y Seguros Múltiples de Inversión. No se infiere que el archivo GyT corresponda a Columna.

## Resultado por aseguradora

### Aseguradora General — 5

- tres matches directos listos;
- un match directo histórico con propuesta de recibo;
- un HOLD por diferencia de monto.

### Aseguradora Guatemalteca — 10

- tres desapariciones con póliza presente;
- siete pagos posteriores al corte del estado disponible.

### Bantrab — 2

El estado es anterior a ambos pagos. Conserva valor histórico, pero no confirma el saldo posterior.

### Columna — 10

No existe contraparte identificada en los archivos actuales. No se solicita todavía otra fuente hasta convertir cada caso en necesidad concreta.

### El Roble — 31

- 18 desapariciones con póliza presente;
- cinco desapariciones completas;
- cuatro pagos posteriores al corte inferido;
- tres recibos históricos pendientes de contraparte;
- un caso todavía pendiente después del pago reportado.

### Ficohsa — 1

La comisión corrobora reconocimiento del recaudo, pero el conflicto de prefijo de póliza y moneda conserva el HOLD.

### La Ceiba — 3

- una desaparición con póliza presente;
- dos desapariciones completas.

### Mapfre — 2 pagos CRM + 2 pagos solo aseguradora

- un match directo listo;
- un HOLD por identidad insuficiente;
- dos pagos del reporte de aseguradora no tienen contraparte CRM.

### Universales — 3

- dos desapariciones con póliza presente;
- un pago posterior al corte.

### Seguros Múltiples de Inversión — 1

No tiene contraparte adicional identificada.

## Contrato operativo

```text
recibo exacto
→ vigencia exacta, incluso vencida reciente
→ evidencia directa de aseguradora
→ evidencia temporal de cartera
→ comisión reconocida
→ soporte específico si queda HOLD
→ autorización
→ cobro
```

Límites:

- ausencia sola no crea cobro;
- comisión sola no crea cobro;
- banco solo no crea cobro;
- pago posterior al corte se conserva;
- un recibo de vigencia vencida no reactiva la póliza;
- no se reutiliza una fila de pago;
- `finmovs` permanece separado.

## Seguridad

```text
filas reales almacenadas en repo: 0
PII en evidencia persistida: 0
números de póliza en evidencia persistida: 0
montos reales en evidencia persistida: 0
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
operational writes: 0
browser: 0
deploy: 0
production: untouched
```

## Evidencia

- `AUDITORIA-READONLY-COBROS-MATRIZ-REAL-SANITIZADA-20260801.json`;
- owner `importa-cobros-matriz-multievidencia-p0.js`;
- regresión `orbit360-test-importa-cobros-matriz-multievidencia-p0-v20260801.mjs`.

## Siguiente acción exacta

Cerrar el gate 10.4 estático y, después, construir la cola de propuestas autorizables separando:

1. cinco matches directos;
2. 31 evidencias temporales de clearing;
3. cinco recibos históricos omitidos;
4. cuatro HOLD directos de aseguradora;
5. un HOLD de comisión;
6. un HOLD que aún aparece pendiente;
7. casos que requieren evidencia posterior o todavía no tienen contraparte.

No se ejecutará escritura hasta que esa cola tenga diff, idempotencia, rollback y autorización explícita.
