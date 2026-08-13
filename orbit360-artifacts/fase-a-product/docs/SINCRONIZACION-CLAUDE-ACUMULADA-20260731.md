# SINCRONIZACIÓN ACUMULADA CLAUDE — ORBIT 360

Fecha de corte: 2026-07-31  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `LEDGER_RECTOR_ACTUALIZADO / NO_ZIP / NO_ENVIO_AUN`

Este documento sustituye como ledger vivo de pendientes reutilizables a `SINCRONIZACION-CLAUDE-ACUMULADA-20260717.md`. No borra la historia anterior; la hereda y agrega todos los patrones, fixes y restricciones relevantes generados después.

## 1. Regla anti-regresión

Toda candidata futura de Claude se audita antes de empalmar contra:

1. este ledger;
2. baseline vivo de PR #5/HEAD;
3. owners y contratos vigentes;
4. pruebas estáticas/sintéticas existentes;
5. Academia;
6. archivos backend protegidos.

La candidata se acepta únicamente por delta. No puede reemplazar un owner vigente por una versión anterior, reactivar un bridge retirado, volver a modal una vista ya aprobada como página completa, eliminar responsive ya cerrado, degradar estados honestos ni simplificar contratos de Póliza/Recibos/Vehículos.

## 2. Herencia obligatoria del ledger anterior

Se mantienen sin pérdida los IDs CL-001 a CL-026 del ledger 20260717, incluyendo Router owner, Legal idempotente, multirol/scopes, Cliente 360, Aseguradoras, credenciales, Comparativo, importadores bajo demanda, PWA sin bootstrap operativo y gates contra owners duplicados.

## 3. Acumulado posterior 2026-07-17 → 2026-07-31

| ID | Dominio | Patrón reusable que Claude debe conservar/incorporar | Estado |
|---|---|---|---|
| CL-027 | Metodología | `STOP_RETRY`: dos fallos de la misma etapa detienen reintentos; primero causa raíz + prueba sintética | `PENDIENTE_CLAUDE` |
| CL-028 | Metodología | Una autorización macro por bloque de riesgo; no microautorizaciones repetitivas para preflight/browser/hosting del mismo bloque | `PENDIENTE_CLAUDE` |
| CL-029 | Gates | Gate/validator no puede usar producción como entorno de desarrollo; debe reproducir la causa fuera de producción | `PENDIENTE_CLAUDE` |
| CL-030 | Control plane | Requests inmutables, lineage, digest, rollback y un solo gate por cierre | `PENDIENTE_CLAUDE` |
| CL-031 | Visual | Un PASS técnico de conteos/hidratación no equivale a UX aprobada; el gate visual debe verificar semántica, navegación y estados visibles | `PENDIENTE_CLAUDE` |
| CL-032 | Visual | Cero `undefined`, `NaN`, copy técnico o estado engañoso en UI; faltante = estado honesto visible | `PENDIENTE_CLAUDE` |
| CL-033 | Responsive | Dirección desktop + Operativo tablet + Asesor móvil; títulos, tabs, tablas, KPIs y fichas no pueden romperse al reducir viewport | `PENDIENTE_CLAUDE` |
| CL-034 | Cliente 360 | Lista y ficha deben usar el mismo read-model canónico; conteo de pólizas, prima, cartera y salud no pueden contradecirse | `PENDIENTE_CLAUDE` |
| CL-035 | Rendimiento | Resúmenes por cliente deben usar índices/caché invalidable; evitar O(clientes × colecciones completas) por render | `PENDIENTE_CLAUDE` |
| CL-036 | Pólizas | La vista de lectura de Póliza es página/ficha completa contextual, no modal/drawer | `PENDIENTE_CLAUDE` |
| CL-037 | Vehículos | La vista de lectura de Vehículo es ficha completa contextual, con enlace bidireccional a Póliza y Cliente | `PENDIENTE_CLAUDE` |
| CL-038 | Read-model | Aliases canónicos visuales no escriben: `primaTotal/primaNeta`, `formaPago/frecuencia`, `anioModelo`, `placaNormalizada`, `chasisFuente`, `motorFuente` | `PENDIENTE_CLAUDE` |
| CL-039 | Póliza detalle | Mostrar identidad contractual, cliente/asegurado, aseguradora, asesor, ramo/subramo/producto, estado, país/moneda, vigencias y renovación | `PENDIENTE_CLAUDE` |
| CL-040 | Póliza prima | Mostrar prima neta, gastos expedición, gastos financieros, otros/asistencias, base gravable, IVA/impuestos y prima total por separado | `PENDIENTE_CLAUDE` |
| CL-041 | Póliza riesgo | Mostrar suma asegurada, concepto/riesgo y objeto asegurado; para Auto, detalle del vehículo vinculado | `PENDIENTE_CLAUDE` |
| CL-042 | Póliza recibos | Recibos esperados/cartera deben mostrarse dentro de la ficha de Póliza sin confundirse con cobros aplicados | `PENDIENTE_CLAUDE` |
| CL-043 | Póliza historial | Historial, emisiones, renovaciones y endosos deben ser visibles desde la ficha completa | `PENDIENTE_CLAUDE` |
| CL-044 | Vehículo detalle | Mostrar marca, línea/tipo, modelo/año, placa, inciso, uso, chasis/VIN, motor, color, suma asegurada, concepto/descripcion y póliza | `PENDIENTE_CLAUDE` |
| CL-045 | Pólizas migración | Vigencia contractual manda sobre etiquetas operativas de pago; `Vencida` fuente no convierte automáticamente una vigencia activa en histórica | `PENDIENTE_CLAUDE` |
| CL-046 | Pólizas migración | No crear número de póliza ficticio; identidad y relaciones deterministas/idempotentes | `PENDIENTE_CLAUDE` |
| CL-047 | Recibos | Solo `Vigente/Por renovar` genera calendario/cartera activa; estados históricos preservan trazabilidad y no materializan cartera nueva | `PENDIENTE_CLAUDE` |
| CL-048 | Recibos/Cobros | `pago_reportado` ≠ pago aplicado ≠ conciliado; no inferir Cobros desde banco/recibos | `PENDIENTE_CLAUDE` |
| CL-049 | Finanzas | Recaudo/cobro de prima no crea `finmovs`; finmovs queda para movimientos reales de la empresa | `PENDIENTE_CLAUDE` |
| CL-050 | Cartera histórica | Histórico exigible se conserva separado de cartera activa y debe tener semántica honesta | `PENDIENTE_CLAUDE` |
| CL-051 | Proyección lifecycle | Wrappers/proyecciones deben ser idempotentes; envolver el store dos veces no puede impedir `attach()` ni listeners | `PENDIENTE_CLAUDE` |
| CL-052 | Seguridad UI | Lectura visual no debe exponer Firebase, backend, LAB, mock, secrets o referencias técnicas | `PENDIENTE_CLAUDE` |
| CL-053 | Multirol | Cambio de rol conserva owner/ruta válida y debe re-renderizar sin loops, overlays o pérdida del menú | `PENDIENTE_CLAUDE` |
| CL-054 | Aseguradoras | Directorio/ficha/conocimiento/recursos operativos conservan owners únicos y mínimo privilegio; no reconstruir desde candidata antigua | `PENDIENTE_CLAUDE` |
| CL-055 | Importadores | Fuentes separadas, dry-run/diff/confirmación/rollback; no mezclar Clientes, Pólizas, Vehículos, Cobros, planillas, banco o finmovs | `PENDIENTE_CLAUDE` |
| CL-056 | Datos faltantes | El frontend no inventa datos ausentes; muestra `Pendiente de completar` y conserva calidad/provenance | `PENDIENTE_CLAUDE` |
| CL-057 | Pólizas/Vehículos | Fuente canónica y read-model visual son capas distintas; aliases de presentación nunca sustituyen el contrato de persistencia | `PENDIENTE_CLAUDE` |
| CL-058 | Regresión | Toda candidata debe tener prueba que bloquee retorno de Póliza/Vehículo a modal como vista principal de lectura | `PENDIENTE_CLAUDE` |
| CL-059 | Regresión | Toda candidata debe bloquear retorno de `p.prima`/`p.forma`/`v.anio` legacy sin compatibilidad canónica | `PENDIENTE_CLAUDE` |
| CL-060 | Reuso transversal | Auth, membership, scopes, Orbit.store, readiness, rollback, browser harness, integridad y control-plane no se reconstruyen por módulo | `PENDIENTE_CLAUDE` |

## 4. Cierres que deben considerarse baseline, no rehacerse

Claude debe tratar como baseline funcional/arquitectónico ya resuelto y no reconstruir desde cero:

- M1 Cliente 360 + Aseguradoras y owners visuales;
- M2 bootstrap productivo read-only;
- M3 activación tenant;
- M4 writer durable/importadores y migración canónica de Clientes/Aseguradoras;
- M5 control-plane, responsive/viewport, multirol, technical copy, Academia y Hosting readiness;
- M6 product shell read-only, membership/access projection, validator actionability y legal gate lifecycle;
- Pólizas: writer canónico, vigencia como autoridad contractual, calidad pendiente, cero cartera en bloque Pólizas;
- Vehículos: identidad ligada a versión de Póliza, IDs determinísticos, cero fallback inseguro por número/placa;
- Recibos/Cartera 9.1.0: separación de recibos esperados, cartera activa, histórico exigible y Cobros;
- Rules compatibility mínimo privilegio;
- lifecycle idempotente de proyección Recibos/Cartera;
- owner full-page/read-model v1.199c de Cliente360/Pólizas/Vehículos.

## 5. Reglas UX específicas que NO pueden volver atrás

1. Póliza de lectura = pantalla completa.
2. Vehículo de lectura = pantalla completa.
3. Modal queda reservado para acciones acotadas: edición, confirmaciones o formularios cuando corresponda; no para sustituir la ficha principal.
4. Póliza muestra más que primas: debe incluir todos los datos operativos útiles disponibles.
5. Recibos/cartera se consultan dentro de contexto de Póliza y Cliente, sin mezclarse con Cobros aplicados.
6. Cliente 360 lista y ficha deben coincidir en conteos y estados.
7. Cero `undefined`/`NaN`.
8. Responsive no se considera “cerrado” si solo funciona a viewport desktop.

## 6. Backend y datos que Claude NO recibe

Clasificación `BACKEND_PROTEGIDO_NO_CLAUDE` / `SECRETO_DATO_REAL`:

- Firestore Rules/Storage Rules;
- Firebase/Auth/provider real;
- service accounts, secretos, credenciales;
- `credentialRef` reales;
- payloads y documentos privados A&S;
- 430 clientes, 1,373 pólizas, 1,032 vehículos, 1,293 recibos y 673 cartera como registros reales;
- workflows de escritura/deploy;
- requests de autorización;
- hashes/digests que revelen rutas privadas cuando no corresponda;
- adaptadores protegidos `backend-lab-*`, `store*`, `auth.js`, `importa.js` cuando el cambio sea backend específico.

Claude sí recibe la **semántica reusable** derivada de esos cierres, nunca los secretos/datos.

## 7. Archivos de referencia para el próximo paquete Claude

Prioridad alta:

- `docs/ACTUALIZACION-DELTA-CLAUDE-POLIZA-RECIBOS-V1199-20260711.md`
- `docs/AUDITORIA-CIERRE-POLIZA-RECIBOS-COBROS-V1199-20260711.md`
- `docs/ADDENDUM-MAESTRO-ACELERACION-PRODUCTIVA-REUSO-TRANSVERSAL-Y-CONTROL-AUTORIZACIONES-20260730.md`
- `docs/ACADEMIA-IMPACT-RULES-CANALES-LAB-PRODUCT-20260730.md`
- `docs/ACADEMIA-IMPACT-VEHICULOS-IMPORTADOR-IDENTIDAD-20260730.md`
- `docs/ACADEMIA-IMPACT-RECIBOS-CARTERA-CONCILIACION-20260730.md`
- `docs/CIERRE-CAUSA-RAIZ-CLIENTE360-POLIZAS-VEHICULOS-20260731.md`
- `modules/policy-receipts-v1199-detail-guard.js` — tomar únicamente semántica/UX reusable, no datos.
- `tools/orbit360-test-client360-policy-vehicle-readmodel-v1199c-20260731.mjs` — contrato anti-regresión.

## 8. Gate obligatorio para candidata futura

Antes de empalmar una candidata Claude debe verificarse, como mínimo:

```txt
NO_REGRESSION_ROUTER_OWNER
NO_REGRESSION_LEGAL_OWNER
NO_REGRESSION_MULTIROL_SCOPES
NO_REGRESSION_ASEGURADORAS_OWNER
NO_REGRESSION_IMPORTERS_ON_DEMAND
NO_REGRESSION_POLICY_FULLPAGE
NO_REGRESSION_VEHICLE_FULLPAGE
NO_REGRESSION_POLICY_CANONICAL_ALIASES
NO_REGRESSION_VEHICLE_CANONICAL_ALIASES
NO_UNDEFINED_NAN_VISIBLE
RESPONSIVE_DESKTOP_TABLET_MOBILE
CLIENT_LIST_DETAIL_COUNTS_COHERENT
RECEIPTS_NOT_COBROS
RECAUDO_NOT_FINMOVS
```

Si cualquiera falla, la candidata se corrige por delta; no se sustituye el baseline vivo.

## 9. Estado de envío

Este ledger está **actualizado y listo para formar parte del próximo paquete Claude**, pero no se genera ZIP ni se solicita candidata mientras la ruta crítica actual requiera cerrar el visual funcional de Pólizas/Vehículos/Recibos y sea más eficiente completar un paquete acumulado único.
