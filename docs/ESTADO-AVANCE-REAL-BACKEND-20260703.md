# Estado de avance real — Backend Orbit 360 / A&S

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 — Migración Alianzas y Soluciones  
**Estado:** control de avance y corrección de metodología  
**Alcance:** backend ChatGPT/Codex + empalme ágil con prototipos Claude

## 1. Resumen ejecutivo honesto

Sí hay avance, pero no al ritmo necesario para llegar rápido a una versión productiva. El avance real se ha concentrado en:

- ordenar reglas de arquitectura SaaS multi-tenant;
- proteger la separación frontend Claude / backend ChatGPT-Codex;
- documentar la regla crítica de recaudo comercial vs `finmovs`;
- validar que cada nuevo prototipo debe entrar como mini-release, no como reinicio;
- corregir una auditoría inicial demasiado dura sobre el ZIP de Claude;
- empezar a registrar los hallazgos directamente en GitHub.

Lo que todavía NO ha avanzado lo suficiente:

- migración efectiva de información A&S a backend real;
- carga controlada de clientes, pólizas, recibos, aseguradoras y estados de cuenta en Firestore/entorno LAB;
- Auth final de usuarios reales;
- Storage/Drive documental;
- automatizaciones Make reales;
- importador backend real con IA/OCR productivo.

Conclusión: **no estamos empezando de cero**, pero el proceso se volvió demasiado circular por auditorías repetidas, documentación dispersa y empalmes de prototipo sin una compuerta fija. A partir de este punto, el backend debe continuar por contratos estables y no reiniciarse por cada ZIP nuevo de Claude.

## 2. Avances reales acumulados

### 2.1 Arquitectura y reglas de producto

- Confirmado Orbit 360 como SaaS white-label multi-tenant.
- Confirmado que A&S se personaliza por configuración/tenant, no por código bifurcado.
- Confirmado que el chrome conserva marca Orbit 360 y el logo del cliente vive en slot white-label.
- Confirmado que módulos no deben tocar almacenamiento directo: solo `Orbit.store`.
- Confirmado que el backend se conecta reimplementando `data/store.js` y conservando la API exacta.
- Confirmado que producción, metas y comisiones se calculan sobre prima neta recaudada.
- Confirmado que moneda se maneja por país y no se suma en crudo entre GT/CO.

### 2.2 Regla crítica recaudo comercial vs finanzas reales

Regla protegida:

- Pago aplicado por cliente a póliza/recibo = recaudo comercial.
- Afecta cartera, recibos, producción recaudada, comisión estimada, estado de cuenta del cliente, Cliente 360 y analítica.
- No crea `finmov` automático.
- `finmovs` queda para caja/banco real: comisiones efectivamente recibidas, facturas cobradas, liquidaciones pagadas, egresos, banco/caja y ajustes financieros reales.

Este punto evita duplicar ingresos y es central para A&S.

### 2.3 Lógicas A&S documentadas

- Jan-May: reconciliar comisiones desde facturas y movimientos financieros existentes, sin duplicar ingresos.
- Jun-Jul en adelante: generar desde estados de cuenta/planillas de aseguradoras.
- Factura de julio puede corresponder a recaudo de junio; factura de junio a recaudo de mayo.
- IVA debe separarse: base/subtotal, IVA, total.
- Comisión de asesor debe calcularse sobre base antes de IVA, según configuración.
- USD requiere tasa manual/configurable, monto original, equivalente y diferencia cambiaria.
- Importador debe pedir aseguradora, período documento, período recaudo, moneda/tasa, IVA, relación póliza-cliente-recibo-asesor, preview, aprobar fila/todo, excluir, remapear e iterar.
- Edición de asesor en liquidación debe preguntar alcance: solo liquidación, actualizar póliza, actualizar cliente, actualizar ambos o dejar revisión pendiente.

### 2.4 Auditoría de prototipos

- Se recibió y reauditorió el ZIP Claude `Prototype Development Request - 2026-07-02T201909.489.zip`.
- Se corrigió el criterio inicial: el ZIP sí trae estructura completa y avances; el problema principal es trazabilidad documental.
- Se documentaron hallazgos en `docs/AUDITORIA-REVISADA-ZIP-CLAUDE-20260703.md`.

### 2.5 GitHub

- Se verificó acceso al repo `paulaosoriof86/orbit360-core`.
- Se inició carga directa de documentación de auditoría y continuidad.
- No se tocó código funcional.
- No se hizo deploy.
- No se hizo merge de frontend/backend.

## 3. Errores cometidos o riesgos detectados

### E1 — Usar `CHANGELOG.md` como única fuente de verdad

Se concluyó inicialmente que el ZIP estaba más incompleto de lo que realmente estaba porque `CHANGELOG.md` abre en v1.55, aunque la bitácora interna llega a v1.85.

**Corrección:** auditar siempre código + bitácoras + docs + módulos, no solo changelog.

### E2 — Reauditar desde cero cada ZIP

Cada nuevo prototipo estaba consumiendo demasiado tiempo como si reiniciara el proyecto.

**Corrección:** cada ZIP entra como mini-release con diff de cambios, no como proyecto nuevo.

### E3 — Mezclar auditoría de frontend con avance backend

El backend se frenó porque las auditorías del prototipo consumieron el foco operativo.

**Corrección:** separar carriles: Claude = frontend/prototipo; ChatGPT/Codex = backend/contratos/datos/integraciones.

### E4 — No registrar inmediatamente todo en GitHub

Parte del contexto quedó en conversación y documentos descargables, lo que obligaba a repetir instrucciones al abrir nuevos chats.

**Corrección:** todo hallazgo, cambio local, pendiente o decisión debe quedar en GitHub en docs vivos.

### E5 — No tener una compuerta de empalme fija

La llegada de nuevos ZIPs generaba riesgo de sobreescribir backend o perder avances.

**Corrección:** empalme controlado: reemplazar solo `modules/`, `core/`, `styles/` cuando aplique, conservar backend `data/store.js`, tenant y configuración.

### E6 — Avance insuficiente en migración efectiva de datos A&S

Se ha documentado mucho, pero todavía falta cargar y validar datos A&S en entorno controlado.

**Corrección:** priorizar importación LAB con fuentes reales autorizadas o dataset anonimizado/mapeado, sin hardcodear ni meter datos reales al prototipo.

## 4. Nueva regla operativa desde este punto

A partir de ahora:

1. Ningún ZIP nuevo reinicia backend.
2. Cada ZIP se audita como mini-release en máximo una ronda documental.
3. El backend avanza por contrato estable de datos.
4. Toda corrección local se documenta también para Claude.
5. No se hacen cambios funcionales de frontend salvo fixes mínimos seguros y documentados.
6. La prioridad semanal es migración real controlada, no más solo auditoría.

## 5. Estimación realista de tiempos

La estimación depende de autorización para trabajar directamente en GitHub/Firebase LAB y de no detenernos por nuevos prototipos. Bajo esa condición:

### Escenario ágil mínimo viable

**3 a 5 días hábiles intensivos** para tener:

- contrato de datos congelado;
- Firestore LAB estable con `Orbit.store`;
- importación base inicial A&S en LAB o dataset anonimizado;
- aseguradoras/catálogos cargados;
- cartera/cobros básicos validados;
- smoke de módulos principales contra backend;
- documentación de empalme lista.

### Escenario funcional A&S más serio

**7 a 10 días hábiles** para tener:

- Auth LAB;
- tenant A&S;
- importadores principales;
- pólizas/recibos/cobros/comisiones con reglas A&S;
- finanzas sin duplicar recaudo;
- validación de flujo Cliente 360 → Póliza → Cobro → Comisión → Finanzas;
- planillas/estados de cuenta en modo revisión/aprobación;
- smoke documentado.

### Escenario producción comercializable

**2 a 3 semanas** para:

- seguridad completa;
- Storage/Drive;
- integraciones reales Make/correo/WhatsApp;
- IA backend;
- migración histórica completa;
- pruebas de permisos/roles;
- hardening y documentación final.

## 6. Plan de trabajo actualizado

### Fase A — Control documental y no reinicio

**Duración objetivo:** medio día.  
**Estado:** en progreso.

- Crear documentos vivos en GitHub.
- Registrar auditoría corregida.
- Registrar errores/metodología.
- Separar backlog Claude / backend / A&S / core.

### Fase B — Contrato backend que no cambia con prototipos

**Duración objetivo:** 0.5 a 1 día.

Entregables:

- contrato de colecciones;
- contrato `Orbit.store`;
- definición de tenant path;
- reglas recaudo vs finmovs;
- campos mínimos por colección;
- mapeo de importadores A&S.

### Fase C — Firestore LAB y smoke estable

**Duración objetivo:** 1 a 1.5 días.

Entregables:

- `data/store.js` o adapter LAB manteniendo API;
- aislamiento `tenantId`;
- `_emit`/onSnapshot;
- seed ficticio mínimo;
- smoke de lectura/escritura;
- reporte.

### Fase D — Migración base A&S controlada

**Duración objetivo:** 1 a 2 días para primer corte.

Entregables:

- directorio aseguradoras GT/CO;
- clientes/base inicial;
- pólizas;
- recibos/cobros;
- vehículos;
- validación de deduplicación;
- reporte de registros cargados, rechazados y por revisar.

Nota: los datos reales no deben hardcodearse ni meterse al prototipo. Deben ir a backend/tenant o usarse en dataset anonimizado para pruebas.

### Fase E — Finanzas/comisiones A&S

**Duración objetivo:** 2 a 3 días.

Entregables:

- planillas/estados de cuenta;
- CxC aseguradora;
- CxP asesores;
- facturas con IVA;
- USD/tasa/diferencia;
- no duplicidad con `finmovs`;
- liquidación asesor con historial/auditoría.

### Fase F — Auth/roles/seguridad

**Duración objetivo:** 1 a 2 días LAB.

Entregables:

- login por correo;
- roles/módulos visibles;
- reglas de lectura/escritura por tenant;
- smoke de acceso.

## 7. Criterio de terminado mínimo

No se declara avance real hasta que exista:

- archivo/documento en GitHub;
- smoke o verificación;
- datos en backend LAB o contrato listo;
- bitácora de cambios/errores actualizada;
- siguiente acción clara.

## 8. Estado actual final

**Avance real:** medio, pero mal distribuido.  
**Riesgo:** alto si seguimos auditando cada prototipo desde cero.  
**Corrección:** plan por carriles y compuerta de empalme.  
**Prioridad inmediata:** pasar de documentación a carga/mapeo controlado de datos A&S y contrato backend estable.
