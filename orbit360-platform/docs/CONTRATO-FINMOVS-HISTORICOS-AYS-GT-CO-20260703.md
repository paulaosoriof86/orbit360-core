# Contrato de importación — `finmovs` históricos A&S GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** contrato técnico documental  
**Estado:** definido sin carga LAB; requiere autorización explícita antes de implementación/escritura.

## 1. Alcance

Este contrato aplica únicamente a movimientos históricos financieros derivados del archivo:

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

Alcance autorizado:

```txt
Histórico financiero Guatemala / Colombia hasta abril 2026
```

Excluido:

- mayo 2026 como cierre definitivo;
- junio 2026;
- julio 2026;
- clientes;
- pólizas;
- cobros realizados;
- cartera;
- producción;
- seed demo;
- Firestore LAB sin autorización explícita.

## 2. Colección destino futura

```txt
finmovs
```

No deben generarse desde esta fuente:

```txt
clientes
polizas
cobros
comisiones
facturas
cartera
aseguradoras
asesores
```

`facturas` solo podría considerarse en una fase separada si existe una fuente específica de CxC/CxP o una regla aprobada para pendientes/no facturados. No se habilita en este contrato.

## 3. Esquema propuesto

```js
{
  id: string,
  tenantId: string,
  pais: 'GT' | 'CO',
  moneda: 'GTQ' | 'COP',
  periodo: 'YYYY-MM',
  fecha_operativa: 'YYYY-MM-DD' | null,
  fecha_contable: 'YYYY-MM-DD' | null,
  origen_archivo: string,
  origen_hoja: string,
  origen_bloque: 'INGRESOS' | 'EGRESOS' | 'SALDO_ANTERIOR' | 'AJUSTE' | 'SIN_CLASIFICAR',
  origen_fila_hash: string,
  tipo_movimiento: 'ingreso' | 'egreso' | 'saldo_inicial' | 'ajuste' | 'sin_clasificar',
  concepto: string,
  tercero: string | null,
  categoria: string | null,
  subcategoria: string | null,
  monto: number,
  monto_original: number,
  signo: 1 | -1 | 0,
  estado: 'historico' | 'referencia' | 'requiere_validacion' | 'excluido',
  conciliacion_estado: 'no_conciliado' | 'conciliado' | 'diferencia' | 'no_aplica',
  requiere_validacion: boolean,
  validaciones: string[],
  observaciones: string | null,
  createdAt: string,
  updatedAt: string
}
```

## 4. Reglas de país y moneda

| País | Moneda |
|---|---|
| Guatemala | GTQ |
| Colombia | COP |

Reglas:

- No mezclar monedas.
- No sumar GTQ y COP en un mismo total.
- El país se infiere de la hoja mensual, no del concepto.
- Si la hoja no permite país confiable, el movimiento queda `requiere_validacion=true`.

## 5. Reglas de tipo de movimiento

| Bloque origen | Tipo destino | Signo sugerido |
|---|---|---:|
| INGRESOS | ingreso | 1 |
| EGRESOS | egreso | -1 |
| Saldo anterior | saldo_inicial | 0 |
| Ajustes explícitos | ajuste | según columna/origen |
| Sin bloque confiable | sin_clasificar | 0 |

`Saldo anterior` no se debe tratar automáticamente como ingreso o egreso operativo. Debe quedar como `saldo_inicial` o `referencia` hasta definir regla contable final.

## 6. Reglas de estado

| Estado | Uso |
|---|---|
| historico | Movimiento financiero histórico candidato, antes de conciliación. |
| referencia | Registro útil para contexto, pero no movimiento operativo directo. |
| requiere_validacion | Registro incompleto, ambiguo o con monto/fecha/categoría dudosa. |
| excluido | Registro no importable, subtotal, total, encabezado o soporte. |

## 7. Reglas de exclusión

Excluir o marcar como `excluido`:

- títulos;
- encabezados repetidos;
- subtotales;
- totales;
- filas vacías;
- separadores visuales;
- hojas de presupuesto;
- hojas de análisis;
- dashboards;
- hoja de producción;
- cualquier registro sin monto confiable y sin valor contable.

## 8. Validaciones mínimas

Cada registro candidato debe validar:

1. país confiable;
2. moneda coherente con país;
3. periodo reconocible;
4. bloque origen reconocible;
5. monto numérico;
6. concepto no vacío;
7. no ser subtotal/total/encabezado;
8. no provenir de hoja excluida;
9. trazabilidad de origen;
10. estado de validación asignado.

## 9. Trazabilidad obligatoria

Cada movimiento debe conservar:

```txt
origen_archivo
origen_hoja
origen_bloque
origen_fila_hash
periodo
pais
moneda
```

No se documentan datos reales en GitHub. La trazabilidad detallada se conserva solo en ejecución privada/LAB autorizada.

## 10. Reglas anti-contaminación

Este contrato bloquea expresamente:

- crear clientes desde movimientos;
- crear pólizas desde movimientos;
- crear cobros desde movimientos;
- crear cartera desde movimientos;
- asociar automáticamente ingresos a pólizas;
- usar conceptos financieros como datos maestros;
- importar producción desde la hoja `Listado producción 2025-2026`.

## 11. Dry-run esperado, cuando se autorice

El dry-run futuro debe producir solo reporte, no escritura:

```txt
hprocesadas
h_excluidas
registros_candidatos
registros_excluidos
ingresos
egresos
saldo_inicial
requiere_validacion
por_pais
por_moneda
por_periodo
validaciones
errores_bloqueantes
```

## 12. Condiciones para permitir escritura LAB

La escritura LAB solo podrá considerarse después de cumplir todo esto:

1. autorización explícita de Paula;
2. confirmación de tenant LAB;
3. dry-run sin errores bloqueantes;
4. reglas de `Saldo anterior` definidas;
5. catálogo financiero mínimo definido;
6. estrategia de conciliación definida;
7. reporte de exclusiones revisado;
8. garantía de no tocar clientes/pólizas/cobros/cartera.

## 13. Pendientes de backend

1. Definir catálogo financiero base A&S.
2. Definir tratamiento final de `Saldo anterior`.
3. Definir normalización de conceptos recurrentes.
4. Definir hash estable de fila sin exponer datos sensibles.
5. Preparar script dry-run sin escritura.
6. Preparar reporte de validación sin payload real.

## 14. Pendientes de prototipo base / Claude

1. Selector obligatorio de alcance del archivo.
2. Modo `financiero histórico` con bloqueo de inferencias CRM.
3. Prevalidación visual antes de importar.
4. Resumen por país/moneda/periodo.
5. Panel de registros excluidos.
6. Panel de registros que requieren validación.
7. Flujo posterior de conciliación con estados de cuenta y planillas.

## 15. Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No backend LAB protegido modificado.
- No descargables.

## Estado

**Contrato documental definido.**

Pendiente: implementación dry-run solo cuando se decida avanzar con backend de importación financiera y bajo autorización explícita.
