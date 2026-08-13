# Plan auditoría — Ops, ruteo de gestiones y notificaciones

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: plan de auditoría backend/frontend. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Motivo

Paula detectó que en Ops las solicitudes de clientes, asesores y otros usuarios quedan en una lista de gestiones administrativas sin discriminar correctamente el tipo de gestión ni redirigirlas a la lista que corresponde.

También se define como requisito que los movimientos del cliente en cualquiera de sus secciones notifiquen al asesor relacionado y tengan retroalimentación, comunicación y trazabilidad completa.

## 2. Base activa

La auditoría debe realizarse sobre la candidata activa:

```txt
Prototype Development Request - 2026-07-04T152321.882.zip
```

No usar candidatas anteriores.

## 3. Archivos a revisar

- `modules/ops.js`
- `modules/portal.js`
- `modules/cobros.js`
- `modules/cliente360.js`
- `modules/polizas.js`
- `modules/renovaciones.js`
- `modules/cancelaciones.js`
- `modules/siniestros.js`
- `modules/notificaciones.js`
- `core/ciclo.js`
- `core/queries.js`
- `data/seed.js`

## 4. Preguntas de auditoría

### Clasificación y ruteo

- ¿Dónde se crean las gestiones?
- ¿Qué campo define el tipo de gestión?
- ¿Existe lista destino o todo cae en administrativo?
- ¿Se distingue origen cliente/asesor/operativo/sistema?
- ¿Se asigna responsable por rol?
- ¿Se asigna SLA/prioridad?
- ¿Se vincula cliente, asesor, póliza, cobro o documento?

### Notificaciones

- ¿Se notifica al asesor cuando su cliente solicita algo?
- ¿Se notifica a Cobros cuando reportan pago?
- ¿Se notifica a Operativo cuando el cliente pide gestión?
- ¿Se notifica al cliente cuando cambia el estado?
- ¿Queda registro de la notificación enviada?

### Trazabilidad

- ¿Cada cambio queda en historial/actividad?
- ¿Existe estado interno, estado cliente y estado asesor?
- ¿Se guardan comentarios y documentos relacionados?
- ¿Se puede reconstruir qué pasó, quién actuó y cuándo?

## 5. Diagnóstico esperado

El resultado debe entregarse así:

```txt
OPS-RUTEO-NOTIFICACIONES-DIAGNOSTICO
- Estado actual:
- Gestiones que caen mal en administrativo:
- Campos actuales de gestión:
- Campos faltantes:
- Notificaciones existentes:
- Notificaciones faltantes:
- Dónde se pierde trazabilidad:
- Fix frontend para Claude:
- Fix backend para ChatGPT/Codex:
- Manuales/Academia afectados:
```

## 6. Posibles decisiones después de auditar

### Opción A — UI ya tiene datos pero no filtra bien

Si la gestión tiene tipo/destino, pero Ops no lo muestra correctamente:

- documentar fix para Claude/frontend;
- no tocar backend real.

### Opción B — Falta modelo de datos

Si las gestiones no tienen campos de tipo/destino/responsable/asesor:

- preparar contrato de colección `gestiones` ampliado;
- preparar validador/smoke de modelo;
- documentar cambios para futuro `Orbit.store` real.

### Opción C — Falta notificación

Si el flujo crea gestión pero no notifica:

- definir evento de notificación;
- mapear audiencia;
- registrar en `notificaciones`;
- documentar actualización para manuales y Academia.

## 7. Impacto en Academia

Actualizar cuando se corrija:

- Manual Ops;
- Manual Portal Cliente;
- Manual Cobros;
- Manual Asesor;
- Ruta Administrativo/Operativo;
- Ruta Asesor nuevo;
- Ruta Cliente nuevo;
- Evaluación sobre seguimiento de solicitudes;
- Notificación de actualización de Academia.

## 8. Restricciones

- No Firestore.
- No deploy.
- No merge.
- No datos reales.
- No tocar `data/store.js` sin fase aprobada.
- No pisar backend protegido.

## 9. Estado

Plan creado. Siguiente paso: auditar los archivos reales de la candidata activa y producir diagnóstico.
