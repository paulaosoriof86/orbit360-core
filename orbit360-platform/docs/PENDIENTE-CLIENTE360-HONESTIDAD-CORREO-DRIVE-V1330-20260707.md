# PENDIENTE — Cliente360 honestidad correo/Drive v1330

Fecha: 2026-07-07
Proyecto: Orbit 360 A&S
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open

## Motivo

Cliente360 es un archivo grande y sensible. No se reemplazó completo desde el conector GitHub porque la copia local disponible no tiene el mismo blob SHA que el remoto. Para evitar pisar cambios previos, queda como parche seguro pendiente para Codex/local.

## Hallazgos confirmados

Archivo: orbit360-platform/modules/cliente360.js

1. Header del expediente muestra Drive como si fuera destino activo:
   - “Expediente en Drive”
   - “Agregar link de Drive”

2. Comparativo de renovación:
   - Botón: “Enviar comparativo al cliente”
   - Handler llama directamente Orbit.correo.enviar.

3. Siniestros:
   - Botón “Correo a aseguradora” llama directamente Orbit.correo.enviar.

4. Pestaña Correos:
   - Botón “Redactar” llama directamente Orbit.correo.enviar.

## Parche seguro requerido

Aplicar solo sobre la rama activa y sin tocar backend protegido.

### Comparativo

Cambiar el botón a:

Preparar comparativo para cliente

Cambiar handler para usar:

window.__orbitCompose = {
  para: cliente.email || '',
  asunto: 'Comparativo de renovación · ' + p.numero,
  cuerpo: 'Adjunto el comparativo de tu renovación con ' + props.length + ' opción(es).',
  clienteId: p.clienteId,
  vinculo: { tipo: 'poliza', id: polId, label: p.numero }
};
location.hash = '#/correo';

Toast:

Comparativo preparado en Correo; envío real requiere cuenta conectada.

### Siniestros

Cambiar “Correo a aseguradora” para preparar compositor:

window.__orbitCompose = {
  para: '',
  asunto: numeroReclamo + ' · ' + clienteNombre,
  cuerpo: '',
  clienteId: cid,
  vinculo: { tipo: 'reclamo', id: reclamoId, label: numeroReclamo || reclamoId }
};
location.hash = '#/correo';

### Pestaña Correos

Cambiar botón “Redactar” para usar window.__orbitCompose y luego navegar a #/correo. No llamar Orbit.correo.enviar desde Cliente360.

### Drive

Cambiar textos visibles:

- “Expediente en Drive” → “Expediente vinculado”
- “Agregar link de Drive” → “Agregar enlace de expediente”

Si en el futuro se muestra estado Drive, debe ser honesto: conectado, pendiente de conexión o enlace manual.

## Validaciones requeridas

- node --check orbit360-platform/modules/cliente360.js
- node tools/orbit360-validar-backend-lab-contrato.mjs

## Impacto Claude / Academia

Claude debe conservar este patrón:

- Redactar/preparar correo no significa enviar.
- Abrir WhatsApp Web no confirma entrega.
- Link manual de expediente no equivale a integración Drive activa.
- El comparativo preparado no debe figurar como enviado hasta confirmación de canal conectado.

Academia debe incluir este caso en Cliente360, Correo, Siniestros y Configuración/Integraciones.
