# Paquete súper acumulado Claude — Addendum obligatorio P0.9l

Fecha: 2026-07-10  
Documento padre:

```txt
PAQUETE-SUPER-ACUMULADO-CLAUDE-DESDE-CANDIDATA-20260708-EN-CONSTRUCCION.md
```

Estado: acumulado; todavía no entregar a Claude.

## 1. Regla de inclusión

Este addendum forma parte obligatoria del próximo paquete completo para Claude. No debe entregarse solo ni tratarse como solicitud parcial.

Baseline:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

## 2. P0.9l que Claude debe replicar

### Aseguradoras

- panel de conocimiento documental;
- conexión de archivos;
- sincronización y preparación;
- fuentes/manifiestos/propuestas/reglas/presentaciones/relaciones/revisiones;
- lote de 11 fuentes y 6 aseguradoras por configuración;
- historial y reanudables;
- formulario de operación controlada;
- responsive móvil/escritorio.

### Flujo visible

```txt
Seleccionar lectura de prueba o reanudación
→ elegir documentos
→ escribir motivo
→ generar vista previa
→ ver archivos disponibles/pendientes
→ revisar código de control
→ confirmar
→ ejecutar sin guardar conocimiento
→ revisar resultado
→ guardar historial por separado
```

### Copy obligatorio

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
Lectura terminada
Historial guardado
Listo para revisión
Documentos listos; conocimiento incompleto
```

### Copy prohibido

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

## 3. Hotfix local acumulado

Claude debe incorporar de forma nativa el comportamiento actual de:

```txt
modules/aseguradoras-batch-admin-copy-p09l.js
```

No eliminarlo durante el empalme hasta que la candidata demuestre:

- textos equivalentes;
- mismos permisos;
- mismas confirmaciones;
- mismos estados honestos;
- cero códigos técnicos visibles;
- responsive validado.

## 4. Patrón reusable que debe aparecer en UX/Academia

```txt
archivo autorizado
→ Orbit lo localiza
→ usuario ve disponibilidad
→ vista previa
→ lectura de prueba
→ revisión humana
→ historial separado
```

El usuario nunca copia rutas, referencias o credenciales.

## 5. Reglas de seguridad visual

- no mostrar rutas;
- no mostrar tokens;
- no mostrar hashes salvo necesidad de auditoría avanzada;
- no mostrar códigos internos como copy principal;
- no afirmar conectado si no lo está;
- no afirmar conocimiento guardado después de una lectura;
- no habilitar Cotizador/Comparativo.

## 6. Academia acumulada

Agregar rutas:

1. `Operación documental de Aseguradoras` — Dirección/AdminTenant.
2. `Lectura y reanudación de documentos` — Operativo.
3. `Seguridad de archivos autorizados` — común.
4. `Documento procesado no significa producto habilitado` — común.
5. `Historial frente a conocimiento` — Dirección/Operativo.

Cada ruta requiere práctica, evaluación, errores frecuentes, rol autorizado y progreso.

## 7. Smoke visual de la futura candidata

- panel una sola vez;
- formulario una sola vez;
- no códigos técnicos;
- no rutas;
- estados disponibles/pendientes;
- rol activo correcto;
- Asesor bloqueado;
- Operativo sin persistencia global;
- Dirección con historial separado;
- confirmaciones exactas;
- responsive;
- Cotizador/Comparativo deshabilitados.

## 8. Archivos protegidos

No sobrescribir:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
tools/orbit360-*
```

Conservar también:

```txt
core/aseguradoras-runtime-bootstrap-p09f.js
core/aseguradoras-source-reference-broker-p09j.js
core/aseguradoras-same-origin-document-bridge-p09l.js
modules/aseguradoras-knowledge-panel-p09f.js
modules/aseguradoras-batch-admin-form-p09j.js
modules/aseguradoras-batch-admin-copy-p09l.js
```

## 9. Gate Claude

Todavía no solicitar candidata.

Reevaluar cuando existan:

- host ejecutado;
- preview real;
- lectura real training;
- historial visible tras recarga;
- read model estable;
- smoke visual.

Cuando se cumpla, generar un paquete único y súper acumulado que incluya el documento padre, este addendum y los addenda posteriores.
