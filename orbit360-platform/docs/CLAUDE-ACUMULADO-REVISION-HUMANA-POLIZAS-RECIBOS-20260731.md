# Claude acumulado · revisión humana Pólizas / Vehículos / Recibos

Fecha: 2026-07-31
Clasificación principal: `REPLICABLE_CLAUDE_ACUMULADO`

## Enviar solo como patrones reutilizables

1. **Unknown-is-not-zero**: parsers/read-models visuales deben conservar vacío/null como desconocido. `Number('')` no puede convertir datos ausentes en cero de negocio.
2. **Premium semantics**: neta, gastos, ajustes/impuestos y total son campos distintos; no inferir total desde neta. Mostrar fuente/calendario por separado cuando corresponda.
3. **Fail-closed quality**: no mostrar “validado” si faltan campos críticos para el tipo de riesgo.
4. **Full-page detail navigation**: Póliza, Vehículo y Recibo esperado deben tener detalle navegable y preservar regreso/contexto.
5. **Receipt ≠ payment**: calendario de recibos separado de cobros aplicados; pago reportado no equivale a conciliación.
6. **Indexed collection rendering**: no hacer búsquedas O(P×V) dentro de loops de 1,000+ filas; indexar relaciones y paginar DOM.
7. **Chronological schedules**: calendarios financieros deben ordenarse por fecha, no por orden de llegada/importación.
8. **Source adjustment neutral semantics**: un campo fuente ambiguo se etiqueta como ajuste/campo fuente hasta que exista contrato contable; no inferir signo.
9. **Human finding → automated contract**: cualquier defecto material encontrado en revisión visual debe incorporarse al gate único para impedir regresión.
10. **Dark-surface actions**: controles ghost en fondos oscuros deben definir contraste/fondo explícito.

## No enviar a Claude

- contenido real de archivos A&S;
- nombres, teléfonos, pólizas o montos reales;
- hashes/manifiestos de fuentes privadas;
- reglas Firestore, credenciales o runtime protegido;
- decisiones de fusión de clientes reales;
- adaptadores backend protegidos.

Clasificaciones relacionadas:

- `BACKEND_PROTEGIDO_NO_CLAUDE`: store/adaptadores/gates/runtime privados;
- `SECRETO_DATO_REAL`: fuentes, PII y evidencia tenant;
- `ACADEMIA_ACTUALIZAR`: semántica de primas, recibos/cobros, calidad y gates.
