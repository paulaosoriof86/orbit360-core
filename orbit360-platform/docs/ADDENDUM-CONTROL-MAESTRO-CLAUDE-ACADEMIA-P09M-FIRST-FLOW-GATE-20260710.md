# Addendum de control maestro Claude/Academia — P0.9m

Fecha: 2026-07-10  
Estado: acumulado; todavía no solicitar candidata Claude.

## 1. Baseline

Toda futura candidata debe partir de:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
```

o de una sucesora auditada y aceptada. No reconstruir desde una versión anterior.

## 2. Requisito UX reusable

La interfaz debe distinguir claramente:

```txt
Pendiente de conexión
Archivo disponible
Vista previa lista
Lectura terminada
Requiere validación
Historial guardado
Conocimiento pendiente
Listo para revisión
Habilitación pendiente
```

No mostrar al usuario:

- P0.9m;
- host;
- same-origin;
- HttpOnly;
- manifest;
- backend;
- Firestore;
- LAB;
- rutas;
- referencias;
- códigos técnicos.

Esos conceptos pueden existir en auditoría técnica, no en la superficie cliente.

## 3. Vista de Aseguradoras

Después del primer flujo real debe mostrar:

- aseguradora;
- documento;
- producto y variante;
- país y moneda;
- estado de disponibilidad;
- estado de lectura;
- advertencias;
- calidad/completitud;
- revisión pendiente;
- historial de la operación.

Nunca mostrar tasas o PII en el resumen general. Los valores tarifarios revisables deben permanecer dentro del flujo autorizado de reglas.

## 4. Progresión visual obligatoria

```txt
Archivo pendiente
→ Archivo disponible
→ Vista previa lista
→ Lectura terminada
→ Requiere validación
→ Regla/presentación propuesta
→ Binding incompleto o listo para revisión
→ Segundo gate
```

Procesar un archivo no debe cambiar automáticamente a “activo” o “habilitado”.

## 5. Gate de Claude

No solicitar candidata mientras falte cualquiera de estos puntos:

1. preview real desde la plataforma;
2. Auth y rol activo comprobados;
3. lectura training real;
4. historial visible después de recarga;
5. read model estable;
6. smoke visual/responsive;
7. frontera Aseguradoras/Cotizador/Comparativo.

El reporte P0.9m es evidencia técnica, no reemplazo del smoke visual.

## 6. Hotfixes acumulados

Claude debe absorber nativamente:

- copy de usuario P0.9l;
- formulario de operación documental;
- panel de conocimiento;
- estados de lote e historial;
- códigos de control traducidos;
- bloqueo por rol activo;
- separación entre ejecución e historial;
- cero rutas o IDs manuales.

No debe eliminar los hotfixes actuales hasta demostrar equivalencia funcional y visual.

## 7. Academia

Actualizar rutas por rol.

### Dirección/AdminTenant

Debe aprender:

- interpretar el preflight sin tecnicismos;
- diferenciar preview, lectura, historial y conocimiento;
- revisar advertencias;
- confirmar el segundo gate;
- identificar cuándo un producto aún no puede cotizarse.

### Operativo

Debe aprender:

- revisar disponibilidad;
- ejecutar lectura training;
- reanudar pendientes;
- no persistir historial global cuando su rol activo no lo permite;
- crear gestión de corrección cuando falta una fuente.

### Asesor

Debe entender:

- que no opera el lote global;
- que puede consultar únicamente información autorizada relacionada con sus clientes;
- que no modifica reglas tarifarias ni habilitaciones.

## 8. Evaluaciones

Incluir preguntas prácticas:

1. ¿Una lectura terminada habilita el Cotizador? — No.
2. ¿Un reporte técnico sustituye la revisión visual? — No.
3. ¿Quién puede persistir historial global? — Rol administrativo activo autorizado.
4. ¿Qué ocurre si falta una fuente? — Queda pendiente/reanudable.
5. ¿Qué información nunca debe mostrarse? — Rutas, referencias, secretos y PII.

## 9. Estado acumulado

```txt
P0.9m técnico: implementado
copy reusable: documentado
Academia: requisitos acumulados
candidata Claude: todavía no
próxima evaluación: después del flujo visual real y recarga
```
