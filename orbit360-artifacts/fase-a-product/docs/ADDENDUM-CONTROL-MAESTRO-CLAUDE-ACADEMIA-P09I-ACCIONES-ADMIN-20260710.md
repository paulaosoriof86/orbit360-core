# Addendum control maestro Claude/Academia — P0.9i acciones administrativas

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / CONTRATO_BACKEND_IMPLEMENTADO`

## 1. Regla de continuidad

La futura UX debe mantener separadas estas acciones:

```text
previsualizar lote
≠ ejecutar dry-run
≠ reanudar pendientes
≠ persistir historial
≠ persistir conocimiento
≠ habilitar módulos
```

No debe existir un botón único que combine todo.

## 2. Wizard administrativo futuro

Pasos mínimos:

1. Seleccionar acción: dry-run o reanudación.
2. Mostrar documentos incluidos.
3. Mostrar referencias disponibles/faltantes sin revelar su valor.
4. Permitir filtrar documentos.
5. Registrar motivo obligatorio.
6. Mostrar actor y rol activo.
7. Generar fingerprint/preview.
8. Solicitar frase de confirmación reforzada.
9. Ejecutar sin persistir conocimiento.
10. Mostrar resultados por documento.
11. Ofrecer persistencia independiente del historial a roles administrativos.
12. Mantener cerrado el segundo gate.

## 3. Estados visibles

La interfaz debe mostrar:

```text
preview_pendiente
preview_listo
requiere_referencia
requiere_confirmacion
fingerprint_cambiado
ejecutando_dry_run
dry_run_completo
dry_run_incompleto
reanudar_disponible
historial_no_persistido
historial_persistido
```

No debe mostrar “procesado” cuando solo existe preview.

## 4. Roles

### Operativo

Puede:

- abrir preview;
- revisar alcance;
- ejecutar dry-run;
- reanudar pendientes;
- revisar resultados.

No puede:

- persistir historial global;
- persistir reglas/presentaciones/bindings;
- habilitar módulos.

### Admin/Dirección/SuperAdmin/AdminTenant

Puede además:

- persistir historial metadata-only;
- confirmar motivo;
- revisar auditoría;
- continuar a revisión de conocimiento.

### Asesor

No puede ejecutar acciones administrativas del lote.

## 5. Confirmación reforzada

La UX debe mostrar exactamente la frase requerida:

```text
EJECUTAR DRY-RUN
REANUDAR DRY-RUN
```

El usuario debe escribirla o confirmarla de forma equivalente. Si cambia el alcance, motivo o actor, el preview debe invalidarse.

## 6. Preview

Debe mostrar:

- aseguradora;
- documento;
- tipo Excel/PDF;
- producto;
- país y moneda;
- versión;
- referencia disponible/faltante;
- acción;
- cantidad total;
- fingerprint;
- advertencia de cero persistencia.

Nunca debe mostrar:

- rutas;
- URLs firmadas;
- tokens;
- nombres internos de carpetas backend;
- claves;
- PII contenida en los documentos.

## 7. Resultados

Cada documento debe mostrar:

- estado;
- código;
- intentos;
- manifiesto/propuesta/presentación detectados;
- error sanitizado;
- elegibilidad para reanudación;
- diff con run anterior cuando exista.

## 8. Persistencia del historial

La UI debe separar visualmente:

```text
Guardar historial del run
```

de:

```text
Aplicar conocimiento revisado
```

Guardar historial exige:

- rol administrativo;
- confirmación del plan;
- segunda confirmación de persistencia;
- motivo;
- auditoría.

No debe insinuar que guardar historial habilita Cotizador o Comparativo.

## 9. Panel actual

El panel P0.9f/P0.9i continúa siendo solo lectura.

Muestra:

- preview vigente;
- documentos;
- referencias presentes/faltantes;
- frase requerida;
- última ejecución;
- historial persistido o no.

No contiene acciones de ejecución.

## 10. Academia profunda

Rutas sugeridas:

- diferencia entre preview y ejecución;
- por qué un dry-run no persiste conocimiento;
- fingerprint y alcance;
- referencia backend sin rutas;
- rol activo;
- motivo obligatorio;
- confirmación reforzada;
- reanudación selectiva;
- persistencia separada del historial;
- lectura de errores y diffs;
- segundo gate.

Evaluaciones:

- detectar una referencia faltante;
- bloquear Asesor;
- permitir revisión a Operativo;
- invalidar fingerprint cambiado;
- elegir la frase correcta;
- distinguir historial de conocimiento;
- reanudar solo fallidas/pendientes;
- confirmar que Cotizador continúa deshabilitado.

## 11. Prohibiciones para Claude

- no unir preview, ejecución y persistencia en un botón;
- no exponer referencias o rutas;
- no permitir a Asesor ejecutar lote;
- no permitir a Operativo persistir historial global;
- no persistir conocimiento desde la pantalla P0.9i;
- no habilitar Cotizador/Comparativo;
- no usar datos reales en fixtures visuales;
- no tocar `Orbit.store` directamente;
- no mostrar provider como conectado si responde `BACKEND_REQUIRED`.

## 12. Condición para solicitar candidata

Claude se solicitará después de:

1. empalme del bootstrap en LAB;
2. provider real conectado;
3. primer dry-run real;
4. historial persistido y recargado;
5. validación visual del panel;
6. contrato de formulario P0.9j estabilizado.

Hasta entonces:

```text
NO_ENVIADO_A_CLAUDE
```
