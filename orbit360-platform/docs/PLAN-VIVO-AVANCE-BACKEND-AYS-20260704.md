# Plan vivo de avance backend — Orbit 360 A&S

Última actualización: 2026-07-13  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy

## 1. Propósito

Mantener una vista única del avance operativo, los tres carriles, los pendientes reales y el siguiente bloque. Este documento reemplaza las prioridades históricas ya superadas, pero no elimina sus auditorías ni bitácoras.

## 2. Restricciones permanentes

```txt
Producción: no autorizada
Deploy: no autorizado
Merge/main: no autorizados
Datos reales hardcodeados: prohibidos
Secretos en repositorio, UI o reportes: prohibidos
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

Pendiente de datos separado:

```txt
Fuente Pólizas
```

No se deben inferir pólizas desde clientes, movimientos financieros, bancos o cobros.

### OP-2 — Aseguradoras

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
- cuentas completas visibles/copiables para usuarios autorizados del módulo;
- usuarios y contraseñas visibles/copiables para Dirección/Admin/Operativo o permiso extra;
- Asesor sin acceso a credenciales de portal;
- migración legacy no destructiva;
- permisos en funciones y proveedor, no solo en botones;
- alias/versiones/duplicados probables bloqueados para revisión;
- entidades aliadas separadas de aseguradoras directas;
- directorio importado no habilita tarifas;
- responsive y Academia por rol;
- cuarentena previa de hojas técnicas, internas y de apoyo.

Gate final preparado:

```txt
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

Solo puede solicitarse a Paula cuando las validaciones estáticas/CI estén estabilizadas. Debe ejecutar únicamente las tres Plataformas pendientes, reutilizar CRM 10/10 y OP-2 12/15, elegir puerto solo y no cerrar otras aplicaciones.

## 4. Carriles permanentes

### Carril A — prototipo, UX y Academia

Estado:

- patrones CRM documentados para Claude;
- patrones Aseguradoras documentados para Claude;
- patrón reusable de cuarentena de hojas documentado;
- responsive y estados honestos implementados;
- Academia Aseguradoras actualizada a v1.219 sin duplicar cursos;
- progreso y certificados preservados.

Pendiente:

- incorporar los patrones en la siguiente candidata comercializable de Claude;
- no trasladar datos A&S, secretos, bindings LAB ni rutas privadas;
- después de los dry-runs, agregar casos prácticos sanitizados de revisión de fuentes.

### Carril B — backend, seguridad y Orbit.store

Estado:

- `Orbit.store`, Auth, Firestore LAB y reglas protegidos;
- política de cuentas y credenciales aplicada también a llamadas directas del proveedor;
- migración de recursos en orden copiar → verificar → retirar;
- cuarentena de hojas ocurre antes del parser, captura protegida y operaciones;
- evidencia de reanudación usa JSONL + capturas, no frases ni tildes;
- integración de `index.html` se realiza con backup, verificación y rollback;
- workflow actualizado a Node 24 y nuevos gates estáticos.

Pendiente:

- obtener ejecución CI verde observable para el HEAD vigente;
- ejecutar una sola vez el gate focalizado local de Plataformas;
- conectar proveedor seguro real antes de aplicar recursos sensibles de directorios.

### Carril C — fuentes reales y migración operativa

Inventario sanitizado recibido:

```txt
Directorio Guatemala:
  18 hojas totales
  14 candidatas operativas
  4 hojas excluidas

Directorio Colombia:
  17 hojas totales
  16 candidatas operativas
  1 hoja excluida
```

No se escribieron datos ni se trasladaron valores sensibles al repositorio.

Secuencia obligatoria:

1. cerrar las tres vistas de Plataformas;
2. ejecutar dry-run Guatemala sin escritura;
3. resolver alias, entidades aliadas y filas bloqueadas;
4. ejecutar dry-run Colombia sin escritura;
5. resolver alias, entidades aliadas y filas bloqueadas;
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
Motivo: los reportes de texto generaron falsos negativos por codificación.
Solución: reutilizar results.jsonl + capturas + IDs exactos.
Estado: implementado.
```

### Intermedio B — Cuarentena previa de hojas

```txt
Motivo: excluir por nombre no protege frente a hojas técnicas renombradas.
Riesgo: mezclar fuentes o crear operaciones inválidas.
Solución: nombre + señales de contenido antes del parser.
Estado: implementado y con validador ficticio.
```

### Intermedio C — Integración local del index

```txt
Motivo: preservar codificación, backend protegido y rollback.
Solución: pipeline idempotente con backup y verificación de orden.
Estado: implementado.
```

Estos intermedios apoyan el plan; no lo reemplazan ni abren módulos nuevos.

## 7. Metodología 0% manual

ChatGPT/Codex:

- audita;
- modifica;
- empalma;
- documenta;
- ejecuta validaciones accesibles;
- revisa CI;
- prepara un único gate local final.

Paula:

- ejecuta una sola acción local cuando Chrome/Windows o la fuente local sean indispensables;
- revisa visualmente el resultado final.

No corresponde pedir a Paula:

- elegir puertos;
- cerrar aplicaciones;
- localizar reportes o carpetas;
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

Reglas a conservar en prototipo comercializable:

- SaaS multi-tenant, sin fork A&S;
- todos los módulos usan `Orbit.store`;
- estados honestos y no técnicos;
- importadores por fuentes separadas;
- dry-run antes de escritura;
- cuarentena antes del parser;
- cuentas y credenciales con visibilidad operativa diferente;
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
Entidad aliada ≠ aseguradora directa
Producción/metas/comisiones → prima neta recaudada
```

## 10. Documentación creada/actualizada en el bloque v1.219

```txt
docs/AUDITORIA-SANITIZADA-CUARENTENA-HOJAS-DIRECTORIOS-OP2-20260713.md
docs/PATRON-CLAUDE-CUARENTENA-HOJAS-IMPORTADORES-V1219-20260713.md
data/academia-v1217-aseguradoras-op2.js
core/aseguradoras-op2-sheet-quarantine.js
tools/orbit360-validar-cuarentena-hojas-aseguradoras-v1219.mjs
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
.github/workflows/orbit360-aseguradoras-op2-smoke.yml
```

## 11. Próximo bloque recomendado

```txt
1. Diagnosticar y corregir cualquier fallo CI del HEAD actual.
2. No pedir ejecución local hasta tener el circuito estático estabilizado.
3. Ejecutar una sola vez el gate focalizado de las tres Plataformas.
4. Cerrar Aseguradoras 15/15.
5. Ejecutar dry-run Guatemala y después Colombia, separados y sin escritura.
6. Continuar Cotizador + Comparativo.
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
