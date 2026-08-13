# AUDITORÍA VISUAL POST-AUTH Y ROOTFIX TRANSVERSAL

Fecha: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `SOURCE_FIX_READY_STATIC_VALIDATION_PENDING`

## 1. Fuente de evidencia

La auditoría se basa en navegación humana real y capturas proporcionadas el 5 de agosto de 2026 en la candidata LAB vigente.

No existía antes una prueba completa en navegador de login, navegación, tiempos y detalles. Las verificaciones anteriores de Auth fueron técnicas y operacionales por API/runtime; no equivalían a aprobación visual humana.

## 2. Hallazgos

### 2.1 Login

```text
FUNCTIONAL_DEFECT
```

- No existe opción para mantener la sesión iniciada.
- Auth fuerza persistencia por sesión.
- `¿Problemas al ingresar? → Limpiar sesión` es una acción técnica que no resuelve recuperación y no debe presentarse como ayuda.
- No se debe almacenar la contraseña en el navegador.

Corrección source-only:

- opción `Mantener sesión iniciada en este dispositivo`;
- selección entre persistencia LOCAL o SESSION;
- eliminación del texto/acción técnica;
- cero almacenamiento de contraseña.

### 2.2 Bloqueos, cifras cambiantes y navegación lenta

```text
PIPELINE_MECHANISM_FAILURE
+
FUNCTIONAL_DEFECT
```

Evidencia:

- al pasar de Aseguradoras a Cliente 360 la vista se bloqueó;
- al reingresar, Cliente 360 tardó en abrir;
- KPIs y listados cambiaron más de una vez;
- abrir cliente, póliza y recibo tomó varios segundos o minutos;
- Pólizas mostró primero una composición y luego otra.

Causa raíz:

- el store abre snapshots independientes por colección;
- cada snapshot inicial emite un evento;
- el router vuelve a renderizar el módulo cada vez que llega una dependencia;
- Cliente 360 recalculaba el resumen por cliente mediante barridos repetidos de pólizas, cobros y comisiones;
- el usuario podía interactuar mientras la vista todavía era parcial y podía ser reemplazada por el siguiente render.

Corrección source-only:

- cada módulo espera a que todas sus dependencias estén listas;
- se muestra una carga estable con progreso, no KPIs parciales;
- la vista se renderiza una sola vez al completar la hidratación;
- Cliente 360 utiliza índice agrupado y cache invalidable;
- tiempos de render quedan registrados en diagnóstico de sesión.

### 2.3 Vehículos, recibos y cobros

```text
FUNCTIONAL_DEFECT
```

- Vehículos muestra tarjetas, pero no tenía detalle propio.
- Recibos y Cobros dependían principalmente del clic en la fila y no ofrecían una acción explícita consistente.
- La demora/re-render podía impedir percibir que el clic había funcionado.

Corrección source-only:

- drawer de detalle de vehículo;
- botón explícito `Ver detalle`;
- apertura por tarjeta o botón;
- botón explícito de detalle en filas de recibos/cobros;
- no se modifican datos.

### 2.4 Responsive

```text
FUNCTIONAL_DEFECT
```

- títulos y acciones no se adaptan completamente en ventanas intermedias;
- los KPIs conservan cuatro columnas demasiado pronto;
- la corrección móvil existente inicia demasiado tarde y no cubre tablet/desktop angosto.

Corrección source-only:

- breakpoints en 1100, 760 y 520 px;
- títulos fluidos, wrap seguro y contenedores con `min-width:0`;
- KPIs 2 columnas en tablet y 1 en móvil;
- acciones y búsqueda superior adaptadas.

### 2.5 Inferencias de Cobros

```text
NO ES REGRESIÓN VISUAL
ESTADO FUNCIONAL INCOMPLETO POR NO MATERIALIZACIÓN
```

La evidencia mostró una cuota ya conciliada, pero no las cuotas anteriores inferidas.

Causa:

- Bloque 4.0 calculó y clasificó 365/365 filas;
- 128 casos de secuencia, 2 post-corte y 2 planillas son propuestas read-only;
- la materialización durable del ledger aún no fue autorizada ni ejecutada;
- por eso la interfaz continúa mostrando únicamente cobros materializados previamente.

No se debe convertir una inferencia en cobro confirmado. El Bloque 4.1 debe almacenar pagos reportados, evidencias, propuestas y HOLD; la aplicación a cobros requiere una decisión posterior.

### 2.6 Conciliaciones

```text
DATA_CONTRACT_FAILURE
```

- La bandeja no muestra propuestas porque todavía no existe un ledger durable activo proyectado al consumidor.
- El vacío no explica el estado del proceso.

Corrección source-only inmediata:

- estado vacío honesto;
- explicación de que los pagos sin enlace único permanecen protegidos;
- cero apariencia de módulo roto o terminado.

Pendiente del Bloque 4.1/5:

- activar el ledger durable por run aislado;
- proyectar el run activo a la bandeja;
- mostrar propuestas y HOLD sin convertirlos en cobros.

### 2.7 Cancelaciones

```text
FUNCTIONAL_DEFECT
```

El módulo renderiza cero registros, pero no aclara el alcance del dato.

Corrección source-only:

- estado vacío: `No hay cancelaciones registradas en el corte activo`;
- no afirmar que el histórico completo sea cero.

### 2.8 Ops y Leads

```text
FUNCTIONAL_DEFECT DE VERIFICABILIDAD
```

Los módulos se ven correctos, pero la UI no permite comprobar su estado de manera autónoma.

Corrección source-only:

- botón `Ejecutar prueba en vivo` en Ops y Leads;
- diagnóstico read-only de hidratación, backend disponible, bridge, proyección, IDs, referencias y errores de sincronización;
- resultado PASS/WARN/FAIL;
- escrituras realizadas: 0.

Una prueba CRUD sintética con rollback deberá ejecutarse en un gate separado si se requiere validar escritura end-to-end.

## 3. Implementación

Owners:

```text
orbit360-platform/core/visual-runtime-rootfix-v20260805.js
orbit360-platform/core/backend-lab-loader.js
tools/orbit360-test-visual-runtime-rootfix-source-v20260805.mjs
```

Lifecycle:

```text
tools/orbit360-validator-lifecycle-contract-visual-runtime-rootfix-v20260805.json
```

Gate source-only:

```text
block2.7-visual-runtime-rootfix-static-v20260805
```

## 4. Frontera

```text
Firestore reads: 0
Firestore writes: 0
Auth writes: 0
operational writes: 0
browser automático: 0
Functions deploy: 0
Hosting deploy: 0
Rules deploy: 0
producción/main/merge: 0
```

El rootfix no está visible todavía en LAB porque no se ha autorizado un nuevo deploy de Hosting.

## 5. Decisión sobre producción y pólizas pendientes de actualización

No se debe enviar a producción antes de cerrar:

1. carga estable sin KPIs cambiantes;
2. navegación y detalles;
3. prueba viva de Ops/Leads;
4. proyección honesta de Cobros/Conciliaciones;
5. una revisión visual final por rol y viewport.

Las pólizas pendientes se separan en dos grupos:

### Deben corregirse antes de producción

- errores en cliente o asesor asignado;
- estado incorrecto;
- vigencias incorrectas;
- prima, moneda o país incorrectos;
- calendario de recibos incorrecto;
- pólizas duplicadas;
- datos que cambian cartera, cobros o permisos.

### Pueden cargarse después del go-live

- pólizas nuevas o renovaciones posteriores al corte verificado;
- actualizaciones operativas normales que ingresaron después del cierre del dataset;
- información complementaria no crítica.

La salida recomendada es con un corte de datos explícito y un delta incremental posterior, no retrasar producción por cada póliza nueva que siga llegando.

## 6. Secuencia exacta

1. Obtener PASS source-only del rootfix.
2. Preparar una autorización única para desplegar solo Hosting LAB.
3. Ejecutar prueba viva controlada: Dirección desktop, Operativo tablet y Asesor móvil.
4. Corregir únicamente hallazgos demostrados y revalidar una vez.
5. Retomar Bloque 4.1 del ledger de Cobros.
6. Cerrar la RC acumulativa.
7. Aplicar correcciones críticas de pólizas y separar el delta post-corte.
8. Presentar candidata final.
9. Autorizar go-live.

## 7. Academia y reutilización

```text
ACADEMIA_ACTUALIZAR
REPLICABLE_CLAUDE_INMEDIATO
```

Patrones reutilizables:

- hidratación estable antes del primer render;
- no mostrar KPIs parciales;
- diagnóstico read-only autoadministrable;
- estado vacío con alcance temporal;
- sesión persistente sin almacenar contraseña;
- diferencia entre propuesta, HOLD y cobro confirmado.
