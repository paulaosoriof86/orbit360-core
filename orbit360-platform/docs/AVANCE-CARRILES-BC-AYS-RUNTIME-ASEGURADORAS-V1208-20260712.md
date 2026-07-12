# AVANCE CARRILES B/C — RUNTIME ASEGURADORAS A&S v1.208

Fecha: 2026-07-12  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy, producción ni `main`.

## 1. Carril actual

```txt
Carril B — contratos, seguridad, runtime y Orbit.store
Carril C — fuentes reales A&S, configuración tenant y bindings
Carril A — Claude continúa de forma paralela sobre su última candidata
```

Este bloque no modifica el prototipo general ni traslada tasas, reglas, links o entrenamiento A&S a Claude.

## 2. Auditoría anti-reproceso

Antes de cambiar código se verificaron archivos físicos y documentación viva. Ya existen y no deben reconstruirse:

- contrato tarifario multiproducto P0.6;
- extractor numérico Excel P0.6b;
- reconciliación regla ↔ cotización P0.6c;
- adapter PDF reusable P0.7;
- binding gate P0.8;
- runtime documental y read model P0.9;
- snapshots y persistencia LAB P0.9e;
- bootstrap, primera fuente y panel P0.9f;
- lote controlado de 11 fuentes P0.9g;
- historial, acciones y formulario administrativo P0.9h–P0.9j;
- observador y reportes sanitizados P0.9n;
- configuración de aseguradoras tenant P0.10;
- plan de bindings AseGuate P0.10c;
- contratos Cotizador/Comparativo v1.203.

También se confirmó que ocho cotizadores Excel reales ya fueron inspeccionados fuera del repositorio y que el lote A&S registra 11 fuentes de seis aseguradoras. No corresponde repetir extracción ni inventario.

## 3. Hallazgo real

### Necesidad

El `index.html` vivo carga los contratos v1.203 y los bridges visuales de Aseguradoras, pero no carga el guard LAB ni el bootstrap P0.9. Por eso el trabajo P0.6–P0.10 existía físicamente pero no quedaba enlazado a la SPA.

### Esperado

En modo:

```txt
orbitBackend=firestore-lab
+ tenant=alianzas-soluciones
```

Aseguradoras debe poder cargar el runtime documental A&S, conservando:

- seguridad;
- snapshots;
- provider/bridge;
- panel e historial;
- segundo gate cerrado;
- Cotizador y Comparativo deshabilitados hasta validación.

En cualquier otro tenant o en el prototipo general, ese runtime no debe cargarse.

### Causa raíz

El integrador P0.9 existía, pero su `--apply` nunca fue ejecutado sobre el index. Editar el index monolítico directamente seguía siendo riesgoso por codificación y regresiones.

## 4. Fix aplicado

Archivo:

```txt
orbit360-platform/modules/aseguradoras-v1202-resources-bridge.js
```

Cambio aditivo:

1. detecta contexto de backend y tenant;
2. fuera de A&S LAB devuelve `not_applicable`;
3. en A&S LAB carga primero `core/backend-lab-security-guard.js`;
4. después carga `core/aseguradoras-runtime-bootstrap-p09f.js`;
5. inicia el bootstrap ya implementado;
6. emite estado sanitizado;
7. mantiene `enablesCotizador: false` y `enablesComparativo: false`;
8. no modifica `index.html` ni archivos protegidos.

Commit:

```txt
89529b63cb6fccf261ac37401565ecc1df19310e
```

## 5. Copy visible corregido

En el mismo bridge se tradujeron estados internos:

```txt
sin_sensibles      → Sin recursos sensibles registrados
backend_required   → Conexión segura pendiente
default-deny       → Pendiente de configuración validada
```

No se expone terminología de arquitectura al usuario final.

## 6. Normalización documental AseGuate

### Hallazgo

El lote y la primera fuente usan IDs canónicos:

```txt
ays_aseguate_tarifario_2026_v1
ays_aseguate_cotizacion_auto_ejemplo_v1
ays_aseguate_cotizacion_microbus_ejemplo_v1
```

El plan P0.10c utilizaba otra convención `doc_ays_*`. Aunque el constructor actual no consume esos IDs para el cálculo, mantener dos convenciones podía producir fuentes falsamente ausentes cuando se conectara persistencia/binding real.

### Fix

Archivo:

```txt
orbit360-platform/data/tenant-alianzas-soluciones-binding-plan-p10c.js
```

Se unificaron los IDs con el lote y se conservó:

```txt
enabled: false
enablesCotizador: false
enablesComparativo: false
requiresHumanValidation: true
requiresSecondGateForEnablement: true
```

Commit:

```txt
5131b45ed5570db2fa9929356382463b89e59f2e
```

Se amplió la prueba del binding para verificar:

- IDs canónicos;
- automóvil y microbús separados;
- no herencia de regla;
- targets deshabilitados;
- segundo gate obligatorio.

Commit de prueba:

```txt
bc394a5f6501656522b2524a9bfcb513e83ce510
```

## 7. Validación automatizada añadida

Archivos:

```txt
orbit360-platform/tools/orbit360-test-ays-runtime-link-v1208.mjs
.github/workflows/orbit360-ays-runtime-link-v1208-smoke.yml
```

Comprueban:

- sintaxis del bridge;
- guard antes del bootstrap;
- carga exclusiva de A&S LAB;
- cero carga en otro tenant;
- cero tasas genéricas;
- cero `localStorage` operativo;
- cero Firestore directo;
- Cotizador/Comparativo no habilitados;
- copy visible operativo;
- IDs documentales canónicos;
- segundo gate cerrado.

Commits:

```txt
6084446e15b6f023fa00567f533b3ef66818d24c
280b7125802bbe92e8da006b520a0de15aae0d35
```

El conector no mostró checks asociados al commit. Por tanto, el workflow queda configurado pero no se declara aprobado hasta contar con resultado visible o validación local equivalente.

## 8. Estado verificado de A&S

### Ya trabajado — no reprocesar

```txt
contratos tarifarios: implementados
extractor Excel: implementado
ocho cotizadores reales inspeccionados: sí
adapter PDF: implementado
tres PDFs reales auditados: sí
inventario de 11 fuentes: configurado
configuración de seis aseguradoras: registrada
perfil financiero AseGuate: confirmado tenant
plan auto/microbús: implementado
segundo gate: cerrado
runtime A&S: ahora enlazado desde la SPA
```

### Todavía pendiente — cierre real

```txt
workflow/check v1.208 visible
navegador LAB con Auth/rol activo
provider/referencia backend autorizada
lectura training desde formulario
preview real
persistencia metadata-only de primera fuente
recarga y read model
reconciliación de reglas/presentaciones reales
binding auto y microbús persistidos
smoke desktop/móvil
segundo gate, únicamente después de validación humana
```

Ninguna de estas tareas justifica volver a extraer los ocho libros ni rediseñar los contratos.

## 9. Frontera Claude

### Replicable para próxima sincronización

- estados visibles de negocio, no códigos internos;
- patrón de carga condicionada por capacidad/configuración tenant;
- distinguir `configurada`, `validada`, `persistida`, `lista para segundo gate` y `habilitada`;
- no afirmar guardado/envío/habilitación antes de confirmación real.

### Exclusivo A&S — no compartir con Claude

- IDs y nombres de fuentes A&S;
- aseguradoras y aliases reales;
- perfil financiero AseGuate;
- reglas, tasas, documentos y variantes;
- referencias backend;
- lote de 11 fuentes;
- bindings automóvil/microbús.

## 10. Siguiente acción

Ejecutar una validación LAB consolidada del runtime enlazado:

```txt
Aseguradoras
→ runtime P0.9
→ guard y snapshots
→ formulario documental
→ referencia backend autorizada
→ lectura training AseGuate
→ preview
→ historial
→ recarga/read model
```

No persistir reglas ni habilitar Cotizador/Comparativo antes de cerrar esta validación y revisar las propuestas contra las fuentes ya procesadas.
