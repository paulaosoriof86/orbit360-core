# RUNBOOK — VALIDACION VISUAL P0 IMPORTADORES Y CONCILIACION

Fecha: 2026-07-09
Carril: A/B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: runbook preparado; no ejecutado.

## Objetivo

Validar visualmente el flujo P0 de importadores y conciliacion antes de usar fuentes reales o permitir escritura controlada.

Este runbook no autoriza merge, deploy ni carga real. Solo define que revisar cuando la validacion visual sea indispensable.

---

## 1. Precondiciones

Antes de abrir validacion visual deben cumplirse estas condiciones:

1. PR #5 sigue abierto y draft.
2. Rama activa es `ays/backend-tenant-lab-v99-20260703`.
3. No hay merge a `main`.
4. No hay deploy.
5. No hay datos reales hardcodeados.
6. No se han tocado secretos.
7. CI/smoke fue revisado o se documenta que no hay resultado visible.
8. Se valida con datos ficticios o dry-run sanitizado.

---

## 2. Pantalla a abrir

Modulo:

```txt
Importar
```

Debe verse:

- tarjetas de importacion por grupo;
- bloque de motor de extraccion adaptable;
- tablero operativo minimo P0 debajo del bloque del motor;
- conteos por capa;
- alertas de validacion;
- tabla por capa.

No debe verse:

- nombres de sistemas legacy especificos;
- Firebase, Firestore, LAB, localStorage, mock, demo o smoke en texto cliente;
- secretos, credenciales, tokens o configuraciones tecnicas;
- mensajes que prometan escritura real sin confirmacion.

---

## 3. Capas que deben aparecer en tablero

El tablero debe mostrar como minimo:

```txt
polizas
recibosEsperados
recibosAseguradora
carteraPrimas
conciliacionesPrimas
comisionesDevengadas
facturasComisiones
cxcComisiones
movimientosBanco
conciliacionBancaria
cxpAsesores
```

Cada capa debe mostrar:

- conteo;
- pendientes;
- alertas de validacion;
- monto cuando aplique;
- tabla de control.

---

## 4. Datos ficticios sugeridos

Para validar visualmente sin riesgo se recomienda usar datos ficticios con estos casos:

### 4.1 Poliza renovada vigente

- Estado fuente: `Renovada`.
- Vigencia: incluye fecha actual.
- Forma de pago: mensual.
- Esperado: genera o muestra recibos esperados; no crea cobros confirmados.

### 4.2 Estado de cuenta aseguradora

- Registro pendiente reportado por aseguradora.
- Esperado: cae en `recibosAseguradora`, `carteraPrimas` y `conciliacionesPrimas`.
- No debe caer en CxC financiera.

### 4.3 Planilla comision

- Comision devengada por planilla.
- Esperado: crea `planillasComisiones`, `comisionesDevengadas`, `conciliacionesComisiones`.
- No debe crear prima pendiente.

### 4.4 Factura comision

- Factura identificada como comision/intermediacion/corretaje.
- Esperado: crea `facturasComisiones` y `cxcComisiones`.
- No debe crear cartera de primas.

### 4.5 Banco comision

- Abono que coincide con CxC comision.
- Esperado: crea `movimientosBanco` y `conciliacionBancaria` pendiente.
- CxC queda como recaudo probable pendiente de confirmacion, no cobrada definitiva.

### 4.6 Pago asesor

- Cargo que coincide con CxP asesor.
- Esperado: CxP queda como pago probable pendiente de confirmacion, no pagada definitiva.

---

## 5. Validacion de confirmacion reforzada

Debe existir UI o flujo para:

- resumen de impacto;
- total de operaciones;
- crear/actualizar;
- bloqueados;
- registros que requieren validacion;
- riesgos;
- usuario confirmador;
- motivo;
- frase exacta:

```txt
CONFIRMO ESCRITURA CONTROLADA
```

Sin esa frase, no debe ejecutarse escritura.

---

## 6. Validaciones de bloqueo

La escritura debe bloquearse si existe cualquiera de estas condiciones:

- batch no aprobado;
- falta confirmacion humana;
- falta motivo;
- falta usuario confirmador;
- faltan pais/moneda/llave/formato de pago/monto cuando aplique;
- registros con `requiereValidacion`;
- `validationStatus` distinto a `validado`;
- intento de escribir en colecciones bloqueadas.

Colecciones bloqueadas:

```txt
finmovs
cobros
cxc
cxp
usuarios
roles
permisos
secrets
credenciales
```

---

## 7. Evidencia a guardar

Si se ejecuta validacion visual, guardar evidencia de:

1. pantalla Importar con tablero P0 visible;
2. tarjetas P0 con conteos;
3. tabla de una capa con registros ficticios;
4. alerta de validacion visible;
5. pantalla/flujo de confirmacion reforzada;
6. intento bloqueado sin frase exacta;
7. confirmacion no ejecutada con datos reales;
8. consola sin errores criticos si se revisa navegador.

No guardar ni compartir capturas con datos reales de clientes, polizas, banco o documentos.

---

## 8. Criterios de aprobado visual

Aprobado visual minimo si:

- el modulo Importar abre sin romper navegacion;
- tarjetas de importacion siguen funcionando;
- tablero P0 aparece;
- capas P0 aparecen;
- al seleccionar capa cambia la tabla;
- no hay texto tecnico interno visible para cliente;
- no se muestran nombres de fuentes legacy especificas;
- no se habilita escritura sin confirmacion;
- no se crean pagos definitivos por flujo visual;
- no se crean finmovs por importar banco.

---

## 9. Criterios de rechazo visual

Rechazar y corregir si:

- Importar queda en blanco;
- tablero no carga;
- botones de importacion dejan de abrir drawer;
- aparece texto tecnico interno visible;
- aparece fuente legacy especifica por nombre;
- se marca pago/cobro definitivo sin confirmacion;
- banco crea finmov definitivo;
- primas pendientes aparecen como CxC financiera;
- CxC/CxP se mezclan con cartera de primas;
- aparece error de JS que bloquea navegacion.

---

## 10. Accion manual

No requerida en este momento.

Sera indispensable solo cuando se necesite validar navegador real o cargar fuente real desde el equipo de Paula.

Cuando sea indispensable, la solicitud manual debe indicar:

- motivo concreto;
- un solo bloque;
- sin alternativas;
- sin merge;
- sin deploy;
- sin datos reales salvo autorizacion expresa;
- resultado esperado para pegar de vuelta.

---

## 11. Siguiente paso despues de validacion visual

Si la validacion visual pasa:

1. preparar dry-run real sanitizado por fuente separada;
2. generar reporte de impactos;
3. revisar bloqueos;
4. pedir confirmacion humana solo si se va a escribir;
5. mantener PR draft hasta aprobacion final.

Si falla:

1. corregir solo el punto fallido;
2. no abrir nuevos modulos;
3. no pasar a Claude;
4. no pedir carga real;
5. documentar causa y fix.
