# Registro acumulado — Importador transversal, Clientes, Claude y Academia

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 1. Motivo

Cerrar el riesgo de desviación y dejar una fuente viva que distinga:

- trabajo transversal ya realizado;
- trabajo implementado pero pendiente de smoke/CI;
- trabajo pendiente de Claude/prototipo;
- trabajo pendiente de backend real;
- trabajo de migración real ya cruzado que no debe repetirse.

## 2. Estado real del importador transversal

El importador transversal NO está en cero y NO debe rehacerse.

### Implementado

- hub `modules/importar.js`;
- drawer/base `core/importa.js`;
- fuentes separadas;
- contratos por sourceType;
- builder dry-run sanitizado;
- wire de captura antes de escritura;
- confirmación reforzada;
- escritura controlada bloqueada por defecto;
- tablero operativo P0;
- motores P0 de pólizas, cartera, comisiones y banco;
- directorio de aseguradoras;
- calendario marketing;
- identidad de marca;
- motor P0 reusable de clientes;
- wire P0 de clientes;
- tests sintéticos.

### Pendiente para cierre controlado

- CI visible y exitoso;
- smoke visual del hub/drawer;
- confirmar orden de carga de todos los wires;
- registrar el test del wire de clientes en workflow;
- bandejas operativas completas para validación por entidad;
- validación de permisos/scopes;
- escritura real continúa bloqueada hasta autorización.

Conclusión:

```txt
Importador transversal = P0 implementado parcialmente cerrado.
No rehacer arquitectura.
Cerrar por validaciones, integración y UX pendiente.
```

## 3. Cambios locales/backend de este bloque

### Archivos

```txt
orbit360-platform/core/importa-clientes-p0.js
orbit360-platform/core/importa-clientes-p0-wire.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importa-clientes-p0.mjs
tools/orbit360-test-importa-clientes-p0-wire.mjs
.github/workflows/orbit360-p0-smoke.yml
```

### Regla implementada

El hub carga el motor de clientes antes del wire. El wire solo normaliza operaciones marcadas como importadas/P0 y conserva el contrato `Orbit.store`.

No se modificó:

```txt
data/store.js
store-firestore-lab.local.js
backend-lab-loader/init/security-guard
core/auth.js
core/importa.js
firestore.rules
```

## 4. Patrón backend reusable

```txt
Fuente variable
→ detección/mapeo
→ normalizador por entidad
→ operaciones por colección permitida
→ dry-run sanitizado
→ calidad/duplicados/bloqueos
→ revisión humana
→ confirmación reforzada
→ escritura controlada futura por Orbit.store
→ auditLog
```

Para Clientes:

```txt
aliases de columnas/asesores por tenant
estado inicial pendiente_polizas
duplicado exacto separado de probable
calidad de datos
asesor temporal con alerta
país/moneda configurables
sin payload real en repo
```

## 5. Pendientes acumulados para Claude/prototipo

Claude NO se necesita todavía para este bloque técnico. Debe llamarse cuando se inicie el cierre visual del importador o cuando se vaya a integrar la siguiente candidata.

Paquete acumulado que Claude deberá recibir:

1. Importador transversal como wizard único, no importadores aislados inconsistentes.
2. Paso de detección de encabezados y propuesta de mapeo.
3. Corrección humana del mapeo.
4. Resumen crear/actualizar/omitir/requiere validación.
5. Vista de duplicados exactos y probables separada.
6. Alertas de calidad por cliente y por asesor.
7. Estado `pendiente_polizas` explicado como temporal, no inactivo.
8. Asesor temporal claramente marcado y corregible por rol autorizado.
9. Trazabilidad por archivo/hoja/fila/bloque/país/moneda/periodo.
10. Estados honestos: propuesta, pendiente de revisión, validado, listo para escritura.
11. Nunca mostrar Firebase, backend, LAB, mock, localStorage o nombres internos.
12. No simular escritura ni importación completada si solo existe dry-run.
13. Integración visual con Cliente360, Calidad, Equipo, Pólizas, Cobros, Finanzas y Aseguradoras.
14. Roles/scopes: asesor solo propios; Dirección/Admin todos según configuración.
15. Gestiones de corrección cuando el cliente/póliza no aparece o está asignado a otro asesor.

## 6. Academia acumulada

Academia debe enseñar por rol:

- qué fuentes puede importar cada rol;
- diferencia entre dry-run y escritura;
- cómo corregir mapeo;
- duplicado exacto vs probable;
- calidad de datos;
- `pendiente_polizas`;
- cliente activo/inactivo derivado del cruce ya realizado;
- fuentes separadas;
- cobros no son finmovs;
- cartera de primas no es CxC financiera;
- documentos soporte solo proponen cambios;
- confirmación reforzada;
- trazabilidad y auditoría;
- permisos y scopes;
- seguridad de credenciales.

## 7. Baseline A&S que no se repite

No volver a procesar desde cero:

- clientes y dry-run 414/0/0/26;
- cruce clientes/pólizas;
- pólizas y estados operativos;
- vehículos complementarios;
- recibos esperados y fuente externa;
- cobros;
- cartera;
- comisiones/facturas/CxC/CxP;
- banco y conciliación propuesta.

Solo reabrir ante nueva fuente, contradicción concreta, fallo de test/smoke o decisión expresa.

## 8. Plan operativo vivo

1. Cerrar integración técnica de Clientes en importador transversal.
2. Obtener CI/smoke del importador sin escribir datos reales.
3. Actualizar registro del dry-run ejecutado.
4. Retomar Aseguradoras usando directorios ya procesados.
5. Integrar Cotizador/Comparativo v110 como patrón configurable.
6. Validar transversalmente CRM/Pólizas/Cartera/Cobros/Comisiones, sin repetir cruces.
7. Solicitar Claude para cierre UX/Academia cuando exista paquete acumulado suficiente.

## 9. Criterio para avisar a Paula sobre Claude

Avisar de forma explícita cuando ocurra cualquiera:

- se vaya a trabajar el wizard visual/bandejas del importador;
- se requiera modificar Cliente360/Calidad/Equipo por el nuevo patrón;
- se inicie integración visual de Aseguradoras/Cotizador/Comparativo;
- exista candidata nueva para empalme;
- el paquete acumulado tenga cambios suficientes para una iteración grande y estable.

## 10. Estado

- Backend/normalización Clientes: implementado.
- Wire/runtime Clientes: implementado.
- Hub transversal: actualizado.
- Test motor: preparado.
- Test wire: preparado.
- CI visible: pendiente.
- Smoke visual: pendiente.
- Claude: documentado acumulativamente; no requerido todavía.
- Escritura real: bloqueada.
