# Bloque 1 · Corte operativo v5 · VALIDATOR_STALE

Fecha: 2026-07-20  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Estado

`PRODUCTO_CORREGIDO_NO_PUBLICADO · VALIDATOR_RECONCILED_NO_RERUN · M1_ABIERTO`

La revisión humana confirmó que el parpadeo y los filtros quedaron corregidos, pero detectó nuevos defectos operativos: país pendiente fuera de Calidad, segmentación no explicada, aseguradoras inactivas sin motivo, accesos y copia bancaria incompletos, Tarifas y conocimiento sin jerarquía, importador con falso éxito y títulos aún no responsive.

## Clasificación

- `FUNCTIONAL_DEFECT`: importador declaraba éxito sin archivo ni propuesta persistida; controles operativos y responsive incompletos.
- `VALIDATOR_STALE`: el gate anterior no ejercitaba persistencia documental, segmentación, Calidad, inactividad, accesos ni títulos.
- `SECURITY_FAILURE_AVOIDED`: las contraseñas no se expusieron como texto plano; se conserva el contrato de referencia segura.
- `PIPELINE_MECHANISM_FAILURE`: el preflight v5 heredó contratos obsoletos y después exigió tokens presentes solo en comentarios.

## Implementación

### Carril A · Frontend, UX y Academia

- Calidad prioriza país y moneda, permite filtro y edición rápida con motivo y auditoría.
- Pólizas y cobros vinculados solo generan sugerencias de país; nunca escriben silenciosamente.
- Segmento sin pólizas validadas: `Pendiente de clasificar`.
- Criterios futuros visibles: Nuevo, Recurrente, Estándar, Premium e Histórico.
- Motivo visible para aseguradoras inactivas.
- Títulos y acciones responsive mediante `clamp`, wrap y grids móviles.
- Accesos operativos con revelado/copia segura cuando existe proveedor vinculado.
- Copia bancaria completa: banco, tipo, cuenta, moneda, titular y uso.
- Tarifas y conocimiento con resumen, propuestas y estados honestos.
- Academia API 1.221, contenido 1.224.

### Carril B · Seguridad, backend y gates

- `core/importa.js`, Store, Auth, Router propietario, adaptadores Firestore y reglas protegidas no fueron modificados.
- `docs-aseguradora` se intercepta en su bridge especializado.
- Seleccionar archivo no equivale a almacenarlo.
- Sin enlace HTTPS o proveedor seguro, se registra propuesta y se informa `Pendiente de almacenamiento seguro`.
- El gate v5 valida cancelación sin escritura, no falso éxito, responsive, Calidad, segmento, acceso seguro y copia bancaria.

### Carril C · Datos A&S

- 414 clientes, 26 aseguradoras y 7 asesores preservados.
- 337 GT, 16 CO y 61 `REQUIERE_VALIDACION`.
- 391 Persona y 23 Empresa.
- Sin reimportación y sin avance a Pólizas, Cobros o datos posteriores.

## Causa raíz del pipeline

Run `29717447684` falló 3/1097 checks porque el overlay exigía textos que solo existían en comentarios; el preflight elimina comentarios antes de evaluar tokens.

Run `29717631288` volvió a fallar en preflight porque el overlay mínimo dejó de reemplazar el contrato antiguo del ejecutor runtime. El registro base exigió seis tokens de la versión 1.0.25, aunque el ejecutor vigente es 1.0.27.

Conforme a la regla de dos fallos en la misma etapa, se detuvieron los reintentos. El overlay quedó corregido en `929364bed0a07725275dd69f43ba1c49736e21bf`, restaurando explícitamente el contrato runtime 1.0.27, sin disparar otro gate.

## Claude

- `REPLICABLE_CLAUDE_ACUMULADO`: Calidad país/moneda, evidencia propuesta-only, segmentación honesta, importador sin falso éxito, responsive, acceso seguro y copia bancaria completa.
- `ACADEMIA_ACTUALIZAR`: completado en contenido 1.224.
- `TENANT_AYS_ONLY`: conteos y distribución real.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: proveedores seguros, Firestore LAB, reglas, credenciales y pipeline.
- `SECRETO_DATO_REAL`: no transferir contactos, cuentas, accesos ni archivos reales.

## Siguiente acción exacta

En un corte nuevo de pipeline:

1. confirmar HEAD `929364bed0a07725275dd69f43ba1c49736e21bf`;
2. ejecutar solo `node tools/orbit360-validar-gate-contracts-v20260717.mjs block1-client360-insurers-lab-v20260717`;
3. aceptar exclusivamente `GO_GATE_CONTRACT`;
4. solo entonces ejecutar una vez el gate oficial;
5. aceptar únicamente artefacto sanitizado `ok:true`;
6. publicar el nuevo LAB y realizar revisión humana v5.

No hacer nuevos cambios de producto, reimportaciones ni otro gate hasta ese corte.
