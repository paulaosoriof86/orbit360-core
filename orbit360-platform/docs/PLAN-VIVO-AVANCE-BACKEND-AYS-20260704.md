# Plan vivo de avance backend — Orbit 360 A&S

Última actualización: 2026-07-13  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy

## 1. Propósito

Mantener una vista única del avance operativo, los tres carriles y el siguiente bloque. Este documento prevalece sobre prioridades históricas ya superadas, sin borrar sus auditorías ni bitácoras.

## 2. Restricciones permanentes

```txt
Producción: no autorizada
Deploy: no autorizado
Merge/main: no autorizados
Datos reales hardcodeados: prohibidos
Valores protegidos en repositorio, UI o reportes: prohibidos
Backend protegido: no sobrescribir
Metodología: 0% manual salvo gate local final indispensable
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

Pendiente de fuente separada:

```txt
Pólizas
```

No se deben inferir pólizas desde clientes, movimientos financieros, bancos o cobros.

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

## 4. Gate final habilitado

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

## 5. Carriles permanentes

### Carril A — prototipo, UX y Academia

Estado:

- patrones CRM documentados para Claude;
- patrón Aseguradoras documentado;
- patrón reusable de cuarentena documentado;
- patrón v1.220 de importadores seguros consolidado;
- identidad exacta y bloqueo de actualización probable en Academia;
- mensajes operativos y anti-copy técnico incluidos;
- Academia Aseguradoras actualiza los mismos cursos;
- progreso y certificados preservados.

Documentos principales:

```txt
docs/PATRON-CLAUDE-CRM-CALIDAD-PORTAL-POLIZA-V1216-20260712.md
docs/PATRON-CLAUDE-ASEGURADORAS-OP2-V1217-20260713.md
docs/PATRON-CLAUDE-CUARENTENA-HOJAS-IMPORTADORES-V1219-20260713.md
docs/PATRON-CLAUDE-IMPORTADORES-CUARENTENA-IDENTIDAD-COPY-V1220-20260713.md
docs/PATRON-REUTILIZABLE-CLAUDE-DESGLOSE-COTIZACION-ESTIMACION-INTERNA-20260712.md
```

Pendiente:

- trasladar estos patrones a la siguiente candidata comercializable de Claude;
- no trasladar datos A&S, valores protegidos, bindings LAB ni rutas privadas;
- agregar casos prácticos sanitizados después de los dry-runs.

### Carril B — backend, seguridad y Orbit.store

Estado:

- `Orbit.store`, Auth, Firestore LAB y reglas protegidos;
- política de cuentas y accesos aplicada a UI y proveedor;
- migración en orden copiar → verificar → retirar;
- cuarentena antes del parser, captura y operaciones;
- revisión de alias con `captureSecure=false`;
- importación preparada con captura protegida por defecto;
- coincidencia probable nunca actualiza silenciosamente;
- copy visible y errores internos sanitizados;
- evidencia reutilizable mediante JSONL + capturas;
- integración de `index.html` con backup y rollback;
- validador canónico v1.220;
- CI dividido por contratos;
- estado de commit publicado y confirmado `success`.

Pendiente:

- ejecutar el gate visual focalizado una sola vez;
- conectar proveedor seguro real antes de aplicar recursos protegidos.

### Carril C — fuentes reales y migración operativa

Preflight sanitizado:

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

No se escribieron datos ni se trasladaron valores de las fuentes al repositorio.

Una fuente contiene hojas ajenas al directorio que requieren revisión de seguridad separada. Permanecen excluidas y ningún valor entra al dry-run o documentación.

Secuencia obligatoria:

1. cerrar las tres vistas de Plataformas;
2. dry-run Guatemala sin escritura;
3. resolver identidad, aliados y filas bloqueadas;
4. dry-run Colombia sin escritura;
5. resolver las dos parejas probables y la entidad aliada;
6. aplicar solo filas confirmadas mediante proveedor seguro;
7. solicitar/procesar la fuente separada Pólizas.

## 6. Orden del plan operativo

```txt
1. CRM — cerrado
2. Aseguradoras — gate focalizado habilitado; dry-runs GT/CO después
3. Cotizador + Comparativo configurable
4. Ops + Leads
5. Finanzas, conciliaciones, comisiones, CxC/CxP
6. Marketing
7. Siniestros, renovaciones, cancelaciones, automatizaciones e integraciones
8. Academia backend profunda transversal
```

No avanzar a Finanzas ni otro módulo para sustituir el cierre pendiente de Aseguradoras.

## 7. Intermedios vigentes

```txt
Evidencia estructurada:
  results.jsonl + capturas + IDs exactos + booleano ok

Cuarentena previa:
  nombre + señales de contenido antes del parser

Actualización exacta:
  identidad canónica exacta o bloqueo humano

Mensajes operativos:
  mapa de errores y sanitización de cambios tardíos

CI verificable:
  grupos por contrato + estado del commit
```

Estos intermedios apoyan el plan; no abren módulos nuevos ni cambian el orden operativo.

## 8. Metodología 0% manual

ChatGPT/Codex:

- audita;
- modifica;
- empalma;
- documenta;
- valida;
- revisa CI;
- corrige fallos;
- prepara un único gate local final.

Paula:

- ejecuta una sola acción local cuando Chrome/Windows o una fuente local sean indispensables;
- comparte el reporte generado;
- revisa visualmente el resultado final.

No corresponde pedir a Paula:

- elegir puertos;
- cerrar aplicaciones;
- localizar reportes;
- editar archivos o comandos;
- diagnosticar el pipeline;
- repetir escenarios aprobados.

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

## 10. Archivos centrales v1.220

```txt
core/aseguradoras-op2-sheet-quarantine.js
core/aseguradoras-op2-source-guard.js
core/insurer-directory-import-v1202-security.js
data/academia-v1217-aseguradoras-op2.js
tools/orbit360-validar-aseguradoras-op2-v1220.mjs
tools/orbit360-validar-aseguradoras-op2-group-v1220.mjs
tools/orbit360-validar-alias-directorios-aseguradoras-v1219.mjs
tools/orbit360-validar-copy-importador-aseguradoras-v1220.mjs
tools/orbit360-validar-resume-evidence-op1-op2-v1218.mjs
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
.github/workflows/orbit360-aseguradoras-op2-smoke.yml
```

## 11. Próximo bloque

```txt
1. Ejecutar una sola vez el gate focalizado de tres Plataformas.
2. Auditar el reporte y las tres capturas.
3. Cerrar Aseguradoras 15/15 si aprueba.
4. Ejecutar dry-run Guatemala sin escritura.
5. Resolver bloqueos.
6. Ejecutar dry-run Colombia sin escritura.
7. Continuar Cotizador + Comparativo.
```

## 12. Formato obligatorio de cierre

```txt
Avance del bloque
- Qué adelanté:
- Bloque trabajado:
- Plan/área impactada:
- Documentos creados/actualizados:
- Decisiones agregadas:
- ¿Se agregó algo intermedio al plan?:
- Intermedios agregados:
- Pendientes que siguen:
- Qué sigue en el plan:
- Próximo bloque recomendado:
- Estado PR/rama:
```
