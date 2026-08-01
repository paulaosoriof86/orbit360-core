# Autorización read-only — Planillas y Comisiones

Fecha y hora: 2026-08-01 14:21 -06:00  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5`, debe permanecer draft/open  
Estado: `AUTHORIZED_WAITING_CURRENT_SOURCES`

## Alcance expresamente autorizado

Se registra autorización para ejecutar, cuando estén disponibles las fuentes vigentes del periodo exacto:

1. recibir y verificar la planilla de comisiones de Mapfre correspondiente a julio de 2026;
2. recibir y verificar la planilla de comisiones de Aseguradora General correspondiente a los tres cobros conciliados;
3. comprobar archivo, hoja, fila, país, moneda, periodo y trazabilidad;
4. procesar las fuentes en paquete privado y modo read-only;
5. ejecutar `planillas-comisiones-source-adapter-p0` sin conexión a UI, `Orbit.store` ni writer productivo;
6. generar dry-run con decisiones `CREAR_CANDIDATO`, `OMITIR_DUPLICADO`, `REQUIERE_VALIDACION` y `HOLD_PERIOD_MISMATCH`;
7. mantener excluidos los cuatro casos residuales de Cobros que permanecen en `HOLD`;
8. producir evidencia sanitizada antes de cualquier nueva decisión de escritura.

## No autorizado

Esta autorización no permite:

- escribir registros de comisión;
- crear `finmovs`;
- modificar cobros, recibos, pólizas, cartera o datos de clientes;
- inferir tasas de comisión;
- reutilizar planillas de otro periodo;
- usar movimientos financieros, banco o histórico para sustituir una planilla de comisiones;
- reabrir o reproducir el gate 10.9 de Cobros;
- conectar el adaptador a `index.html`, UI, `Orbit.store` o importador productivo;
- ejecutar navegador, deploy, Functions, Rules, Storage o producción;
- modificar `main`, hacer merge o cerrar el PR.

## Condición de ejecución

No se arma gate operativo ni dry-run de casos hasta disponer de al menos una fuente vigente y verificable del periodo exacto. La ausencia de fuente mantiene el estado `SOURCE_MISSING`; no se crean filas sintéticas para sustituir datos reales.

## Fuente pendiente exacta

- Mapfre: planilla de comisiones de julio de 2026 que cubra los dos cobros conciliados.
- Aseguradora General: planilla de comisiones que cubra los tres cobros conciliados de julio de 2026.

## Siguiente acción exacta

```text
recibir una o ambas planillas vigentes
→ validar periodo y estructura
→ empaquetar de forma privada
→ ejecutar adaptación read-only
→ generar dry-run sanitizado
→ reportar candidatos y bloqueos
→ solicitar autorización separada solo si existieran escrituras elegibles
```
