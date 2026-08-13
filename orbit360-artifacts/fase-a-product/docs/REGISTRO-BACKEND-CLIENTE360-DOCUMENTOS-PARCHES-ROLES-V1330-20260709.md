# Registro — backend Cliente360 Documentos/Parches/Roles v1330

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Paula indicó continuar con backend mientras Claude trabaja. El frente más útil sin pisar backend protegido es definir contrato reusable para Cliente360 Documentos por rol, porque Claude debe trabajar UX y ChatGPT/Codex debe proteger reglas, estados, auditoría, metadata-only y parches pendientes.

## Archivos creados

```txt
orbit360-platform/docs/CONTRATO-BACKEND-CLIENTE360-DOCUMENTOS-ROLES-PARCHES-V1330-20260709.md
orbit360-platform/docs/DOCUMENTOS-PARCHES-ROLES-V1330.schema.json
tools/orbit360-validar-documentos-parches-roles-v1330.mjs
tools/orbit360-test-documentos-parches-roles-v1330.mjs
orbit360-platform/docs/REGISTRO-BACKEND-CLIENTE360-DOCUMENTOS-PARCHES-ROLES-V1330-20260709.md
```

## Qué resuelve

- Modelo mínimo `documentos`.
- Modelo mínimo `parchesPendientes`.
- Estados permitidos.
- Acciones por rol.
- Gates con motivo y confirmación reforzada.
- Bloqueos por país/moneda.
- GT→GTQ y CO→COP.
- Separación historial cliente vs auditoría interna.
- Prohibición de base64/bytes/tokens/secrets/URLs públicas.
- Validador estático del contrato.
- Test sintético sin datos reales.

## Impacto backend

Este bloque deja una especificación lista para conectar después a Firestore/Storage real sin cambiar módulos:

```txt
Cliente360 UI -> Orbit.store -> documentos/parchesPendientes/auditoria -> futuro adapter real
```

## Impacto Claude/prototipo

¿Aplica a Claude/prototipo? Sí.

Claude debe usar este contrato para:

```txt
- pestaña Documentos de Cliente360;
- soportes de pago;
- documentos del expediente;
- propuestas/diffs pendientes;
- estados visibles;
- botones por rol;
- motivo obligatorio;
- historial cliente separado de auditoría interna;
- no base64;
- no secretos;
- no escritura automática desde documentos.
```

## Restricciones cumplidas

- No merge.
- No deploy.
- No main.
- No producción.
- No datos reales.
- No secretos.
- No backend protegido.
- No `index.html`.
- No `data/store.js`.
- No Firestore rules.

## Estado

Bloque backend documental creado. Pendiente ejecutar validadores localmente cuando haya computador.