# Addendum control maestro Claude/Academia — P0.9g lote documental

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / CONTRATO_BACKEND_IMPLEMENTADO`

## 1. Regla de continuidad

La futura UX debe consumir el lote P0.9g. No debe reconstruir un importador paralelo ni simular procesamiento de archivos.

Debe respetar:

- Aseguradoras como fuente primaria;
- once fuentes del tenant A&S;
- seis aseguradoras canónicas;
- referencias backend, nunca rutas locales;
- dry-run antes de persistir;
- confirmación de lote y de cada fuente;
- validación humana;
- segundo gate;
- Cotizador y Comparativo deshabilitados hasta autorización.

## 2. Vista de lote

Debe mostrar:

- nombre y versión del lote;
- total de fuentes;
- Excel/PDF;
- aseguradoras;
- estado general;
- progreso;
- fecha de inicio/finalización;
- actor y rol activo;
- modo dry-run o persistencia;
- motivo;
- errores sanitizados.

## 3. Estado por fuente

Cada fila debe incluir:

- aseguradora;
- nombre del archivo;
- tipo de fuente;
- producto/vehículo/plan;
- versión;
- referencia disponible o pendiente;
- número de intentos;
- estado;
- outputs detectados;
- acción permitida según rol.

Estados visibles:

```text
Esperando referencia
Bloqueada
Falló
Dry-run listo
Metadata persistida
Verificada en read model
```

No traducir `dry_run_ready` como “activo”, “cargado” o “habilitado”.

## 4. Reintentos

La UI debe distinguir:

- error transitorio reintentable;
- error estructural;
- referencia faltante;
- autorización;
- proveedor no conectado;
- validación pendiente.

Un reintento no debe repetir fuentes ya verificadas salvo solicitud explícita.

## 5. Binding sets

Debe existir una sección separada para:

### AseGuate automóvil

- tarifario;
- PDF automóvil;
- regla;
- presentación;
- reconciliación;
- estado del gate.

### AseGuate microbús

Misma estructura, sin heredar la variante de automóvil.

### Universales Riesgo Plus

Debe mostrar claramente:

```text
Presentación disponible
Tarifa/regla faltante
Binding incompleto
```

## 6. Diferencia conceptual obligatoria

La UX y Academia deben enseñar:

```text
Documento procesado
→ propuesta
→ conocimiento revisado
→ binding revisable
→ segundo gate
→ habilitación
```

Nunca presentar estas etapas como equivalentes.

## 7. Roles

### Asesor

- consulta estado de fuentes relacionadas con productos habilitados;
- no ejecuta lote global;
- no persiste conocimiento;
- no habilita reglas.

### Operativo

- revisa resultados;
- resuelve clasificación permitida;
- solicita corrección/reintento;
- no confirma persistencia global ni habilitación.

### Admin/Dirección

- inicia dry-run;
- revisa diferencias;
- confirma persistencia por fuente;
- aprueba reintentos;
- revisa auditoría;
- ejecuta segundo gate cuando corresponda.

## 8. Confirmaciones

La interfaz debe separar:

1. Confirmar el lote que se va a procesar.
2. Confirmar cuáles fuentes se persistirán.
3. Confirmar posteriormente el segundo gate de habilitación.

No usar una sola casilla para las tres decisiones.

## 9. Panel actual P0.9g

El panel implementado es informativo y solo lectura. Claude no debe reemplazarlo por botones falsos.

Puede evolucionarlo a:

- tabla filtrable;
- progreso por aseguradora;
- timeline;
- drawer de detalle;
- diff;
- historial de intentos;
- vínculos a la fuente original bajo permisos.

Las acciones solo se agregan cuando el bridge backend esté conectado y probado.

## 10. Estados honestos

```text
sin ejecutar
esperando provider
esperando referencia
dry-run incompleto
dry-run completo
persistencia parcial
persistencia verificada
conocimiento incompleto
listo para revisión de binding
pendiente segundo gate
```

## 11. Academia profunda

### Dirección/Admin

- preparar un lote;
- interpretar estados;
- revisar referencias;
- diferenciar dry-run y persistencia;
- aprobar fuentes individualmente;
- resolver fallos;
- revisar bindings;
- ejecutar segundo gate.

### Operativo

- leer manifiestos;
- identificar archivos equivocados;
- corregir país/producto/vehículo;
- documentar observaciones;
- solicitar reintento.

### Asesor

- comprender por qué un producto aún no aparece;
- consultar estado;
- reportar una inconsistencia sin modificar reglas.

Evaluaciones:

- identificar una referencia faltante;
- reconocer un error reintentable;
- impedir que automóvil herede microbús;
- detectar presentación sin tarifa;
- diferenciar metadata persistida de habilitación;
- seleccionar la confirmación correcta.

## 12. Prohibiciones para Claude

- no hardcodear rutas ni fileRefs;
- no incluir datos reales o PII;
- no llamar `Orbit.store` directamente;
- no ejecutar el lote desde un panel solo lectura;
- no mostrar provider conectado sin bridge;
- no habilitar módulos al completar el lote;
- no fusionar variantes;
- no ocultar fuentes fallidas;
- no eliminar historial al reintentar.

## 13. Condición para solicitar candidata

Claude será solicitado después de:

1. empalme P0.9f aplicado en LAB;
2. provider real conectado;
3. dry-run real de las once fuentes;
4. primera persistencia verificada;
5. estados del panel confirmados visualmente;
6. contrato de acciones y permisos estabilizado.

Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
