# Academia Orbit 360 · impacto revisión humana Pólizas / Recibos

Fecha: 2026-07-31
Clasificación: `ACADEMIA_ACTUALIZAR`

## Aprendizajes obligatorios por rol

### Dirección / Operativo

- **Vacío no es cero.** Si la fuente no trae expedición, financiamiento, IVA, suma asegurada o datos del vehículo, Orbit debe mostrar pendiente de completar; nunca fabricar `0`.
- **Prima neta y prima total son conceptos distintos.** La prima total no se infiere desde la neta. Si existe calendario, el total del calendario se presenta separado de la prima total de póliza.
- **Centavos importan.** Diferencias pequeñas entre póliza y calendario deben quedar visibles como conciliación de fuente, no desaparecer por redondeo.
- **Recibo esperado no es Cobro.** `recibosEsperados` representa calendario/obligación; `cobros` representa un pago aplicado y conciliado.
- **Pago reportado no es pago conciliado.** Una evidencia o un saldo que la aseguradora ya no reporta no crea automáticamente un cobro.
- **Calidad fail-closed.** Una póliza de Vehículos con datos críticos ausentes no puede mostrarse como información validada.

### Asesor

- Puede identificar y completar faltantes permitidos mediante gestiones y formatos, pero no fusionar clientes, reasignar pólizas ni convertir evidencia de pago en Cobro.
- Si una póliza aparentemente falta porque existe una posible identidad duplicada, debe generarse una gestión de corrección; `NO_AUTO_MERGE` prevalece hasta validación.

### Importador / migración

- La fuente puede contener más detalle que el contrato canónico ya materializado. Eso no autoriza una reimportación completa.
- Primero se hace diff read-only por fuente/campo; después se decide enriquecimiento selectivo, siempre bajo manifiesto y autorización de escritura.
- Campos ambiguos como `Monto Descuento` no se reinterpretan contablemente sin contrato; se conservan como campo fuente/ajuste hasta validación.

### Gates

Un PASS visual automático no basta si solo prueba presencia de DOM, roles y conteos. El gate debe probar comportamiento y semántica:

1. vacío ≠ cero;
2. neta ≠ total;
3. detalle navegable de Póliza/Vehículo/Recibo;
4. separación Recibo/Cobro;
5. performance con volumen real esperado;
6. orden cronológico;
7. calidad fail-closed;
8. cero copy técnico;
9. cero escrituras en revisión read-only.

La revisión humana puede reabrir un bloque cuando encuentra un defecto real no cubierto. Ese hallazgo debe convertirse en contrato automatizado para evitar la misma regresión.
