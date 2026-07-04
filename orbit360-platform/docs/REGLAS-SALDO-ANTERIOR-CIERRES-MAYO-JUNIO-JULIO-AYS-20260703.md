# Reglas preliminares — Saldo anterior y cierres mayo/junio/julio A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** reglas preliminares documentales  
**Estado:** propuesta; requiere validación de Paula antes de uso operativo o LAB.

## 1. Objetivo

Separar los movimientos históricos financieros cerrados de los saldos iniciales, borradores y cierres manuales pendientes de mayo, junio y julio.

Estas reglas buscan evitar:

- doble conteo de saldos;
- tratar saldos iniciales como ingresos;
- mezclar cierres manuales con históricos;
- cargar mayo/junio/julio sin conciliación;
- contaminar clientes, pólizas, cobros o cartera.

## 2. Regla base de `Saldo anterior`

`Saldo anterior` no debe clasificarse automáticamente como ingreso ni egreso operativo.

Tratamiento propuesto:

```txt
origen_bloque = SALDO_ANTERIOR
tipo_movimiento = saldo_inicial
estado = referencia
signo = 0
conciliacion_estado = no_aplica o no_conciliado
requiere_validacion = true hasta confirmar regla final
```

## 3. Uso permitido de `Saldo anterior`

`Saldo anterior` sirve para:

- referencia de inicio de periodo;
- conciliación de saldos;
- validar continuidad entre meses;
- detectar diferencias entre cierre anterior y apertura actual.

No sirve para:

- producción;
- cartera;
- ingresos operativos;
- egresos operativos;
- comisiones;
- cobros;
- facturas;
- metas.

## 4. Riesgo de doble conteo

Si `Saldo anterior` se suma como ingreso, puede inflar el flujo de caja mensual.

Regla protegida:

```txt
Los reportes de flujo operativo deben excluir saldo_inicial salvo que el reporte sea de balance/saldos.
```

## 5. Regla de continuidad entre meses

En una fase posterior de conciliación, se podrá validar:

```txt
saldo_final_mes_anterior = saldo_anterior_mes_actual
```

Si no coincide:

```txt
estado = requiere_validacion
validaciones += ['diferencia_saldo_inicio']
```

No se corrige automáticamente.

## 6. Mayo 2026

Paula indicó que mayo 2026 se llenará manualmente y se conciliará con planillas de aseguradoras, estados de cuenta y respaldos.

Regla preliminar:

- Las hojas mayo 2026 del archivo de movimientos quedan como referencia/no cierre.
- No se cargan como histórico consolidado.
- Pueden usarse como insumo de comparación durante conciliación manual, si Paula lo autoriza.

Estado sugerido si se procesan en dry-run futuro:

```txt
estado = referencia
periodo = 2026-05
requiere_validacion = true
conciliacion_estado = no_conciliado
```

## 7. Junio 2026

Junio no forma parte del archivo histórico cerrado.

Regla preliminar:

- Debe capturarse/validarse manualmente.
- Debe conciliarse contra planillas de aseguradoras y estados de cuenta.
- No debe inferirse desde archivos anteriores.
- No debe heredarse automáticamente desde mayo.

## 8. Julio 2026

Julio no forma parte del histórico financiero cerrado.

Regla preliminar:

- Debe capturarse/validarse manualmente.
- Debe conciliarse contra planillas de aseguradoras y estados de cuenta.
- Puede quedar como periodo abierto si todavía está en curso.
- No debe mezclarse con histórico migrado.

## 9. Estados sugeridos por periodo

| Periodo | Estado sugerido | Regla |
|---|---|---|
| 2024-11 a 2026-04 | historico | Candidato para `finmovs` histórico, previa validación. |
| 2026-05 | referencia / requiere_validacion | Cierre manual pendiente. |
| 2026-06 | requiere_validacion | Captura y conciliación manual. |
| 2026-07 | abierto / requiere_validacion | Periodo operativo actual o en cierre. |

## 10. Regla de conciliación con planillas y estados de cuenta

Para mayo, junio y julio, un movimiento no debe quedar como cerrado hasta cruzarse con al menos una fuente de respaldo:

- estado de cuenta bancario;
- planilla de aseguradora;
- soporte interno validado;
- registro manual aprobado.

Estado sugerido antes de conciliación:

```txt
conciliacion_estado = no_conciliado
```

Después de validación:

```txt
conciliacion_estado = conciliado | diferencia | no_aplica
```

## 11. Regla anti-inferencia

Los cierres manuales de mayo, junio y julio no deben crear automáticamente:

- clientes;
- pólizas;
- cobros;
- cartera;
- comisiones por asesor;
- metas.

Esas entidades se cargarán desde archivos separados y actualizados.

## 12. Requisitos antes de cerrar mayo/junio/julio en Orbit

1. Fuente bancaria revisada.
2. Planillas de aseguradoras revisadas cuando aplique.
3. Diferencias identificadas.
4. Movimientos manuales registrados con responsable/fecha.
5. Registros marcados como conciliados o con diferencia.
6. Moneda separada GTQ/COP.
7. Sin mezcla de cartera ni producción.

## 13. Pendiente para prototipo base / Claude

El módulo/importador financiero debe incorporar:

1. Estado de periodo: histórico, referencia, abierto, cerrado, requiere validación.
2. Tratamiento especial de `Saldo anterior`.
3. Bloqueo de saldos iniciales en reportes de flujo operativo.
4. Flujo de cierre manual por mes.
5. Conciliación con planillas/estados de cuenta.
6. Separación estricta entre finanzas y cartera.
7. Registro de responsable y fecha para ajustes manuales.

## 14. Restricciones cumplidas

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

**Reglas preliminares documentadas.**

Requieren validación antes de uso operativo o LAB.
