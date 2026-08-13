# Acumulado Claude — Cobros con autorización controlada

Fecha: 2026-08-01  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Problema reusable

Una propuesta de conciliación podía confundirse con autorización o escritura efectiva. Además, el caso de un recibo histórico exigible requiere un control diferente al de un recibo canónico existente.

## Patrón reusable

```text
matriz de evidencia
→ cola controlada
→ paquete sanitizado de autorización
→ decisión explícita
→ gate de escritura independiente
```

El paquete reusable debe:

- exponer referencias opacas, nunca datos reales del tenant;
- mantener `authorizationGranted=false` y `writeEligible=false` hasta una decisión posterior;
- separar recibos existentes de recibos históricos;
- exigir confirmación reforzada para crear un recibo histórico;
- permitir aprobación parcial del lote;
- incluir diff, idempotencia, snapshot y rollback por tarjeta;
- prohibir reactivar pólizas y crear `finmovs` desde Cobros.

## Owner local

`core/cobros-authorization-package-p0.js`

## UX reusable

Dirección recibe tarjetas de decisión. Operativo prepara evidencia sin aprobar. Asesor solo consulta o solicita corrección.

## Exclusiones

- datos reales A&S;
- hashes de fuentes reales;
- backend protegido;
- autorizaciones efectivas;
- escrituras y credenciales.

## Estado Claude

Pendiente de incorporar en el siguiente paquete acumulado. No debe enviarse como ZIP con datos reales.
