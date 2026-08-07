# Claude acumulado — v17 advisor cache + route readiness

## REPLICABLE_CLAUDE_ACUMULADO

Patrón reutilizable permitido:
- separar fuentes required y optional por módulo;
- exponer una sola autoridad observable de readiness;
- dividir validación de ruta en `required hydration` y `render ready`;
- cachear proyecciones derivadas read-only e invalidarlas por cambios de fuente o identidad/membresía;
- mantener capturas best-effort/no bloqueantes y watchdog independiente del diagnóstico funcional.

No enviar nombres de tenant, datos reales, conteos identificables, credenciales, rutas de secretos ni implementación backend protegida.

## BACKEND_PROTEGIDO_NO_CLAUDE

No compartir:
- lógica exacta de relay runtime/GO_GATE_CONTRACT;
- consumidor STOP y sealer terminal;
- archivos de lifecycle/overlay/request;
- service account/Firebase transport;
- store Firestore LAB/productivo;
- reglas, Auth, migradores o scripts protegidos.

## ACADEMIA_ACTUALIZAR

Explicar:
- diferencia entre defecto funcional de rendimiento y fallo del mecanismo de validación;
- por qué ampliar timeout no corrige una reconstrucción O(n×m);
- invalidación de caché segura y read-only;
- orden `REQUIRED_HYDRATION_PASS` → `RENDER_READY_PASS`;
- cero reimportación para resolver visualización.

## TENANT_AYS_ONLY / SECRETO_DATO_REAL

No aplica contenido reusable. Cualquier dato real observado permanece fuera del paquete Claude.
