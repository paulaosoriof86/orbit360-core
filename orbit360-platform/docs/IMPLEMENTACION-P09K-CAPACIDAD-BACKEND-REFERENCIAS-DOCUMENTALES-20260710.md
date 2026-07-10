# IMPLEMENTACIÓN P0.9K — CAPACIDAD BACKEND DE REFERENCIAS DOCUMENTALES

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy.

## Carril actual

Carriles B + C, con impacto reusable documentado para Carril A.

## Necesidad

P0.9j dejó listo el formulario administrativo, pero el frontend no debía conocer rutas locales, archivos montados, enlaces temporales ni credenciales. Faltaba una capacidad backend que:

1. identificara documentos autorizados por tenant/documento;
2. generara referencias opacas;
3. resolviera esas referencias únicamente dentro del backend;
4. entregara disponibilidad al formulario;
5. ejecutara inspectores Excel/PDF ya implementados;
6. mantuviera todo en `training`, metadata-only y con validación humana;
7. no habilitara Cotizador ni Comparativo.

## Implementación

### Registro seguro

Archivo:

```txt
tools/orbit360-document-reference-registry-p09k.mjs
```

Funciones principales:

- escaneo de raíces autorizadas sin seguir symlinks;
- profundidad y cantidad de archivos limitadas;
- matching por nombre lógico del catálogo;
- soporte de mappings privados locales ignorados por Git;
- verificación de que la ruta real esté dentro de una raíz permitida;
- cálculo SHA-256;
- referencia opaca `backend-ref://tenant/documento/version`;
- lookup interno con ruta;
- estado público sin ruta;
- bloqueo por tenant, propósito, expiración y uso único;
- faltantes y ambigüedades como estados honestos.

El registro público nunca incluye `localPath`, `mountedPath`, URL firmada, bytes, base64 o secretos.

### Capacidad backend

Archivo:

```txt
tools/orbit360-document-backend-capability-p09k.mjs
```

Integra:

```txt
registro P0.9k
→ resolver P0.9d
→ bridge/runner P0.9c
→ extractores Excel/PDF
```

Métodos compatibles con el bridge del frontend:

```txt
status()
execute(task, request)
resolveBatchReferences(request)
prepareBatchReferences(request)
resolveSourceReferences(request)
referencesForBatch(request)
```

La respuesta de referencias contiene IDs opacos solamente. La ruta real se utiliza internamente al llamar el runner.

### Comando LAB

Archivo:

```txt
tools/orbit360-document-backend-command-p09k.mjs
```

Comandos:

```txt
status
references
run
```

Configuración:

```txt
ORBIT_DOCUMENT_CATALOG
ORBIT_DOCUMENT_SOURCE_ROOT
ORBIT_DOCUMENT_PRIVATE_REGISTRY
```

Los archivos privados viven bajo rutas ignoradas como:

```txt
_orbit360_private_sources/
*.local.json
*.private.json
```

El comando no imprime rutas locales.

### Catálogo A&S

Archivo:

```txt
orbit360-platform/data/tenant-alianzas-soluciones-source-catalog-p09k.json
```

Contiene las once fuentes ya acordadas:

- 8 Excel;
- 3 PDF;
- 6 aseguradoras;
- IDs internos del tenant;
- país/moneda;
- producto/ramo/variante;
- versión;
- tarea del inspector.

No contiene rutas, PII, tarifas, importes de clientes, binarios ni secretos.

## Preflight real de AseGuate

Se ejecutó fuera del repositorio contra:

```txt
Tasas AseGuate.xlsx
```

Resultado sanitizado:

```txt
registry: ready
tenant: alianzas-soluciones
documentId: ays_aseguate_tarifario_2026_v1
aseguradoraId: ins_gt_aseguradora_guatemalteca
reference: backend-ref opaca
provided: 1/1
missing: 0
containsLocalPaths: false
writeAllowed: false
Cotizador: deshabilitado
Comparativo: deshabilitado
```

El archivo, la ruta y el registro privado no se subieron al repositorio.

Este preflight confirma la resolución real de la primera referencia, pero no equivale todavía a:

- bridge same-origin conectado al navegador;
- dry-run visual desde el formulario;
- persistencia de historial;
- persistencia de conocimiento.

## Seguridad

- No hay `fetch`, XHR o SDK Drive en el frontend.
- No se agregaron credenciales.
- No se modifica `Orbit.store`.
- No se modifica Auth.
- No se modifica Firestore Rules.
- No se siguen symlinks.
- Se bloquean rutas fuera de raíces autorizadas.
- La configuración privada está cubierta por `.gitignore`.
- La ejecución continúa metadata-only.
- País y tenant permanecen explícitos.

## Pruebas

Archivo:

```txt
tools/orbit360-test-document-backend-capability-p09k.mjs
```

Cubre:

- descubrimiento seguro;
- archivo faltante;
- mapping privado autorizado;
- hash;
- referencia opaca;
- lookup interno;
- respuesta sin ruta;
- tenant cruzado;
- comando LAB;
- cero habilitación.

Workflow:

```txt
.github/workflows/orbit360-document-backend-capability-p09k-smoke.yml
```

## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado: sí.
- Debe compartirse con Claude: sí, cuando se solicite la siguiente candidata.
- Módulos impactados: Aseguradoras, Configuración/Integraciones, Importador documental, Cotizador, Comparativo, Academia.
- UX requerida:
  - el usuario ve `Disponible`, `Pendiente de conexión`, `No encontrado` o `Requiere validación`;
  - nunca ve rutas, hashes técnicos completos, backend, LAB o credenciales;
  - seleccionar/cargar documento crea una referencia automáticamente;
  - el formulario no pide copiar IDs ni enlaces;
  - documento encontrado no significa tarifa validada;
  - registrar fuente no habilita producto.
- Academia:
  - diferencia entre archivo, referencia, manifiesto, regla y binding;
  - por qué las rutas no se muestran;
  - cómo interpretar referencias pendientes;
  - cómo reanudar un lote;
  - roles autorizados.
- Riesgo si Claude lo ignora: UI manual, exposición de rutas, falsas integraciones y activación prematura.

## Estado

```txt
registro backend: implementado
capacidad backend: implementada
comando LAB: implementado
catálogo 11 fuentes: implementado
preflight real AseGuate referencia: completado
smoke local: completado
workflow: configurado
bridge navegador/backend real: pendiente
dry-run visual real: pendiente
Firestore LAB: sin escritura
Cotizador/Comparativo: deshabilitados
```

## Siguiente paso

P0.9l:

```txt
host same-origin de comandos
→ inyección segura de OrbitBackendDocumentBridge
→ status visible
→ preview real AseGuate desde formulario
→ dry-run real training
→ historial metadata-only
→ recarga/read model
```
