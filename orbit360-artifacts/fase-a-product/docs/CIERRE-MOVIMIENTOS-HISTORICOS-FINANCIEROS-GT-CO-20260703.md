# Cierre movimientos históricos financieros GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Fuente:** `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx`  
**Estado:** cierre documental del alcance financiero histórico; sin carga LAB.

## 1. Alcance definitivo

El archivo se usará únicamente para movimientos históricos financieros de Guatemala y Colombia.

No se usa para:

- clientes definitivos;
- pólizas definitivas;
- cobros realizados definitivos;
- cartera;
- producción real;
- Firestore LAB;
- seed demo.

La hoja `Listado producción 2025-2026` queda ignorada para migración operativa.

## 2. Hojas revisadas

| Tipo de hoja | Cantidad | Tratamiento |
|---|---:|---|
| Hojas mensuales GT/CO detectadas | 38 | Base de revisión financiera. |
| Hojas históricas migrables hasta abril 2026 | 36 | Candidatas para `finmovs` históricos. |
| Hojas mayo 2026 | 2 | Referencia/no finales; cierre manual y conciliado. |
| Hojas soporte/no mensuales | 6 | No migración directa. |

Hojas soporte/no mensuales detectadas:

- Salario Carlos 2025.
- Salario Carlos.
- Presupuesto May 26.
- Análisis 2026.
- Dashboard 2026.
- Listado producción 2025-2026.

## 3. Corte histórico financiero

Para este bloque se toma como histórico financiero consolidable únicamente:

```txt
noviembre 2024 a abril 2026
```

Incluye Guatemala y Colombia.

Las hojas de mayo 2026 no se consideran cierre definitivo porque Paula indicó que el cierre de mayo, junio y julio se llenará manualmente y se conciliará contra planillas de aseguradoras, estados de cuenta y respaldos.

## 4. Conteo estructural sin datos reales

| Alcance | Hojas | Registros candidatos | Ingresos candidatos | Egresos candidatos |
|---|---:|---:|---:|---:|
| Histórico hasta abril 2026 | 36 | 804 | 256 | 548 |
| Mayo 2026, solo referencia | 2 | 43 | 15 | 28 |

Distribución del histórico hasta abril 2026:

| País | Registros candidatos |
|---|---:|
| Guatemala | 568 |
| Colombia | 236 |

Estos conteos son estructurales y no sustituyen una conciliación contable. No se documentan importes ni terceros en el repo.

## 5. Reglas de importación financiera propuestas

Para convertir esta fuente en `finmovs` históricos se requiere aplicar estas reglas:

1. Cada hoja mensual debe mapearse a país, mes y año.
2. Guatemala debe manejarse en GTQ.
3. Colombia debe manejarse en COP.
4. No mezclar monedas.
5. Separar ingresos y egresos.
6. Distinguir `Saldo anterior` de movimientos operativos.
7. Mantener clasificación financiera si la hoja la trae.
8. Si no hay clasificación, inferir solo categoría preliminar y marcar `requiere_validacion`.
9. No convertir comisiones o ingresos en pólizas/cobros.
10. No crear cartera desde movimientos financieros.
11. No usar hojas de presupuesto/análisis/dashboard como movimientos reales.
12. Registrar trazabilidad de hoja, bloque y fila de origen en una carga futura LAB.

## 6. Campos mínimos sugeridos para `finmovs`

```txt
id
pais
moneda
periodo
fecha_operativa
origen_archivo
origen_hoja
origen_bloque
concepto
tercero
clasificacion
tipo_movimiento
monto
iva_si_aplica
estado
observaciones
requiere_validacion
createdAt
updatedAt
```

## 7. Bloqueos antes de carga LAB

No se debe cargar Firestore LAB todavía.

Pendientes antes de una carga segura:

1. Validar si `Saldo anterior` entra como movimiento, balance inicial o referencia.
2. Confirmar tratamiento de registros con monto cero, pendiente o columnas usadas de forma irregular.
3. Definir catálogo de categorías financieras A&S.
4. Definir cómo se marcarán préstamos/aportes internos vs ingresos operativos.
5. Confirmar si mayo 2026 se excluye completamente o se usa solo como borrador de conciliación.
6. Cruzar cierre manual de mayo, junio y julio con planillas y estados de cuenta.

## 8. Pendientes para prototipo base / Claude

Aplicar al importador inteligente:

1. Permitir seleccionar alcance del archivo antes de procesar: financiero histórico, clientes, pólizas, cobros, planillas, estados de cuenta o soporte.
2. Si el alcance es financiero histórico, bloquear inferencias automáticas hacia clientes, pólizas, cobros y cartera.
3. Detectar hojas mensuales por país/mes/año.
4. Detectar bloques `INGRESOS` y `EGRESOS` aunque el formato cambie por mes.
5. Excluir hojas de presupuesto, análisis, dashboard y producción si no se seleccionan explícitamente.
6. Identificar `Saldo anterior` como balance/referencia, no necesariamente como movimiento operativo.
7. Mostrar prevalidación antes de importar: hojas incluidas, excluidas, ingresos, egresos, moneda, país, registros con pendiente, registros sin clasificación.
8. Permitir conciliación posterior con estados de cuenta y planillas de aseguradoras.

## 9. Restricciones cumplidas

- No deploy.
- No merge.
- No actualización de `main`.
- No escritura Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No modificación del backend LAB protegido.
- No descargables para Paula.

## Estado final

**Bloque financiero histórico documentado.**

La siguiente fase real debe usar archivos actualizados y separados por entidad cuando Paula los proporcione uno a uno: clientes, pólizas, cobros realizados, planillas de aseguradoras y estados de cuenta/cierres.
