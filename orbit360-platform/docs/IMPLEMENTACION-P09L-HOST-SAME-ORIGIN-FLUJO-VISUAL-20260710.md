# Implementación P0.9l — Host same-origin y flujo visual de Aseguradoras

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft, sin merge ni deploy.

## 1. Carril actual

Carriles B + C, con traducción acumulada al Carril A.

## 2. Necesidad

P0.9k resolvía archivos autorizados y ejecutaba inspectores desde herramientas backend, mientras P0.9j ofrecía el formulario visual. Faltaba una frontera same-origin que conectara ambos sin:

- exponer rutas;
- poner credenciales o secretos en JavaScript;
- abrir CORS;
- modificar permanentemente `index.html`;
- habilitar Cotizador o Comparativo;
- convertir el host LAB en servicio de producción.

## 3. Solución

### Host loopback

Archivo:

```txt
tools/orbit360-aseguradoras-same-origin-host-p09l.mjs
```

Características:

- escucha únicamente en `127.0.0.1`;
- genera sesión aleatoria de arranque;
- entrega cookie `HttpOnly` y `SameSite=Strict`;
- rechaza peticiones sin sesión;
- rechaza orígenes ajenos;
- aplica `no-store`, `nosniff`, frame deny y política same-origin;
- sirve únicamente `orbit360-platform/`;
- bloquea traversal;
- no sirve herramientas ni carpetas privadas;
- limita el tamaño de requests;
- no imprime rutas en respuestas;
- no realiza writes operativos.

### Transformación del index en memoria

El host lee el `index.html` real y agrega únicamente a la respuesta HTTP:

```txt
core/backend-lab-security-guard.js
core/aseguradoras-same-origin-document-bridge-p09l.js
core/aseguradoras-runtime-bootstrap-p09f.js
```

Orden validado:

```txt
loader
→ init
→ store
→ store Firestore LAB
→ security guard
→ bridge same-origin
→ bootstrap documental
→ módulo Aseguradoras
```

El archivo `index.html` en disco no cambia.

### Bridge navegador/host

Archivo:

```txt
orbit360-platform/core/aseguradoras-same-origin-document-bridge-p09l.js
```

Expone:

```txt
status
execute
resolveBatchReferences
prepareBatchReferences
resolveSourceReferences
referencesForBatch
```

Usa rutas relativas same-origin:

```txt
/__orbit360/status
/__orbit360/references
/__orbit360/run
```

No contiene URL externa, token, API key, ruta local o almacenamiento cliente.

### Capacidad backend usada

El host conecta:

```txt
catálogo P0.9k
→ registro privado
→ resolver P0.9d
→ runner P0.9c
→ extractor Excel/PDF
```

Toda ejecución fuerza propósito `training` e impide valores sensibles.

## 4. Sesión y seguridad

El flujo de inicio es:

```txt
launcher
→ URL aleatoria de sesión
→ cookie HttpOnly
→ redirección a Aseguradoras
→ requests same-origin autenticados
```

Las acciones exigen además:

- actor;
- rol activo permitido;
- tenant `alianzas-soluciones`;
- mismo origen;
- documento y referencia válidos.

P0.9l es exclusivamente local/LAB. No es diseño de producción.

## 5. Launcher cero manual técnico

Archivos:

```txt
tools/orbit360-iniciar-aseguradoras-lab-p09l.ps1
tools/orbit360-detener-aseguradoras-lab-p09l.ps1
```

El launcher:

1. valida repo, rama y HEAD;
2. valida configuración Firebase LAB local;
3. busca una carpeta privada autorizada dentro del repo;
4. inicia el host oculto;
5. espera confirmación;
6. abre Aseguradoras en el navegador;
7. deja reporte privado ignorado por Git.

No busca automáticamente en Descargas, Escritorio u otras carpetas personales.

## 6. Lenguaje visible

Se corrigió el panel para no mostrar:

```txt
BACKEND_REQUIRED
Provider
Snapshots
Preflight LAB
metadata-only
referencias backend
```

La UI usa:

```txt
Pendiente de conexión
Conexión de archivos
Sincronización
Preparación
Vista previa lista
Archivo disponible
Archivo pendiente
Código de control
Lectura terminada
Historial guardado
```

Archivos:

```txt
orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js
orbit360-platform/modules/aseguradoras-batch-admin-copy-p09l.js
```

El segundo archivo es un hotfix aditivo y reversible porque el reemplazo grande del formulario fue bloqueado por el conector. Claude deberá absorber este copy de forma nativa en la próxima candidata.

## 7. Pruebas

Archivo:

```txt
tools/orbit360-test-aseguradoras-same-origin-host-p09l.mjs
```

Valida:

- loopback;
- sesión requerida;
- cookie HttpOnly/SameSite;
- redirección a Aseguradoras;
- índice transformado;
- índice en disco intacto;
- bridge servido;
- status sin rutas;
- referencia opaca;
- actor/tenant;
- ejecución de inspector;
- origen ajeno bloqueado;
- cero writes y cero habilitación.

También se actualizó:

```txt
tools/orbit360-test-aseguradoras-knowledge-panel-p09f.mjs
```

para bloquear términos técnicos visibles.

Workflow:

```txt
.github/workflows/orbit360-aseguradoras-same-origin-p09l-smoke.yml
```

## 8. Estado real

```txt
host same-origin: implementado
bridge navegador: implementado
launcher: implementado
stop controlado: implementado
smoke HTTP: configurado
copy visible: endurecido
index en disco: no modificado
host en navegador real: no ejecutado
preview real visual: no ejecutado
dry-run real visual: no ejecutado
historial Firestore LAB: no persistido
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## 9. Qué falta

1. Ejecutar host en checkout local completo.
2. Confirmar configuración Firebase LAB.
3. Tener la fuente AseGuate en una raíz privada autorizada.
4. Abrir Aseguradoras.
5. Verificar copy y responsive.
6. Generar preview real.
7. Ejecutar lectura training.
8. Guardar historial por separado.
9. Recargar.
10. Confirmar read model.
11. Documentar smoke visual.
12. Reevaluar solicitud a Claude.

## 10. Acción manual

No se requiere para continuar código/documentación. La ejecución visual real sí requerirá el entorno local cuando se alcance el gate de validación.
