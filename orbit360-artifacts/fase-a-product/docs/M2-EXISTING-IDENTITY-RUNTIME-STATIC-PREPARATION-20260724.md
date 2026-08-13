# M2 — preparación estática del runtime con identidad existente

Fecha: 2026-07-24  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.0`

## Fuente y causa raíz

El proyecto Firebase `ays-orbit-360-lab`, Auth y la membership del tenant `alianzas-soluciones` ya existen y fueron reconciliados read-only en el run `30094359595`. El primer workflow runtime introdujo referencias nuevas y una aplicación de Rules no reconciliada; la clasificación vinculante es `PIPELINE_MECHANISM_FAILURE`.

## Implementación preparada

- reutiliza exclusivamente el proyecto existente;
- resuelve los aliases históricos de cuenta de servicio;
- deriva la configuración web mediante Firebase Management API en lectura;
- selecciona una única identidad activa, privilegiada y enlazada entre Auth y membership;
- ejecuta el bootstrap canónico y el `Orbit.store` read-only;
- bloquea localmente `insert`, `update`, `remove`, `setPref` y `reseed`;
- no crea ni modifica usuarios;
- no crea ni modifica memberships;
- no aplica Firestore Rules ni Storage Rules;
- no realiza escrituras de configuración ni operativas;
- no despliega Hosting ni Functions.

## Gate estático

La ejecución estática no usa secretos, Firebase, Firestore, runtime ni navegador. Valida sintaxis, owners, workflow, prohibiciones y fixtures. Solo un resultado sanitizado `ok:true` permite solicitar después una autorización runtime única.

## Estado

`STATIC_PREPARATION_AUTHORIZED_ONCE`. El runtime externo continúa `PREPARED_NOT_AUTHORIZED` con cero ejecuciones permitidas.
