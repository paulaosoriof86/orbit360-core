# GRAVICENTRA INSURANCE — UAT y recuperación causal sin reabrir aprobaciones

**Corte:** 2026-10-29 · **Único gate:** I6.5/B4-003 · **Estado:** recuperación de gobernanza probada localmente, UAT autenticada de Operativo y Dirección parcial, seguridad HOLD, LIVE inalterado.

## Identidad exacta

- Repositorio `paulaosoriof86/orbit360-core`, rama `recovery/fase-a-clean-20260831`.
- Fuente funcional publicada `199860dd23cad3db2df581828a45ae9f9e5cc7d8`, árbol `f0f95a727f4a99ebb046fb0c4cee71c3833f6c91` y padre `3a9e673e60656d9def9cfa9333257e467977cbaf`.
- CI y readback Hosting-only Preview: run `40861280332` SUCCESS.
- URL de candidata `https://ays-orbit-360-lab--gi-i65-b4-199860dd-40861280332-hcyw59nf.web.app/`.
- No confundir el estado de esta Preview con producción, ni el PASS local del guard con seguridad PASS.

## Tres causas comprobadas

1. **Lectura-escritura desincronizada:** `tareas` y `finmovs` ausentes del universo opcional de hidratación; `tareas` sin política cliente y `finmovs` asignado a módulo incorrecto. Fuente `199860dd` ya corrigió ambas sin mover registros ni ampliar permisos de escritura.
2. **Relaciones históricas GT/CO:** expediente `I6_5_B4_003_EVERGREEN_AND_UAT_SYNCHRONIZATION_20261021.json` detectó 41 pólizas CO asociadas a clientes GT y una póliza GT a cliente CO. Regla de Paula: país del cliente vinculado a mercado asegurador, con adjudicación especial de clientes multipaís. La UAT de Carlos reprodujo al menos una inconsistencia GT/CO con póliza Seguros Bolívar y prima COP. No deducir que los 42 casos actuales son idénticos sin recuento nuevo; no editar automáticamente datos.
3. **Control Plane comparaba huellas congeladas con bytes posteriores:** el manifiesto de 114 rutas presenta exactamente cinco diferencias actuales, todas de la fuente autorizada `199860dd`. Se conservan todas las huellas históricas; el nuevo recibo `I6_5_B4_003_EXACT_SOURCE_SUCCESSOR_COMPOSITION_20261029.json` acredita padre, fuente, árbol, nueve archivos, cinco hashes antes/después y límites de no-promoción. El guard, modificado únicamente para validar los receipts históricos contra sus commits certificados y el sucesor contra los bytes físicos actuales, devolvió `GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS` y `SECURITY_RELEASE_HOLD=ACTIVE_FAIL_CLOSED` en ejecución local completa.

## UAT autenticada en Chrome — identidad efectiva Carlos Castro / Operativo

Solo lectura de datos reales; no pagos, cargas, mutaciones, borrados, correos ni WhatsApp. Los conteos de Carlos están limitados por su identidad efectiva y no representan la cartera de Dirección.

| Área | Hallazgo físico | Estado acotado |
|---|---|---|
| Cronograma | Tarea QA existente visible en Día/Semana/Mes; persiste tras recarga real; alta abre y se cancela | PASS lectura persistida; CREATE→READBACK nuevo no acreditado |
| Cobros | 27 filas en alcance de Carlos; 19 SIGA por confirmar; 5 pagos GTQ Q2,744 con vínculo de país no confirmado, explícitos y fuera de agregados; filtro CO 27 / GT 0 | PASS lectura/filtros sin mezclar monedas; universo Dirección pendiente |
| Renovaciones | 19 vencidas, 2 próximas 15 días y 14 en 16–45; primas separadas COP 70,665,459 y GTQ 161,634; saludo sin nombre confirmado no inserta `null` | PASS render; vínculo renovación y workflow transaccional pendiente |
| Cliente 360 | 8 clientes del alcance Carlos, 7/12 pólizas vigentes, COP 6,279,939 de prima activa; ficha con cliente marcado GT y póliza de aseguradora CO/COP | RELACIÓN DE PAÍS INCONSISTENTE; no corregir origen a ciegas |
| Pólizas | 1,425 registros de la sesión Operativo (vs. 1,414 baseline histórico); vista de rol Asesor quedó en 25/16 vigentes | PASS visibilidad y reducción de alcance; +11 requiere reconciliar procedencia |
| Aseguradoras | 33 fichas, 29 activas, algunas QA; vs. 31 baseline | PASS directorio; +2 explicar por QA/source; CRUD pendiente |
| Siniestros | Ruta operativa y cero reclamos | PASS lectura de estado vacío; CRUD no probado |
| Historial | 5 interacciones visibles | PASS lectura Operativo; correlación, no duplicación y roles Dirección/Asesor pendientes |
| Ops/Leads | 4 negocios en curso, 6 leads; enlaces y estados presentes | PASS navegación y lectura; ciclo Lead→Cliente→Póliza no probado |
| Cotizador/Comparativo | Ramas Auto, Vida, Gastos Médicos, Hogar y Daños; **no Fianzas** pese a existir en Pólizas y Academia | BRECHA DE CATÁLOGO / AUTORIDAD de Fianzas por decidir, sin cotización emitida |
| Importación | 4,607 confirmados, 8 fuentes sin confirmar, 177 alertas, 31 pendientes; 1,425 pólizas, 1,872 recibos (+30 históricos), 1,310 cartera (+27 históricos) | PASS tablero; no importa ni prueba conciliación de todos los orígenes |
| Calidad | 8/8 clientes del alcance con datos incompletos, 7 sin teléfono, 74 discrepancias prima/recibo; 0 país por validar pese a relación GT/CO observada | BRECHA DE DETECCIÓN de relación multipaís/asegurador |
| Academia | 25 cursos, 90 lecciones, incluye Fianzas; navegación disponible tras expandir sección | PASS catálogo; progreso/gestión pendientes |
| Correo | UI declara «sin cuenta conectada»; sin envío real | Dependencia de integración, no pérdida de correos |
| Roles | Operativo→Asesor oculta Aseguradoras/Importación; Pólizas cae 1,425→25; restaurado Operativo | PASS visibilidad menú/scope; backend-deny no probado |

## UAT autenticada de Paula Osorio — Dirección, tenant Alianzas & Soluciones

Cuenta efectiva reconocida en pantalla como **Paula Osorio**; selector **Ver como: Dirección** y país **Todos** salvo cuando se anotan filtros. Fuente desplegada Preview exacta `199860dd`. Esta comprobación no sustituye pruebas de backend por rol ni certificación de reglas Firestore.

| Área | Readback Dirección en Chrome | Clasificación sin reabrir aprobaciones |
|---|---|---|
| Inicio | Hidratación 5/5; 434 clientes, 1,425 pólizas, 645 obligaciones vencidas, 16 renovaciones 45d; 5 pagos confirmados GTQ Q2,744. | PASS UI/hidratación; 434 vs. 442 clientes históricos requiere origen/filtro, NO prueba pérdida. |
| Cobros | Todos 2,560 filas / SIGA 1,229; GT 2,514 / 1,195; CO 46 / 34. Sumas exactas entre países. 5 pagos confirmados GTQ Q2,744, sin conversión COP. | PASS universo Dirección y partición GT/CO. Cuatro filas COP marcadas vencidas en filtro GT no concuerdan con resumen de cartera: anomalía de atribución pendiente. |
| Conciliaciones | Seis estados de conciliación formal: todos 0; no errores de interfaz. Los 5 pagos confirmados/conciliados del flujo Cobros no equivalen a propuestas de conciliación formal. | PASS render vacío; `finmovs` E2E y correspondencia contable no acreditados. |
| Comisiones | Vista Dirección disponible; 0 registros, 0 generado/pagado/pendiente. | Funcionalidad UI existe; 0 no permite concluir pérdida ni que cálculo de comisiones esté materializado. |
| Cancelaciones | 490 cancelaciones históricas, 489 sin motivo documentado; prima perdida separada GTQ 1,842,217, USD 91,823,506, COP 26,564,526; 34% histórico no representa churn temporal. | PASS lectura, con ALERTA de interpretación: único motivo QA se titula "principal" aunque 489 carecen de causa. Validar USD extremo en su fuente. |
| Equipo y permisos | Siete usuarios; siete asesores multirol, tres operativos, cuatro multirol; Paula SuperAdmin Operativo Asesor / GT CO, Samuel AdminTenant Operativo Asesor, Carlos Operativo Asesor / GT CO. Matriz canónica: Dirección, Operativo y administradores **Todos**, Asesor **Solo propios**. | PASS directorio/matriz read-only y explicación causal de diferencias de alcance. No alteradas cuentas/permisos. |
| Aseguradoras | 33 fichas, 29 activas, 13 con contacto principal, siete con acceso, una con documentos; ficha Preview sintética abre, ocho pestañas disponibles. | PASS navegación y lectura; CRUD real protegido. +2 vs. baseline histórico de 31 incluyen fixtures QA y requiere inventario de identidad. |
| Tarifas y conocimiento | En ficha aislada QA: dos fuentes de Drive vinculadas, cero validadas, dos por revisar y cero ramos habilitados para calcular. Productos/planes abarcan Automóviles, Vida, Gastos Médicos, Daños, Fianzas y otros ramos. | **CAPACIDAD DESARROLLADA**; conocimiento incompleto no es ausencia de módulo; ningún cálculo con tarifa no validada. |
| Historial | 35 interacciones Dirección vs. cinco visibles a Carlos, con evidencia de seguimiento de renovación, actualización de póliza, clientes y gestiones Ops de septiembre/octubre. | PASS recuperación de trazas aprobadas; algunos eventos de renovación muestran "Sin cliente", pendiente relación, no reescribir el histórico. |
| Renovaciones | 19 vencidas, 2 ≤15d y 14 a 16–45d; COP 70,665,459 y GTQ 161,634 separados; acciones Propuestas/Pedir renovar/Cotizar presentes. | PASS render; estado fuente "Renovada" junto a vigencia vencida exige confirmación del vínculo entre renovaciones sucesoras. Sin mensajes enviados. |
| Cliente 360 | 434 fichas, 23 empresas y 395 personas tipificadas; 1,413 pólizas vinculadas a clientes visibles **y 12 pólizas sin cliente visible**; 218 activas vinculadas; GTQ 627,575 y COP 81,897,592. "País por validar" muestra 0. | PASS render y moneda; BLOQUEO DE CALIDAD relacional: 12 vínculos faltantes y discrepancias transpaís no marcadas. No inferir pérdida de 8 clientes por simple comparación de conteos. |
| Pólizas | 1,425 total, 230 activas, 1,193 históricas/sin cartera, 2 otras/validar; 16 próximas a vencer; inventario asegurador con FIANZAS y productos. | PASS listado; confirma identidad +11 sobre baseline, clasificación 230+1193+2=1425. |
| Orbit Finanzas | Módulo multipaís completo en UI (movimientos, dashboard, CxC/CxP, financiación, presupuesto, liquidaciones, conciliación, metas, IA); mes octubre abierto, **0 movimientos**. | NO CERTIFICAR cálculos: origen financiero aún no cargado/conciliado; no interpretar pantalla vacía como borrado. |
| Reportes | Producción carga 1,425 registros; pestañas Producción, Cartera, Comisiones, Renovaciones, Siniestros y Cancelaciones, exportes CSV/Excel/PDF visibles. | PASS lectura de producción; PDF **no certificado**: la interacción de exportación interrumpió el control, sin readback del archivo. |
| Configuración | Marca y razón social vigentes, logo/favicon, paleta, roles, países, catálogos, integraciones/APIs disponibles. | PASS lectura; no se alteró ningún valor ni Auth/IAM. |

### Hallazgos transversales nuevos

1. **Diferencia de rol resuelta por evidencia:** la Dirección sí ve 2,560 filas de Cobros y 35 interacciones, mientras Carlos Operativo veía solo 27 y cinco. La matriz dice que Operativo usa alcance "Todos" por defecto, pero prevalecen restricciones particulares del usuario; hace falta auditar su membresía y política efectiva, sin ampliar permisos a ciegas.
2. **Partición de pólizas conciliada aritméticamente:** `1,413 visibles con cliente + 12 sin cliente visible = 1,425`. Esto explica la pantalla sin afirmar que el cliente no exista en la base.
3. **Cuatro alertas de integridad por atender:** país póliza/cliente GT-CO, COP en GT para Cobros, 12 pólizas sin vínculo visible, y etiquetas vencida/renovada cuando no hay vínculo de sucesora confirmado. Son causas/identidades específicas, no justificación para reconstruir módulos ya aprobados.
4. **Prueba PDF pendiente por causa técnica de interacción:** no se obtuvo un archivo comprobable, no reportar PASS ni FAIL funcional definitivo hasta readback del artefacto.

## Conservación y siguiente movimiento

- Mantener intactos los 15 linajes de capacidades, 295 hallazgos, 86 tareas, 6 P0, I6 formal 50 %, B3-004/B3-008, aceptación I5, Renovaciones y demás aprobaciones de negocio.
- CI de nueva Preview PASS para código/bytes, pero `Control Plane Guard run 40861280336` falló por comparación histórica y debe repetirse sobre el nuevo sucesor de gobernanza. El PASS recién obtenido **es local**, no CI publicado.
- UAT **Paula/Dirección** de lectura ya ejecutada en Inicio, Cobros, Conciliaciones, Comisiones, Cancelaciones, Equipo/matriz, Aseguradoras/Conocimiento, Historial, Renovaciones, Cliente 360, Pólizas, Orbit Finanzas, Reportes y Configuración. Siguen pendientes: transacciones sintéticas controladas en backend para finmovs y Cronograma, negativas backend por rol, export PDF descargado, avance Cotizador/Comparativo/Fianzas en tarifas validadas, integración y operaciones financieras reales; no inferir que todo pasó solo por mostrar UI.
- No promover LIVE mientras Firestore B4-003, prueba backend efectiva, UAT y aprobación siguen HOLD. El plan de choque continúa transversal; no reabrir ni reimportar para explicar diferencias de rol.
- Si se transporta este sucesor de **gobernanza** a GitHub, usar commit `[skip ci]` para que el workflow histórico I6 Post-Salida (capaz de LIVE bajo sus gates) no se dispare; luego ejecutar exclusivamente `Gravicentra Control Plane Guard v5` en modo read-only. No usar workflow de promoción.

**Prohibiciones observadas:** 0 cambios en datos, Auth/IAM, Firestore Rules o producción; 0 envíos; 0 aceptación visual suplantada; 0 módulos reimplementados.
