# Fase 8.5 - Estado

Fecha: 2026-07-02

Estado: PAUSADA PARA AJUSTE METODOLOGICO.

Se genero paquete y script de empalme v1.80 con backend LAB protegido, pero los dos scripts PowerShell entregados fallaron por sintaxis antes de ejecutar el empalme.

## Resultado local reportado

- Script inicial: fallo de parser PowerShell.
- Script FIX: fallo de parser PowerShell.
- No se debe reutilizar ninguno de esos dos scripts.
- No hay evidencia de que el empalme se haya aplicado; el error aparece antes de copiar/commitear.

## Validaciones realizadas sobre copia parcheada del ZIP

- node --check OK en core, modules y data.
- Sin mojibake en archivos activos.
- Sin referencias ajenas funcionales.
- Sin localStorage directo en modules.
- Fechas historicas operativas reemplazadas. Solo queda ancla interna de demo en core/ui.js.
- index.html parcheado con orden LAB: data/store.js, data/store-firestore-lab.local.js, data/seed.js.

## Restricciones

- No deploy.
- No Hosting.
- No produccion.
- No merge.
- Auth/Fase 9 sigue pausada hasta completar Fase 8.5.

## Correccion de negocio agregada

La regla pago aplicado -> finmovs queda corregida. Pago aplicado por cliente es recaudo comercial y estimado de comision, no movimiento financiero real de la empresa. Ver `DECISION-RECAUDO-VS-FINMOVS-20260702.md` y `ERRATA-AUDITORIA-V180-RECAUDO-20260702.md`.

## Nueva metodologia

No continuar con scripts PowerShell largos para este empalme. Siguiente paso: empalme directo/controlado por GitHub o instrucciones locales minimas y verificables.
