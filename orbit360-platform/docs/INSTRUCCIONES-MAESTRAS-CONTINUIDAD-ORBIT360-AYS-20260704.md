# Instrucciones maestras de continuidad — Orbit 360 A&S

Fecha: 2026-07-04  
Actualización metodológica: 2026-07-12  
Proyecto: Migración A&S — Orbit 360  
Repo: `paulaosoriof86/orbit360-core`  
Rama backend activa: `ays/backend-tenant-lab-v99-20260703`  
PR vigente: #5, draft, sin merge y sin deploy.

## Propósito

Este archivo debe leerse al iniciar cada conversación nueva de Orbit 360. Su función es conservar contexto, metodología, reglas, lógicas, histórico y plan de trabajo para que Paula no tenga que repetirlos.

## Lectura obligatoria inicial

Antes de auditar, empalmar, modificar backend, generar prompts o trabajar sobre un nuevo candidato, leer:

- este archivo;
- `docs/RAMA-ACTIVA-OBLIGATORIA-AYS-BACKEND.md`;
- `docs/METODOLOGIA-CANONICA-PAQUETES-CLAUDE-AUDITORIA-RETROALIMENTACION-20260712.md`;
- `CHANGELOG.md`;
- `README.md`;
- `docs/BITACORA-CAMBIOS.md`;
- `docs/BITACORA-ERRORES.md`;
- `docs/PENDIENTES-Y-MEJORAS.md`;
- `docs/PLAN-IMPLEMENTACION-PARSER-FUENTES-SEPARADAS-AYS-20260704.md`;
- `docs/NOTA-PARA-CLAUDE-AVANCES-BACKEND-MIENTRAS-CORRIGE-CANDIDATO-20260704.md`;
- auditorías y pendientes Claude más recientes.

## Regla inicial de cada conversación

Asumir y verificar:

- proyecto: Orbit 360 A&S;
- repo correcto: `paulaosoriof86/orbit360-core`;
- rama backend activa: `ays/backend-tenant-lab-v99-20260703`;
- PR vigente: #5;
- no main, no merge, no deploy;
- no datos reales en código ni seed;
- no reemplazar backend con ZIP de prototipo.

## Qué es Orbit 360

Orbit 360 es una plataforma 360 comercializable para intermediarios de seguros. Debe ser greenfield, white-label, multi-tenant y configurable por tenant. A&S es el primer tenant, no una regla hardcodeada del producto.

## Tenant A&S

El tenant vigente es `alianzas-soluciones`. Las lógicas propias de A&S se documentan como tenant/configuración. Las mejoras generalizables se documentan para Claude y para el prototipo base comercializable.

## Separación de responsabilidades

Claude trabaja principalmente frontend, UX, módulos visuales, navegación, diseño y smoke visual real.

ChatGPT/Codex trabaja repo, backend, Firestore LAB, Auth LAB, tenant, `Orbit.store`, reglas, importadores backend, parser, validadores, pipeline de empalme, auditoría forense y documentación técnica.

Claude no debe pisar backend. ChatGPT/Codex no debe aceptar candidato sin auditoría forense.

## Backend protegido

No reemplazar ni sobrescribir:

- `orbit360-platform/data/store.js`;
- `orbit360-platform/data/store-firestore-lab.local.js`;
- `orbit360-platform/core/backend-lab-loader.js`;
- `orbit360-platform/core/backend-lab-init.js`;
- `orbit360-platform/core/backend-lab-security-guard.js`;
- `firestore.rules`;
- scripts `tools/orbit360-*` de backend, preflight, plan, preview, diff, pipeline, manifest y normalización.

## Metodología ágil

Trabajar por bloques grandes, útiles y documentados. Reducir al mínimo lo manual para Paula. Ejecutar directamente lo que sea posible. Solo pedir intervención manual cuando sea indispensable.

## Errores metodológicos que no deben repetirse

- Reiniciar contexto desde cero.
- Usar `main` para continuidad backend.
- Usar rama de prototipo para backend.
- Empalmar ZIP completo sin auditoría.
- Pisar backend protegido.
- Entregar ZIPs si Paula no los pidió.
- Hacer manualmente lo que puede automatizarse.
- Afirmar que funciona sin verificar.
- Ocultar límites de verificación.
- No actualizar pendientes después de auditoría.
- Mezclar frontend Claude con backend ChatGPT/Codex.
- Hardcodear A&S o datos reales.
- Mezclar financiero histórico con cobros/recaudos.
- Crear clientes/pólizas desde documentos o bancos sin confirmación.
- Creer una afirmación de Claude sin comprobar archivo, función, comportamiento y prueba.
- Generar paquetes acumulados cuando no existe un P0 real.
- Volver a pedir trabajo que ya está implementado y verificado.

## Regla para cada nuevo candidato Claude

Cuando Paula entregue un nuevo ZIP/prototipo:

1. No empalmar de inmediato.
2. Auditar como mini-release.
3. Identificar ZIP, SHA256, versión e inventario.
4. Comparar primero el delta físico contra la candidata inmediatamente anterior.
5. Revisar `index`, `core`, `modules`, `data`, `styles` y `docs`.
6. Validar JS.
7. Comprobar cada afirmación de Claude mediante archivo + función + comportamiento + prueba + resultado.
8. Revisar rutas del menú contra módulos.
9. Buscar accesos directos a almacenamiento operativo.
10. Buscar textos técnicos visibles y verificar la segmentación por rol.
11. Buscar fechas fijas, impuestos y defaults peligrosos.
12. Revisar importador, país/moneda, pólizas/cartera, primas, cobros, planillas, documentos, PWA y documentación.
13. Comparar contra pendientes previos y cambios locales reutilizables.
14. Clasificar: implementado/verificado, parcial, pendiente, regresión, no demostrado, fuera de alcance Claude o superado/no repetir.
15. Separar carriles A/B/C y ownership antes de generar instrucciones.
16. Clasificar severidad P0/P1/P2 según la metodología canónica.
17. Documentar resueltos, pendientes, regresiones y nuevos hallazgos.
18. Pasar por pipeline: preflight, plan, preview, diff y revisión manual.
19. Empalmar solo si es aditivo y no pisa backend protegido.
20. Aplicar el gate de paquete:

```txt
P0 real presente
→ un único paquete pequeño exclusivo para Claude
→ no empalme completo
→ continuar B/C en paralelo cuando sea seguro.

P0 = 0
→ no generar paquete
→ documentar P1/P2
→ empalmar selectivamente
→ actualizar baseline
→ continuar operación A&S.
```

Los detalles, formato de paquete, validación de afirmaciones y reglas contra falsos positivos están en:

```txt
docs/METODOLOGIA-CANONICA-PAQUETES-CLAUDE-AUDITORIA-RETROALIMENTACION-20260712.md
```

## Documentación obligatoria

Toda mejora, corrección, bug, hallazgo, cambio o pendiente debe documentarse con:

- fecha;
- módulo/área;
- síntoma o necesidad;
- esperado;
- causa raíz si aplica;
- archivo/función;
- fix o mejora;
- impacto comercializable;
- estado;
- si aplica al prototipo base.

Toda mejora hecha directamente por ChatGPT/Codex que aplique al prototipo debe documentarse también para Claude, indicando si es reusable, específica A&S, backend protegido o ya presente en la candidata.

## Lógicas comerciales obligatorias

- País/moneda: GT -> GTQ, CO -> COP.
- Si falta país o moneda confiable: requiere validación.
- No asumir Guatemala por defecto para escritura.
- Producción, metas y comisiones se calculan sobre prima neta recaudada.
- Separar prima neta, gastos, impuestos y prima total.
- Vigente/Por renovar generan cartera.
- Cancelada/Vencida/Anulada/Rechazada son histórico.
- Cartera solo incluye cobros pendientes de pólizas vigentes o por renovar del año actual.
- Cobros/recaudos no son `finmovs`.
- Financiero histórico solo alimenta `finmovs` históricos.
- Estados bancarios sirven para conciliación, no para crear clientes/pólizas/cobros.
- Documentos soporte pueden proponer datos, pero no crear/modificar clientes o pólizas sin confirmación.
- Planillas de comisión deben leerse desde filas reales, no simularse.

## Importador y parser por fuentes separadas

Tipos de fuente autorizados:

- clientes;
- aseguradoras;
- polizas;
- vehiculos;
- cobros_realizados;
- planilla_aseguradora;
- planilla_comisiones;
- estado_cuenta_bancario;
- financiero_historico;
- siniestros;
- documentos_soporte;
- configuracion_catalogo.

Cada fuente debe tener contrato real, preview, validación, dry-run y trazabilidad. Si un tipo visible no tiene contrato, debe ocultarse, bloquearse o quedar como pendiente, nunca simularse como operativo.

## Estado actual

El PR #5 contiene backend LAB protegido, pipeline de empalme seguro, auditorías Claude, protección de artefactos locales, plan parser por fuentes separadas, validador de manifests, normalizador país/moneda y nota para Claude con avances backend.

La candidata y el paquete Claude vigentes deben tomarse siempre de la auditoría más reciente; las referencias históricas de paquetes anteriores no constituyen baseline operativo.

## Regla final

Antes de actuar, leer. Antes de empalmar, auditar. Antes de afirmar, verificar. Antes de cambiar backend, confirmar rama. Antes de tocar datos, validar fuente. Antes de entregar a Claude, documentar. Antes de crear paquete, comprobar P0. Antes de cerrar, dejar trazabilidad y continuar el carril operativo.