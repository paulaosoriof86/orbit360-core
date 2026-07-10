# Addendum de control maestro Claude/Academia — P0.9l

Fecha: 2026-07-10  
Estado: acumulado para próxima candidata; todavía no enviar a Claude.

## 1. Baseline

Claude debe partir de:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

o de una sucesora formalmente auditada.

No reconstruir Aseguradoras desde cero ni reemplazar backend protegido.

## 2. Lo que P0.9l aporta al prototipo

La futura candidata debe incorporar de forma nativa:

- panel de conocimiento documental dentro de Aseguradoras;
- estado de conexión de archivos;
- estado de sincronización/preparación;
- lote por aseguradora;
- formulario de lectura de prueba;
- selección de documentos;
- motivo obligatorio;
- vista previa;
- código de control;
- confirmación reforzada;
- resumen de resultados;
- historial separado;
- estados de archivos pendientes;
- responsive móvil y escritorio.

## 3. Copy obligatorio de usuario

Usar:

```txt
Motor documental
Conexión de archivos
Pendiente de conexión
Sincronización
Preparación
Archivo disponible
Archivo pendiente
Vista previa lista
Código de control
Lectura de prueba
Documento procesado
Requiere revisión
Historial guardado
Listo para revisión
Documentos listos; conocimiento incompleto
```

No mostrar:

```txt
backend
LAB
Firestore
Firebase
Provider
Snapshots
Preflight
BACKEND_REQUIRED
metadata-only
fileRef
sourceRef
localPath
endpoint
smoke
```

Los códigos técnicos pueden existir internamente, pero nunca ser copy principal.

## 4. Hotfix local que Claude debe absorber

Archivo actual:

```txt
modules/aseguradoras-batch-admin-copy-p09l.js
```

Es una capa aditiva temporal que corrige textos visibles del formulario P0.9j.

Claude debe:

1. integrar los textos directamente en el formulario nativo;
2. conservar lógica, permisos y confirmaciones;
3. eliminar la necesidad del hotfix únicamente cuando el reemplazo nativo esté auditado;
4. no borrar el hotfix del paquete antes de demostrar equivalencia visual y funcional.

## 5. Diseño de la operación

La UX debe mantener los pasos visibles:

```txt
Seleccionar acción
→ seleccionar documentos
→ escribir motivo
→ generar vista previa
→ revisar archivos disponibles/pendientes
→ revisar código de control
→ escribir confirmación
→ ejecutar lectura sin guardar conocimiento
→ revisar resultado
→ guardar historial por separado
```

No pedir rutas, IDs técnicos, URLs, tokens ni credenciales.

## 6. Estados honestos

- Si no hay conexión: `Pendiente de conexión`.
- Si un archivo no se localiza: `Archivo pendiente`.
- Si la vista previa existe pero no puede ejecutarse: explicar qué falta sin códigos técnicos.
- Si la lectura termina: `Lectura terminada`; no decir conocimiento guardado.
- Si el historial se guarda: `Historial guardado`; no decir reglas habilitadas.
- Cotizador y Comparativo permanecen deshabilitados hasta su gate.

## 7. Roles

### Dirección/AdminTenant/Admin/SuperAdmin

- seleccionar documentos;
- generar vista previa;
- ejecutar lectura;
- guardar historial;
- revisar conocimiento;
- confirmar gates futuros.

### Operativo

- seleccionar documentos;
- generar vista previa;
- ejecutar lectura;
- reanudar pendientes;
- no guardar historial global.

### Asesor

- no opera el lote global;
- solo consulta información permitida por su alcance cuando exista una vista específica.

La autorización depende del rol activo.

## 8. Academia

Crear o actualizar rutas:

### Dirección/AdminTenant

Lección: `Operar fuentes documentales de Aseguradoras`

Debe enseñar:

- diferencia entre localizar, leer, revisar, guardar historial y habilitar;
- motivo y confirmación reforzada;
- por qué el historial se guarda separado;
- por qué Cotizador sigue deshabilitado.

### Operativo

Lección: `Leer y reanudar documentos pendientes`

Debe enseñar:

- seleccionar archivos;
- interpretar disponible/pendiente;
- ejecutar lectura de prueba;
- revisar errores;
- reanudar solo pendientes;
- escalar validaciones.

### Seguridad

Lección común:

- Orbit localiza archivos autorizados;
- el usuario no copia rutas;
- la UI no muestra ubicaciones;
- un documento procesado no es una regla habilitada;
- no compartir códigos de control fuera del flujo.

Cada ruta debe tener práctica, evaluación, errores frecuentes y evidencia de progreso.

## 9. Smoke visual requerido

Auditar:

- panel aparece una sola vez;
- formulario aparece una sola vez;
- responsive;
- textos no se cortan;
- estados no muestran códigos internos;
- botones se bloquean correctamente;
- rol activo visible;
- Asesor bloqueado;
- Operativo sin botón de guardar historial;
- confirmación exacta;
- archivos disponibles/pendientes visibles;
- no aparecen rutas;
- no aparecen términos técnicos;
- Cotizador/Comparativo no se activan.

## 10. Restricciones de empalme

Claude no puede sobrescribir:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
tools/orbit360-*
```

El empalme debe conservar:

- bridge same-origin;
- bootstrap P0.9f;
- contratos P0.9g/P0.9h/P0.9i/P0.9j;
- configuración P0.10;
- segundo gate;
- cero habilitación accidental.

## 11. Momento de solicitud a Claude

Todavía no.

Reevaluar después de:

1. host ejecutado en navegador real;
2. vista previa AseGuate real;
3. lectura training real;
4. historial visible tras recarga;
5. smoke visual base.

En ese momento, entregar paquete súper acumulado completo, no solo este addendum.
