# Contrato canónico de fuentes de migración — Orbit 360 A&S

Fecha: 2026-07-04
Estado: vigente para backend, parser e importador.

## Objetivo

Unificar los tipos de fuente permitidos para que frontend, backend, manifest, dry-run y próximos paquetes Claude usen la misma lógica.

## Reglas base

- No mezclar fuentes.
- No inferir clientes ni pólizas desde bancos o histórico financiero.
- No escribir cartera desde histórico financiero.
- No escribir cobros desde banco sin conciliación.
- Documentos soporte solo proponen cambios con diff y confirmación.
- La moneda sugerida por país no es moneda autorizada para escritura.
- Toda fila debe conservar archivo, hoja, fila, bloque, periodo, país y moneda.

## País y moneda

```txt
GT -> GTQ
CO -> COP
```

Si la fuente no trae moneda explícita, debe marcarse validación requerida aunque exista país.

## Fuentes permitidas

1. `clientes`: escribe clientes. No crea pólizas, cobros, finanzas ni comisiones.
2. `aseguradoras`: escribe aseguradoras. Directorio separado por país.
3. `polizas`: escribe pólizas y, solo si procede, cobros/cartera.
4. `vehiculos`: escribe vehículos. No crea póliza ni cobro.
5. `cobros_realizados`: escribe cobros/recaudos. No escribe `finmovs`.
6. `planilla_aseguradora`: concilia cartera/recibos. No crea maestros.
7. `planilla_comisiones`: escribe comisiones desde filas reales. No simula tarifas.
8. `estado_cuenta_bancario`: escribe conciliación bancaria. No crea clientes, pólizas ni cartera.
9. `financiero_historico`: escribe solo `finmovs`. No infiere operación comercial.
10. `siniestros`: escribe reclamos. No altera pólizas/cartera sin confirmación.
11. `documentos_soporte`: escribe documentos y parches pendientes. No aplica cambios directos.
12. `configuracion_catalogo`: escribe configuración/catálogos. No crea operación.

## Herramienta asociada

```txt
tools/orbit360-generar-contrato-fuentes-ays.mjs
tools/orbit360-test-generar-contrato-fuentes-ays.mjs
```

La herramienta genera reportes JSON/TXT en `_orbit360_reports` y valida invariantes mínimas del contrato.

## Uso operativo

Usar este contrato al actualizar importador, manifest, dry-run, parser backend, validadores país/moneda, auditorías Claude y paquetes de continuidad.

## Restricciones

No contiene datos reales. No escribe Firestore. No modifica `Orbit.store`. No despliega. No autoriza migración real.