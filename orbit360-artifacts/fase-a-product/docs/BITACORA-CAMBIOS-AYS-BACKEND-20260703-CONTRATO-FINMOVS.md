# Bitácora cambios backend A&S — Contrato `finmovs` históricos

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** contrato técnico / preparación backend sin escritura  
**Estado:** RESUELTO documentalmente; ABIERTO para implementación posterior autorizada.

## Entrada

- **Módulo / área:** Backend A&S — Finanzas / `finmovs` históricos.
- **Síntoma/necesidad:** tras corregir el alcance del archivo de movimientos, se requiere dejar definido cómo se transformará en `finmovs` sin contaminar clientes, pólizas, cobros ni cartera.
- **Esperado:** contrato técnico, reglas de validación, estructura de dry-run y bloqueos de seguridad antes de cualquier implementación.
- **Causa raíz:** el archivo financiero contiene formatos mensuales y hojas soporte; el importador necesita reglas estrictas para no inferir entidades CRM desde movimientos financieros.
- **Archivo/función:** documentación en `CONTRATO-FINMOVS-HISTORICOS-AYS-GT-CO-20260703.md` y `PLAN-DRYRUN-FINMOVS-HISTORICOS-LAB-AYS-20260703.md`.
- **Fix/mejora aplicada:** contrato documental de `finmovs`, esquema propuesto, reglas de país/moneda, estado, exclusión, trazabilidad, anti-contaminación y plan de dry-run sin escritura.
- **Impacto en prototipo comercializable:** aplica al prototipo base. El importador debe poder operar por alcance de archivo y bloquear inferencias CRM cuando el alcance sea financiero histórico.
- **Estado:** RESUELTO documentalmente.

## Documentos agregados

```txt
orbit360-platform/docs/CONTRATO-FINMOVS-HISTORICOS-AYS-GT-CO-20260703.md
orbit360-platform/docs/PLAN-DRYRUN-FINMOVS-HISTORICOS-LAB-AYS-20260703.md
```

## Reglas protegidas

1. `finmovs` es la única colección destino futura desde el archivo financiero.
2. No crear clientes desde movimientos.
3. No crear pólizas desde movimientos.
4. No crear cobros desde movimientos.
5. No crear cartera desde movimientos.
6. No mezclar GTQ y COP.
7. No procesar hoja de producción como CRM.
8. No escribir Firestore sin autorización explícita.
9. No generar descargables salvo paquete solicitado por Paula.

## Pendientes antes de implementación

1. Catálogo financiero base A&S.
2. Tratamiento final de `Saldo anterior`.
3. Tratamiento de terceros en reportes y LAB.
4. Regla para mayo 2026: excluido total o borrador no conciliado.
5. Formato del reporte dry-run sin datos reales.
6. Autorización explícita para crear script dry-run.

## Pendientes Claude / prototipo base

1. Selector obligatorio de alcance del archivo.
2. Modo financiero histórico con bloqueo de inferencias CRM.
3. Vista de dry-run antes de importar.
4. Panel de errores bloqueantes.
5. Conciliación posterior con planillas y estados de cuenta.

## Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No backend LAB protegido modificado.
- No descargables.
