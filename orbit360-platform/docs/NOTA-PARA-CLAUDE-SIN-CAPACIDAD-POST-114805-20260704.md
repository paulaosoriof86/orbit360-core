# Nota para Claude — pendiente por capacidad post candidata 114805

Fecha: 2026-07-04
Estado: Claude sin capacidad / no generar nuevo paquete hasta solicitud de Paula.

## Contexto

Paula confirmó que Claude no tiene capacidad en este momento. Por tanto, ChatGPT/Codex continuará backend y documentación, mientras se acumulan pendientes para entregar a Claude cuando Paula pida el próximo paquete.

## Baseline frontend vivo

Última candidata recibida y auditada:

```txt
Prototype Development Request - 2026-07-04T114805.866.zip
```

Estado:

```txt
baseline frontend más reciente aceptado con reservas
```

No se considera cierre completo porque quedan residuos P0/P1 del importador.

## Pendientes Claude acumulados

Documento vivo:

```txt
orbit360-platform/docs/PENDIENTES-CLAUDE-POST-114805-ACUMULADO.md
```

Puntos principales pendientes:

1. No inferir moneda de hoja con `monedaDe(paisHoja)`.
2. No default `GTQ` para clientes sin país/moneda confiable.
3. Corregir `SCOPE.documentos` para que cree `parchesPendientes`, no `clientes`.
4. Revisar fechas fijas y separar seed demo de flujo operativo.
5. Ocultar textos técnicos para UI cliente.
6. Actualizar smoke visual real.

## Mejoras backend realizadas mientras Claude no tiene capacidad

ChatGPT/Codex reforzó el pipeline para que futuras candidatas no repitan los mismos errores:

- `tools/orbit360-auditar-importador-candidato-claude-ays.mjs`
- `tools/orbit360-auditar-residuos-candidato-114805-ays.mjs`
- `tools/orbit360-pipeline-empalme-candidato-claude-ays.mjs` ahora ejecuta auditorías de importador antes de plan/preview/diff.
- Tests sintéticos actualizados.

## Instrucción para próximo paquete Claude

Cuando Paula pida el paquete, incluir esta nota, el acumulado post 114805, la auditoría 114805, la decisión de empalme y los cambios de pipeline backend para que Claude conserve los fixes en su siguiente candidata.

## Restricciones

No merge. No deploy. No main. No datos reales. No secretos. No reemplazar backend LAB protegido.