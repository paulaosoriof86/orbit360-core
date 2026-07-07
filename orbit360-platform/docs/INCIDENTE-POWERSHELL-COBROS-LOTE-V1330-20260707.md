# Incidente PowerShell — Cobros lote v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Motivo

Se intentó aplicar localmente el hotfix de `modules/cobros.js` para la acción de recordatorios por lote, debido a falta de créditos Codex y a que desde ChatGPT no hay patch parcial seguro para archivos grandes.

El intento no puede considerarse validación ni cierre funcional.

## Diagnóstico

El bloque PowerShell no se ejecutó completo desde el inicio. Se ejecutaron fragmentos sueltos y variables críticas quedaron sin valor. Luego algunas líneas de reporte fueron interpretadas por PowerShell como comandos.

Por esa razón, cualquier mensaje local de éxito producido en esa sesión no es evidencia suficiente de que el archivo remoto haya quedado corregido.

## Decisión de continuidad

No se debe asumir que el hotfix funcional de `cobros.lote()` quedó aplicado.

Estado correcto:

```txt
PENDIENTE TÉCNICO DE APLICACIÓN FUNCIONAL.
```

Los documentos previos de parche local listo siguen siendo útiles como especificación, pero no equivalen a hotfix ejecutado y verificado en el repo remoto.

## Documentos relacionados

```txt
orbit360-platform/docs/ERRATA-PENDIENTE-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
orbit360-platform/docs/PARCHE-LOCAL-LISTO-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
orbit360-platform/docs/PLAN-IMPLEMENTACION-GATES-ADMIN-V1330-20260707.md
```

Interpretación correcta:

- `ERRATA`: vigente.
- `PARCHE-LOCAL-LISTO`: especificación técnica preparada, no cierre funcional.
- `PLAN-IMPLEMENTACION`: vigente.

## Regla para próximas acciones locales

No volver a pedir a Paula bloques PowerShell largos pegados en consola para este proyecto.

Si se requiere PowerShell, debe entregarse como archivo `.ps1` o como una instrucción mínima de una línea, con diagnóstico inicial y abortos seguros antes de mutar archivos.

## Pendiente funcional

Aplicar en `orbit360-platform/modules/cobros.js` el cambio de lenguaje y estado de la acción de lote para que diga preparación, no envío real.

Debe conservar el patrón:

```txt
Preparar no es enviar.
Correo/WhatsApp real requiere canal conectado y confirmación del proveedor.
```

## Estado

No se tocó código desde este documento.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
