# Ensayo M4 — Financiero histórico GT/CO v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Definir el ensayo controlado para importar el histórico financiero de A&S Guatemala y Colombia sin crear clientes, pólizas, cobros, cartera, producción ni comisiones productivas.

Este ensayo es de riesgo medio: alimenta Finanzas/flujo histórico, pero no debe afectar cartera, metas, producción ni estado de pagos.

## Fuente revisada localmente

Archivo local:

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

Revisión realizada solo sobre estructura.
No se subió el archivo real al repositorio.
No se copiaron movimientos, nombres de pagadores, montos ni saldos al repo.
No se cargaron datos reales.

## Estructura observada

El libro contiene múltiples hojas mensuales por país, por ejemplo:

- hojas A&S GT por mes;
- hojas A&S Col por mes;
- hojas auxiliares de salario;
- hoja de presupuesto;
- hoja de análisis;
- dashboard;
- listado de producción.

La fuente cubre histórico desde finales de 2024 hasta mayo 2026 aproximadamente.

## Hojas que sí son candidatas para M4

Solo deben procesarse hojas mensuales operativas con patrón similar a:

```txt
AyS GT <mes/año>
AyS Col <mes/año>
```

Estas hojas contienen bloques de ingresos, egresos y resumen.

## Hojas que deben excluirse en M4

No deben procesarse como financiero histórico:

- hojas de salario;
- presupuesto;
- análisis;
- dashboard;
- listado de producción;
- cualquier resumen, gráfico, tablero o soporte.

El listado de producción debe ir a flujo de pólizas/producción cuando corresponda, no a `finmovs`.

## Mapeo recomendado hacia `finmovs`

El importador `financiero-historico` espera:

- fecha o periodo;
- concepto;
- monto;
- tipo de movimiento;
- país;
- categoría/clase;
- moneda explícita o validación.

Mapeo recomendado:

| Orbit/finmovs | Fuente sugerida | Observación |
|---|---|---|
| concepto | Concepto | Mantener como descripción histórica |
| pagador/beneficiario | Pagador o equivalente | Solo como contraparte, no cliente/póliza |
| día | Día | Combinar con periodo detectado por hoja |
| clase | Clasificación | Categoría contable/histórica |
| valor | Valor | Monto absoluto; tipo define ingreso/egreso |
| tipo | Bloque Ingresos/Egresos | No inferir cartera |
| país | Nombre de hoja | GT o CO con trazabilidad explícita |
| periodo | Nombre de hoja | Mes/año detectado |
| moneda | Encabezado, hoja o validación | Si no es explícita, marcar `REQUIERE_VALIDACION` |

## Reglas de importación

1. Escribir únicamente en `finmovs`.
2. No crear clientes.
3. No crear pólizas.
4. No crear cobros.
5. No crear cartera.
6. No sumar GTQ y COP en crudo.
7. No convertir financiero histórico en producción real.
8. No usar movimientos financieros para confirmar pagos de clientes.
9. No usar saldos iniciales/finales como recaudo.
10. Excluir títulos, subtotales, totales, dashboards y presupuestos.

## Reglas para saldos

Los saldos anteriores/iniciales deben quedar como referencia o `saldo_inicial`, no como ingreso productivo.

Los saldos finales/resúmenes deben excluirse o quedar como referencia, no como movimiento operativo productivo.

## País y moneda

La hoja permite inferir país por nombre, pero la moneda debe quedar explícita o marcada para validación.

Regla:

- GT sugiere GTQ.
- CO sugiere COP.
- La sugerencia no autoriza escritura como moneda definitiva si el archivo/hoja/fila no la trae de forma confiable.
- Si falta moneda confiable, el registro debe quedar `REQUIERE_VALIDACION`.

## Riesgos detectados

### 1. Hojas auxiliares dentro del mismo libro

El libro mezcla hojas operativas con hojas de análisis, dashboard, presupuesto, salario y producción. El importador debe excluirlas o enviarlas a flujos distintos.

### 2. Bloques múltiples por hoja

Las hojas mensuales tienen bloques de ingresos, egresos y resumen. El parser debe detectar bloque de origen para asignar tipo de movimiento.

### 3. Saldos y totales

Saldos, impuestos, disponible, pendiente por pago, totales y subtotales no deben convertirse en ingresos/egresos operativos sin validación.

### 4. Conceptos que parecen cobros de clientes

Si un ingreso parece pago de cliente, recibo, prima, póliza, cuota, recaudo o abono, debe quedar `REQUIERE_VALIDACION` y no escribirse como producción/cobro confirmado.

### 5. Junio/julio 2026

La fuente revisada no resuelve por sí sola junio/julio 2026. Para esos meses debe cruzarse con planillas de comisión y estados de cuenta, porque pueden existir pagos aplicados en planillas que no aparecen en el financiero histórico.

## Criterio de aceptación M4

El ensayo pasa si:

- procesa solo hojas mensuales operativas;
- excluye hojas auxiliares;
- escribe o propone únicamente `finmovs`;
- separa GT/CO;
- conserva moneda o marca validación;
- conserva trazabilidad de archivo, hoja, bloque y fila;
- trata saldos como referencia;
- no crea cartera;
- no crea cobros;
- no crea producción real;
- genera reporte dry-run;
- permite revisar errores antes de escribir.

## Resultado esperado

Resultado aceptable:

```txt
Movimientos financieros históricos en finmovs.
Separados por país/moneda/periodo.
Saldos como referencia.
Cobros dudosos en REQUIERE_VALIDACION.
Sin clientes.
Sin pólizas.
Sin cobros.
Sin cartera.
Sin producción real.
```

## Orden recomendado de ejecución

1. Dry-run solo con una hoja GT de bajo riesgo.
2. Dry-run solo con una hoja CO de bajo riesgo.
3. Revisar moneda, periodo y exclusiones.
4. Generar reporte CSV.
5. Repetir con todas las hojas mensuales operativas.
6. No tocar junio/julio 2026 hasta tener planillas y estados de cuenta.

## Impacto Claude/prototipo

Claude debe conservar cuando entre:

- Finanzas histórico separado de cartera/cobros;
- bandera de `REQUIERE_VALIDACION`;
- no mezclar monedas;
- vista de movimientos por país/moneda/periodo;
- saldos como referencia;
- reportes que distingan financiero histórico vs producción/cobros.

## Impacto Academia

Academia debe enseñar:

- diferencia entre financiero histórico, cobros y cartera;
- por qué un movimiento financiero no confirma pago de cliente;
- cómo leer país/moneda;
- cómo interpretar saldos;
- cómo revisar movimientos en `REQUIERE_VALIDACION`;
- por qué producción se calcula sobre prima neta recaudada, no sobre cualquier ingreso financiero.

## Estado

Documento creado.
No se tocó código funcional.
No se subió la fuente real.
No se cargaron datos reales.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No secretos.
