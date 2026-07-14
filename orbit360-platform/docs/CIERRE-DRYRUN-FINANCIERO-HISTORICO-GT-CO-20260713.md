# Cierre de dry-run financiero histórico GT/CO

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carriles: B (contrato/importador) y C (fuente real)  
Estado: dry-run cerrado; cero escrituras

## Fuente procesada

`Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx`

SHA-256:

`973a46b81f629de716913195cd573cb853768bff6a1b0cc866b79ab9bbd4209f`

Cobertura:

- 38 hojas mensuales;
- Guatemala y Colombia separadas;
- periodo de noviembre de 2024 a mayo de 2026;
- GT usa GTQ;
- CO usa COP;
- 841 filas con monto principal válido y trazabilidad.

## Reconciliación

Resultado:

```txt
periodos reconciliados: 38/38
diferencia de ingreso caja: 0 por periodo
diferencia de egreso planificado: 0 por periodo
diferencia de egreso pendiente: 0 por periodo
diferencia de egreso pagado: 0 por periodo
```

La reconciliación separa:

- valor neto;
- IVA;
- ISR/retención, que no se suma a caja;
- egreso pagado;
- egreso pendiente;
- saldo de apertura;
- financiamiento recibido o devuelto.

## Decisiones del dry-run

```txt
VALIDACION_MENSUAL_AGRUPADA: 729
REQUIERE_VALIDACION_INDIVIDUAL: 37
SOLO_SALDO_APERTURA: 29
SOLO_FINANCIERO_HISTORICO: 13
LISTO_FINMOVS: 8
LISTO_HISTORICO_FINMOVS_REQUIERE_FECHA: 25
```

La validación mensual agrupada evita revisar 729 filas una por una. Se permite porque los 38 periodos concilian exactamente; todavía no equivale a escritura.

## Calidad de la fuente

Hallazgos:

- 180 filas con monto principal vacío y cifras en columnas auxiliares: excluidas del dry-run;
- 39 grupos de duplicados probables, 85 filas involucradas: requieren diff, no eliminación automática;
- 3 errores de fórmula en celdas analíticas de la fuente:
  - `AyS GT May 25!K24`;
  - `AyS GT Jun 25!K24`;
  - `AyS Col May 26!O12`;
- los errores no afectan la conciliación de los bloques fuente de movimientos, pero deben conservarse como alerta de calidad.

## Hojas excluidas

No se importan como movimientos:

- `Salario Carlos 2025` y `Salario Carlos`: auxiliares de nómina;
- `Presupuesto May 26`: planeación;
- `Análisis 2026`: hoja derivada;
- `Dashboard 2026`: hoja derivada;
- `Listado producción 2025-2026`: fuente del dominio Pólizas, no del dominio financiero.

La hoja de producción no se usa para inferir clientes, pólizas, cartera o cobros desde los movimientos financieros.

## Reglas de dominio

1. El destino primario es `financiero_historico`.
2. Un ingreso por comisión no es un cobro de prima ni un recaudo de cliente.
3. Los financiamientos usan naturaleza `financing`; no son ingreso operativo ni producción.
4. Los saldos anteriores son aperturas, no movimientos del mes.
5. Pendiente, parcial, facturado o no facturado no se publica como realizado.
6. No se crean ni actualizan `clientes`, `polizas`, `carteraPrimas` o `cobros` desde esta fuente.
7. El paso a `finmovs` requiere estado realizado, fecha suficiente, diff aprobado, confirmación, auditoría y rollback.
8. No se convierten ni mezclan GTQ y COP.

## Código aditivo

Contrato:

`core/importa-financiero-historico-contract-p0.js`

Validador:

`tools/orbit360-validar-importa-financiero-historico-p0.mjs`

El contrato:

- no llama `Orbit.store`;
- no usa `localStorage` ni `sessionStorage`;
- no expone funciones de escritura;
- produce únicamente un dry-run;
- impide destinos ajenos a `financiero_historico`;
- conserva trazabilidad por archivo, hoja, fila, bloque, periodo y hash.

## Carriles

### Carril A

Sin cambios. Claude continúa trabajando sobre la candidata v1.215 para producir la siguiente candidata incremental.

### Carril B

Contrato reusable implementado sin modificar backend protegido, Auth, Firestore LAB ni reglas.

### Carril C

Fuente financiera real perfilada, reconciliada y sanitizada. No se escribió ningún dato.

## Siguiente acción

Cuando el backend productivo y las membresías multirol estén habilitados:

1. cargar el manifiesto sanitizado;
2. aplicar diff por periodo;
3. resolver 37 validaciones individuales y 39 grupos duplicados;
4. aprobar en bloque los periodos legacy reconciliados;
5. escribir primero en `financiero_historico`;
6. promover solamente movimientos realizados y fechados a `finmovs`;
7. registrar `auditLog` y plan de rollback.

Acción manual requerida en este bloque: ninguna.
