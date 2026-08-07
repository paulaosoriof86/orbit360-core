# Academia Orbit 360 — actualización v23 · gate nativo y causa raíz

Fecha: 2026-08-07  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Qué debe enseñar esta actualización

v23 no cambia botones ni flujos de Cliente 360/Aseguradoras; cambia el mecanismo de validación que protege su salida. Por ello no corresponde rehacer cursos funcionales. Sí debe incorporarse a las rutas de Dirección/Superadmin/IT y a formación técnica/operativa avanzada.

### Lección: defecto funcional vs defecto del instrumento

El usuario debe poder distinguir:
- `FUNCTIONAL_DEFECT`: la conducta real del producto incumple el contrato;
- `VALIDATOR_STALE`: el gate exige una arquitectura o selector ya retirado;
- `DATA_CONTRACT_FAILURE`: los datos no cumplen el contrato canónico;
- `ENVIRONMENT_FAILURE`: entorno/credenciales/dependencias impiden ejecutar;
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de generación/patch/workflow falla;
- `SECURITY_FAILURE`: existe riesgo de permisos, exposición o integridad.

Caso v23: después de dos fallos v22 en la misma etapa, el producto quedó congelado y se sustituyó el mecanismo de transformación textual por un artefacto runtime nativo.

### Lección: gate único Block 1

El cierre vigente valida Cliente 360 + Aseguradoras en tres experiencias:
- Dirección desktop;
- Operativo tablet;
- Asesor móvil.

El gate debe enseñar que un módulo posterior no puede bloquear prematuramente el bloque actual. Pólizas/Cobros/Ops/Leads/Conciliaciones/Cancelaciones conservan sus hallazgos en ledger, pero no deciden el cierre de Block1.

### Lección: observabilidad event-driven

Explicar conceptualmente:
- readiness requerido antes de navegar;
- observer armado antes del cambio de ruta;
- señal de render por evento/mutación;
- persistencia de métricas aun en timeout;
- post-ready timeout = posible `VALIDATOR_STALE`;
- verdadero not-ready timeout = posible `FUNCTIONAL_DEFECT`.

No enseñar paths protegidos, secretos, service accounts ni detalles internos reutilizables para atacar el entorno.

### Lección: universo contractual read-only

Objetivo de Block1: 414 clientes / 26 aseguradoras / 7 asesores.

Reglas de decisión:
- duplicado fuerte puede excluirse con evidencia objetiva;
- histórico/inactivo explícito puede quedar fuera del universo efectivo;
- fuera de tenant/país efectivo puede excluirse;
- `requiere_validación` sigue contando y no puede ocultarse para hacer coincidir el objetivo;
- diferencia no explicada detiene antes de Hosting.

### Caso práctico sugerido

Un gate observa 430 clientes frente a 414 esperados. El alumno debe elegir entre:
1. borrar 16 registros para cuadrar — incorrecto;
2. reimportar clientes — incorrecto;
3. clasificar read-only cada diferencia con evidencia y detener si no se reconcilia — correcto.

## Impacto por rol

- Dirección/Superadmin/IT: comprender gates, autorizaciones, STOP_RETRY, integridad y lectura de evidencia.
- Operativo: entender que una relación vacía debe mostrarse de forma honesta y que un gate no debe inventar contenido.
- Asesor: reforzar scope propios/equipo/todos/ninguno y por qué una prueba debe escoger objetivos dentro del mismo scope visible.

## Evaluación afectada

Agregar preguntas aplicadas sobre:
- qué capa corregir ante `PIPELINE_MECHANISM_FAILURE`;
- por qué no se cambia Cliente360 para satisfacer un validator roto;
- por qué el request runtime permanece ausente hasta source PASS;
- qué ocurre si el universo 414/26/7 no reconcilia antes de Hosting;
- diferencia entre un hallazgo preservado en ledger y un blocker del bloque actual.

## Manuales afectados

- manual de seguridad/gates: actualizar;
- manual técnico de runtime/readiness: actualizar;
- manual funcional Cliente 360: sin cambio funcional por v23;
- manual funcional Aseguradoras: sin cambio funcional por v23;
- rutas de Asesor/Operativo: solo referencia al concepto de scope y relaciones honestas, no al mecanismo interno.

## Pendiente

Cuando v23 tenga evidencia runtime terminal, añadir el caso real final (PASS o STOP) con métricas sanitizadas y causa raíz, sin nombres ni datos A&S.
