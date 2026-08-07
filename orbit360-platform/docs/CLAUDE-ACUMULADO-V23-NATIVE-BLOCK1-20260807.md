# Acumulado Claude — patrón reusable v23 · artefacto runtime nativo

Fecha: 2026-08-07  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrones reutilizables detectados

### 1. Artefacto runtime nativo/versionado + observabilidad compartida por API

Cuando un validator necesita reutilizar una capacidad de otro gate:
- extraer la capacidad transversal a una API/librería explícita;
- crear el nuevo artefacto runtime como fuente estable;
- compilar/importar exactamente el mismo archivo que luego se ejecutará;
- prohibir generación por regex/slices/replace sobre código ya generado;
- mantener ledger de hallazgos de otros módulos sin convertirlos en blockers fuera de su bloque.

### 2. Sucesión explícita de owner del mismo gate

Si el preflight canónico todavía exige un owner histórico ya cerrado:
- no modificar producto/PWA/Service Worker para recrear tokens antiguos;
- comprobar lifecycle, freeze y HEAD actuales;
- preservar el owner previo como histórico;
- registrar una versión posterior del mismo `gateId`;
- sincronizar router canónico, engine, lifecycle, preflight, workflows, documentación y Academia;
- validar source sin request y runtime solo con request nuevo.

Caso reusable v23: owner histórico `1.0.40` CSS delivery → owner canónico candidato `1.0.41` native Block1, con M1/M2 históricos preservados como cerrados.

## Qué puede replicar Claude

- diseño conceptual de un gate con scope de bloque explícito;
- separación `blocking routes` vs `nonblocking ledger`;
- patrón event-driven: observer armado antes de navegar y señal explícita de render;
- clasificación timeout post-ready vs verdadero not-ready;
- pruebas que seleccionan targets dentro del scope efectivo del usuario;
- patrón de universo read-only con categorías objetivas y `requiere_validación` no excluible;
- sucesión de owner/version cuando un preflight queda obsoleto;
- estados honestos de STOP/PASS;
- actualización coordinada de owner, contrato, preflight, workflow, documentación y Academia.

## Qué NO se entrega a Claude

No compartir:
- secretos, tokens, service accounts;
- IDs/nombres/correos/datos reales A&S;
- configuraciones Firebase reales sensibles;
- rutas de almacenamiento protegidas o credenciales;
- contenido de `Orbit.store`, Auth, Rules o backend protegido como implementación a sobrescribir;
- adjudicación concreta de registros A&S.

## Impacto UX/prototipo

No hay rediseño visual v23. El prototipo debe conservar:
- Cliente 360 y Aseguradoras como flujos separados pero pertenecientes al mismo cierre Block1;
- relaciones vacías con mensajes honestos;
- Aseguradoras en solo lectura para Asesor cuando corresponda;
- navegación móvil coherente con scope;
- cero copy técnico en UI cliente.

## Impacto Academia

Debe explicarse:
- diferencia entre defecto de producto, `VALIDATOR_STALE` y fallo de pipeline;
- gates por bloque y ledger no bloqueante;
- observabilidad por eventos;
- sucesión de owner canónico sin regresión de producto;
- por qué una discrepancia de universo no se corrige borrando/reimportando datos para satisfacer una cifra.

## Riesgo si se ignora

Volver a transformar artefactos generados, hacer que producto retroceda para satisfacer owners históricos o mezclar blockers de módulos posteriores puede reintroducir ciclos de STOP, falsos defectos y uso innecesario de entornos de riesgo para depurar el validator.
