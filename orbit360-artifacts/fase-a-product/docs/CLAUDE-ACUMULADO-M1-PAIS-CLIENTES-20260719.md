# Claude acumulado · Contrato de país de Clientes · 2026-07-19

## REPLICABLE_CLAUDE_INMEDIATO

1. Normalizar país mediante valores canónicos configurables, no mediante texto libre visible.
2. Admitir aliases de país y código regional definidos por el contrato del importador.
3. Si país declarado y código regional confiable se contradicen, usar `REQUIERE_VALIDACION`; nunca escoger silenciosamente uno.
4. Falta de país o moneda no bloquea la existencia del cliente, pero sí bloquea cálculos o consumidores que requieran esos datos.
5. La ausencia de pólizas no sirve para identificar país.
6. El filtro de país debe incluir y hacer visible el estado `Por validar` cuando exista.
7. El validador debe comprobar distribución exacta cuando el lote tiene baseline conocido, no solo que cada grupo sea mayor que cero.
8. Fechas importadas deben aceptar separadores comunes `/`, `-` y `.`, devolviendo vacío honesto cuando no sean interpretables.

## REPLICABLE_CLAUDE_ACUMULADO

- Mostrar una etiqueta de negocio como `País por validar`, no el código interno `REQUIERE_VALIDACION`.
- Incorporar una bandeja de calidad para completar país/moneda con trazabilidad y confirmación.
- Mantener antes/después, fuente, fila, actor, fecha y rollback en cualquier corrección masiva.

## ACADEMIA_ACTUALIZAR

La Academia ya enseña que país/moneda faltantes requieren validación y que no deben asumirse desde otras fuentes. Al siguiente paquete comercializable se debe añadir el ejemplo reusable:

```txt
código regional confiable → país canónico;
conflicto o ausencia → requiere validación.
```

## No enviar a Claude

- nombres de archivos o clientes A&S;
- números de fila específicos;
- conteos particulares del tenant;
- scripts o credenciales Firestore LAB;
- registros de auditoría o rollback reales.

Clasificación de lo anterior: `TENANT_AYS_ONLY`, `BACKEND_PROTEGIDO_NO_CLAUDE` o `SECRETO_DATO_REAL`.
