# Decisión operativa — Aseguradoras: accesos, cuentas, planes, tarifas y documentos

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Corrección de criterio

La ficha de Aseguradoras sí debe cumplir una función operativa de directorio interno. Por tanto:

- debe conservar usuario y contraseña de los portales de las aseguradoras;
- debe permitir a usuarios autorizados visualizar la contraseña bajo demanda;
- debe mostrar cuentas bancarias completas a roles autorizados;
- no debe reducirse a `credentialRef/backend_required` cuando el objetivo del tenant es que el equipo consulte los accesos desde la plataforma;
- debe protegerse mediante roles, ocultamiento por defecto, revelado bajo demanda, motivo/auditoría y almacenamiento seguro cuando exista backend real.

## Roles autorizados

Acceso a credenciales y cuentas bancarias:

- SuperAdmin;
- AdminTenant/Admin;
- Dirección;
- Operativo.

Por defecto no acceden:

- Asesor;
- ClientePortal;
- AuditorSoloLectura, salvo permiso explícito configurado;
- otros roles sin módulo/permiso adicional.

La autorización final debe usar roles múltiples, rol activo, módulos habilitados, extras/restricciones y scope. No basta comparar un único nombre de rol.

## Experiencia requerida

### Credenciales

- contraseña oculta por defecto;
- botón `Mostrar` / `Ocultar`;
- visualización bajo demanda solo para rol autorizado;
- registro de quién visualizó, fecha, aseguradora y motivo operativo;
- copiar usuario/contraseña como acción separada y auditable;
- nunca exponer credenciales en listados generales, exportaciones, logs, Academia o payloads para Claude;
- backend real debe cifrar/guardar en mecanismo seguro; el prototipo puede representar el flujo sin contener secretos reales.

### Cuentas bancarias

- visibles completas para SuperAdmin/Admin/Dirección/Operativo;
- ocultas o restringidas para otros roles;
- mostrar banco, tipo, número, moneda, titular, país y uso;
- acción copiar número auditable;
- cambios requieren motivo y antes/después;
- GT/GTQ, CO/COP y excepciones USD explícitas.

## Planes, tarifas y documentos por aseguradora

Cada aseguradora debe permitir cargar y administrar:

- planes;
- productos;
- ramos;
- tarifas;
- coberturas;
- límites;
- deducibles;
- condiciones;
- exclusiones;
- vigencia;
- país;
- moneda;
- requisitos de emisión;
- comisión por ramo/producto/plan;
- pólizas PDF de ejemplo;
- cotizaciones PDF de ejemplo;
- condiciones generales y particulares;
- formularios;
- tarifarios PDF/Excel/imagen.

## Uso documental

Los documentos deben poder ser leídos por la plataforma para proponer estructura normalizada destinada a:

- Cotizador: planes, tarifas, primas, reglas y vigencias;
- Comparativo: coberturas, deducibles, exclusiones, condiciones y diferencias entre aseguradoras;
- OCR/importador documental: extracción con propuesta/diff;
- Academia: explicación del origen y validación de tarifas sin exponer información sensible.

La extracción documental no actualiza automáticamente tarifas ni planes. Flujo obligatorio:

```txt
cargar documento
→ identificar aseguradora/país/moneda/ramo/producto/plan
→ extraer contenido
→ proponer mapeo normalizado
→ mostrar diff
→ revisión humana
→ validar
→ activar para Cotizador/Comparativo
→ conservar trazabilidad y versión
```

## Modelo reusable creado

Archivos:

```txt
orbit360-platform/core/aseguradoras-directorio-p0.js
tools/orbit360-test-aseguradoras-directorio-p0.mjs
```

Incluye:

- autorización conceptual por rol;
- máscara/revelado de contraseñas;
- máscara/revelado de cuentas;
- evento de auditoría de consulta sensible;
- normalización de documentos;
- normalización de planes;
- validación mínima de plan y fuente documental.

No contiene datos reales ni modifica backend protegido.

## Estado de implementación

- contrato reusable: IMPLEMENTADO;
- smoke sintético: PREPARADO;
- integración runtime en ficha Aseguradoras: PENDIENTE;
- almacenamiento seguro real de secretos: PENDIENTE BACKEND AUTORIZADO;
- UX final Mostrar/Ocultar/Copiar/auditar: PENDIENTE CLAUDE/PROTOTIPO + integración local;
- carga y lectura de PDFs/Excel/imagen: contrato definido, motor documental transversal pendiente de integración visual/operativa;
- conexión Cotizador/Comparativo: siguiente fase después de estructura Aseguradoras.

## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado: directorio interno con secretos operativos consultables por roles autorizados.
- Debe compartirse con Claude: Sí.
- Módulos impactados: Aseguradoras, Equipo/Permisos, Auditoría, Cotizador, Comparativo, Documentos, Academia.
- Texto/estado UI requerido: `Oculto`, `Mostrar`, `Ocultar`, `Copiar`, `Acceso restringido`, `Documento pendiente de lectura`, `Propuesta pendiente de validación`, `Tarifa validada`.
- Academia impactada: gestión segura de portales, cuentas, documentos y tarifas.
- Riesgo si Claude lo ignora: directorio inutilizable o exposición de secretos sin control.

## Academia

Rutas requeridas:

- Dirección/Admin: permisos, auditoría, planes/tarifas y documentos;
- Operativo: consultar accesos/cuentas, cargar documentos, revisar propuestas;
- Asesor: usar planes/tarifas habilitadas sin ver credenciales ni cuentas;
- IT/Seguridad: almacenamiento seguro, auditoría y respuesta a incidentes.

## Registro del cambio

- fecha: 2026-07-09;
- módulo: Aseguradoras;
- necesidad: mantener directorio operativo real con accesos, cuentas y conocimiento documental;
- esperado: datos sensibles accesibles únicamente a roles autorizados y planes/tarifas alimentados desde documentos validados;
- causa raíz: interpretación previa demasiado restrictiva de `credentialRef` para un caso donde el tenant necesita consultar credenciales;
- archivo/función: `core/aseguradoras-directorio-p0.js`;
- fix/mejora: contrato de roles, máscaras, revelado, auditoría y modelos documentales;
- impacto: Aseguradoras, Cotizador, Comparativo, importador documental, permisos y Academia;
- estado: contrato implementado, runtime pendiente.

## Acción manual

No requerida en este momento. Los archivos reales de tarifas, pólizas ejemplo y cotizaciones ejemplo pueden incorporarse posteriormente para dry-run sanitizado cuando se entre al bloque documental de Aseguradoras/Cotizador/Comparativo.