# Cierre — Honestidad operativa v1330

Fecha: 2026-07-07
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Cerrar el bloque de revisión/hotfixes de honestidad operativa del prototipo empalmado v1330, evitando que la UI afirme envíos, pagos, integraciones, IA, Drive, WhatsApp, correo o publicación real cuando la acción solo queda preparada/registrada o depende de proveedor/backend conectado.

## Regla transversal aplicada

```txt
Preparar no es enviar.
Reportar no es conciliar.
Validar propuesta no es aplicar pago.
Abrir WhatsApp Web no confirma entrega.
Cuenta configurada no equivale a OAuth/backend conectado.
Enlace manual no equivale a integración Drive activa.
IA no conectada no debe etiquetarse como IA.
Metricool/Canva/Make/Correo/Drive/WhatsApp requieren proveedor conectado para ejecución real.
```

## Commits funcionales principales del bloque

```txt
94a7596b56d2e7cee0ecb89b35b78c1153575865
fix(ays): calidad honestidad datos v1330

a98b7a6bc2ddb0f700a474a6248bf4ff40468022
docs(ays): cierre hotfix equipo notify correo v1330

fb6332f90af5f9a2b680eeb1bdbdb974bac363ee
docs(ays): cierre hotfix portal siniestros automatizaciones plantillas v1330

5d6901e935c4ded1a825de2f744f20e88c8d96e8
docs(ays): cierre hotfix correo cancelaciones historial polizas v1330

0f12f1c742a36a43be61122ba6bad18a8a199465
fix(ays): marketing honestidad ia publicaciones v1330

17afa5d8ada41b078cd84db092ace68420c8cb0d
fix(ays): reportes honestidad programacion moneda v1330

de7c8671883006386184cce3597513c092a7766d
fix(ays): cliente360 prepara correo sin envio real v1330

55520f74536db7846448814d90528d543d22eaf1
docs(ays): documenta hotfix cliente360 correo drive v1330
```

## Módulos revisados/corregidos

### Cliente360

Estado: corregido.

Cambios confirmados:

- `Expediente en Drive` -> `Expediente vinculado`.
- `Agregar link de Drive` -> `Agregar enlace de expediente`.
- Comparativo prepara compositor central en `#/correo`.
- Siniestros prepara correo a aseguradora en `#/correo`.
- Pestaña Correos prepara redacción central.
- Ya no se llama envío directo desde Cliente360 para estos flujos.

Patrón Claude/Academia:

- El usuario aprende que Cliente360 prepara comunicaciones y expedientes, pero el envío/entrega real depende del módulo Correo o del proveedor conectado.

### Correo

Estado: alineado.

Patrón confirmado:

- Sin cuenta conectada: correos preparados, no enviados.
- Con cuenta configurada: confirmación real depende del proveedor.
- El compositor central es la capa correcta para comunicaciones salientes.

### Notificaciones / WhatsApp

Estado: alineado.

Patrón confirmado:

- `Preparados hoy`, no `Enviados hoy`.
- `wa.me` abre chat, no confirma entrega.
- API WhatsApp queda como pendiente de conexión cuando no hay backend/proveedor real.

### Portal

Estado: alineado.

Patrón confirmado:

- Reportar pago desde portal no aplica pago.
- Reporte queda pendiente de revisión/conciliación.
- Notificación queda registrada en portal; WhatsApp/correo real depende de integración.
- Documentos quedan registrados para revisión; carga real requiere Storage/backend.

### Cobros

Estado: alineado.

Patrón confirmado:

- Distingue `Reportado por cliente`, `Validada (por aplicar)`, `Pagado (por conciliar)`, `Conciliado`, `Requiere validación` y `Bloqueado`.
- Evita confundir pago reportado con cobro aplicado.

### Conciliaciones

Estado: alineado.

Patrón confirmado:

- La bandeja solo cambia estado de propuestas.
- No aplica pagos ni modifica cobros.
- Conserva país/moneda por propuesta.

### Configuración / Integraciones

Estado: alineado.

Patrón confirmado:

- WhatsApp Cloud API y otras conexiones pueden quedar pendientes.
- Las credenciales no deben exponerse en front.
- Configurar no equivale a conexión real activa.

### Equipo / Usuarios

Estado: alineado.

Patrón confirmado:

- Crear usuario en equipo no equivale a credenciales enviadas.
- Invitación/Auth real queda pendiente de backend/canal conectado.

### Marketing

Estado: corregido.

Patrón confirmado:

- Si no hay IA conectada, las ideas se etiquetan como plantilla local.
- Publicar/programar requiere Metricool/Make/proveedor conectado.
- Solicitar pieza a Canva no equivale a creación real si no hay integración activa.

### Reportes

Estado: corregido.

Patrón confirmado:

- Programar reporte en Orbit no equivale a envío real por correo.
- Envío real queda pendiente de integración activa.
- En vista multipaís no se deben sumar monedas crudas.

## Validaciones reportadas en el bloque

```txt
node --check orbit360-platform/modules/cliente360.js: OK
node tools/orbit360-validar-backend-lab-contrato.mjs: OK, 0 errores, 1 warning esperado del guard LAB en index
```

Además, en hotfixes previos se validaron por `node --check` los módulos ajustados antes de subirlos cuando el cambio fue aplicado por ChatGPT/Codex.

## Archivos protegidos

No se tocaron en este cierre documental:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
index.html
```

## Impacto en Academia

Academia debe incorporar este bloque como regla transversal para usuarios por rol:

- Cliente: reportar pago no significa pago confirmado.
- Asesor: preparar comparativo/correo no significa enviado.
- Operaciones: validar propuesta de conciliación no aplica cobro.
- Finanzas: conciliado es estado posterior, no equivalente a reporte.
- Marketing: propuesta de publicación no significa publicación ejecutada.
- Dirección/Admin: configuración de integración no significa proveedor conectado.

## Impacto para Claude/prototipo

Claude debe conservar estos patrones en próximos candidatos:

- Usar lenguaje `Preparar`, `Registrar`, `Pendiente de conexión`, `Pendiente de revisión`, `Pendiente de conciliación`, `Proveedor conectado requerido`.
- Evitar `Enviado`, `Publicado`, `Conectado`, `Aplicado`, `Conciliado`, `Drive activo`, `IA generada` salvo evidencia real.
- No reintroducir textos técnicos visibles: Firebase, Firestore, backend, LAB, localStorage, mock, demo, smoke, credenciales.

## Estado final del bloque

- Bloque de honestidad operativa v1330: cerrado documentalmente.
- PR #5 permanece draft/open.
- No merge.
- No deploy.
- No main.
- No datos reales.
- No ZIP entregado.

## Siguiente bloque recomendado

Continuar con validación de estabilidad visual/funcional post-hotfix por módulos críticos:

1. Inicio
2. Cliente360
3. Correo
4. Portal
5. Cobros
6. Conciliaciones
7. Reportes
8. Marketing
9. Configuración
10. Academia

Si aparecen regresiones visuales, corregir solo con parches pequeños y documentados.
