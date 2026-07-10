# Paquete súper acumulado Claude — Addendum obligatorio P0.9n

Fecha: 2026-07-10  
Estado: en construcción; todavía no entregar a Claude.

## 1. Baseline invariable

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

Este addendum se suma al paquete maestro y a P0.9l/P0.9m. No sustituye requisitos anteriores.

## 2. Lo que Claude debe absorber

### Aseguradoras

- panel de conocimiento documental;
- formulario de operación controlada;
- disponibilidad de archivos;
- preview y código de control;
- lectura de prueba;
- resumen de resultados;
- historial separado;
- reanudación;
- estados de documento/conocimiento/binding;
- vista responsive.

### Estados visibles

```txt
Pendiente de conexión
Archivo pendiente
Archivo disponible
Vista previa lista
Lectura terminada
Historial guardado
Requiere validación
Listo para revisión
Habilitación pendiente
```

### Progresión obligatoria

```txt
archivo disponible
→ vista previa
→ lectura
→ historial
→ validación
→ regla/presentación
→ binding
→ segundo gate
```

Nunca saltar de “archivo leído” a “producto activo”.

## 3. Observabilidad que no se muestra al cliente

El backend registra de forma privada:

- panel/formulario montados;
- rol activo;
- conexión;
- preview;
- lectura;
- historial;
- recarga/read model;
- mobile/desktop;
- overflow;
- copy técnico;
- gate Claude.

Claude no debe mostrar el observador, reportes, nombres P0.9n ni códigos internos.

## 4. Copy prohibido

```txt
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

## 5. Responsive

La candidata debe ser auditada al menos en:

- móvil;
- escritorio.

No se acepta:

- overflow horizontal;
- botones fuera del viewport;
- tablas sin adaptación;
- textos técnicos truncados;
- formularios que obliguen a copiar IDs o rutas.

## 6. Historial y recarga

Después de recargar deben reaparecer:

- run;
- ítems;
- último estado;
- documentos reanudables;
- conteos del read model.

La UI no puede depender únicamente de memoria temporal del formulario.

## 7. Frontera de módulos

Debe quedar claro que:

- Aseguradoras administra fuentes y conocimiento;
- Cotizador consume únicamente bindings habilitados;
- Comparativo consume propuestas/presentaciones validadas según target;
- procesar archivos no habilita ningún target.

## 8. Prohibiciones de regresión

Claude no puede:

- sobrescribir backend protegido;
- crear almacenamiento paralelo;
- hardcodear A&S en componentes reusables;
- fusionar automóvil y microbús;
- mostrar rutas, referencias o PII;
- eliminar hotfixes P0.9l/P0.9m/P0.9n sin equivalencia comprobada;
- habilitar Cotizador/Comparativo por estado documental;
- volver a una candidata anterior.

## 9. Academia acumulada

Agregar o actualizar:

1. estados del flujo documental;
2. preview vs lectura;
3. lectura vs historial;
4. recarga/read model;
5. reglas y bindings;
6. permisos por rol activo;
7. responsive y accesibilidad operativa;
8. segundo gate;
9. seguridad de archivos;
10. por qué el observador técnico no aparece en UI.

## 10. Auditoría futura

Comparar candidata contra:

- baseline del 8 de julio;
- repo vivo;
- paquete maestro;
- addenda P0.9l, P0.9m y P0.9n;
- Academia;
- hotfixes;
- archivos protegidos.

Auditar:

- no regresiones;
- multi-tenant;
- rol activo;
- copy de usuario;
- responsive;
- PWA;
- navegación;
- estados honestos;
- cero renderer duplicado;
- smoke visual.

## 11. Momento de entrega

```txt
Paquete acumulado: activo
Claude: todavía no
Pendientes: flujo real, mobile/desktop, recarga y frontera visual
Próxima evaluación: después de P0.9o
```

Cuando el gate cierre, el paquete final debe ser completo y descargable, incluyendo todo desde la candidata del 8 de julio y no solo el último bloque.
