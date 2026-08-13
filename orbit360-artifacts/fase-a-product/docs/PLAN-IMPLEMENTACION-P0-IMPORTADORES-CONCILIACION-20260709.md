# PLAN DE IMPLEMENTACION P0 — IMPORTADORES Y CONCILIACION ORBIT 360 A&S

Fecha: 2026-07-09  
Carriles: B/C  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: plan implementable aditivo; no datos reales; no merge; no deploy.

---

## 1. Objetivo

Convertir la matriz P0 de importadores/conciliacion en una ruta de implementacion por archivo, sin repetir auditorias de modulos ya revisadas y sin desviarse hacia bloques posteriores.

El objetivo inmediato es cerrar la base operativa de:

- clientes;
- polizas;
- vehiculos/bienes asegurados;
- recibos/cobros;
- estados de cuenta aseguradora;
- planillas de comisiones;
- facturas de comisiones;
- CxC/CxP financieras;
- conciliaciones;
- documentos/OCR como propuestas;
- limpieza de UI/Academia de nombres de sistemas anteriores.

Cotizador/Comparativo, Finanzas profundo y Aseguradoras Hub completo quedan anotados, pero no son el siguiente foco hasta cerrar P0.

---

## 2. Principio anti-reproceso

No repetir auditorias generales ya hechas. La implementacion debe partir de los modulos existentes y agregar/corregir solo lo necesario.

Regla:

```txt
si ya existe modulo o flujo parcial → ajustar de forma aditiva
si falta entidad separada → crear contrato/coleccion logica nueva
si hay riesgo de pisar backend protegido → documentar y esperar autorizacion
si es UX/visual/prototipo complejo → documentar para Claude, no tocar todavia
```

---

## 3. Archivos protegidos que NO se deben tocar en P0

No modificar salvo autorizacion explicita:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-smoke-ays-lab-v99.ps1
tools/orbit360-integrar-backend-lab-index.ps1
tools/orbit360-run-flujo-ays-lab-v99.ps1
tools/orbit360-validar-backend-lab-contrato.mjs
```

---

## 4. Archivos candidatos a tocar

| Archivo | Estado actual | Accion P0 |
|---|---|---|
| `orbit360-platform/core/importa.js` | Importador transversal parcial. | Ajustar mapas, llaves, scope, dry-run, entidades separadas y estados. |
| `orbit360-platform/core/primas.js` o equivalente | Motor de primas/recibos si existe. | Revisar sin reescribir; ajustar generacion de recibos esperados. |
| `orbit360-platform/modules/clientes.js` | Cliente360/CRM ya auditado. | Agregar calidad/importacion/estado pendiente polizas si falta. |
| `orbit360-platform/modules/polizas.js` o modulo equivalente | Polizas ya existente. | Visualizar estado original vs operativo, vigencias, recibos esperados. |
| `orbit360-platform/modules/cobros.js` o equivalente | Cobros/cartera parcial. | Separar recibos esperados, fuente externa, aseguradora, cartera. |
| `orbit360-platform/modules/finanzas.js` | Ya tiene CxC/CxP, liquidaciones y banco beta. | Conectar comisiones/facturas/banco sin mezclar primas. |
| `orbit360-platform/modules/aseguradoras.js` | Directorio operativo avanzado pero todavia debe actuar como hub. | P0: no redisenar completo; solo documentar datos necesarios y no bloquear conciliacion. |
| `orbit360-platform/modules/configuracion.js` | Config general/API. | Quitar menciones visibles de sistema anterior; usar fuente externa/CRM externo. |
| `orbit360-platform/modules/academia.js` o contenido Academia | Parcial. | Quitar menciones a sistemas anteriores; usar lenguaje generico. |
| `orbit360-platform/docs/*` | Documentacion viva. | Mantener bitacora de decisiones y pendientes. |

---

## 5. Implementacion P0 por archivo

### 5.1 `core/importa.js`

Acciones:

1. Clientes:
   - Estado inicial `pendiente_polizas`.
   - Duplicado exacto vs probable.
   - Folio cliente bloqueado/no usado.
   - Crear alertas de calidad: documento, correo, telefono, geografia, asesor.
   - Asesor temporal configurable con alerta; no hardcode.

2. Polizas:
   - Cambiar dedup de `numero` a llave compuesta:

```txt
aseguradora + numeroPoliza + contratante/asegurado normalizado + vigenciaInicio + vigenciaFin
```

   - Guardar `estadoFuenteOriginal`.
   - Calcular `estadoOperativoOrbit`.
   - Tratar renovada con vigencia activa como `vigente_renovada`.
   - Marcar cancelada solo si coincide vigencia exacta.
   - Separar prima neta/gastos/IVA/total.
   - No generar cartera viva para historico.

3. Recibos/cobros:
   - No escribir todo en `cobros`.
   - Crear/usar capas logicas:
     - `recibosEsperados`
     - `recibosFuenteExterna`
     - `cobrosFuenteExterna`
     - `recibosAseguradora`
     - `carteraPrimas`
     - `conciliacionesPrimas`
   - Si no existen colecciones en seed/store, usar nombres logicos con store API; Firestore LAB acepta colecciones dinamicas via adapter.

4. Estados de cuenta aseguradora:
   - Importar a `estadosCuentaAseguradora` + `recibosAseguradora` + `carteraPrimas`.
   - No usar CxC/CxP.
   - No marcar pago definitivo.

5. Planillas de comisiones:
   - Crear `planillasComisiones`, `comisionesDevengadas`, `recaudosProbables`, `conciliacionesComisiones`.
   - Planilla puede indicar recaudo probable, no pago definitivo.
   - No crear prima pendiente.

6. Facturas de comisiones:
   - Distinguir `facturaComision` vs `facturaPrima`.
   - Factura comision crea `cxcComisiones`.
   - Factura prima/recibo cliente crea soporte/propuesta de aplicacion, no CxC.

7. Banco:
   - Mantener estado bancario en bandeja de conciliacion.
   - Crear finmov solo cuando se confirme.

8. Documentos:
   - Mantener estrategia de parches/diff.
   - Agregar tipos documentales: DPI, Cedula, RUT, RTU, Camara, patente, recibo servicios, poliza PDF, tarjeta circulacion, soporte pago, factura, cotizacion, tarifario.

### 5.2 `modules/finanzas.js`

Mantener estructura existente:

- movimientos;
- dashboard;
- CxC/CxP;
- liquidacion empresa;
- liquidacion asesores;
- conciliacion bancaria.

Ajustes P0:

- CxC solo para facturas de comision u otros conceptos financieros.
- CxP solo para asesores/vendedores/proveedores/otros egresos financieros.
- Primas pendientes no aparecen como CxC.
- Planilla de comisiones crea comision devengada; factura crea CxC; banco marca cobrada.
- CxP asesor nace cuando comision es liquidable, no solo cuando aparece en planilla.
- Pago a asesor se marca solo con banco/confirmacion.

### 5.3 `modules/aseguradoras.js`

Estado actual ya reconoce que documentos, tarifas y cotizaciones alimentan IA/cotizador. P0 no es redisenar todo el hub, pero si debe dejar compatibilidad para:

- documentos de aseguradora;
- productos;
- tarifas;
- cotizaciones PDF;
- polizas ejemplo;
- contactos;
- portales/accesos con `credentialRef`;
- reglas de pago;
- reglas de comision;
- pais/moneda;
- fuentes para cotizador/comparativo.

Accion P0:

- No convertir todavia en rediseño visual grande.
- Asegurar que docs de aseguradora no creen tarifas oficiales sin aprobacion.
- Guardar como propuestas/versiones si se extraen.
- Documentar para Claude el rediseño posterior a Hub.

### 5.4 `modules/configuracion.js`

Accion P0:

- Cambiar cualquier texto visible tipo nombre de sistema anterior por:
  - `CRM externo / sistema anterior`
  - `Fuente externa de importacion`
  - `Base externa`
- No mencionar herramientas especificas en Academia/UI/manuales generales.

### 5.5 Academia

Accion P0:

- Ruta generica:
  - importar fuentes externas;
  - validar datos extraidos;
  - conciliar primas;
  - conciliar comisiones;
  - diferenciar cartera de primas vs CxC/CxP financiera;
  - cargar documentos;
  - validar OCR;
  - auditar cambios.
- Sin nombres de sistemas anteriores.

---

## 6. Orden de implementacion recomendado

### Paso 1 — limpieza visible urgente

- Quitar menciones visibles de sistemas anteriores en Configuracion/Academia/UI.
- Impacto bajo, riesgo bajo.

### Paso 2 — corregir polizas en importador

- Llave compuesta.
- Estado original vs operativo.
- Renovada vigente.
- Cancelada exacta por vigencia.
- Divisa por aseguradora/pais.
- Impacto alto, riesgo medio.

### Paso 3 — separar recibos/cartera/conciliacion

- Crear entidades separadas:
  - `recibosEsperados`
  - `recibosFuenteExterna`
  - `recibosAseguradora`
  - `carteraPrimas`
  - `conciliacionesPrimas`
- Impacto alto, riesgo medio/alto.

### Paso 4 — planillas/facturas/comisiones

- Planilla crea comision devengada y recaudo probable.
- Factura crea CxC de comision.
- Banco confirma recaudo.
- Liquidacion crea CxP asesor.
- Impacto alto, riesgo medio.

### Paso 5 — documentos/OCR como propuestas

- Extender tipos documentales.
- Mantener diff/validacion.
- No escribir criticos directo.
- Impacto alto, riesgo bajo/medio si se mantiene como propuesta.

### Paso 6 — Aseguradoras Hub/Cotizador/Comparativo

- Solo despues de cerrar pasos P0 anteriores.
- Preparar para Claude si implica rediseño UX.

---

## 7. Smoke minimo por paso

### Smoke 1 — limpieza visible

- No debe aparecer nombre de sistema anterior en UI/Academia/manuales generales.
- Documentacion tecnica interna puede conservar trazabilidad si aplica.

### Smoke 2 — polizas

Casos ficticios:

- Renovada con vigencia activa → `vigente_renovada`.
- Cancelada exacta → `cancelada_terminal` solo esa vigencia.
- Mismo numero con distinta vigencia → dos vigencias, no fusion.
- Sin moneda con aseguradora confiable → moneda por pais.
- Sin aseguradora confiable → `REQUIERE_VALIDACION_PAIS_MONEDA`.

### Smoke 3 — cartera

- Recibo esperado no es cobro confirmado.
- Estado aseguradora pendiente crea `pendiente_aseguradora`.
- Fuente externa pagado + aseguradora pendiente crea conflicto.
- Historico no infla cartera operativa.

### Smoke 4 — comisiones

- Planilla crea comision devengada.
- Planilla crea recaudo probable, no pago definitivo.
- Factura coincide con planilla + IVA → `factura_cuadra`.
- Factura inexistente → `pendiente_facturar` o `no_facturado_acumulado`.
- CxC creada solo por factura de comision.

### Smoke 5 — banco

- Estado banco no crea finmov final sin validacion.
- Banco puede marcar CxC comision cobrada.
- Banco puede marcar CxP asesor pagada.
- Banco no crea clientes/polizas/recibos.

---

## 8. Pendientes para Codex/backend

Cuando se pida implementacion a Codex, el prompt debe ordenar:

1. Trabajar exclusivamente en `ays/backend-tenant-lab-v99-20260703`.
2. No tocar archivos protegidos.
3. Implementar primero limpieza visible y P0 de importadores.
4. No introducir datos reales.
5. Usar datos ficticios para smoke.
6. Mantener compatibilidad `Orbit.store`.
7. Ejecutar validadores/smoke existentes.
8. Documentar cambios en bitacora.

---

## 9. Pendientes para Claude/prototipo

No enviar a Claude todavia. Cuando corresponda, Claude debe recibir:

- rediseño de Aseguradoras como Hub;
- UX de importador documental;
- UX de conciliacion de primas;
- UX de conciliacion de comisiones;
- UX de Academia generica;
- UX de Cotizador/Comparativo conectado a tarifas/documentos.

Debe tener prohibido:

- tocar backend protegido;
- reemplazar `store.js`;
- hardcodear A&S;
- mostrar nombres de sistemas anteriores;
- simular integraciones activas;
- escribir datos sin validacion.

---

## 10. Criterio de cierre P0

P0 se considera cerrado cuando:

- importadores crean/actualizan con dry-run y auditoria;
- polizas usan llave compuesta y estados correctos;
- recibos/cartera estan separados por capa;
- estados de cuenta aseguradora no se mezclan con CxC;
- planillas/facturas crean flujo de comisiones correcto;
- CxC/CxP no incluyen primas pendientes;
- UI/Academia no menciona sistemas anteriores;
- smoke ficticio pasa;
- documentacion queda actualizada.
