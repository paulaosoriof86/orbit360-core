# Protocolo anti-desviación — plan operativo con datos reales A&S

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo

Paula alertó que el proyecto acumuló demasiadas sesiones de arquitectura, auditoría, empalmes y documentación sin volver oportunamente al carril de datos reales que ya había sido acordado: pedir fuentes una por una, perfilar clientes, pólizas, cobros y operar lo antes posible.

Este protocolo se crea para que esa desviación no vuelva a ocurrir.

## Reconocimiento

Sí hubo una desviación parcial. El trabajo backend realizado es útil y necesario, pero se perdió visibilidad del carril operativo de migración real.

La solución no es abandonar backend ni dejar de auditar. La solución es obligar tres carriles simultáneos y un checkpoint antes de cada bloque.

## Regla maestra nueva

A partir de este documento, toda continuidad de Orbit 360 A&S debe responder a tres carriles, siempre:

```txt
Carril A — Última candidata/prototipo/empalme.
Carril B — Backend protegido/seguridad/Orbit.store.
Carril C — Datos reales/migración operativa A&S.
```

Ningún bloque puede avanzar más de una sesión sin decir explícitamente qué pasó en cada carril.

## Checkpoint obligatorio antes de responder o actuar

Antes de cada bloque, el asistente debe verificar internamente y reflejar en la respuesta cuando aplique:

```txt
1. ¿Cuál es la última candidata auditada/aceptada?
2. ¿Qué carril estoy trabajando ahora: A, B, C o mixto?
3. ¿Qué avance visible produce este bloque?
4. ¿Qué fuente real ya recibida estoy usando o qué fuente real falta pedir?
5. ¿Estoy repitiendo auditoría ya hecha o estoy convirtiendo auditoría en acción?
6. ¿Qué documento/registro se actualiza?
7. ¿Hay algo que bloquee operación real?
```

## Circuit breaker anti-vueltas

Detener y corregir rumbo si ocurre cualquiera:

```txt
- Se hacen 2 bloques seguidos sin avance visible ni script ejecutable ni matriz de datos.
- Se crean documentos sin una acción siguiente concreta.
- Se pide otra auditoría de algo ya auditado sin nuevo insumo.
- Se habla de backend sin indicar cómo afecta operación real.
- Se habla de Claude/prototipo sin actualizar pendientes o empalme.
- Se trabaja más de 1 bloque sin mencionar fuentes reales recibidas/faltantes.
- Se usa la palabra “pendiente” sin asignar: responsable, carril, siguiente acción y condición de cierre.
```

Cuando se active el circuit breaker, el siguiente mensaje debe contener solo:

```txt
Estado real
Bloqueador
Siguiente acción concreta
Dato/fuente que falta pedir a Paula si aplica
```

## Orden operativo obligatorio desde ahora

### Etapa 0 — Retomar rumbo inmediato

```txt
1. Mantener última candidata como base incremental.
2. Ejecutar empalme seguro preparado.
3. Crear matriz real de fuentes recibidas/faltantes.
4. Pedir a Paula el siguiente archivo real: CLIENTES.
```

### Etapa 1 — Clientes

Objetivo:

```txt
Crear mapeo de clientes sin escribir producción.
```

Acciones:

```txt
- recibir archivo clientes;
- inventariar hojas/columnas;
- normalizar país/moneda si aplica;
- detectar duplicados;
- producir dry-run crear/actualizar/omitir;
- no escribir sin confirmación.
```

Salida esperada:

```txt
Matriz clientes validada + reporte de calidad.
```

### Etapa 2 — Pólizas

Objetivo:

```txt
Mapear pólizas contra clientes ya perfilados.
```

Acciones:

```txt
- recibir archivo pólizas;
- mapear cliente/aseguradora/ramo/vigencia/estado/prima;
- separar prima neta, gastos, IVA/impuestos, total;
- validar país/moneda;
- Vigente/Por renovar genera cartera futura solo cuando reglas estén completas;
- Cancelada/Vencida/Anulada/Rechazada queda histórico.
```

Salida esperada:

```txt
Dry-run pólizas + errores por validar.
```

### Etapa 3 — Vehículos

Objetivo:

```txt
Relacionar vehículos con cliente/póliza cuando la fuente lo permita.
```

Bloqueos:

```txt
No inferir vehículo desde documentos sin confirmación y diff.
```

### Etapa 4 — Recibos/cobros realizados

Objetivo:

```txt
Mapear cobros realizados con trazabilidad.
```

Regla:

```txt
Cobros/recaudos no son finmovs.
```

### Etapa 5 — Estado bancario conciliable

Objetivo:

```txt
Conciliación propuesta, no escritura automática.
```

Regla:

```txt
No escribir cobros desde banco sin conciliación validada.
```

### Etapa 6 — Planillas aseguradora/comisiones

Objetivo:

```txt
Leer filas reales de planillas, no simular tarifas.
```

### Etapa 7 — Documentos soporte / siniestros

Objetivo:

```txt
Crear propuestas/diffs, no cambios automáticos.
```

## Fuentes reales ya recibidas y carril correcto

```txt
Directorio Aseguradoras Guatemala 2026.xlsx -> configuracion_catalogo / aseguradoras / contactos.
Directorio - Aseguradoras Colombia 2024.xlsx -> aseguradoras / contactos CO.
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx -> financiero_historico / finmovs.
AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx -> marketing / calendario.
Manual de Identidad Básica – Versión 1 – Vigente.docx -> configuración marca / Academia Marketing.
Logo V. 2026.jpeg -> configuración marca / slot white-label.
comparativo_final_v110.html -> Cotizador/Comparativo avanzado, integrar como módulo aislado/configurable.
```

## Fuentes faltantes que deben pedirse una a una

Orden de solicitud a Paula:

```txt
1. Clientes.
2. Pólizas.
3. Vehículos si no vienen en pólizas.
4. Recibos/cobros realizados.
5. Planillas aseguradora.
6. Planillas comisiones.
7. Estado de cuenta bancario conciliable.
8. Siniestros.
9. Documentos soporte.
```

## Regla de respuesta desde ahora

Toda respuesta de continuidad debe incluir, aunque sea breve:

```txt
Carril actual:
Avance visible:
Fuente real usada o siguiente fuente a pedir:
Pendiente documentado:
Siguiente acción:
```

## Regla anti-auditoría redundante

No pedir ni repetir auditoría si ya existe una auditoría válida y no hay archivo nuevo.

En ese caso, pasar a acción:

```txt
- empalmar;
- ejecutar validador;
- crear matriz;
- pedir fuente real siguiente;
- preparar script;
- documentar decisión.
```

## Regla de tiempo

Si Paula pregunta “¿vamos bien?” o “¿cuánto falta?”, responder con semáforo:

```txt
Verde: protegido/estable.
Amarillo: preparado pero no ejecutado.
Rojo: bloquea operación real.
Siguiente desbloqueo concreto.
```

## Estado

Protocolo anti-desviación creado. Debe aplicarse en toda conversación siguiente y en cualquier continuidad del proyecto.