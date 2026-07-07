# Criterios de uso de Claude — Prototipo, UX y Academia v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Definir cuándo sí debe entrar Claude y cuándo no, para evitar gastar capacidad semanal en tareas que deben resolverse desde backend/ChatGPT/Codex o documentación técnica.

## Decisión actual

En este momento Claude NO es la herramienta principal para el siguiente bloque crítico.

La prioridad actual sigue siendo técnica/operativa:

1. Cobros lote.
2. Gates Configuración/Equipo.
3. Aseguradoras borrar/desactivar.
4. Siniestros estados finales.
5. Cancelaciones anti-duplicados.
6. Importador dry-run/fuentes separadas.

Estos puntos requieren implementación controlada, validación sintáctica, contrato backend y protección de archivos críticos. Claude debe recibir la especificación, pero no debe pisar backend ni reemplazar módulos sin auditoría.

## Cuándo avisar a Paula que use Claude

Avisar a Paula que Claude debe entrar cuando se cumpla al menos una de estas condiciones:

### 1. Base funcional estable

Cuando los hotfixes críticos estén aplicados y validados:

- `cobros.lote()` ya no afirma envío real.
- Configuración/Equipo tienen gates mínimos.
- Aseguradoras bloquea borrado con vínculos.
- Siniestros pide motivo para estados finales.
- Cancelaciones evita duplicados.

En ese momento Claude puede mejorar UX/copy/flujo visual sin romper lógica.

### 2. Se requiere rediseño o mejora de experiencia

Claude es útil para:

- simplificar pantallas;
- mejorar layout;
- organizar navegación;
- afinar microcopy;
- hacer flujos más intuitivos;
- diseñar estados vacíos;
- mejorar tabs/drawers/modales;
- convertir reglas técnicas en experiencia clara.

### 3. Academia debe volverse interactiva

Claude debe entrar para transformar las reglas en:

- rutas por rol;
- lecciones guiadas;
- quizzes;
- evaluaciones prácticas;
- certificados;
- instrucciones paso a paso dentro de cada módulo;
- contenidos de onboarding para nuevos usuarios.

### 4. Se prepara paquete de prototipo comercializable

Claude debe entrar cuando haya que presentar Orbit 360 como producto:

- demo pulida;
- navegación fluida;
- estados honestos;
- visual corporativo;
- storytelling SaaS;
- white-label multi-tenant;
- manuales visuales.

### 5. Nuevo candidato ZIP/prototipo

Claude debe entrar si Paula trae un nuevo ZIP/candidato de prototipo, pero solo bajo auditoría forense:

1. confirmar baseline vivo;
2. extraer e inventariar;
3. comparar contra última versión auditada;
4. validar que no pise backend protegido;
5. revisar rutas/módulos/importador/Academia;
6. documentar mejoras, regresiones y pendientes;
7. empalmar solo si pasa pipeline seguro.

## Cuándo NO usar Claude

No usar Claude para:

- modificar `data/store.js`;
- modificar `store-firestore-lab.local.js`;
- modificar `backend-lab-*`;
- modificar `firestore.rules`;
- modificar `tools/orbit360-*`;
- modificar Auth real;
- diseñar parsers de migración real;
- aplicar datos reales;
- resolver tenant isolation;
- tocar reglas de seguridad;
- hacer cambios sin leer docs maestros.

## Qué debe recibir Claude cuando entre

Claude debe recibir un paquete claro con:

### Reglas de producto

- Orbit 360 es SaaS/white-label/multi-tenant.
- A&S es tenant por configuración, no fork.
- Marca Orbit en chrome; logo cliente en slot white-label.
- No hardcodear A&S/datos reales.
- No mostrar Firebase/Firestore/backend/LAB/localStorage/mock/demo en UI cliente.
- Preparar no es enviar.
- Reportar no es aplicar.
- Validar no es conciliar.
- Integración configurada no es integración activa.

### Reglas comerciales

- GT -> GTQ.
- CO -> COP.
- No sumar monedas en crudo.
- Producción/metas/comisiones = prima neta recaudada.
- Separar prima neta/gastos/impuestos/total.
- Pólizas Vigente/Por renovar generan cartera.
- Cancelada/Vencida/Anulada/Rechazada son histórico.
- Si falta país/moneda/estado: `REQUIERE_VALIDACION`.

### Reglas de importación

- Fuentes separadas.
- Dry-run + diff + confirmación.
- Trazabilidad archivo/hoja/fila/bloque/país/moneda.
- Banco propone conciliación, no aplica pago.
- Documentos soporte proponen, no escriben sin confirmación.

### Reglas de gates

- Gate 0: lectura.
- Gate 1: acción operativa menor.
- Gate 2: mutación administrativa.
- Gate 3: acción crítica tenant/provisioning.
- Toda acción sensible debe pedir confirmación/motivo/auditoría.

## Archivos recientes que Claude debe leer cuando entre

```txt
orbit360-platform/docs/PLAN-CIERRE-IMPLEMENTACION-URGENTE-ORBIT360-AYS-V1330-20260707.md
orbit360-platform/docs/MATRIZ-RBAC-GATES-CONFIG-EQUIPO-ASEGURADORAS-V1330-20260707.md
orbit360-platform/docs/MATRIZ-GATES-SINIESTROS-CANCELACIONES-COBROS-CONCILIACIONES-V1330-20260707.md
orbit360-platform/docs/AUDITORIA-ACCIONES-ADMINISTRATIVAS-DIRECTAS-V1330-20260707.md
orbit360-platform/docs/PLAN-IMPLEMENTACION-GATES-ADMIN-V1330-20260707.md
orbit360-platform/docs/INCIDENTE-POWERSHELL-COBROS-LOTE-V1330-20260707.md
orbit360-platform/docs/ERRATA-PENDIENTE-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
orbit360-platform/docs/PARCHE-LOCAL-LISTO-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
```

## Prompt base para Claude cuando corresponda

```txt
Lee primero la documentación reciente de Orbit 360 A&S v1330. Tu rol es prototipo/UX/Academia, no backend protegido.

Debes conservar:
- Orbit 360 SaaS multi-tenant.
- A&S como tenant por configuración.
- estados honestos: preparar no enviar, reportar no aplicar, validar no conciliar.
- gates administrativos visibles y comprensibles.
- rutas Academia por rol.
- no hardcodear datos reales ni A&S como fork.
- no mostrar textos técnicos al cliente.

No debes tocar ni reemplazar backend protegido, store, Auth, Firestore, tools, reglas ni index sin autorización expresa.

Prioriza mejoras de UX para:
1. Cobros lote como preparación, no envío.
2. Configuración/Equipo con gates claros.
3. Aseguradoras con borrar/desactivar seguro.
4. Siniestros con motivo en estados finales.
5. Cancelaciones sin duplicados.
6. Academia por rol con evaluaciones de estas reglas.

Entrega cambios como candidato auditable, no como reemplazo total sin diff.
```

## Estado

Documento creado como criterio de decisión.
No se usó Claude.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
