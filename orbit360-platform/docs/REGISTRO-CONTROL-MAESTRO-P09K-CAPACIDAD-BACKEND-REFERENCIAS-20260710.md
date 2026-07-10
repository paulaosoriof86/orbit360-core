# REGISTRO DE CONTROL MAESTRO — P0.9K

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Carril actual

- A — Prototipo/Claude/Academia: patrón acumulado; todavía no solicitar candidata.
- B — Backend protegido: capacidad aditiva implementada sin tocar archivos protegidos.
- C — Fuente real: primera referencia AseGuate resuelta fuera del repo.

## Avance visible

Se implementó la frontera que faltaba entre archivos autorizados y el formulario P0.9j:

```txt
catálogo tenant
→ raíz autorizada o mapping privado
→ registro backend
→ referencia opaca
→ resolver P0.9d
→ runner P0.9c
→ manifest metadata-only
```

## Archivos creados

```txt
tools/orbit360-document-reference-registry-p09k.mjs
tools/orbit360-document-backend-capability-p09k.mjs
tools/orbit360-document-backend-command-p09k.mjs
tools/orbit360-test-document-backend-capability-p09k.mjs
orbit360-platform/data/tenant-alianzas-soluciones-source-catalog-p09k.json
.github/workflows/orbit360-document-backend-capability-p09k-smoke.yml
orbit360-platform/docs/IMPLEMENTACION-P09K-CAPACIDAD-BACKEND-REFERENCIAS-DOCUMENTALES-20260710.md
orbit360-platform/docs/PAQUETE-SUPER-ACUMULADO-CLAUDE-DESDE-CANDIDATA-20260708-EN-CONSTRUCCION.md
```

## Decisiones

1. Las once fuentes tienen catálogo backend separado del catálogo visual.
2. El catálogo no contiene rutas.
3. Los nombres de carga arbitrarios se resuelven mediante mapping privado ignorado por Git.
4. La referencia pública es opaca.
5. La ruta real solo existe dentro del registro backend.
6. El actor y tenant se validan antes de entregar referencias.
7. `training` sigue siendo el propósito por defecto.
8. P0.9k no persiste conocimiento ni historial.
9. P0.9k no habilita Cotizador o Comparativo.
10. Claude se solicitará después de frontera visual/runtime real, no por antigüedad de sesiones.

## Fuente real usada

```txt
Tasas AseGuate.xlsx
```

Uso:

- descubrimiento dentro de raíz autorizada;
- hash;
- referencia opaca;
- disponibilidad 1/1;
- cero ruta en salida.

No se subió el archivo ni su ruta.

## Pendientes documentados

- host same-origin del capability;
- inyección segura del bridge;
- preview real desde formulario;
- dry-run real del extractor;
- historial metadata-only en Firestore LAB;
- recarga/read model;
- lote de once fuentes;
- bindings AseGuate;
- segundo gate;
- smoke visual;
- candidata Claude súper acumulada.

## Criterio para llamar a Claude

No llamar todavía.

Revisar después de:

```txt
P0.9l host/bridge
+ primer preview real
+ primer dry-run real
+ historial visible tras recarga
+ smoke visual de Aseguradoras
```

Cuando corresponda, entregar paquete acumulado desde la candidata `2026-07-08T183042.881`, no un delta parcial.

## Siguiente acción

P0.9l:

```txt
host local/same-origin seguro
→ capability P0.9k
→ bridge navegador
→ preview real AseGuate
→ dry-run training
→ historial separado
```

## Estado

```txt
P0.9k: implementado
preflight referencia real: completado
smoke local: completado
workflow GitHub: configurado
CI visible: pendiente
bridge visual: pendiente
Firestore writes: no
Cotizador/Comparativo: deshabilitados
```
