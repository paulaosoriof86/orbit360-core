# Paquete súper acumulado para Claude — Addendum obligatorio P0.9m

Fecha: 2026-07-10  
Estado: en construcción; todavía no entregar a Claude.

## 1. Baseline invariable

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

Este addendum se suma al paquete maestro y al addendum P0.9l. No sustituye ni reduce requisitos anteriores.

## 2. Cambios que Claude deberá absorber

### Operación documental

- formulario administrativo completo;
- selección de fuentes sin IDs manuales;
- disponibilidad de archivos;
- preview;
- código de control;
- confirmación reforzada;
- lectura sin persistir conocimiento;
- historial separado;
- reanudación;
- estados por documento;
- bindings incompletos/listos.

### Copy visible

Usar lenguaje de usuario:

```txt
Pendiente de conexión
Archivo disponible
Archivo pendiente
Vista previa lista
Lectura terminada
Requiere validación
Historial guardado
Listo para revisión
```

No mostrar:

```txt
backend
LAB
Firestore
Firebase
host
same-origin
HttpOnly
provider
snapshot
preflight
manifest
metadata-only
BACKEND_REQUIRED
```

### Gate y estados

La futura candidata debe visualizar la progresión real, pero no exponer el reporte técnico P0.9m.

Debe conservar esta regla:

```txt
archivo leído ≠ conocimiento validado ≠ binding listo ≠ producto habilitado
```

## 3. Evidencia P0.9m

El backend genera un reporte privado con:

- estado de sesión y host;
- disponibilidad de AseGuate;
- lectura training;
- conteos estructurales;
- flags de seguridad;
- gate Claude.

Claude no debe intentar leer, mostrar o persistir ese reporte en la UI. Solo se usa para auditoría y continuidad.

## 4. Prohibiciones de regresión

Claude no puede:

- reemplazar `data/store.js`;
- reemplazar `data/store-firestore-lab.local.js`;
- modificar `core/backend-lab-*`;
- cambiar Auth o reglas;
- crear almacenamiento paralelo;
- meter rutas o credenciales en frontend;
- hardcodear A&S en componentes reusables;
- fusionar automóvil con microbús;
- habilitar Cotizador/Comparativo por haber leído un archivo;
- eliminar hotfixes P0.9l/P0.9m sin equivalencia comprobada;
- volver a una candidata anterior.

## 5. Aseguradoras A&S

El prototipo debe representar por configuración:

- Seguros BAM;
- Bantrab;
- Seguros Columna;
- Aseguradora Guatemalteca;
- Aseguradora Rural (Banrural);
- Seguros Universales.

Alias y perfiles financieros pertenecen al tenant, no al core general.

## 6. AseGuate

Mostrar componentes separados:

```txt
prima neta
asistencia
emisión 5% sobre prima neta
IVA 12% sobre subtotal gravable
prima total
```

Los porcentajes se leen desde configuración del tenant. No crear fórmulas ocultas ni copiar importes de ejemplos.

## 7. Academia obligatoria

Agregar o actualizar:

1. estados del flujo documental;
2. preview vs lectura;
3. lectura vs persistencia;
4. historial y recarga;
5. binding y segundo gate;
6. permisos por rol activo;
7. seguridad de archivos;
8. por qué Cotizador sigue deshabilitado;
9. interpretación de advertencias;
10. reanudación de fuentes fallidas.

## 8. Auditoría de la futura candidata

Comparar contra:

- candidata base del 8 de julio;
- repo vivo;
- paquete súper acumulado maestro;
- addendum P0.9l;
- este addendum P0.9m;
- documentación de Academia;
- hotfixes de copy;
- archivos protegidos.

Validar:

- no regresiones;
- no textos técnicos visibles;
- multi-tenant;
- rol activo;
- estados honestos;
- responsive;
- PWA;
- navegación;
- cero duplicación de renderers;
- smoke visual.

## 9. Momento de entrega

```txt
Paquete acumulado: activo
Claude: todavía no
Próxima evaluación: después del preview real, lectura training, historial tras recarga y smoke visual
```

Al cerrarse el gate, el paquete final debe ser completo y descargable para Claude, incluyendo todas las modificaciones desde la candidata del 8 de julio, no únicamente el último bloque.
