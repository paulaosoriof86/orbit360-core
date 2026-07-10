# Registro control maestro — P0.10 resolución A&S

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `IDENTIDADES_RESUELTAS / PERFIL_FINANCIERO_ASEGUATE_CONFIRMADO / WIRE_P09_IMPLEMENTADO / RUNTIME_LAB_PENDIENTE`

## Fuente real usada

- directorio de aseguradoras GT ya recibido;
- ocho cotizadores/tarifarios Excel;
- tres cotizaciones PDF;
- confirmaciones de Dirección A&S:
  - Banrural = Aseguradora Rural;
  - Columna ya pertenece al directorio;
  - IDs pueden ser internos;
  - AseGuate GE 5% sobre prima neta;
  - AseGuate IVA 12% sobre base gravable.

No se incorporaron contactos, accesos, cuentas, PII ni payloads de los archivos al repositorio.

## Carril A — Prototipo/UX/Claude

Avance:

- requisitos de nombre legal/visible/aliases;
- IDs invisibles y automáticos;
- editor futuro de perfiles financieros;
- simulador de reconciliación;
- lote sin ingreso manual de IDs/fileRefs;
- Academia por rol;
- addendum Claude P0.10.

Pendiente:

- interfaz visual;
- corrección interactiva de aliases;
- visor de perfil financiero;
- lote visual;
- diff y gate visual.

Claude no se solicita todavía.

## Carril B — Backend/contratos

Implementado:

```text
core/tenant-insurer-config-p10.js
core/tenant-source-batch-adapter-p10.js
data/tenant-alianzas-soluciones-insurers-p10.js
tools/orbit360-test-tenant-insurer-config-p10.mjs
tools/orbit360-test-tenant-source-batch-adapter-p10.mjs
tools/orbit360-test-aseguradoras-knowledge-p10-wire.mjs
.github/workflows/orbit360-tenant-insurer-config-p10-smoke.yml
```

También se actualizó:

```text
modules/aseguradoras-knowledge-p09.js
tools/orbit360-integrar-aseguradoras-knowledge-p09-index.mjs
tools/orbit360-test-integrar-aseguradoras-knowledge-p09-index.mjs
```

Cerrado:

- aliases por tenant;
- nombre canónico/visible;
- resolución por archivo;
- ID de directorio o interno estable;
- resolución posterior por ID;
- perfil financiero versionado;
- aplicación aditiva;
- prevención de duplicados;
- once fuentes → seis aseguradoras;
- resolución automática antes del provider;
- contexto reducido sin ficha sensible;
- enriquecimiento financiero antes del plan P0.9;
- orden seguro de scripts;
- cero escritura/habilitación.

Pendiente:

- ejecución visible de CI;
- empalme real en index;
- provider real Drive/upload;
- writer Firestore LAB;
- read model real;
- binding persistido;
- gate.

## Carril C — Fuentes reales

Resuelto:

```text
Banrural = Aseguradora Rural
Cotizador VA = Seguros Columna
AseGuate GE = 5% prima neta
AseGuate IVA = 12% subtotal gravable
```

Reconciliación de ejemplos:

```text
Microbús: 2,508.80
Automóvil: 3,332.00
```

Los importes se usan como casos de validación; no se convierten en constantes del core.

Pendiente:

- reglas reales versionadas;
- mapeo bloque tarifario → plan/vehículo;
- alcance del financiamiento;
- persistencia en LAB;
- segundo gate;
- ejecución secuencial del lote.

## Bloqueos cerrados

No volver a preguntar:

- si Banrural y Rural son la misma aseguradora;
- si Columna corresponde al Cotizador VA;
- quién debe definir IDs;
- que Paula entregue fileRefs o rutas;
- porcentaje/base de gastos AseGuate;
- porcentaje/base de IVA AseGuate para estos productos.

## Referencias autorizadas

Son generadas por backend al cargar/seleccionar archivos. No son un dato manual pendiente del usuario.

## Wire P0.10b

El servicio P0.9 ahora:

1. resuelve la aseguradora por tenant/directorio/alias;
2. bloquea fuentes desconocidas antes del provider;
3. entrega al provider el ID resuelto;
4. conserva un contexto sin contactos, cuentas o accesos;
5. aplica el perfil financiero tenant a reglas revisadas;
6. construye el plan metadata-only;
7. mantiene Cotizador y Comparativo deshabilitados.

## Estado del empalme

```text
integrador actualizado: sí
dry-run por defecto: sí
--apply ejecutado: no
index.html modificado: no
backend protegido modificado: no
Firestore LAB escrito: no
Cotizador habilitado: no
Comparativo habilitado: no
```

## Próxima acción

P0.9e/P0.10c:

1. ejecutar dry-run del integrador contra checkout completo;
2. validar orden y UTF-8;
3. aplicar empalme controlado si pasa;
4. registrar bridge/provider LAB;
5. persistir primera fuente metadata-only;
6. leerla desde read model;
7. construir regla AseGuate con perfil P0.10;
8. construir binding automóvil/microbús;
9. mantener gate cerrado;
10. preparar lote secuencial de once fuentes.
