# Orbit 360 A&S — P0.9j Formulario administrativo seguro del lote

Fecha: 2026-07-10  
Módulo: Aseguradoras  
Carriles: B + C, con traducción al Carril A  
Estado: implementado en rama; no aplicado todavía en runtime LAB real

## 1. Necesidad

P0.9i cerró el contrato de preview, dry-run/reanudación y persistencia separada del historial, pero todavía no existía una interfaz operable. No era aceptable resolverlo pidiendo a la usuaria que copiara rutas, IDs o referencias técnicas.

## 2. Resultado esperado

Dentro de Aseguradoras, un usuario autorizado debe poder:

1. escoger dry-run o reanudación;
2. seleccionar fuentes por nombre, aseguradora, producto y versión;
3. registrar un motivo;
4. generar un preview;
5. ver disponibilidad de referencias sin ver su valor;
6. revisar fingerprint y frase de confirmación;
7. ejecutar sin persistir conocimiento;
8. revisar resultados;
9. guardar por separado únicamente el historial metadata-only.

## 3. Causa raíz

Las referencias backend son necesarias para que el runner abra un archivo autorizado, pero no deben entrar al DOM, al store, al historial ni a campos editables. El contrato P0.9i aceptaba referencias internamente, pero faltaba una frontera que las mantuviera opacas durante toda la operación visual.

## 4. Implementación

### 4.1 Broker efímero

Archivo:

```text
core/aseguradoras-source-reference-broker-p09j.js
```

Responsabilidades:

- consulta una capacidad backend inyectada;
- acepta métodos compatibles como `resolveBatchReferences` o `prepareBatchReferences`;
- solicita referencias por tenant, lote y documentos;
- fuerza `returnPaths=false`, `returnUrls=false`, `returnRawBytes=false` y `returnBase64=false`;
- guarda referencias únicamente en memoria efímera;
- emite un ticket con vencimiento de cinco minutos;
- limita la memoria a veinte tickets;
- invalida el ticket después de una ejecución correcta;
- bloquea actor, tenant, lote o selección de documentos diferentes;
- entrega a la UI solo `provided`, `missing` y `referenceValueExposed=false`.

El broker no usa `fetch`, `XMLHttpRequest`, `localStorage`, `sessionStorage` ni `Orbit.store`.

Sin bridge backend retorna `BACKEND_REQUIRED`. Puede construir un preview informativo, pero `executable=false`.

### 4.2 Formulario visible

Archivo:

```text
modules/aseguradoras-batch-admin-form-p09j.js
```

El formulario se monta después del panel P0.9f dentro de la ruta `#/aseguradoras`.

Funciones visibles:

- selector Dry-run / Reanudar pendientes;
- lista de fuentes configuradas, sin IDs manuales;
- motivo obligatorio;
- preview;
- disponibilidad de referencias;
- fingerprint;
- frase `EJECUTAR DRY-RUN` o `REANUDAR DRY-RUN`;
- resumen de ejecución;
- persistencia separada del historial mediante dos confirmaciones y la frase `GUARDAR HISTORIAL`.

El actor se deriva de `Orbit.auth.user()` y del tenant activo. Se conserva el rol activo y los roles asignados cuando estén disponibles.

### 4.3 Permisos

Preview y dry-run:

- SuperAdmin;
- Dirección;
- Admin;
- AdminTenant;
- Operativo.

Persistencia del historial:

- SuperAdmin;
- Dirección;
- Admin;
- AdminTenant.

Asesor no puede operar el lote. Operativo puede revisar y ejecutar dry-run, pero no guardar historial global.

### 4.4 Separación de persistencias

El formulario nunca llama persistencia de manifiestos, propuestas, reglas, presentaciones o bindings.

La ejecución conserva:

```text
knowledgePersisted: false
historyPersisted: false
enablesCotizador: false
enablesComparativo: false
```

El historial se guarda después mediante el contrato P0.9i/P0.9h y requiere confirmación independiente.

## 5. Bootstrap

`core/aseguradoras-runtime-bootstrap-p09f.js` fue actualizado a `p09j-v1`.

Orden final relevante:

```text
P0.9g orquestador
→ P0.9h historial
→ P0.9i acciones administrativas
→ P0.9j broker de referencias
→ panel de conocimiento
→ formulario P0.9j
```

El preflight diferencia:

- broker cargado;
- método backend de referencias disponible;
- formulario cargado.

Esto impide confundir “contrato instalado” con “integración backend conectada”.

## 6. Seguridad y privacidad

No se muestran ni persisten:

- rutas locales o montadas;
- referencias `drive://`, `upload://` o `backend-ref://`;
- URLs firmadas;
- tokens;
- credenciales;
- binarios;
- base64;
- texto completo extraído;
- datos personales de las fuentes.

El formulario no permite escribir IDs de aseguradoras o documentos.

## 7. Pruebas

Archivos:

```text
tools/orbit360-test-aseguradoras-source-reference-broker-p09j.mjs
tools/orbit360-test-aseguradoras-batch-admin-form-p09j.mjs
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs
```

Escenarios:

- referencias disponibles sin exposición;
- ausencia de backend;
- ticket consumido;
- actor Dirección obtenido desde Auth;
- fuentes visibles sin IDs manuales;
- preview y fingerprint;
- confirmación exacta;
- ejecución sin conocimiento;
- historial separado;
- cero red directa;
- cero almacenamiento cliente;
- cero habilitación.

Workflow:

```text
.github/workflows/orbit360-aseguradoras-batch-form-p09j-smoke.yml
```

## 8. Archivos protegidos

No se modificaron:

```text
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
core/auth.js
firestore.rules
```

## 9. Impacto

- Aseguradoras ya tiene una ruta visual operable para el lote.
- La usuaria no debe preparar rutas, IDs ni referencias.
- El backend sigue siendo la única fuente autorizada de referencias.
- La UI no puede persistir conocimiento accidentalmente.
- Cotizador y Comparativo siguen deshabilitados.

## 10. Estado honesto

```text
broker P0.9j: implementado
formulario P0.9j: implementado
bootstrap: actualizado
smokes/workflow: configurados
index.html aplicado: no
bridge de referencias real: no conectado
preview real: no ejecutado
dry-run real: no ejecutado
historial Firestore LAB: no persistido
conocimiento: no persistido
```

## 11. Siguiente acción

P0.9k debe preparar la capacidad backend de referencias para Drive/upload y el contrato de comandos LAB, sin introducir endpoints, credenciales o rutas en frontend. Después se podrá ejecutar el primer preview real y el dry-run de AseGuate.