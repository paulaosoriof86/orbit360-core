# Academia Orbit 360 — Cola controlada de Cobros

Fecha: 2026-08-01  
Estado: read-only

## Matriz no es escritura

La matriz reúne evidencias. La cola decide qué puede presentarse para autorización. Ninguna de las dos aplica pagos.

```text
fuentes
→ matriz multievidencia
→ cola controlada
→ autorización
→ escritura atómica futura
```

## Niveles

### Listo para autorización

Existe identidad directa suficiente entre pago, obligación y fuente de aseguradora. Se presenta un diff; la Dirección decide.

### Revisión temporal

El recibo deja de aparecer en una cartera posterior mientras la póliza continúa. Es evidencia fuerte, pero la ausencia por sí sola no crea cobro.

### Requiere validación

Desaparece la póliza completa o existe otra ambigüedad que impide distinguir pago, ajuste o exclusión del reporte.

### HOLD

Falta contraparte, existe una diferencia material o la evidencia disponible es anterior al pago. El caso se conserva sin adivinar.

## Controles obligatorios

Cada propuesta debe tener:

- llave de idempotencia;
- antes y después;
- fuentes y cortes;
- snapshot previo a escritura;
- plan de reversión;
- motivo de autorización;
- cero creación de `finmovs`;
- cero reactivación de pólizas.

## Recibo histórico

Una vigencia vencida reciente puede tener un recibo exigible pendiente. La autorización reforzada permite proponer el recibo histórico correcto y el pago, pero no cambia el estado de la póliza.

## Por rol

### Dirección

Autoriza únicamente los casos con evidencia suficiente. Los recibos históricos requieren confirmación reforzada y revisión del diff.

### Operativo

Resuelve HOLD por caso. Solicita una fuente vigente solo cuando la cola identifica exactamente qué evidencia falta. No vuelve a pedir archivos con el mismo hash.

### Asesor

Puede aportar documentos o iniciar una gestión de corrección. No autoriza ni aplica pagos.

## Idempotencia

La misma combinación de caso, estado y fuentes produce la misma llave. Si una propuesta ya fue procesada, no puede aplicarse de nuevo.

## Rollback

Antes de cualquier escritura futura se conserva el estado de recibo y cobro. Si la operación falla, se elimina únicamente el cobro creado y se restaura el snapshot del recibo, sin modificar las filas fuente.
