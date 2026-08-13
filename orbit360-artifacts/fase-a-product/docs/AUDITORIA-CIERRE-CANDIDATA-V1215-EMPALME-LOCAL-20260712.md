# Auditoría de cierre y empalme local — candidata v1.215 — 2026-07-12

## Identidad

- ZIP recibido: `Prototype Development Request - 2026-07-12T143251.651.zip`
- SHA256: `def65dd18df98be07f8f63722921144c81f5c09504eb269fc013cf47931a45ad`
- Delta contra candidata anterior: 3 archivos (`modules/comparativo.js`, `modules/equipo.js`, `modules/renovaciones.js`).
- Sintaxis JS antes del cierre local: válida.
- Protegidos: `data/store.js`, `core/auth.js`, `core/importa.js` byte-identical.

## Aceptado de Claude

- `equipo.js`: invitación preparada y pendiente de confirmación.
- `renovaciones.js`: campaña preparada y pendiente de confirmación.
- `comparativo.js`: consistencia ahora bloquea antes de validar; fuente por origen más estricta.

## P0 encontrados y convertidos en acción local

### Desglose tautológico

Claude calculaba `extras = total - neta - iva`; por construcción, la suma siempre coincidía con el total y el campo `cm-gastos` se descartaba. Se añadió `gastos` al DTO y se transmite desde Cotizador, PDF y registro manual. El gate verifica valores finitos, no negativos y diferencia máxima 0.51.

### Estimación interna tratada como propuesta validada

El flujo todavía asignaba `estadoValidacion='validada'` a `estimacion_interna`, habilitando ranking y emisión. Ahora queda `revisada_interna`, visible solo como referencia y excluida de toda decisión de aseguradora.

### País/moneda y persistencia

Manual/PDF ya no usan GTQ por defecto: toman país/moneda del comparativo. La edición de una cotización canónica actualiza `Orbit.store` y obliga revalidación.

## Decisión

- No se devuelve otro paquete a Claude.
- Se autoriza empalme selectivo con el cierre local.
- P1 no bloqueantes: Replantear profundo, visor transversal, multirol/scopes, ficha-página de Póliza y evidencia responsive sistemática.
- Backend protegido no se modifica.
