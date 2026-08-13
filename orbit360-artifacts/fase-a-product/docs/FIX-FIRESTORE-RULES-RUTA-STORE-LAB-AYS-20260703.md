# Fix Firestore Rules — ruta Store LAB A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Tipo:** fix mínimo backend LAB / reglas Firestore  
**Estado:** aplicado en rama, sin deploy.

## 1. Hallazgo

Al continuar sobre la base backend validada del PR #3 se detectó una desalineación entre:

- el adapter LAB `orbit360-platform/data/store-firestore-lab.local.js`, que usa la ruta:

```txt
tenantId/{tenantId}/{coleccion}/{docId}
```

- y `firestore.rules`, que permitía la ruta documental:

```txt
tenants/{tenantId}/data/{document=**}
```

## 2. Riesgo

Si se ejecuta Firestore LAB con el adapter actual, las reglas podían bloquear lecturas/escrituras del adapter aunque la membresía del tenant estuviera correcta.

Esto afectaría directamente el objetivo urgente de A&S:

- crear clientes;
- crear pólizas;
- cargar cobros;
- probar CRUD manual;
- probar importadores;
- validar Cliente 360.

## 3. Fix mínimo aplicado

Se actualizó `firestore.rules` para permitir ambas rutas durante la transición:

```txt
tenants/{tenantId}/data/{document=**}
tenantId/{tenantId}/{document=**}
```

La primera queda como ruta documental/futura. La segunda conserva compatibilidad con el adapter LAB v1.73 ya validado.

## 4. Qué NO se hizo

- No se hizo deploy.
- No se tocó producción.
- No se subieron datos reales.
- No se tocaron módulos frontend.
- No se cambió Auth.
- No se cambió `data/store.js` demo.

## 5. Pendiente técnico

En una fase posterior se debe normalizar el adapter y reglas a una sola ruta definitiva. Mientras tanto, este fix permite avanzar con A&S sin romper Fase 8.

## 6. Impacto para Claude

No aplica a UX visual directa, pero Claude debe respetar que el frontend no puede asumir rutas Firestore ni tocar backend. Los módulos siguen hablando solo con `Orbit.store`.

## 7. Estado

**Estado:** RESUELTO EN RAMA / pendiente smoke LAB y deploy de reglas solo cuando Paula lo autorice.
