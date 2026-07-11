# Delta acumulado — candidata Claude v1.197 vs rama viva Orbit 360 A&S

Fecha: 2026-07-11  
Candidata: `Prototype Development Request - 2026-07-11T093254.494.zip`  
SHA256: `8ea0fd79eb80bf8b9da2601e17f4922292087e297773bebfe9530e4745aab1a0`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, deploy ni producción.

## Propósito

Registrar todo lo que la candidata todavía no contiene, simplifica, declara incorrectamente o no recibió desde cambios locales/backend. Este archivo alimentará el próximo paquete Claude y evita que una versión incremental futura revierta avances de la rama.

El ZIP duplicado `Prototype Development Request - 2026-07-11T093254.494(1).zip` tiene el mismo SHA256. No es una candidata nueva y no requiere una segunda auditoría.

## Regla incremental

```txt
La candidata más reciente no es automáticamente el baseline completo.
Baseline vivo = candidata aceptada + rama protegida + hotfixes + contratos
+ datos/modelos operativos + documentación posterior.
```

Cuando el prototipo no incluye un cambio local reutilizable, se registra aquí para que Claude lo replique en UX/Academia sin copiar secretos, datos reales ni lógica backend exclusiva.

## 1. Infraestructura y composición que faltan en la candidata

La candidata no incluye la composición viva completa de la rama:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store-firestore-lab.local.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
core/backend-resource-contracts.js
modules/aseguradoras-v1197-ux-bridge.js
data/academia-v1197-bridge.js
styles/v1197-empalme.css
tools/validadores posteriores
```

Su `index.html` no debe copiarse completo porque:

- retira loaders/adapters LAB;
- pierde hotfixes de Portal y versiones posteriores;
- reintroduce preferencia de sidebar vía `localStorage`;
- no carga contratos de documentos/credenciales;
- no representa el baseline vivo.

¿Aplica a Claude/prototipo? **Sí, parcialmente.** Debe conservar orden de carga, hooks y ausencia de almacenamiento directo; no debe incluir backend LAB, secretos ni configuración real.

## 2. Documentación desactualizada dentro de la candidata

### README

Todavía afirma:

- store localStorage “hoy” sin reconocer el adapter LAB;
- solo Inicio/Cliente360 construidos;
- resto en roadmap;
- arquitectura reducida a pocos archivos.

### CHANGELOG/BITÁCORAS

- no consolidan la serie v1.188–v1.197 de forma coherente;
- el encabezado histórico habla de commits directos a `main`;
- existen entradas fuera de orden;
- varias afirmaciones de cierre no tienen evidencia independiente;
- el manifiesto sigue nombrado `v1187` aunque el ZIP llega a v1.197.

### Auditorías y smoke internos

- varios reportes pertenecen a v1.79, v1.114, v1.117, v1.126 o v1.140;
- no prueban la candidata v1.197 completa;
- no incluyen comparación reproducible contra la rama viva;
- no aportan capturas responsive de la última versión;
- no validan backend LAB, datos A&S ni permisos reales.

¿Aplica a Claude/prototipo? **Sí.** La próxima entrega debe actualizar README, CHANGELOG, manifiesto, bitácoras, pendientes y smoke de la versión exacta.

## 3. Aseguradoras

### Avances aceptados

- directorio como portada;
- ficha por pestañas;
- copy más operativo;
- KPI con detalle inicial;
- visor documental inicial;
- `credentialRef` en lugar de campo de contraseña;
- responsive mejorado.

### Lo que aún falta o es inferior a la rama

1. Su motor `_fuentes` es más simple que el vivo.
2. Reduce dimensiones de clasificación y capacidades de consumo.
3. La edición profunda sigue siendo modal/draft parcial.
4. Alta de aseguradora puede crear un registro incompleto antes de confirmar.
5. Persistencia de cambios sensibles no siempre tiene motivo, antes/después y rollback.
6. Cobertura de vínculos para desactivar/borrar no es completa.
7. Identidad documental por índice/nombre puede ser inestable.
8. Metadatos de documento son incompletos.
9. KPI requiere semántica consistente, filtros y regreso contextual.
10. Plataformas necesitan múltiples usuarios/roles cuando aplique.
11. Cuentas, instrucciones de pago y visibilidad deben provenir de tenant/permiso.
12. Logo no debe persistirse como Data URL en la entidad.
13. Importador del directorio no refleja toda la estructura GT/CO.
14. Aún no se usa el dry-run sanitizado real para comprobar el módulo.
15. Debe existir calidad/última revisión/responsable por aseguradora.

### Cambios locales que la próxima candidata debe recibir

- bridge de directorio/ficha principal;
- conservación obligatoria de `base._fuentes`;
- rol activo + extras/restricciones;
- cuentas enmascaradas/revelables según permiso;
- usuario copiable y credencial por referencia;
- visor mediante `documentRef`;
- estados honestos sin proveedor conectado;
- desactivar vinculación en vez de borrar;
- integración con datos GT/CO sanitizados.

¿Aplica a Claude/prototipo? **Sí**, excepto proveedor real de secretos/Drive y datos reales.

## 4. Cotizador

Pendientes:

1. Gate real todavía debe ser `default-deny`, no solo copy.
2. Debe validar combinación país/moneda/ramo/producto/segmento/riesgo/vehículo/uso/plan.
3. Debe consumir únicamente fuente/versión validada y habilitada.
4. Debe distinguir tarifa, regla de cálculo, presentación y caso de prueba.
5. DTO canónico pierde campos al transferir a Comparativo/Historial.
6. No está integrada la profundidad funcional de `comparativo_final_v110.html`.
7. No debe almacenar historial operativo en preferencia del navegador.
8. Debe conectarse a Cliente360/Lead/Ops y preservar trazabilidad.
9. Prima neta, gastos, IVA/impuestos y total deben mantenerse separados.
10. País/moneda nunca se infieren silenciosamente.

¿Aplica a Claude/prototipo? **Sí.** El backend proveerá fuentes validadas; Claude debe mantener UX/configuración y DTO compatibles.

## 5. Comparativo

Pendientes:

1. Integrar los patrones avanzados del v110 sin copiar Firebase/Auth/storage/router.
2. Preservar coberturas, límites, deducibles, exclusiones, condiciones y vigencias.
3. Comparar ofertas normalizadas sin perder campos.
4. Recomendación debe explicar criterios y permitir edición humana.
5. Historial, impresión, PDF, WhatsApp/correo y asesoría deben ser configurables por tenant.
6. Gate de fuentes/aseguradoras debe ser real.
7. Debe abrir Cliente360/Lead y conservar contexto.
8. Debe documentar fuente, versión, fecha, moneda y validación de cada opción.
9. No se debe presentar envío/emisión real si integración no está conectada.

¿Aplica a Claude/prototipo? **Sí.** Backend externo y secretos no.

## 6. CRM/Cliente360

La candidata no contiene todo el baseline operativo posterior:

- dry-run sanitizado de 440 clientes;
- 414 crear / 26 requieren validación;
- reglas de asesores A&S;
- multirol y scope por colección/módulo;
- estados derivados posteriores a pólizas;
- gestiones de corrección;
- campos permitidos/prohibidos para asesores;
- calidad por asesor;
- vínculo completo con pólizas/vehículos/recibos/cobros/cartera/comisiones;
- lógica de documentos por referencia;
- validación del acceso Portal por asesor.

Pendientes de cierre:

1. expediente completo y editable según permiso;
2. navegación cruzada coherente;
3. Cliente360 como fuente operativa, no solo visual;
4. scopes propios/equipo/todos/ninguno;
5. dato faltante editable sin permitir cambios críticos;
6. pago reportado ≠ pago aplicado;
7. estados de cliente derivados del modelo de pólizas/cobros;
8. smoke con datos sanitizados.

¿Aplica a Claude/prototipo? **Sí.** Debe reflejar roles, scopes, gestiones y estados; no incluir nombres/payload reales.

## 7. Pólizas, vehículos, recibos, cobros y cartera

Pendientes que deben mantenerse incrementales:

- llave canónica de póliza;
- complemento Auto sin duplicar pólizas;
- Vigente/Por renovar genera recibos/cartera;
- otros estados son histórico/recuperación;
- prima separada;
- país/moneda obligatorios;
- forma de pago y recibos esperados;
- cobros/recaudos separados de `finmovs`;
- conciliación propuesta antes de aplicar;
- documento soporte como propuesta/diff;
- auditoría y scope.

La candidata debe comprobar, no reescribir, estos contratos.

¿Aplica a Claude/prototipo? **Sí.** Son reglas de producto reutilizables y deben enseñarse en Academia.

## 8. Comisiones y Finanzas

Pendientes/deltas:

1. comisión aseguradora ≠ tarifa de cotización;
2. prima pendiente no genera CxC/CxP financiera;
3. factura emitida ≠ ingreso real;
4. factura → CxC → cobro → ingreso;
5. comisión asesor según configuración y prima neta recaudada;
6. movimientos históricos no crean clientes/pólizas/cobros;
7. GTQ/COP separados;
8. estados de cuenta bancarios solo proponen conciliación;
9. respaldo bancario y trazabilidad;
10. dashboards/KPI con desglose operativo;
11. usar movimientos reales A&S en su fase sin hardcodearlos.

¿Aplica a Claude/prototipo? **Sí**, salvo payload real y lógica secreta del backend.

## 9. Ops y Leads

La candidata mantiene módulos, pero no prueba cierre A&S.

Pendientes:

- Kanban/lista/ficha estables;
- sincronía Ops↔Leads;
- cadencias y recordatorios;
- asignación por rol/scope;
- conversión a cliente/póliza sin duplicados;
- solicitudes del Portal y gestiones de corrección;
- vínculo con Cotizador/Comparativo;
- estados y responsables definidos con Paula cuando falte lógica;
- datos sanitizados y smoke.

¿Aplica a Claude/prototipo? **Sí.** Backend de notificaciones/integraciones se conecta aparte.

## 10. Marketing

La candidata no usa todavía el calendario y manual reales A&S como tenant configurado.

Pendientes:

- importar calendario 2026;
- calendario mensual/flujo de piezas;
- responsables, estados, canales y campañas;
- segmentación desde CRM real sanitizado;
- paleta, tipografía, voz y Registro SIB CS-254 por configuración;
- integraciones en estado honesto;
- métricas y retorno;
- no hardcodear marca en core.

¿Aplica a Claude/prototipo? **Sí.** OAuth/API real corresponde al backend.

## 11. Configuración, Equipo y multirol

Pendientes:

- múltiples roles asignados;
- rol activo/default y cambio de vista;
- módulos base + extras - restringidos;
- data scopes independientes;
- países/metas/estado;
- motivo/antes/después;
- confirmación reforzada al abrir acceso a todos;
- último administrador;
- catálogos GT/CO;
- altas manuales con defaults del tenant;
- integraciones configurada/conectada/verificada;
- secretos fuera del navegador.

¿Aplica a Claude/prototipo? **Sí**, salvo Auth real y secretos.

## 12. Documentos, visor y bóveda

Claude tiene razón en la separación de responsabilidades:

```txt
Patrón UI de visor/bóveda -> Carril A, ya aportado.
Drive OAuth, Shared Drives, secreto real, reautenticación, TTL,
auditoría durable y proveedores -> Carril B.
```

Deltas locales posteriores que Claude debe conocer:

- `backend-resource-contracts`;
- estados honestos sin provider;
- documentos por `documentRef`;
- credenciales por `credentialRef`;
- no persistir secreto en DOM/store/log;
- copia/revelado temporal por permiso;
- visor transversal con fallback externo;
- integrar el patrón en todos los módulos.

¿Aplica a Claude/prototipo? **Sí**, solo la UX/contrato y estados.

## 13. IA, Automatizaciones e Integraciones

Pendientes:

- eliminar API keys persistidas como preferencias literales;
- frontend captura referencia/solicitud de conexión, no secreto;
- integración configurada ≠ activa;
- módulo no llama proveedor directo;
- Make, correo, WhatsApp, Google, redes y motores IA detrás de backend;
- prueba de conexión y estados honestos;
- eventos con trazabilidad;
- Academia por rol.

¿Aplica a Claude/prototipo? **Sí**, excepto adapters/secretos.

## 14. Academia

La candidata mejoró metadatos, pero todavía debe:

- enseñar los flujos reales de cada módulo;
- usar rol activo y scope;
- explicar datos que lee/escribe;
- botones/acciones e impacto cruzado;
- notificaciones;
- errores y caso práctico;
- evaluación aplicada;
- evidencia de aprendizaje;
- versionado por lección/ruta;
- recursos existentes y verificables;
- actualizarse con cada cambio operativo.

Rutas mínimas: Asesor, Operativo, Dirección/Admin, Marketing y Cliente Portal.

¿Aplica a Claude/prototipo? **Sí.** Persistencia real de progreso/certificados pertenece al backend.

## 15. Responsive y validación visual

La candidata mejora CSS, pero no entrega evidencia suficiente de la versión final.

Pendiente validar:

```txt
360x800
390x844
412x915
768x1024
834x1194
1024x768
1366x768
1440x900
```

Por cada grupo: navegación, ficha, filtros, KPI, botones, modal/página, teclado, tablas/tarjetas, roles, datos sanitizados y cero overflow.

¿Aplica a Claude/prototipo? **Sí.**

## 16. Datos y creación directa en plataforma

La candidata no prueba todavía que una alta manual futura quede correctamente configurada.

Todo registro creado desde UI debe recibir/validar:

```txt
tenantId
país
moneda
impuestos
catálogos
rol/scope
asesor/responsable
estado canónico
fuente = ingreso_manual_plataforma
fecha/actor
antes/después
calidad
requiereValidacion
```

No se deben crear registros parcialmente operativos con defaults críticos silenciosos.

¿Aplica a Claude/prototipo? **Sí.** La UI debe exigir/mostrar estos campos; validación y persistencia real también se refuerzan en backend.

## 17. Paquete siguiente para Claude

Cuando recupere capacidad, el paquete debe incluir:

```txt
1. candidata v1.197 exacta;
2. este delta;
3. auditoría/empalme v1.197;
4. plan operativo actualizado;
5. patrones backend reutilizables nuevos;
6. matriz de cierre por módulo;
7. evidencia visual y hallazgos posteriores;
8. instrucciones para no tocar protegidos.
```

No debe recibir secretos, payload real, adapters LAB ni lógica exclusiva protegida.

## Estado

```txt
CANDIDATA_V1197: FUENTE_INCREMENTAL_ACEPTADA_PARCIAL
RAMA_VIVA: BASELINE_REAL
DELTA_LOCAL_PARA_CLAUDE: DOCUMENTADO
PROXIMO_FOCO: CIERRE_CRM_ASEGURADORAS_COTIZADOR_COMPARATIVO
```
