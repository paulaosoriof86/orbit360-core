# Bloque 1 · Reparación visual DOM v4 · Cliente 360 + Aseguradoras

Fecha: 2026-07-20  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Estado

`GO_GATE_VISUAL_DOM_V4 · REVISIÓN HUMANA FINAL PENDIENTE`

El cierre técnico anterior fue revocado por la revisión humana porque el DOM visible contradijo la evidencia interna del validador. Esta iteración corrige producto, contrato visual y validador antes de ejecutar nuevamente el mismo gate.

## Hallazgos de la revisión humana

1. Cliente 360 mostraba 414 clientes, pero `0 empresas · 0 personas`.
2. Los filtros Persona y Empresa quedaban vacíos.
3. El listado mostraba el valor de origen `natural`.
4. La ficha mostraba `InvalidDate`.
5. El módulo realizaba dos repintados perceptibles.
6. Los clientes sin país no tenían un control visible para identificarlos.
7. El título y la ficha de Aseguradoras perdían jerarquía en móvil.
8. Contactos, teléfonos, correos y URLs se mostraban como controles deshabilitados sin jerarquía ni acciones directas.
9. Los datos bancarios requerían mejor jerarquía sin debilitar el control seguro de revelado y copia.

## Clasificación

- `FUNCTIONAL_DEFECT`: filtros, fecha visible, repintado y enlaces no accionables.
- `DATA_CONTRACT_FAILURE`: el consumidor visual recibía valores crudos antes de la proyección canónica.
- `VALIDATOR_STALE`: el gate anterior verificaba el helper interno, no el DOM que veía la usuaria.

## Causa raíz

Cliente 360 cargaba la proyección canónica de manera tardía. El primer render consumía los valores crudos (`natural`, fechas no normalizadas) y un evento posterior intentaba corregir la vista. Esto explicaba simultáneamente los filtros vacíos, los conteos en cero, `InvalidDate` y el doble repintado.

Aseguradoras representaba los datos de lectura mediante `input` y `select` deshabilitados. Al retirar visualmente sus bordes y depender de placeholders, la ficha perdía etiquetas y jerarquía, especialmente en móvil. Correos, teléfonos y URLs quedaban como texto no operativo.

## Implementación

### Carril A · Frontend, UX y Academia

- Contrato visual reusable `client-insurer-visual-contract-v20260720`.
- Proyección canónica de copias de lectura antes del Router; no modifica datos persistidos.
- Filtros Persona, Empresa, Colombia y País por validar con conteos exactos.
- Fechas normalizadas antes del primer render.
- Navegación sin pantalla vacía posterior al primer contenido.
- Tarjetas semánticas para contactos, portales y bancos.
- Correos, teléfonos y URLs accionables, seleccionables y copiables.
- Encabezado y ficha de Aseguradoras adaptados a móvil.
- Academia actualizada a contenido 1.223: País por validar, enlaces accionables, seguridad bancaria, primer render y diferencia entre defecto funcional y validador obsoleto.

### Carril B · Backend, seguridad y gates

- `Orbit.store`, Auth, Router, Firestore LAB, reglas e importadores protegidos no fueron modificados.
- El control `Orbit.vault` se conserva para revelar y copiar temporalmente datos bancarios permitidos.
- El validador ahora comprueba el DOM visible en Dirección escritorio, Operativo tableta y Asesor móvil.
- El publicador auxiliar de resultados en PR continúa clasificado como `PIPELINE_MECHANISM_FAILURE`; no invalida el gate cuando la aserción final es exitosa.

### Carril C · Datos reales A&S

- Sin reimportación y sin escritura correctiva.
- 414 clientes, 26 aseguradoras y 7 asesores preservados.
- Distribución validada: 391 Persona, 23 Empresa, 337 GT, 16 CO y 61 `REQUIERE_VALIDACION`.
- No se cargaron pólizas, vehículos, cobros, cartera, comisiones ni financiero histórico.

## Evidencia oficial sanitizada

- HEAD runtime: `a98c6d27179562b58e43d86f6bb9dcf7b0e4d03f`
- Run: `29712959235`
- Job: `88260056434`
- Artifact: `8449412815`
- Digest: `sha256:dc4a84f78ca22e240c9c7e3183c4f490d7c030bb12beeceae1b0bfc1c65f2d98`
- Resultado: `ok:true`
- Build exacto: `true`
- Sin PII ni secretos en evidencia.

Aprobaron:

- preflight y contratos;
- owners y sintaxis;
- autenticación y legal una vez;
- 414/26/7;
- 391 Persona y 23 Empresa;
- filtros CO=16 y País por validar=61;
- cero tipos, países y fechas inválidos;
- cero pantalla vacía después del primer contenido;
- encabezado de Aseguradoras dentro del viewport en 1440, 820 y 390 px;
- contactos, portales y banco con jerarquía;
- enlaces de correo, teléfono y portal;
- copia segura y revelado seguro de banco.

## Claude

- `REPLICABLE_CLAUDE_ACUMULADO`: proyección temprana de lectura, contrato visual semántico, filtros canónicos, tarjetas responsive, enlaces accionables y validación del DOM.
- `ACADEMIA_ACTUALIZAR`: completado en contenido 1.223.
- `TENANT_AYS_ONLY`: conteos 414/26/7 y distribución real.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: bootstrap LAB, store Firestore, credenciales, reglas, auditoría y canal.
- `SECRETO_DATO_REAL`: nombres, correos, teléfonos, cuentas y filas específicas no se transfieren.

## Pendiente y siguiente acción exacta

Revisión humana final sobre el canal LAB publicado por el run 29712959235:

1. confirmar que no existe doble parpadeo perceptible;
2. confirmar Persona=391 y Empresa=23;
3. confirmar País por validar=61;
4. confirmar ausencia de `natural` e `InvalidDate`;
5. confirmar encabezado móvil de Aseguradoras;
6. confirmar jerarquía y acciones de correo, teléfono, WhatsApp y portal;
7. confirmar que banco conserva Ver/Copiar seguro.

Solo con esa aprobación humana se declara M1 cerrado y se inicia Bloque 2, bootstrap productivo read-only.
