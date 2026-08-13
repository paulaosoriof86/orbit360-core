# Bitácora cambios backend A&S — Movimientos históricos financieros

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** aclaración de alcance / auditoría financiera histórica  
**Estado:** RESUELTO documentalmente; ABIERTO para futura carga LAB autorizada.

## Entrada

- **Módulo / área:** Migración real A&S — Finanzas / movimientos históricos.
- **Síntoma/necesidad:** Paula aclaró que el archivo de movimientos debe usarse únicamente como histórico financiero GT/CO hasta antes de finalizar mayo, y que la producción detectada en una hoja del mismo archivo debe ignorarse para migración operativa.
- **Esperado:** cerrar el alcance correcto, separar finanzas de clientes/pólizas/cobros/cartera, y documentar reglas para futura importación segura.
- **Causa raíz:** el workbook contiene hojas financieras, hojas de soporte y una hoja de producción. El procesamiento inicial intentó extraer entidades candidatas desde producción, pero Paula confirmó que la migración se hará con archivos separados y actualizados.
- **Archivo/función:** documentación en `orbit360-platform/docs/CIERRE-MOVIMIENTOS-HISTORICOS-FINANCIEROS-GT-CO-20260703.md`.
- **Fix/mejora aplicada:** se fijó alcance definitivo: usar el archivo solo para `finmovs` históricos GT/CO; ignorar producción para migración; excluir mayo 2026 como cierre no definitivo; documentar reglas de importación financiera.
- **Impacto en prototipo comercializable:** aplica a prototipo base. El importador debe pedir/permitir seleccionar alcance del archivo antes de mapear entidades, y bloquear inferencias cruzadas no autorizadas.
- **Estado:** RESUELTO documentalmente.

## Conteos documentados sin datos reales

| Métrica | Resultado |
|---|---:|
| Hojas mensuales GT/CO detectadas | 38 |
| Hojas históricas migrables hasta abril 2026 | 36 |
| Hojas mayo 2026, solo referencia | 2 |
| Hojas soporte/no mensuales | 6 |
| Registros candidatos históricos hasta abril 2026 | 804 |
| Ingresos candidatos históricos | 256 |
| Egresos candidatos históricos | 548 |
| Registros candidatos GT | 568 |
| Registros candidatos CO | 236 |

## Decisiones protegidas

1. La hoja `Listado producción 2025-2026` queda ignorada para migración operativa.
2. El archivo de movimientos no crea clientes, pólizas, cobros ni cartera.
3. Mayo 2026 no se toma como cierre definitivo.
4. Mayo, junio y julio se completarán manualmente y se conciliarán con planillas y estados de cuenta.
5. No se hará carga Firestore LAB sin autorización explícita.

## Pendientes backend

1. Definir catálogo de categorías financieras A&S.
2. Definir tratamiento de `Saldo anterior`.
3. Definir tratamiento de préstamos/aportes internos.
4. Validar registros con monto cero/pendiente/formato irregular.
5. Preparar importador LAB de `finmovs` solo cuando se autorice.
6. Cruzar cierres de mayo, junio y julio con planillas y estados de cuenta cuando Paula entregue esos archivos.

## Pendientes prototipo base / Claude

1. Selector de alcance antes de procesar archivo.
2. Bloqueo de inferencias no autorizadas según alcance.
3. Detector de hojas mensuales por país/mes/año.
4. Detector flexible de bloques INGRESOS/EGRESOS.
5. Prevalidación visual antes de importar.
6. Flujo de conciliación posterior con estados de cuenta y planillas.

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
- No descargables entregados.
