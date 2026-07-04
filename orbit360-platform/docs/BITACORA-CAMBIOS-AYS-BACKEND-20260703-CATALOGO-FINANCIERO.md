# Bitácora cambios backend A&S — Catálogo financiero base

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** catálogo financiero / reglas de cierre  
**Estado:** RESUELTO documentalmente; ABIERTO para validación de Paula.

## Entrada

- **Módulo / área:** Backend A&S — Finanzas / `finmovs` históricos / cierres.
- **Síntoma/necesidad:** antes de cualquier dry-run o carga LAB se necesitaba una propuesta mínima de categorías financieras y reglas para `Saldo anterior` y cierres mayo/junio/julio.
- **Esperado:** catálogo base editable, reglas de clasificación preliminar, reglas anti doble conteo y separación entre histórico, referencia y cierres manuales.
- **Causa raíz:** el archivo financiero histórico contiene conceptos heterogéneos y saldos de apertura; sin catálogo y reglas de saldo se puede distorsionar flujo, caja, conciliación o reportes.
- **Archivo/función:** documentación en `CATALOGO-FINANCIERO-BASE-AYS-GT-CO-20260703.md` y `REGLAS-SALDO-ANTERIOR-CIERRES-MAYO-JUNIO-JULIO-AYS-20260703.md`.
- **Fix/mejora aplicada:** propuesta de categorías, subcategorías, reglas de clasificación, tratamiento de terceros, reglas de `Saldo anterior`, reglas de corte mayo/junio/julio y pendientes para el importador.
- **Impacto en prototipo comercializable:** aplica al prototipo base. Finanzas debe permitir categorías editables por tenant, reglas de saldos iniciales, cierre mensual y conciliación sin contaminar cartera ni pólizas.
- **Estado:** RESUELTO documentalmente / PENDIENTE VALIDACIÓN.

## Documentos agregados

```txt
orbit360-platform/docs/CATALOGO-FINANCIERO-BASE-AYS-GT-CO-20260703.md
orbit360-platform/docs/REGLAS-SALDO-ANTERIOR-CIERRES-MAYO-JUNIO-JULIO-AYS-20260703.md
```

## Decisiones preliminares documentadas

1. `Saldo anterior` no es ingreso ni egreso operativo automático.
2. `Saldo anterior` queda como `saldo_inicial` o `referencia` hasta validar regla final.
3. Mayo 2026 queda como referencia/requiere validación, no cierre definitivo.
4. Junio 2026 debe capturarse y conciliarse manualmente.
5. Julio 2026 puede quedar como periodo abierto/requiere validación.
6. GTQ y COP no se mezclan.
7. El catálogo financiero no crea clientes, pólizas, cobros ni cartera.

## Pendientes antes de uso operativo

1. Validar categorías con Paula.
2. Confirmar tratamiento de aportes/préstamos.
3. Confirmar tratamiento de comisiones pagadas a asesores/referidores.
4. Definir regla final para transferencias internas.
5. Definir regla final de `Saldo anterior`.
6. Definir tratamiento de mayo 2026: excluido, referencia o borrador conciliable.

## Pendientes Claude / prototipo base

1. Categorías financieras editables por tenant.
2. Estado de periodo: histórico, referencia, abierto, cerrado, requiere validación.
3. Tratamiento especial de saldos iniciales.
4. Cierre mensual manual con responsable/fecha.
5. Conciliación con planillas y estados de cuenta.
6. Bloqueo de inferencias hacia cartera/pólizas desde finanzas.

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
