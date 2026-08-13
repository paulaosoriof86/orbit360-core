# Registro fix de acceso y validación idempotente LAB

Fecha: 2026-07-17

Rama: `ays/backend-tenant-lab-v99-20260703`

PR: #5 draft/open

Alcance: LAB; sin producción, merge ni `main`.

## Necesidad

El formulario de acceso LAB quedaba esperando y el recorrido visual no avanzaba hacia Cliente 360 y Aseguradoras. Además, la validación previa repetía tareas de preparación aunque los recursos necesarios ya existieran.

## Cambios

- Manejo de sesión con límite de espera y mensajes visibles.
- Caché del navegador versionada y estrategia de red primero.
- Entrada LAB con limpieza controlada y carga explícita del recurso vigente.
- Validación administrativa estrictamente read-only durante el gate visual.
- El gate previo verifica únicamente usuario y membresía.
- Los conteos 414/26/7 usan agregaciones de Firestore y no descargan todos los expedientes.
- Las tres agregaciones se ejecutan en paralelo, con intentos acotados y evidencia sanitizada obligatoria.
- Cuando una comprobación previa falla, el motivo sanitizado queda en una ruta incluida en el artefacto del workflow.

## Evidencia del bloqueo externo

La última lectura completa confirmó 414 clientes y luego recibió código administrativo `8` al consultar las siguientes colecciones. El estado se clasificó como capacidad/cuota agotada del servicio, no como eliminación de registros. Por esta razón se sustituyeron las lecturas completas por agregaciones de conteo y se detuvieron los reintentos masivos.

## Carriles

### A — Frontend

No se reemplazó el prototipo ni los renderers de Cliente 360 o Aseguradoras. El cambio visible se limita al acceso LAB y manejo de caché.

### B — Backend y seguridad

No se modificaron `Orbit.store`, el adaptador de datos, reglas ni importadores. Se eliminaron operaciones administrativas repetidas y lecturas masivas durante validaciones visuales.

### C — Datos reales

No se reimportaron ni modificaron clientes o aseguradoras. Últimos conteos completos verificados: 414 clientes, 26 aseguradoras y 7 asesores. Los valores cero de ejecuciones posteriores corresponden a reportes incompletos por fallo de lectura, no a pérdida de información.

## Patrón reutilizable para Claude y Academia

- Un gate visual debe verificar, no repetir preparación administrativa.
- Separar preparación, reparación y validación read-only.
- Conservar IDs reales y reconciliar identidades mediante llaves canónicas y aliases.
- Cada verificador debe tener una sola responsabilidad y no duplicar consultas de conteo.
- Preferir agregaciones cuando solo se necesitan totales.
- Detener reintentos ante límites de capacidad y conservar evidencia honesta.
- Versionar recursos críticos y service workers.
- Usar red primero para recursos sensibles al runtime y caché solo como respaldo.
- Mostrar un límite de espera y un mensaje útil; nunca dejar una acción indefinidamente pendiente.
- No repetir cargas ni modificar datos para resolver un problema de acceso.

## Estado

`GATE_ACTIVADO_CON_CONTEOS_AGREGADOS_Y_SIN_LECTURAS_MASIVAS`.
