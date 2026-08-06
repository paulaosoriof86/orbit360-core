# Acumulado Claude — hidratación required/optional

Clasificación:

```text
REPLICABLE_CLAUDE_INMEDIATO
ACADEMIA_ACTUALIZAR
```

## Patrón reusable

- Definir `required` y `optional` por módulo.
- Calcular readiness únicamente con fuentes esenciales.
- Permitir estado degradado honesto cuando fallen fuentes auxiliares.
- Proyectar aliases visuales desde relaciones autorizadas, sin escritura.
- No hardcodear tenant, usuarios o datos reales en el patrón reusable.
- Exponer diagnóstico de missing/failed sin copy técnico en UI cliente.
- Validar source-only antes de navegador.
- Distinguir fallo de producto, contrato, validador y pipeline.

## No enviar a Claude

```text
BACKEND_PROTEGIDO_NO_CLAUDE
SECRETO_DATO_REAL
TENANT_AYS_ONLY
```

No incluir rutas privadas, credenciales, payloads A&S, digests privados ni owners protegidos de Firebase/Auth.
