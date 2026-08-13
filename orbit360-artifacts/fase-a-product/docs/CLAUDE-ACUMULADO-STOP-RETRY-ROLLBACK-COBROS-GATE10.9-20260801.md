# Claude acumulado — STOP_RETRY y rollback de escritura controlada

Fecha: 2026-08-01  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`  
Capa ejecutora: `BACKEND_PROTEGIDO_NO_CLAUDE`

## Patrón reusable

```text
preflight estático
→ autorización explícita
→ snapshot real
→ grupos atómicos idempotentes
→ detener ante divergencia
→ rollback global verificado
→ congelar después de dos fallos
→ diagnóstico read-only
```

## Reglas transferibles

- una autorización no elimina la validación del snapshot;
- no continuar con los casos restantes después de una divergencia;
- revertir todos los grupos transitorios, no solo el grupo fallido;
- verificar conteos y documentos después del rollback;
- diferenciar `WRITE_PASS`, `WRITE_FAIL_ROLLED_BACK` y `WRITE_FAIL_NOT_RESTORED`;
- bloquear una tercera ejecución después de dos fallos de la misma etapa;
- diagnosticar diferencias por campos y tipos con evidencia sanitizada;
- mantener producción y deploy como fronteras independientes.

## UX reusable

La interfaz de administración debe mostrar estados honestos:

- preparado;
- autorizado;
- ejecutando;
- aplicado y verificado;
- fallido y revertido;
- bloqueado por causa raíz.

No debe mostrar “aplicado” cuando existió una escritura temporal que fue revertida.

## No transferir

- datos reales de clientes;
- números de póliza o recibo;
- montos o fechas reales;
- hashes privados de fuentes;
- referencias internas A&S;
- cuenta de servicio;
- ejecutor backend;
- request real de autorización.
