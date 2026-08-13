# Contrato backend — Score de confianza para conciliación A&S

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** contrato técnico + herramienta segura metadata-only.

---

## 1. Objetivo

Crear una regla backend objetiva para decidir si una fila de planilla/estado puede proponerse como conciliación contra un cobro/recibo de Orbit 360.

La herramienta agregada no escribe en `Orbit.store`, no modifica Firestore, no lee filas reales desde el repo y solo procesa casos metadata-only.

Archivos agregados:

```txt
tools/orbit360-calcular-score-conciliacion-ays.mjs
tools/orbit360-test-score-conciliacion-ays.mjs
```

---

## 2. Fuentes permitidas para score

El score aplica únicamente a fuentes de conciliación:

```txt
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
```

No aplica a:

```txt
clientes
aseguradoras
polizas
vehiculos
financiero_historico
documentos_soporte
configuracion_catalogo
```

---

## 3. Evidencias ponderadas

El score suma hasta 100 puntos:

```txt
policy: 18
receipt_or_installment: 16
client: 14
insurer: 12
country_currency: 16
amount: 14
period_or_date: 10
```

Ajuste por confiabilidad de fuente:

```txt
ALTA/HIGH: 0
MEDIA/MEDIUM: -5
BAJA/LOW: -12
sin declarar: -8
```

---

## 4. Núcleo mínimo obligatorio

Para no bloquear, debe existir evidencia núcleo:

```txt
póliza + país/moneda + monto
```

Si falta cualquiera de esos tres elementos, el resultado queda `BLOQUEADO`.

País/moneda se valida con la regla vigente:

```txt
GT => GTQ
CO => COP
```

Una combinación incoherente queda bloqueada.

---

## 5. Salidas de decisión

```txt
MATCH_EXACTO
MATCH_PROBABLE
REQUIERE_VALIDACION
BLOQUEADO
```

Reglas:

- `MATCH_EXACTO`: score >= 90, con recibo/cuota y partes confiables.
- `MATCH_PROBABLE`: score >= 75.
- `REQUIERE_VALIDACION`: score >= 50.
- `BLOQUEADO`: score < 50, falta núcleo, moneda incoherente, fuente no autorizada o caso con filas embebidas.

---

## 6. Acciones propuestas

La herramienta no aplica pagos automáticamente. Solo propone:

```txt
PROPONER_APLICACION_CON_CONFIRMACION
PROPONER_REVISION
ENVIAR_A_BANDEJA_VALIDACION
NO_APLICAR
```

La aplicación real queda pendiente para fase backend/LAB aprobada, con auditoría y usuario/proceso.

---

## 7. Casos cubiertos por pruebas sintéticas

`tools/orbit360-test-score-conciliacion-ays.mjs` cubre:

1. match exacto;
2. match probable;
3. requiere validación;
4. bloqueo por falta de núcleo;
5. bloqueo por país/moneda incoherente;
6. bloqueo por filas/datos embebidos en caso.

Los tests son sintéticos y no contienen datos reales.

---

## 8. Relación con junio/julio 2026

Junio y julio 2026 deben procesarse como caso de migración, no como lógica productiva hardcodeada.

Planillas de comisión pueden confirmar pagos aplicados solo si la fila real respalda el dato y el score queda en nivel suficiente. Si el score no alcanza, el registro queda en validación.

---

## 9. Impacto en módulos

Backend:

- `conciliaciones` debe guardar score, decisión, acción propuesta, fuente y trazabilidad.
- `cobros` solo debe cambiar estado después de confirmación aprobada.
- `comisiones` debe separar esperada, pagada, diferencia, retención, ajuste y periodo.
- `finmovs` no debe recibir cobros ni recaudos por este flujo.

Claude/prototipo:

- mostrar exacto/probable/requiere validación/bloqueado;
- no presentar pagos como aplicados si solo son propuestas;
- mostrar fuente, hoja, fila, periodo, país y moneda;
- separar estados de Portal: reportado, revisión, aplicado y conciliado.

---

## 10. Uso esperado

```txt
node tools/orbit360-calcular-score-conciliacion-ays.mjs --case ruta/caso.local.json
node tools/orbit360-test-score-conciliacion-ays.mjs
```

Los reportes se escriben en `_orbit360_reports`.
