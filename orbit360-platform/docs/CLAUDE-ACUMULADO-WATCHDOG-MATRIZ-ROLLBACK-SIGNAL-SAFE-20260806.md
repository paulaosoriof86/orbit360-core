# Claude acumulado — watchdog de matriz y rollback signal-safe

Fecha: 2026-08-06  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable detectado

Las verificaciones visuales multirol no pueden depender de un único proceso largo sin checkpoints. El patrón aplica a todos los tenants y módulos que utilicen matrices desktop/tablet/móvil.

## Debe compartirse con Claude

Sí, únicamente como patrón de UX/test reusable. No compartir secretos, Firebase, cuentas, datos A&S ni implementación backend protegida.

## Requisitos para la matriz visual reusable

1. Ejecutar cada rol/viewport como unidad acotada.
2. Registrar antes y después de cada unidad:
   - rol;
   - viewport;
   - ruta;
   - módulo;
   - checkpoint;
   - resultado;
   - warning de captura;
   - tiempo transcurrido.
3. La captura es acotada y no bloqueante, pero el estado funcional sí debe ser verificable.
4. Persistir evidencia parcial aun si un rol posterior falla.
5. No afirmar matriz PASS mientras falte un rol o snapshot final.
6. Mostrar estados honestos: pendiente, en curso, incompleta, fallida o aprobada.

## Patrón backend protegido, no entregable a Claude

- signal traps del shell;
- credenciales y service accounts;
- Hosting backup/clone;
- Firebase CLI;
- lifecycle/request internals;
- rutas privadas y evidencia sensible.

## Impacto en módulos

- Router y navegación móvil.
- Inicio.
- Cliente 360.
- Aseguradoras.
- Cualquier módulo posterior que use el harness transversal.

## Impacto Academia

Agregar caso práctico sobre:

- precheck vs matriz completa;
- warning de captura vs fallo funcional;
- evidencia incremental;
- diferencia entre producto y pipeline;
- STOP_RETRY después de dos fallos de la misma familia.

## Riesgo si se ignora

Un proceso largo puede agotar el timeout global sin dejar capturas, checkpoint exacto ni evidencia utilizable. Eso obliga a repetir riesgos y convierte el entorno en herramienta de desarrollo del validador.

## Pendiente exacto

No implementar visualmente hasta que el owner técnico cierre source-only:

- watchdog por rol;
- JSON incremental;
- artefactos parciales;
- terminación segura;
- prueba sintética de timeout.
