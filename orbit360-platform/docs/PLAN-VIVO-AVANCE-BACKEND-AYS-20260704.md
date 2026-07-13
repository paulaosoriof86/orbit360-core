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

Incluye Clientes 360, Calidad, Portal, ficha de póliza, scopes y visibilidad por rol dentro del alcance validado.

Pendiente de fuente separada:

```txt
Pólizas
```

No se deben inferir pólizas desde clientes, movimientos financieros, bancos o cobros.

### OP-2 — Aseguradoras v1.220

```txt
Estado funcional: IMPLEMENTADO
Estado visual reutilizable: 12/15
Pendiente visual real: 3 vistas de Plataformas
Escenarios pendientes:
  Dirección desktop
  Operativo tablet
  Asesor móvil
Regla: no repetir los 12 aprobados
```

Avances acumulados:

- directorio y ficha-página operativa;
- contactos, plataformas, bancos, documentos, productos y trazabilidad;
- cuentas completas visibles y copiables para usuarios autorizados del módulo;
- accesos de plataformas visibles y copiables para Dirección/Admin/Operativo o permiso extra;
- Asesor sin acceso a credenciales de plataforma;
- migración legacy no destructiva;
- permisos en funciones y proveedor, no solo en botones;
- hojas técnicas, internas y de apoyo en cuarentena antes del parser;
- revisión preliminar sin captura de recursos protegidos;
- versiones, errores de una letra y duplicados probables bloqueados;
- actualización sin revisión únicamente para identidad canónica exacta;
- actualización probable bloqueada con confirmación humana;
- entidades aliadas separadas de aseguradoras directas;
- mensajes operativos sin códigos internos ni copy técnico;
- directorio importado no habilita tarifas;
- responsive y Academia por rol v1.220.

Gate final preparado:

```txt
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

El gate:

1. sincroniza la rama obligatoria por avance rápido;
2. aplica integración local idempotente con backup;
3. ejecuta contratos v1.220 y backend protegido;
4. reutiliza CRM 10/10 y OP-2 12/15 mediante JSONL + capturas;
5. selecciona un puerto libre;
6. ejecuta únicamente las tres vistas de Plataformas;
7. combina el resultado para cerrar 15/15.

No debe solicitarse a Paula hasta que el circuito estático esté estabilizado.

## 4. Carriles permanentes

### Carril A — prototipo, UX y Academia

Estado:

- patrones CRM documentados para Claude;
- patrón Aseguradoras documentado;
- patrón reusable de cuarentena documentado;
- identidad exacta y bloqueo de actualización probable traducidos a Academia;
- mensajes operativos y anti-copy técnico incluidos;
- Academia Aseguradoras v1.220 actualiza los mismos cursos;
- progreso y certificados preservados.

Pendiente:

- trasladar estos patrones a la siguiente candidata comercializable de Claude;
- no trasladar datos A&S, valores protegidos, bindings LAB ni rutas privadas;
- después de los dry-runs, agregar casos prácticos sanitizados de revisión de fuentes.

### Carril B — backend, seguridad y Orbit.store

Estado:

- `Orbit.store`, Auth, Firestore LAB y reglas permanecen protegidos;
- política de cuentas y accesos aplicada a UI y llamadas directas del proveedor;
- migración de recursos en orden copiar → verificar → retirar;
- cuarentena antes del parser, captura y operaciones;
- revisión de alias mantiene `captureSecure=false`;
- importación preparada conserva captura protegida por defecto;
- coincidencia probable nunca se aplica como actualización silenciosa;
- copy visible y errores internos se sanitizan;
- evidencia reutilizable usa JSONL + capturas;
- integración de `index.html` tiene backup, verificación y rollback;
- validador canónico v1.220 con salida compacta;
- CI dividido por contratos para diagnóstico exacto.

Pendiente:

- obtener ejecución CI verde observable para el HEAD vigente;
- ejecutar una sola vez el gate focalizado local de Plataformas;
- conectar proveedor seguro real antes de aplicar recursos protegidos de directorios.

### Carril C — fuentes reales y migración operativa

Preflight sanitizado recibido:

```txt
Directorio Guatemala:
  18 hojas totales
  14 candidatas operativas
  4 hojas excluidas
  cobertura alta de contactos, plataformas y pagos

Directorio Colombia:
  17 hojas totales
  16 candidatas operativas
  1 hoja excluida
  2 parejas probables por nombre
  1 candidata de red/aliado
  cobertura de pagos incompleta
```

No se escribieron datos ni se trasladaron valores de las fuentes al repositorio.

Una fuente contiene hojas ajenas al directorio que requieren revisión de seguridad separada. Esas hojas permanecen excluidas; ningún valor debe entrar al dry-run ni a la documentación. La revisión de vigencia o rotación corresponde a un carril de seguridad separado, no al importador de Aseguradoras.

Secuencia obligatoria:

1. cerrar las tres vistas de Plataformas;
2. ejecutar dry-run Guatemala sin escritura;
3. resolver identidad, aliados y filas bloqueadas;
4. ejecutar dry-run Colombia sin escritura;
5. resolver las dos parejas probables y la entidad aliada;
6. aplicar únicamente filas confirmadas y recursos mediante proveedor seguro;
7. solicitar/procesar la fuente separada Pólizas.

## 5. Orden del plan operativo

```txt
1. CRM — cerrado
2. Aseguradoras — pendiente gate focalizado + dry-runs GT/CO
3. Cotizador + Comparativo configurable
4. Ops + Leads
5. Finanzas, conciliaciones, comisiones, CxC/CxP
6. Marketing
7. Siniestros, renovaciones, cancelaciones, automatizaciones e integraciones
8. Academia backend profunda transversal
```

No avanzar a Finanzas ni otro módulo para sustituir el cierre pendiente de Aseguradoras.

## 6. Intermedios agregados vigentes

### Intermedio A — Evidencia estructurada

```txt
Problema: falsos negativos por texto, tildes o codificación.
Solución: results.jsonl + capturas + IDs exactos + booleano ok.
Estado: implementado.
```

### Intermedio B — Cuarentena previa

```txt
Problema: excluir solo por nombre no protege frente a hojas renombradas.
Solución: nombre + señales de contenido antes del parser.
Estado: implementado y probado con datos ficticios.
```

### Intermedio C — Actualización exacta

```txt
Problema: una coincidencia por inclusión podía proponerse como actualización.
Solución: identidad canónica exacta o bloqueo para revisión humana.
Estado: implementado y probado.
```

### Intermedio D — Mensajes operativos

```txt
Problema: códigos internos o copy técnico podían aparecer temporalmente.
Solución: mapa de errores, sanitización de texto y observación de cambios tardíos.
Estado: implementado y probado.
```

### Intermedio E — CI por contratos

```txt
Problema: los logs extensos ocultaban el control fallido.
Solución: validador compacto y grupos access/import/copy/quarantine/alias/ux/migration/academy/technical.
Estado: implementado; ejecución verde pendiente.
```

Estos intermedios apoyan el plan; no abren módulos nuevos ni cambian el orden operativo.

## 7. Metodología 0% manual

ChatGPT/Codex:

- audita;
- modifica;
- empalma;
- documenta;
- ejecuta validaciones accesibles;
- revisa CI;
- corrige fallos instrumentales;
- prepara un único gate local final.

Paula:

- ejecuta una sola acción local cuando Chrome/Windows o una fuente local sean indispensables;
- revisa visualmente el resultado final.

No corresponde pedir a Paula:

- elegir puertos;
- cerrar aplicaciones;
- localizar reportes;
- editar archivos o comandos;
- diagnosticar el pipeline;
- repetir escenarios aprobados.

## 8. Documentación reusable para Claude

```txt
docs/PATRON-CLAUDE-CRM-CALIDAD-PORTAL-POLIZA-V1216-20260712.md
docs/PATRON-CLAUDE-ASEGURADORAS-OP2-V1217-20260713.md
docs/PATRON-CLAUDE-CUARENTENA-HOJAS-IMPORTADORES-V1219-20260713.md
docs/PATRON-REUTILIZABLE-CLAUDE-DESGLOSE-COTIZACION-ESTIMACION-INTERNA-20260712.md
```

Reglas que debe conservar el prototipo comercializable:

- SaaS multi-tenant, sin fork A&S;
- módulos solo mediante `Orbit.store`;
- estados honestos y no técnicos;
- importadores por fuentes separadas;
- cuarentena y revisión antes del parser operativo;
- revisión preliminar sin captura;
- dry-run antes de escritura;
- identidad canónica exacta antes de actualizar;
- duplicados probables sin fusión automática;
- cuentas y accesos con visibilidad operativa diferente;
- migración no destructiva;
- tarifas default-deny;
- Academia actualizada por rol.

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

## 10. Archivos centrales del bloque v1.220

```txt
core/aseguradoras-op2-sheet-quarantine.js
core/aseguradoras-op2-source-guard.js
core/insurer-directory-import-v1202-security.js
data/academia-v1217-aseguradoras-op2.js
tools/orbit360-validar-aseguradoras-op2-v1220.mjs
tools/orbit360-validar-aseguradoras-op2-group-v1220.mjs
tools/orbit360-validar-alias-directorios-aseguradoras-v1219.mjs
tools/orbit360-validar-copy-importador-aseguradoras-v1220.mjs
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
.github/workflows/orbit360-aseguradoras-op2-smoke.yml
```

## 11. Próximo bloque recomendado

```txt
1. Observar CI agrupado del HEAD actual.
2. Corregir solo el contrato que falle.
3. No pedir ejecución local hasta CI verde.
4. Ejecutar una sola vez el gate de tres Plataformas.
5. Cerrar Aseguradoras 15/15.
6. Dry-run Guatemala y después Colombia, separados y sin escritura.
7. Continuar Cotizador + Comparativo.
```

## 12. Formato obligatorio de cierre de bloque

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
