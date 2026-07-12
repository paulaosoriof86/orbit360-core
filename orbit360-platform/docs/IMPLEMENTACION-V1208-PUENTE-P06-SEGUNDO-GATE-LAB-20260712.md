# IMPLEMENTACIÓN v1.208 — PUENTE P0.6 Y SEGUNDO GATE LAB

Fecha: 2026-07-12  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy, producción ni `main`.

## 1. Carriles

```txt
Carril A — Claude continúa sobre su última candidata; no se interrumpe ni reinicia.
Carril B — contratos P0.6/P0.8/P0.9, seguridad, Orbit.store y segundo gate.
Carril C — fuentes y configuración tenant A&S ya procesadas; cierre sin reproceso.
```

## 2. Anti-reproceso verificado

No se reconstruyeron ni volvieron a extraer:

- ocho cotizadores Excel reales ya inspeccionados;
- tres cotizaciones PDF ya auditadas;
- lote de once fuentes A&S;
- contrato tarifario multiproducto P0.6;
- extractor Excel P0.6b;
- reconciliador P0.6c;
- adapter PDF P0.7;
- binding y segundo gate P0.8;
- runtime y persistencia metadata-only P0.9;
- configuración tenant P0.10;
- plan AseGuate automóvil/microbús P0.10c;
- contratos persistentes Cotizador/Comparativo v1.203.

La auditoría se concentró en conexiones faltantes entre piezas ya existentes.

## 3. Hallazgo B/C-01 — Cotizador v1.203 no consumía P0.6

### Necesidad

El contrato v1.203 solo ejecutaba cuatro formatos básicos:

```txt
prima_fija
porcentaje_valor
tabla_rangos
lookup
```

Las reglas profundas P0.6 ya podían representar prima fija, tasa, mínimos, cargos, lookup y otros esquemas, pero no existía un adapter runtime hacia `Orbit.quoteContracts.calculateAutomatic()`.

### Impacto anterior

Aunque una fuente A&S llegara a validarse y su binding fuera aprobado, el Cotizador no podía utilizar `tariffQuoteReconciliationP06c.calculateRule()`.

### Fix

Archivo nuevo:

```txt
core/quote-comparison-p06-runtime-adapter-v1208.js
```

Commit:

```txt
acbb9431cf18f482883d20917cfd0470a3ab3309
```

Comportamiento:

1. lee `aseguradora_bindings` y `aseguradora_reglas_tarifarias` por `Orbit.store`;
2. exige tenant, aseguradora y dimensiones compatibles;
3. exige binding materialmente habilitado por segundo gate;
4. exige regla en estado validado;
5. selecciona una única regla aplicable mediante P0.6;
6. calcula mediante P0.6c;
7. devuelve prima neta, gastos, impuestos, financiamiento y total separados;
8. conserva binding, regla, documento y versión en trazabilidad;
9. no escribe datos;
10. si no existe binding habilitado, conserva el fallback v1.203 y su bloqueo.

### Estado seguro

```txt
binding A&S habilitado: no
regla ejecutada con datos A&S: no
Cotizador habilitado: no
Comparativo habilitado: no
```

El adapter solo deja listo el camino técnico.

## 4. Alcance de cálculo soportado

P0.6c ejecuta actualmente:

```txt
fixed
rate
rate_with_minimum
rate_plus_fixed_with_minimum
lookup_range
```

Otros contratos P0.6 —por ejemplo matrices de edad/género/maternidad o esquemas por integrantes— permanecen bloqueados con `TIPO_CALCULO_NO_SOPORTADO`. No se genera una prima parcial ni se presenta como válida.

Esto significa:

- los casos compatibles pueden cerrar después de validación;
- salud y matrices complejas requieren un motor adicional antes de habilitarse;
- no corresponde volver a extraer la fuente para resolver esa limitación.

## 5. Bootstrap actualizado

Archivo:

```txt
core/aseguradoras-runtime-bootstrap-p09f.js
```

Commit:

```txt
f9f4a1f7defebe407b769c4d7304e6bc29281645
```

El bootstrap A&S LAB carga ahora el adapter P0.6 después del reconciliador y exige su presencia en preflight.

Prueba actualizada:

```txt
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs
```

Commit:

```txt
0c965eeb83da3940334c0063552c58adf0e64bd1
```

## 6. Hallazgo B/C-02 — segundo gate sin escritor externo

### Necesidad

P0.8 ya podía:

- evaluar binding;
- exigir fuente, presentación, evidencia y ruta de salida;
- validar país/moneda;
- exigir rol activo autorizado;
- exigir motivo y confirmación reforzada;
- generar `approved_pending_external_write`;
- construir un registro runtime.

Sin embargo, no existía un escritor que materializara ese registro en LAB y verificara su lectura.

### Riesgo anterior

La aprobación quedaba como objeto en memoria. Implementar un simple `enabled=true` habría omitido:

- huella del binding;
- actor/rol;
- motivo;
- confirmación;
- auditoría;
- cola de escritura;
- read model;
- rollback.

## 7. Escritor controlado implementado

Archivo nuevo:

```txt
core/aseguradoras-binding-enablement-lab-v1208.js
```

Commit:

```txt
6a78dc2636f2261f343bcc3b0e195e128a431399
```

### Build plan

Exige:

- binding existente;
- target válido;
- rol administrativo activo y asignado;
- motivo;
- confirmación reforzada;
- evaluación completa P0.8/P0.8c;
- paquete runtime único;
- huella esperada del binding.

No escribe.

### Preflight de persistencia

Exige:

- `firestore-lab`;
- tenant `alianzas-soluciones`;
- store LAB explícito;
- snapshots base;
- snapshots de conocimiento;
- security guard;
- Auth LAB esperado;
- actor y tenant coincidentes;
- binding sin cambios desde la aprobación;
- plan íntegro.

### Persistencia

Solo después del preflight:

1. inserta o actualiza un registro runtime separado en `aseguradora_bindings`;
2. no altera el binding fuente;
3. registra auditoría con antes/después, actor, rol y motivo;
4. espera la cola de escritura;
5. bloquea ante error o timeout;
6. confirma el registro en el read model;
7. intenta restaurar el estado anterior si falla.

### Deshabilitación

Usa exactamente el mismo gate y trazabilidad. No existe una ruta rápida sin aprobación.

## 8. Enlace al runtime

Archivo actualizado:

```txt
modules/aseguradoras-v1202-resources-bridge.js
```

Commit de enlace del writer:

```txt
0868485e1483bc86e5d3815e4f8c5e8c87e41425
```

Orden:

```txt
security guard
→ bootstrap P0.9/P0.10/P0.6
→ writer segundo gate
```

El writer:

- se carga después de todos los contratos;
- solo existe en A&S LAB;
- no está en `index.html` general;
- no se autoejecuta;
- no habilita nada al cargarse.

Prueba de frontera actualizada:

```txt
orbit360-platform/tools/orbit360-test-ays-runtime-link-v1208.mjs
```

Commit:

```txt
ff87f964806db4d1a2734bc37729715a039bd89c
```

## 9. Pruebas añadidas

### Adapter P0.6

```txt
orbit360-platform/tools/orbit360-test-quote-p06-runtime-adapter-v1208.mjs
```

Commit:

```txt
9486e8ab748c83c09168133d5d13d89fa43f7741
```

Valida con datos sintéticos:

- gate cerrado → cálculo bloqueado;
- gate abierto → motor P0.6c;
- prima/gastos/impuesto/total separados;
- trazabilidad de binding, regla, fuente y versión;
- cero escrituras;
- cero cruce entre aseguradoras.

### Escritor segundo gate

```txt
orbit360-platform/tools/orbit360-test-binding-enablement-lab-v1208.mjs
```

Commit:

```txt
12c4e5d73df27d2117ae0be17087520a6622b270
```

Valida con datos sintéticos:

- asesor no autorizado;
- confirmación ausente;
- binding inexistente;
- plan correcto;
- persistencia y read model;
- auditoría;
- binding fuente inmutable;
- deshabilitación controlada;
- cambio de huella;
- actor de otro tenant.

### Workflow consolidado

```txt
.github/workflows/orbit360-ays-runtime-link-v1208-smoke.yml
```

Último commit:

```txt
cf8e8fb414fb5084f8884bc1301618c6c341a42a
```

Incluye sintaxis y cinco pruebas acumuladas. A la fecha de este documento GitHub no devuelve runs ni statuses para el HEAD. El workflow queda `CONFIGURADO_NO_CONFIRMADO`; no se declara aprobado.

## 10. Estado real de A&S después de v1.208

### Cerrado técnicamente

```txt
runtime A&S enlazado sin contaminar index: sí
contrato P0.6 conectado al Cotizador: sí
fallback/default-deny conservado: sí
segundo gate con writer controlado: sí
habilitar y deshabilitar auditables: sí
IDs documentales AseGuate unificados: sí
pruebas versionadas: sí
```

### No ejecutado / pendiente real

```txt
CI visible: pendiente
navegador LAB: pendiente
fuente metadata-only persistida y releída: pendiente
reglas/presentaciones reales revisadas en LAB: pendiente
bindings AseGuate reales persistidos: pendiente
plan de segundo gate real construido: pendiente
segundo gate ejecutado: no
Cotizador A&S habilitado: no
Comparativo A&S habilitado: no
```

## 11. Próximo cierre sin reproceso

1. abrir el runtime LAB A&S;
2. verificar Auth, guard, snapshots y writer disponible;
3. persistir/releer la primera fuente metadata-only ya inventariada;
4. cargar las reglas y presentaciones ya extraídas, no volver a extraerlas;
5. reconciliar automóvil y microbús por separado;
6. construir bindings reales;
7. revisar bloqueos y resultados con cotizaciones ejemplo;
8. habilitar únicamente una combinación que cierre todos los gates;
9. comprobar Cotizador → Comparativo → impresión sin mezclar productos ni monedas;
10. repetir por combinación, no por aseguradora completa.

## 12. Frontera Claude

### Compartir como patrón reusable

- estados diferenciados entre extraído, validado, listo para aprobación y habilitado;
- confirmación reforzada para abrir una capacidad;
- antes/después y motivo;
- mensaje honesto cuando un motor no soporta un tipo de cálculo;
- deshabilitación con la misma trazabilidad;
- no afirmar habilitación solo porque el frontend construyó un plan.

### No compartir

- nombres o IDs A&S;
- aseguradoras reales;
- reglas, tasas, documentos o bindings;
- Auth LAB;
- runtime tenant;
- decisiones de habilitación.

## 13. Academia

La futura UX/Academia reusable debe enseñar:

```txt
Fuente recibida
→ extracción
→ revisión humana
→ reconciliación
→ binding tarifa/presentación
→ listo para aprobación
→ segundo gate
→ persistencia confirmada
→ habilitado
```

También debe explicar que:

- una regla validada no está habilitada;
- la habilitación aplica a una combinación concreta;
- país, moneda, producto, plan y riesgo no se heredan libremente;
- un cálculo no soportado se bloquea;
- deshabilitar no borra fuente, regla, historial ni auditoría.
