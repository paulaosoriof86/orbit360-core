# Addendum de control maestro Claude/Academia — P0.9n

Fecha: 2026-07-10  
Estado: acumulado; todavía no solicitar candidata Claude.

## 1. Baseline

La próxima candidata debe partir de:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

o de una sucesora formalmente auditada y aceptada.

## 2. Requisito de observabilidad visual

Claude debe representar estados de usuario, no códigos técnicos.

La interfaz debe permitir distinguir:

```txt
Preparación pendiente
Conexión de archivos disponible
Archivo pendiente/disponible
Vista previa lista
Lectura terminada
Historial guardado
Revisión pendiente
Listo para revisión
Habilitación pendiente
```

No mostrar:

```txt
P0.9n
runtime
host
same-origin
HttpOnly
backend
LAB
Firestore
Firebase
snapshot
manifest
metadata-only
fileRef
sourceRef
localPath
BACKEND_REQUIRED
```

## 3. Panel y formulario

La futura candidata debe integrar nativamente:

- panel de conocimiento documental;
- formulario de lectura de prueba;
- selección de documentos;
- motivo;
- disponibilidad de archivos;
- código de control;
- confirmación reforzada;
- resultado de lectura;
- historial separado;
- estado reanudable;
- responsive móvil/escritorio.

Los hotfixes P0.9l/P0.9n no deben eliminarse hasta demostrar equivalencia funcional y visual.

## 4. Gate visual

La futura candidata debe conservar estos controles:

1. panel visible;
2. formulario visible;
3. rol activo autorizado;
4. preview real;
5. lectura real;
6. historial después de recarga;
7. read model estable;
8. sin overflow móvil;
9. sin overflow escritorio;
10. sin términos técnicos visibles;
11. frontera clara entre Aseguradoras, Cotizador y Comparativo.

El observador técnico no sustituye la revisión humana de diseño.

## 5. Regla de frontera

Debe ser visible que:

```txt
archivo disponible
≠ archivo leído
≠ conocimiento validado
≠ binding listo
≠ producto habilitado
```

Cotizador y Comparativo continúan deshabilitados hasta el segundo gate funcional.

## 6. Privacidad

La UX no debe mostrar ni persistir:

- nombres de carpetas;
- rutas;
- referencias opacas;
- IDs internos;
- PII;
- tasas dentro del resumen general;
- reportes técnicos P0.9m/P0.9n.

Los reportes privados son evidencia para auditoría y continuidad, no contenido cliente.

## 7. Academia

Actualizar rutas por rol.

### Dirección/AdminTenant

Debe aprender:

- interpretar estados sin tecnicismos;
- revisar preview y lectura;
- guardar historial por separado;
- verificar recarga/read model;
- diferenciar revisión visual de habilitación;
- confirmar segundo gate cuando corresponda.

### Operativo

Debe aprender:

- ejecutar lectura de prueba;
- detectar archivo pendiente;
- reanudar fallidas;
- verificar resultados después de recarga;
- no persistir historial global si el rol activo no lo permite.

### Asesor

Debe entender:

- que no opera el lote global;
- que no modifica reglas, bindings o habilitaciones;
- que solo ve conocimiento autorizado relacionado con sus clientes.

## 8. Evaluaciones sugeridas

1. ¿Un panel visible significa que el archivo fue leído? — No.
2. ¿Una lectura terminada habilita Cotizador? — No.
3. ¿Un reporte técnico reemplaza la revisión móvil? — No.
4. ¿Qué confirma una recarga exitosa? — Que historial/read model reaparecen.
5. ¿Qué nunca debe aparecer en UI? — Rutas, referencias, PII y términos técnicos.

## 9. Auditoría futura de candidata

Comparar contra:

- candidata base del 8 de julio;
- repo vivo;
- paquete súper acumulado maestro;
- addenda P0.9l, P0.9m y P0.9n;
- documentación de Academia;
- hotfixes de copy;
- archivos protegidos.

Validar:

- no regresiones;
- responsive móvil/escritorio;
- navegación;
- PWA;
- estados honestos;
- rol activo;
- multi-tenant;
- ausencia de hardcode A&S reusable;
- cero renderer duplicado;
- cero texto técnico visible.

## 10. Estado

```txt
P0.9n implementado
requisitos UX/Academia acumulados
smoke visual real pendiente
candidata Claude: todavía no
próxima evaluación: después de consolidar reportes y checklist visual P0.9o
```
