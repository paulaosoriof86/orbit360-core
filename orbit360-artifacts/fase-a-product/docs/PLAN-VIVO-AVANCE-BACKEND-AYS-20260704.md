# Plan vivo de avance backend — Orbit 360 A&S

Última actualización: 2026-07-13  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy

Documento complementario canónico:

```txt
orbit360-platform/docs/ESTADO-REAL-RUTA-PRODUCCION-AYS-20260713.md
```

## 1. Propósito

Mantener una única vista del avance operativo, los tres carriles y la ruta mínima a una versión A&S utilizable. Este plan prevalece sobre prioridades históricas ya superadas y sobre cualquier instrucción anterior que vuelva a pedir fuentes ya recibidas.

## 2. Restricciones permanentes

```txt
Datos reales hardcodeados: prohibidos
Valores protegidos en repositorio, UI o reportes: prohibidos
Backend protegido: no sobrescribir mediante ZIP/prototipo
Metodología: 0% manual salvo un gate local final indispensable
A&S: tenant configurable, no fork
Deploy productivo: requiere gates, acceso Firebase y autorización explícita final
```

Archivos protegidos principales:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
tools/orbit360-* backend/protegidos
```

## 3. Estado modular vigente

### OP-1 — CRM

```txt
Estado funcional: CERRADO
Estado visual: CERRADO · 10/10
Evidencia: results.jsonl + 10 capturas
Regla: no repetir salvo regresión nueva o cambio de alcance
```

Baseline real ya procesado:

```txt
Clientes Siga CRM: 440 filas
Crear: 414
Requiere validación: 26
Pólizas/Vehículos/Recibos/Cobros/Cartera: procesados, perfilados o modelados
Comisiones/Facturas/Banco: modelados por fuente separada
```

No volver a pedir Clientes, Pólizas, Vehículos, Recibos, Cobros, Cartera o Comisiones como si no existieran. Solo se solicita un delta concreto cuando exista una ausencia exacta demostrada por archivo, periodo, país, aseguradora o dominio.

### OP-2 — Aseguradoras v1.220

```txt
Estado funcional: IMPLEMENTADO
CI estático: VERDE
Contexto verificado: orbit360/aseguradoras-op2-v1220
Commit verificado: 52dbe7a1f92423eb0bca67b92dfe689f94c9532a
Estado visual reutilizable: 12/15
Pendiente visual real: 3 vistas de Plataformas
```

Escenarios pendientes:

```txt
Dirección desktop
Operativo tablet
Asesor móvil
```

Regla: no repetir CRM 10/10 ni los otros 12 escenarios de Aseguradoras.

Avances acumulados:

- directorio y ficha-página operativa;
- contactos, plataformas, bancos, documentos, productos y trazabilidad;
- cuentas completas visibles y copiables para usuarios autorizados;
- accesos de plataformas para Dirección/Admin/Operativo o permiso extra;
- Asesor sin credenciales de plataforma;
- migración legacy no destructiva;
- permisos en UI, funciones y proveedor;
- cuarentena antes del parser;
- revisión preliminar sin captura;
- versiones, errores de una letra y duplicados probables bloqueados;
- actualización sin revisión solo con identidad canónica exacta;
- actualización probable bloqueada con confirmación humana;
- entidad aliada separada de aseguradora directa;
- mensajes operativos sin códigos internos;
- directorio importado no habilita tarifas;
- responsive y Academia por rol v1.220.

### OP-3 — Cotizador + Comparativo

```txt
Baseline frontend acumulado: v1.215
Fuente avanzada recibida: comparativo_final_v110.html
Estado: siguiente módulo después de cerrar Aseguradoras
```

No volver a solicitar el HTML v110. Debe usarse como referencia funcional aislada para rescatar capacidades generalizables sin copiar Firebase, Auth, credenciales, almacenamiento o hardcode A&S.

### OP-4 — Ops + Leads

```txt
Estado: posterior a Cotizador/Comparativo
Contrato existente: aceptación validada → issuance_request → Ops
No crear póliza ni cartera antes de emisión real confirmada
```

## 4. Gate final de Aseguradoras

```txt
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

El gate:

1. verifica y sincroniza la rama por avance rápido;
2. aplica integración local idempotente con backup;
3. ejecuta contratos v1.220 y backend protegido;
4. reutiliza CRM 10/10 y OP-2 12/15 mediante JSONL + capturas;
5. elige un puerto libre;
6. ejecuta únicamente las tres vistas pendientes;
7. combina el resultado para cerrar Aseguradoras 15/15;
8. no hace deploy, commit, push ni cierre de otras aplicaciones.

Estado:

```txt
CI requerido antes del gate: APROBADO
Gate local: HABILITADO
Ejecución local: PENDIENTE
```

## 5. Diagnóstico de producción

La razón por la que todavía se ve demo y no operación A&S es concreta:

```txt
store predeterminado = localStorage + seed ficticio
Firestore = solo modo firestore-lab por query string
Auth/rules = usuario LAB de demostración
firebase.json = sin Hosting
.firebaserc = inexistente en el repositorio
carga real A&S = no ejecutada
```

Publicar el HTML actual no resuelve el problema: desplegaría una demo.

## 6. Carriles permanentes

### Carril A — prototipo, UX y Academia

Estado:

- CRM cerrado 10/10;
- Aseguradoras 12/15 con tres vistas focalizadas pendientes;
- Cotizador/Comparativo v1.215 acumulado;
- comparativo v110 recibido;
- patrones CRM, Aseguradoras, importadores, cotizaciones y Academia documentados;
- no trasladar datos A&S, valores protegidos, bindings LAB ni rutas privadas a Claude.

Pendiente:

- cerrar las tres vistas;
- aplicar patrones a la siguiente candidata comercializable solo cuando aporte un delta real;
- no abrir otra auditoría general sin ZIP/commit/fallo nuevo.

### Carril B — backend, seguridad y Orbit.store

Estado:

- `Orbit.store`, Auth, Firestore LAB y reglas protegidos;
- política de cuentas y accesos aplicada;
- cuarentena y default-deny implementados;
- CI dividido por contratos;
- backend LAB compatible existente.

Pendiente productivo real:

```txt
modo Firestore productivo sin fallback demo
Auth multiusuario basado en membresías tenant
multirol, rol activo y scopes desde backend
rules productivas
configuración Firebase por entorno/secrets
Firebase Hosting y rollback
smoke productivo
```

### Carril C — fuentes reales y migración operativa

Estado recibido/procesado:

```txt
Clientes: dry-run sanitizado cerrado
Pólizas/Vehículos/Recibos/Cobros/Cartera: procesados/modelados
Comisiones/Facturas/Banco: modelados
Aseguradoras GT/CO: preflight sanitizado y fuentes activas
Cotizador/Comparativo v110: recibido
Finanzas GT/CO: fuente recibida separada
Marketing: calendario, manual y logo recibidos
```

Preflight Aseguradoras:

```txt
Guatemala:
  18 hojas totales
  14 candidatas operativas
  4 hojas excluidas
  cobertura alta de contactos, plataformas y pagos

Colombia:
  17 hojas totales
  16 candidatas operativas
  1 hoja excluida
  2 parejas probables
  1 candidata de red/aliado
  cobertura de pagos incompleta
```

No se han escrito datos reales en el backend productivo. Dry-run/modelado/documentación no equivalen a carga real.

Secuencia:

1. cerrar las tres vistas de Plataformas;
2. dry-run Guatemala sin escritura;
3. resolver identidad, aliados y filas bloqueadas;
4. dry-run Colombia sin escritura;
5. resolver parejas probables y entidad aliada;
6. habilitar backend productivo seguro;
7. aplicar filas confirmadas con auditLog y rollback;
8. ejecutar smoke real con datos A&S;
9. continuar Cotizador/Comparativo v110.

## 7. Orden del plan operativo

```txt
1. CRM — cerrado
2. Aseguradoras — tres vistas + dry-runs GT/CO
3. Backend productivo/Auth/Hosting + primera carga A&S
4. Cotizador + Comparativo configurable
5. Ops + Leads
6. Finanzas, conciliaciones, comisiones, CxC/CxP
7. Marketing
8. Siniestros, renovaciones, cancelaciones, automatizaciones e integraciones
9. Academia backend profunda transversal
```

El paso 3 es obligatorio para que los cierres funcionales se traduzcan en una plataforma realmente utilizable. No seguir cerrando módulos únicamente sobre seed demo mientras la operación A&S no tenga persistencia real visible.

## 8. Metodología corregida

ChatGPT/Codex:

- trabaja por delta;
- no relee cientos de documentos en cada iteración;
- audita solo insumos nuevos;
- modifica, empalma, valida y documenta lo estrictamente necesario;
- reutiliza evidencia aprobada;
- mantiene A/B/C;
- convierte auditoría en acción;
- prepara un único gate local final cuando sea indispensable.

Paula:

- no elige puertos;
- no localiza reportes;
- no edita archivos o comandos;
- no diagnostica pipelines;
- no repite escenarios aprobados;
- ejecuta una sola acción local cuando navegador, Windows o credenciales locales sean indispensables;
- revisa la URL y el checklist visual final.

## 9. Reglas de negocio vigentes

```txt
GT → GTQ
CO → COP
Falta país/moneda → REQUIERE_VALIDACION
Cobros/recaudos ≠ finmovs
Estado bancario no aplica cobros directamente
Directorio recibido ≠ tarifa habilitada
Duplicado probable ≠ fusión automática
Actualización probable ≠ actualización validada
Entidad aliada ≠ aseguradora directa
Producción/metas/comisiones → prima neta recaudada
```

## 10. Próximo bloque

```txt
1. Ejecutar una sola vez el gate de 3 vistas de Aseguradoras.
2. Auditar las 3 capturas y cerrar 15/15.
3. Ejecutar dry-runs GT/CO y resolver solo bloqueos concretos.
4. Implementar modo backend productivo + Auth/membresías + rules + Hosting.
5. Ejecutar carga controlada inicial A&S.
6. Smoke productivo y deploy autorizado.
7. Continuar Cotizador/Comparativo v110 y luego Ops/Leads.
```

## 11. Formato obligatorio de cierre

```txt
Avance del bloque
- Qué adelanté:
- Bloque trabajado:
- Carril A:
- Carril B:
- Carril C:
- Evidencia reutilizada:
- Datos realmente escritos: Sí/No
- Validación visual: estado
- Pendientes exactos:
- Próxima acción:
- Estado PR/rama:
```
