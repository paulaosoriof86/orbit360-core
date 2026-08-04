# Addendum Cloud / Claude / Academia — RC1.1 runtime fail-closed y smoke de fuente renderizada

Fecha: 2026-08-03

## Propósito

Documentar de forma reusable el defecto y el patrón de solución que permitió publicar Gravicentra Insurance para A&S con la fuente de datos real, sin hardcodear el tenant en módulos genéricos ni trasladar secretos, datos reales o mecanismos operativos protegidos a Cloud/Claude.

## Hallazgo reusable

Un despliegue puede cumplir simultáneamente:

- paridad de activos;
- módulos presentes;
- conteos correctos en backend;
- release de Hosting válido;

pero seguir mostrando información demo si la aplicación pública selecciona una fuente de runtime distinta de la que verificó el pipeline.

La validación debe comprobar no solo que los datos existen, sino que son la fuente realmente renderizada.

## Patrones acumulados

### CL-115 — Host canónico con runtime fail-closed

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

Todo host asignado a un tenant operativo debe resolver explícitamente:

```text
host
→ tenant
→ runtime
→ backend adapter
→ auth provider
→ store owner
```

Si cualquiera de esas asociaciones falta, la aplicación debe cerrar en modo seguro. Nunca debe caer silenciosamente a demo, seed, mock, localStorage u otro tenant.

### CL-116 — Separación entre prototipo demo y tenant operativo

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

El prototipo comercializable puede conservar seeds ficticios para demostración local o entornos expresamente demo. La separación debe ser declarativa:

```text
prototipo demo: seed permitido
host tenant operativo: seed prohibido
```

La presencia física de `seed.js` en el paquete no lo convierte en fuente autorizada. El runtime debe impedir su uso como verdad cuando el host representa un tenant real.

### CL-117 — Smoke de fuente realmente renderizada

Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`

El smoke productivo mínimo debe abrir el host canónico sin parámetros técnicos y verificar en navegador:

- normalización del host;
- proveedor de autenticación real;
- owner real de `Orbit.store`;
- tenant efectivo;
- snapshots conectados;
- conteo esperado visible;
- ausencia de seeds, credenciales demo y nombres ficticios;
- cero errores de consola bloqueantes.

La verificación Admin SDK es complementaria, no sustitutiva.

### CL-118 — Datos existentes no equivalen a datos utilizados

Clasificación: `ACADEMIA_ACTUALIZAR`

Academia debe enseñar la diferencia entre:

```text
data available
≠ data selected
≠ data rendered
```

El caso RC1 demostró que Firestore podía contener todos los datos reales mientras la UI seguía mostrando el seed. La prueba correcta debe recorrer la cadena completa.

### CL-119 — Reanudación segura después de un fallo pre-risk

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

Cuando un workflow se detiene antes de secretos, lecturas, deploy o producción por un defecto del pipeline, puede reanudarse la misma autorización únicamente con prueba explícita de:

- ejecución previa identificada;
- causa raíz clasificada;
- capacidades no abiertas;
- autorización no consumida por deploy;
- root fix del owner;
- marcador de reanudación inmutable.

No debe solicitarse una nueva autorización como sustituto del diagnóstico.

### CL-120 — Resolución de ramas en runners desacoplados

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

En runners con checkout detached, una rama remota puede existir solo como:

```text
refs/remotes/origin/<branch>
```

Los guards deben resolver y comparar la referencia remota explícita o el SHA sellado. No deben asumir que existe una rama local con el mismo nombre.

## Backend protegido

Los siguientes elementos permanecen `BACKEND_PROTEGIDO_NO_CLAUDE`:

- credenciales y referencias de secretos;
- IDs internos de usuarios y proyectos;
- rutas concretas de rollback;
- workflows productivos completos;
- anclas de versiones de Hosting;
- reglas de autorización operativa;
- datos, nombres y documentos reales.

Cloud/Claude debe recibir únicamente el patrón reusable sanitizado.

## Academia

Actualizar los contenidos de seguridad, gates, backend y despliegue con un ejercicio que compare:

1. prueba estática del loader;
2. lectura Admin SDK;
3. paridad de activos;
4. smoke real de navegador;
5. detección de fallback demo;
6. rollback automático;
7. diferencia entre `FUNCTIONAL_DEFECT`, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`.

## Estado de sincronización

```text
implementado en core: sí
validado en producción: sí
documentado profundamente: sí
patrones CL-115 a CL-120: registrados
enviado externamente a Cloud/Claude: no
incorporado externamente al prototipo: no
```

El envío externo debe realizarse después en un paquete sanitizado y no bloquea la operación productiva de A&S.
