# Política de uso de Claude — pendientes post v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Evitar usar capacidad de Claude demasiado pronto o con demasiados pendientes dispersos, pero tampoco dejar que los pendientes UX/prototipo se acumulen hasta volverse lentos de resolver.

## Regla operativa

Claude se usa cuando haya un paquete coherente y de alto impacto para frontend/prototipo/Academia, no por cada hotfix aislado.

## Cuándo avisar a Paula que ya conviene usar Claude

Avisar cuando se cumpla cualquiera de estas condiciones:

### Condición A — Paquete pequeño de alta prioridad

Hay 3 a 5 pendientes cohesionados que Claude puede resolver rápido en una sola candidata, por ejemplo:

```txt
Cliente360 acciones por rol + Documentos visibles + historial cliente + copy estados + smoke visual.
```

### Condición B — Pendiente visual transversal

Hay un cambio que afecta navegación, UX, diseño, visual smoke o Academia en varios módulos y conviene que Claude lo resuelva de una vez.

### Condición C — Cierre de ciclo de empalme

Después de ejecutar y validar hotfixes P0, si quedan detalles visuales P1/P2 que no comprometen backend pero mejoran comercialización.

### Condición D — Academia necesita materialización UI

Cuando las reglas ya están documentadas, pero falta que Academia las convierta en rutas guiadas, progreso, evaluaciones, certificados y manuales visibles.

## Cuándo NO usar Claude todavía

No usar Claude si:

- Hay solo 1 pendiente menor.
- El pendiente es backend protegido, Firestore, Auth, store, validadores, importadores o runner.
- Falta auditoría de archivos reales.
- El cambio puede documentarse y resolverse con script seguro por ChatGPT/Codex.
- La candidata actual no ha sido empalmada/validada todavía.

## Tamaño máximo recomendado del paquete Claude

Para que Claude lo resuelva rápido:

```txt
Máximo 5 frentes.
Máximo 10 archivos objetivo de prototipo.
Separar claramente: obligatorio / deseable / no tocar.
No pedir backend protegido.
No pedir datos reales.
```

## Pendientes actuales candidatos para próximo paquete Claude

No enviar todavía como paquete grande. Acumular hasta que estén validados los hotfixes P0.

Candidatos actuales:

```txt
1. Cliente360 Documentos: acciones por rol, visibilidad, responsable, aprobar/rechazar propuestas.
2. UX visual de estados: reportado / en revisión / validado no aplicado / aplicado / conciliado.
3. Academia: materializar rutas nuevas con progreso/certificado/manuales visibles.
4. Smoke visual post-hotfixes: revisar Portal, Cobros, M5, Config/Equipo y Academia.
```

## Decisión actual

```txt
Aún no usar Claude.
Primero ejecutar runner P0 y validar baseline corregido.
Avisar a Paula cuando haya paquete de 3-5 pendientes cohesionados, sin backend protegido, que Claude pueda resolver rápido.
```

## Estado

Política creada. Debe aplicarse en adelante antes de preparar cualquier paquete Claude.