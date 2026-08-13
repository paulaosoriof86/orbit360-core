# Nota para Claude — fixes importador post candidata 2026-07-04T072304

Fecha: 2026-07-04
Estado: instrucciones para próxima candidata.

## Objetivo

Corregir los P0/P1 reales detectados en `core/importa.js` y UI relacionada, sin tocar backend ChatGPT/Codex.

## Fixes mínimos obligatorios

### 1. Trazabilidad hoja/fila

Implementar helper similar a:

```js
function copyRowMeta(cells, rec) {
  ['_origenHoja','_paisHoja','_monedaHoja','_periodoHoja','_bloqueOrigen','_numeroFila'].forEach(k => {
    if (cells && cells[k] != null && rec[k] == null) rec[k] = cells[k];
  });
  return rec;
}
```

Usarlo en `applyImport`, `dryRun`, `conciliarRows` y reporte.

### 2. País/moneda sin defaults peligrosos

Eliminar moneda autorizada por `monedaDe(pais)` si no viene explícita. El país puede sugerir moneda, pero debe quedar en campo separado `monedaSugerida` y `requiereValidacion=true`.

### 3. Planillas de comisión

Separar importación de comisiones de actualización de tarifarios. La planilla debe crear/actualizar registros de comisión/conciliación desde filas reales, con país, moneda, periodo y trazabilidad. No actualizar tarifario sin diff y confirmación.

### 4. Documentos soporte

No actualizar `clientes` directo. Guardar documento/parche pendiente y pedir confirmación explícita antes de modificar cliente/póliza.

### 5. Limpieza UI cliente

Ocultar o renombrar textos técnicos: backend, LAB, demo, mock, localStorage, Firebase, Firestore, smoke, Simular. Si es pantalla interna, condicionarla a rol técnico/superadmin.

## Entrega esperada

- ZIP completo `orbit360-platform/`.
- Lista de archivos modificados.
- Auditoría post-fix.
- Bitácora y pendientes actualizados.
- Smoke visual real.
