# Estado real y ruta de producción — Orbit 360 A&S

Fecha: 2026-07-13  
Proyecto: Orbit 360 A&S  
Tenant: `alianzas-soluciones`  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Propósito

Este documento corrige la continuidad y prevalece sobre cualquier línea histórica que vuelva a pedir desde cero fuentes o decisiones ya recibidas y procesadas.

La prioridad ya no es seguir acumulando auditorías amplias. La prioridad es convertir el avance existente en una versión A&S operable, persistente y desplegable, manteniendo los tres carriles y los gates de seguridad.

## 2. Baseline operativo vigente

### CRM / Cliente360

```txt
Estado funcional: CERRADO
Estado visual: CERRADO 10/10
Evidencia: reutilizable
Regla: no repetir salvo regresión demostrada
```

### Aseguradoras

```txt
Estado funcional: IMPLEMENTADO v1.220
CI estático: VERDE en 52dbe7a1f92423eb0bca67b92dfe689f94c9532a
Estado visual reutilizable: 12/15
Pendiente: solo 3 vistas de Plataformas
- Dirección desktop
- Operativo tablet
- Asesor móvil
```

### Cotizador / Comparativo

```txt
Baseline frontend acumulado: v1.215
Fuente funcional avanzada recibida: comparativo_final_v110.html
Siguiente módulo después del cierre real de Aseguradoras
```

La candidata v1.215 no debe sobrescribir ni devolver atrás el trabajo v1.220 de Aseguradoras en la rama viva.

## 3. Fuentes recibidas y procesadas — no volver a pedir desde cero

```txt
Clientes Siga CRM:
- 440 filas procesadas
- dry-run sanitizado: crear 414
- requiere validación: 26

Pólizas / Vehículos / Recibos / Cobros / Cartera:
- procesados, perfilados o modelados en bloques previos
- contratos y cruces definidos
- no inferir desde movimientos financieros

Comisiones / Facturas / Banco:
- flujo modelado
- fuentes separadas
- banco propone; no aplica cobros directamente

Aseguradoras GT/CO:
- directorios recibidos
- preflight/dry-run sanitizado y estructura operativa definidos

Cotizador / Comparativo:
- comparativo_final_v110.html recibido
- usar como referencia funcional aislada y configurable

Finanzas:
- Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx recibido
- destino financiero_historico/finmovs
- GT→GTQ, CO→COP

Marketing:
- calendario maestro 2026 recibido
- manual de identidad y logo recibidos
```

Regla permanente:

```txt
No pedir nuevamente Clientes, Pólizas, Vehículos, Cobros, Cartera,
Comisiones, Finanzas, Marketing, directorios GT/CO, manual, logo o
comparativo v110 como si no existieran.
```

Solo podrá pedirse un archivo concreto cuando exista un faltante exacto demostrado por el módulo, versión, periodo, país o dominio correspondiente.

## 4. Diagnóstico productivo confirmado

El avance no aparece con datos A&S en producción por razones técnicas concretas:

1. `data/store.js` sigue siendo el modo predeterminado y usa `localStorage` + seed ficticio.
2. `data/store-firestore-lab.local.js` solo reemplaza el store con `?orbitBackend=firestore-lab` y tenant `alianzas-soluciones`.
3. `core/auth.js` usa autenticación demo por defecto y Firebase únicamente en modo LAB.
4. `firestore.rules` conserva restricciones del usuario LAB de demostración.
5. `firebase.json` solo declara reglas de Firestore; no existe configuración de Hosting.
6. No existe `.firebaserc` versionado ni proyecto productivo asociado.
7. Los dry-runs y modelos reales no equivalen a escritura en Firestore; la documentación vigente confirma que no se han escrito datos reales.

Conclusión:

```txt
Desplegar hoy el HTML actual sin corregir estos puntos solo publicaría la demo.
No mostraría una operación A&S persistente y multiusuario.
```

## 5. Corrección de metodología

A partir de este corte se aplica:

```txt
1. Una sola fuente de continuidad: este documento + PLAN-VIVO.
2. Lectura delta; no releer cientos de documentos por iteración.
3. Un bloque operativo por vez, con avance funcional visible.
4. Reutilizar evidencias aprobadas; no repetir CRM 10/10 ni Aseguradoras 12/15.
5. Auditoría nueva solo ante un ZIP, commit, fuente o fallo nuevo.
6. Carril C debe avanzar junto con A/B; documentación sola no cuenta como cierre.
7. Paula ejecuta como máximo un gate local cuando navegador, Windows o credenciales locales sean indispensables.
8. No volver a pedir información ya documentada.
```

## 6. Ruta mínima a producción

### P0 — Cerrar Aseguradoras sin repetir trabajo

1. Ejecutar una sola vez las tres vistas pendientes mediante:

```txt
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

2. Auditar únicamente el reporte y las tres capturas.
3. Marcar Aseguradoras 15/15 si aprueba.
4. Ejecutar dry-run GT y luego CO sin escritura.
5. Resolver solo aliases, duplicados probables, entidad aliada y filas bloqueadas.

### P1 — Habilitar backend productivo A&S

Sin bifurcar el producto ni hardcodear datos:

1. Crear modo backend productivo separado de `firestore-lab`.
2. Mantener exactamente la API `Orbit.store`.
3. Eliminar dependencia de UID/correo demo en el modo productivo.
4. Resolver membresía por `tenants/{tenantId}/members/{uid}`.
5. Aplicar multirol, rol activo, módulos y scopes desde datos del tenant.
6. Mantener `localStorage` únicamente para demo explícita, nunca como fallback productivo.
7. Inyectar configuración Firebase mediante entorno/secrets; no subir secretos.
8. Preparar Hosting y rollback sin tocar `main` hasta autorización.

### P2 — Escritura real controlada

Orden de aplicación:

```txt
1. configuración tenant/catálogos
2. usuarios y membresías autorizadas
3. clientes confirmados del dry-run
4. aseguradoras confirmadas GT/CO
5. pólizas/vehículos/recibos/cartera ya modelados, por fuente separada
6. cobros/comisiones solo con sus gates y conciliación
7. finmovs históricos separados
8. marketing separado
```

Cada escritura exige:

```txt
dry-run → diff → confirmación → auditLog → smoke → rollback disponible
```

### P3 — Release candidate y despliegue

Gates mínimos:

```txt
- rama correcta y limpia
- backend protegido intacto
- validadores JS/contratos PASS
- Auth y membresía multiusuario PASS
- store productivo sin fallback demo PASS
- datos A&S controlados visibles y persistentes PASS
- roles/scopes PASS
- cero secretos o datos hardcodeados
- Hosting configurado
- smoke desktop/tablet/móvil
- rollback verificado
```

Solo después:

```txt
deploy Hosting productivo autorizado
→ smoke post-deploy
→ URL y checklist visual para Paula
```

### P4 — Continuidad modular inmediata

Después del primer go-live operable:

```txt
1. Cotizador + Comparativo v110 configurable
2. Ops + Leads y flujo issuance_request
3. Finanzas/conciliaciones/comisiones
4. Marketing
5. resto de operación y Academia profunda transversal
```

## 7. Tres carriles

### Carril A — Prototipo / UX / Academia

```txt
CRM: cerrado
Aseguradoras: 12/15; tres vistas pendientes
Cotizador/Comparativo: v1.215 + referencia v110 recibida
Patrones Claude/Academia: documentados; no bloquean producción inicial
```

### Carril B — Backend / seguridad / Orbit.store

```txt
LAB compatible: existente
Modo productivo: pendiente
Auth productivo multiusuario: pendiente
Rules productivas: pendiente
Hosting: pendiente
```

### Carril C — Datos reales / migración

```txt
Fuentes: recibidas y procesadas/modeladas según dominio
Escritura real: no ejecutada
Siguiente acción: dry-run final Aseguradoras y carga controlada en backend productivo
```

## 8. Bloqueo externo indispensable

El despliegue real requiere acceso a un proyecto Firebase productivo o a un entorno equivalente con:

```txt
projectId
Auth habilitado
Firestore
Hosting
secrets/config de despliegue
permisos de servicio para ejecutar el deploy
```

Esos valores no deben escribirse en GitHub, documentos, chat ni código. Deben existir como secretos del entorno o de GitHub Actions.

## 9. Próxima acción obligatoria

```txt
No abrir otra auditoría general.
Cerrar las tres vistas de Aseguradoras y, en paralelo técnico,
construir el modo backend productivo + Auth/membresías + Hosting.
Después ejecutar la primera carga controlada A&S y smoke real.
```
