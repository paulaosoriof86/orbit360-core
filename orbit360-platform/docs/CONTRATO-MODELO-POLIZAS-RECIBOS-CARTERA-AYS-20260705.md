# Contrato backend — Polizas + recibos + cartera

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** contrato/modelo agregado; sin persistencia real.

---

## 1. Objetivo

Definir el modelo backend plan-only para pólizas, recibos y cartera, manteniendo fuentes separadas, tenant isolation y reglas comerciales de A&S.

Este contrato no crea pólizas, no genera recibos, no genera cartera operativa y no activa Firestore LAB.

---

## 2. Restricciones fijas

- No datos reales en código.
- No crear clientes desde pólizas sin contrato validado.
- No generar recibos si falta estado, país o moneda confiable.
- No generar cartera desde financiero histórico ni `finmovs`.
- No usar estado bancario como cartera sin conciliación.
- No mezclar monedas en crudo.
- No Firestore writes.
- No `Orbit.store` writes.
- No deploy.
- No merge.

---

## 3. Fuentes permitidas

Fuentes válidas para proponer pólizas o completar metadata:

```txt
polizas
clientes
configuracion_catalogo
documentos_soporte
```

Reglas:

- `polizas` es la fuente natural para crear/actualizar pólizas.
- `clientes` solo relaciona póliza con cliente existente o validado.
- `configuracion_catalogo` puede completar catálogos controlados.
- `documentos_soporte` solo propone datos y requiere confirmación con diff.
- `financiero_historico`, `finmovs`, `estado_cuenta_bancario` y `planilla_comisiones` no crean pólizas ni recibos.

---

## 4. Colecciones previstas

```txt
polizas
recibos
carteraItems
polizaClienteRelaciones
auditLog
```

Estas colecciones deben incluir `tenantId` y `source_ref` para trazabilidad.

---

## 5. Modelo `polizas`

Campos mínimos:

```txt
tenantId
poliza_id
cliente_id
numero_poliza
aseguradora_id
ramo
pais
moneda
estado_poliza
vigencia_inicio
vigencia_fin
prima_neta
gastos
impuestos
prima_total
fuente_origen
source_ref
calidad_datos
created_at
updated_at
```

Reglas:

- `poliza_id` es generado por sistema.
- `cliente_id` debe existir o quedar pendiente de validación.
- `pais`, `moneda` y `estado_poliza` son necesarios para generar recibos.
- Si falta país, moneda o estado: `REQUIERE_VALIDACION`.
- GT usa GTQ.
- CO usa COP.

---

## 6. Estados de póliza

Estados que pueden generar recibos/cartera cuando los datos son confiables:

```txt
Vigente
Por renovar
```

Estados históricos:

```txt
Cancelada
Vencida
Anulada
Rechazada
```

Reglas:

- Pólizas vigentes o por renovar pueden generar recibos/cartera solo si país, moneda, estado y cliente son confiables.
- Pólizas canceladas, vencidas, anuladas o rechazadas son histórico y no generan cartera vigente.
- Si falta estado, no se generan recibos automáticos.

---

## 7. Modelo `recibos`

Campos mínimos:

```txt
tenantId
recibo_id
poliza_id
cliente_id
pais
moneda
periodo
fecha_vencimiento
prima_neta
gastos
impuestos
prima_total
estado_recibo
source_ref
created_at
updated_at
```

Reglas:

- El recibo hereda tenant, país y moneda de la póliza validada.
- Debe separar prima neta, gastos, impuestos y total.
- No debe mezclar monedas.
- No se marca como recaudado desde estado bancario sin conciliación.
- El recibo pendiente no equivale a producción.

---

## 8. Modelo `carteraItems`

Campos mínimos:

```txt
tenantId
cartera_item_id
recibo_id
poliza_id
cliente_id
pais
moneda
anio
saldo_pendiente
estado_cartera
origen
source_ref
created_at
updated_at
```

Reglas:

- Cartera solo incluye recibos pendientes de pólizas vigentes o por renovar.
- Cartera solo corresponde al año actual.
- Cartera no se genera desde financiero histórico.
- Cartera no se genera desde estado bancario sin conciliación.
- Cartera no debe usar cobros ya recaudados como pendientes.

---

## 9. Prima y producción

Componentes obligatorios:

```txt
prima_neta
gastos
impuestos
prima_total
```

Reglas:

- `prima_total` no reemplaza los componentes separados.
- Producción, metas y comisiones se calculan sobre `prima_neta_recaudada`.
- La emisión de póliza no cuenta como producción si no hay recaudo validado.
- No sumar GTQ y COP en crudo.

---

## 10. Relación póliza/cliente

Colección:

```txt
polizaClienteRelaciones
```

Campos mínimos:

```txt
tenantId
poliza_id
cliente_id
relacion_estado
source_ref
created_at
updated_at
```

Reglas:

- Una póliza debe relacionarse con cliente validado o quedar pendiente.
- No crear cliente automáticamente desde póliza si falta contrato/validación.
- Mantener trazabilidad de fuente.

---

## 11. Calidad de datos

Reglas:

- Si falta cliente, país, moneda o estado: `REQUIERE_VALIDACION`.
- Si falta vigencia: no generar recibos.
- Si falta desglose de prima: no generar cartera ni producción.
- Todo dato propuesto por documentos requiere confirmación.

---

## 12. Validador agregado

```txt
tools/orbit360-validar-modelo-polizas-recibos-cartera-ays.mjs
```

Uso previsto:

```txt
node tools/orbit360-validar-modelo-polizas-recibos-cartera-ays.mjs --model ruta/modelo-polizas.json --tenant alianzas-soluciones
```

El validador bloquea:

- fuentes no permitidas para crear pólizas/recibos;
- recibos con estado/pais/moneda faltantes;
- cartera generada en fase plan-only;
- producción por emisión sin recaudo;
- suma cruda de monedas;
- prima total sin componentes;
- payload/filas reales;
- secretos o credenciales;
- banderas de escritura.

---

## 13. Tests sintéticos agregados

```txt
tools/orbit360-test-validar-modelo-polizas-recibos-cartera-ays.mjs
```

Casos cubiertos:

- modelo válido;
- fuente no permitida;
- recibos sin estado confiable;
- cartera generada en fase plan-only;
- producción por emisión;
- suma cruda multi-moneda;
- prima sin componentes;
- payload/filas reales.

---

## 14. Impacto en Academia y manuales

Debe actualizarse cuando Claude retome:

- diferencia entre cliente, póliza, recibo, cartera, cobro y producción;
- estados de póliza y su efecto;
- cartera como pendiente del año actual;
- prima neta, gastos, impuestos y total;
- producción por prima neta recaudada;
- país/moneda y validación obligatoria.

---

## 15. Estado

Contrato y tooling agregados en rama. No se ejecutó localmente. No hay persistencia real, creación de pólizas, recibos ni cartera operativa.