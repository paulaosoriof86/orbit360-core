# CIERRE — FIX CANÓNICO DE SHELL MÓVIL, RC1, CLOUD/CLAUDE Y ACADEMIA

Fecha: 2026-08-03  
Producto visible futuro: Gravicentra Insurance  
Nombre técnico histórico preservado: Orbit 360  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open  
Candidata base validada: `267f7231b46d65b80c167f54567a67503b6a6793`  
Fix de producto: `12a52de72f541cf39aae3556fd52a2d444d57b17`

## 1. Bloque y clasificación

```text
bloque: revisión visual posterior a Gate 7.11
clasificación: FUNCTIONAL_DEFECT
owner: Shell/Topbar responsive
alcance: frontend compartido, tenant-neutral
estado: IMPLEMENTADO / VALIDACIÓN ESTÁTICA FOCALIZADA EN CURSO
datos: sin cambios
backend: sin cambios
reimportación: no
Hosting/producción: no ejecutados
```

No corresponde clasificar este hallazgo como `VALIDATOR_STALE`, `DATA_CONTRACT_FAILURE`, `ENVIRONMENT_FAILURE`, `PIPELINE_MECHANISM_FAILURE` ni `SECURITY_FAILURE`. La evidencia visual mostró un defecto funcional reproducible del shell compartido.

## 2. Necesidad y comportamiento esperado

En viewport móvil, Cliente 360, Pólizas y Leads mostraban el encabezado oscuro parcialmente oculto debajo del buscador superior. Ops restringido no mostraba el mismo solapamiento porque su composición visible era distinta, pero dependía del mismo shell.

Comportamiento esperado:

- topbar móvil de dos filas completamente visible;
- buscador en la segunda fila;
- contenido, sidebar y overlay comienzan después de la altura real del topbar;
- mismo comportamiento para cualquier módulo y tenant;
- escritorio y tableta conservan su composición vigente.

## 3. Causa raíz

El token compartido `--topbar-h` permanecía en `56px`, mientras la composición móvil efectiva utilizaba dos filas. `#shell`, `#sidebar` y `.sb-overlay` seguían calculando su posición con la altura estándar de una fila. El encabezado del módulo comenzaba antes de terminar el chrome móvil y quedaba cubierto.

No era un defecto de Cliente 360, Pólizas ni Leads. Corregir cada módulo habría creado tres parches duplicados, deuda y divergencia entre tenants.

## 4. Implementación canónica

Archivo propietario modificado:

```text
orbit360-platform/styles/base.css
```

Cambio:

- define `--topbar-h:104px` únicamente en móvil `max-width:560px`;
- permite que `.topbar` use dos filas sin recorte;
- ubica `.tb-search` como segunda fila de ancho completo;
- hace que `#shell`, `#sidebar` y `.sb-overlay` consuman el mismo token;
- preserva el owner compartido del shell.

### Regla antisupertparche

El correctivo:

- no crea bridge por módulo;
- no crea CSS para A&S;
- no hardcodea tenant, marca, usuario, país o datos;
- no cambia Cliente 360, Pólizas, Leads ni Ops;
- no reemplaza el frontend;
- no toca `Orbit.store`, Auth, Firestore, reglas, adaptadores o writers;
- no crea una versión paralela del producto.

Es un cambio transversal en el owner correcto y debe beneficiar al prototipo comercializable y a todos los tenants.

## 5. Validación y gate

Validador agregado:

```text
tools/orbit360-validar-shell-mobile-rc1-v20260803.mjs
```

Workflow estático, sin secrets ni deploy:

```text
.github/workflows/orbit360-shell-mobile-rc1-static-v20260803.yml
```

Secuencia obligatoria del workflow:

1. `node tools/orbit360-validar-gate-contracts-v20260717.mjs block7-canonical-runtime-cumulative-visual-lab-v20260801`;
2. validación del owner Shell/Topbar;
3. comprobación de delta permitido;
4. publicación de evidencia sanitizada.

Criterios:

- owner canónico en `base.css`;
- breakpoint móvil explícito;
- un solo token de altura;
- topbar, buscador, shell, sidebar y overlay alineados;
- cero hardcode A&S;
- llaves CSS balanceadas;
- cero archivos fuera del alcance autorizado.

El Gate 7.11 anterior no se repite. Después del PASS estático solo corresponde la comprobación visual focalizada de las tres vistas afectadas.

## 6. Cloud / Claude — paquete reusable obligatorio

Clasificación:

```text
REPLICABLE_CLAUDE_INMEDIATO
ACADEMIA_ACTUALIZAR
```

No contiene:

- datos reales;
- secretos;
- configuración Firebase;
- IDs de usuarios;
- credenciales;
- writers o backend protegido;
- lógica exclusiva de A&S.

### Instrucción para Cloud/Claude

Aplicar el patrón en el shell compartido del prototipo comercializable:

> Cuando el chrome responsive cambia de una a varias filas, su altura debe existir como un único token consumido por topbar, contenido, navegación lateral, overlays y cualquier elemento fijo. No corregir offsets dentro de cada módulo. La regla debe ser tenant-neutral, responsive y verificable por contrato.

### Estado de sincronización

```text
implementado en rama canónica: sí
documentado en repositorio: sí
paquete reusable definido: sí
enviado externamente a Cloud/Claude: no todavía
deploy Cloud/Hosting: no
```

El estado `NO_ENVIADO` debe permanecer visible. No se declarará sincronización externa sin evidencia. Este ítem deberá integrar el próximo delta Cloud/Claude, sin bloquear el cierre productivo de A&S.

## 7. Academia — actualización derivada

La Academia debe incorporar este caso en seguridad operativa y mantenimiento de producto:

### Objetivo de aprendizaje

Distinguir entre:

- defecto funcional compartido;
- defecto de un módulo;
- validador obsoleto;
- fallo de datos;
- fallo de seguridad.

### Caso pedagógico

Un encabezado oculto en tres módulos no implica tres bugs. Si todos consumen el mismo shell, se diagnostica el owner compartido antes de parchear pantallas individuales.

### Principios que debe enseñar

- corregir causa raíz en el owner exacto;
- evitar overlays y bridges temporales cuando existe un propietario canónico;
- separar configuración de tenant del core;
- probar rol × viewport × ruta;
- no tocar datos para corregir visualización;
- documentar la diferencia entre implementación local, paquete reusable y sincronización externa efectiva;
- un fix de A&S solo es aceptable como producto si también es útil para el tenant genérico.

### Roles a los que aplica

- Dirección: entiende impacto, aprobación visual y release;
- Operativo: identifica defectos de composición sin solicitar reimportación;
- Asesor: reconoce restricciones honestas y navegación móvil;
- Administración técnica: clasifica owner, gate y replicabilidad.

## 8. Multi-tenant y comercialización

Este cambio fortalece la arquitectura comercializable porque:

- el chrome es único para todos los tenants;
- la altura depende del viewport, no de A&S;
- las marcas cliente permanecen en configuración white-label;
- cualquier módulo futuro hereda el offset correcto;
- una mejora del core se entrega una sola vez y se activa para todos.

A&S sigue siendo el primer tenant y prioridad de salida, pero no se crea un fork ni una solución local exclusiva.

## 9. Rollback exacto

```text
revertir commit: 12a52de72f541cf39aae3556fd52a2d444d57b17
archivo afectado: orbit360-platform/styles/base.css
backend rollback: no aplica
data rollback: no aplica
```

## 10. Frontera siguiente única

```text
PASS estático focalizado
→ validar visualmente Cliente 360, Pólizas y Leads en móvil
→ sellar nueva candidata acumulativa
→ declarar GRAVICENTRA_INSURANCE_RC1
→ preparar predeploy, backup y rollback
→ solicitar una sola autorización de deploy
```

No corresponde otra auditoría general, otro Gate 7.11, reimportar datos, reconstruir frontend/backend ni abrir una candidata paralela.
