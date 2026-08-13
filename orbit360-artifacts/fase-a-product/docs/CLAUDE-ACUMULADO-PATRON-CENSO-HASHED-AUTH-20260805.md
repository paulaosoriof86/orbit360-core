# Acumulado Claude — patrón reusable de censo Auth con hashes

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Problema reusable

El contrato esperaba un número de usuarios activos, pero la fuente durable devolvió un conteo mayor. La ejecución se detuvo antes de escribir, pero la evidencia de fallo solo conservó el total y no permitió identificar los registros excedentes.

## Patrón

```text
censo read-only
→ normalizar actividad
→ deduplicar aliases
→ agrupar por correo/UID
→ emitir hashes por registro
→ comparar con roster aprobado
→ decidir KEEP_CONTRACT o REBASE_CONTRACT
→ escribir solo después
```

## Evidencia mínima sanitizada

- hash de ID del registro;
- hash de correo;
- clase de ruta fuente;
- estado activo calculado;
- errores contractuales;
- grupo de alias;
- candidato de resolución.

## Regla

No crear acceso para todos los registros observados y no eliminar registros para forzar el conteo. La diferencia entre fuente durable y contrato aprobado se resuelve explícitamente antes de cualquier escritura.

## Exclusiones

No incluye nombres, correos, UIDs, tenant específico, secretos ni datos CRM.
