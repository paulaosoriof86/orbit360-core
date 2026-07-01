# Integraciones de la plataforma

> Catálogo de integraciones para CXOrbia, priorizadas por valor/criticidad. Se activan **por proyecto y por plan**. Diseño: la plataforma **no depende** de ninguna para operar (mock/local), pero las soporta cuando el cliente las contrata.

## Núcleo operativo (P0/P1 — alto valor)

| Integración | Para qué | Notas de implementación |
|---|---|---|
| **Google Sheets** | Hoja de Ruta externa **en vivo** (lectura/escritura), export | API Sheets v4 + service account o OAuth; webhook/poll para detectar cambios |
| **Excel Online (Microsoft Graph)** | HR externa en Excel online, lectura en vivo | Microsoft Graph API (workbook) |
| **Excel/CSV importado** | Cargar HR/movimientos/shoppers y **mapear columnas** | Parser en cliente + UI de mapeo |
| **Make (Integromat)** | Orquestar automatizaciones: actualizar HR cuando el shopper marca, disparar mensajes, sincronizar estados | Webhooks entrantes/salientes |
| **WhatsApp** | Ofrecer visitas, recordatorios, soporte | Dos modos: **WhatsApp Web** (link `wa.me`, sin API, manual) y **API** (Green API / WhatsApp Cloud API) para envío automático/masivo |
| **Green API / WhatsApp Cloud API** | Envío automatizado y masivo de WhatsApp | Token por tenant; plantillas aprobadas |

## Mensajería y correo (P1/P2)

| Integración | Para qué |
|---|---|
| **Gmail / Google Workspace** | Enviar ofertas/recordatorios por correo; SSO |
| **Outlook / Microsoft 365** | Correo y gestión interna del equipo; SSO; calendario |
| **Mailchimp** | Campañas masivas a la base de shoppers (ofertas de visitas) |
| **SMTP genérico** | Correo transaccional si no usan Google/MS |

## Productividad / contenido (P2)

| Integración | Para qué |
|---|---|
| **Google Docs / Drive** | Instructivos y documentos del proyecto vinculados |
| **Microsoft (OneDrive/SharePoint)** | Documentos del proyecto |
| **YouTube / Vimeo (embed)** | Videos de aprendizaje embebidos |
| **Facebook (Páginas/Grupos)** | Difusión de convocatorias / reclutamiento de shoppers |

## Identidad / pagos (P3)

| Integración | Para qué |
|---|---|
| **Google / Microsoft SSO** | Inicio de sesión corporativo (enterprise) |
| **BI (Looker/Power BI)** | Export de KPIs a tableros del cliente |
| **Pasarela/banco (export)** | Archivo de pago de lotes (ACH/transferencias) |

## Modos de WhatsApp (importante)
- **WhatsApp Web (manual)**: la plataforma arma el mensaje con plantilla y abre `https://wa.me/<num>?text=<plantilla>` — **sin API ni costo**, el usuario solo confirma el envío. Default para clientes en plan básico.
- **API (automático/masivo)**: Green API o WhatsApp Cloud API para envíos sin intervención y campañas a varios shoppers.
- El shopper también puede **contactar al soporte del cliente** vía `wa.me` a los números configurados por rol.

## Plantillas de mensajes (WhatsApp + correo)
Plantillas editables por el cliente, con variables (`{shopper}`, `{sucursal}`, `{fecha}`, `{honorario}`, `{link}`):
- Ofrecer visita disponible (individual y masiva por ciudad).
- Recordatorio de visita agendada.
- Consulta "¿realizaste la visita?".
- Recordatorio de llenar cuestionario.
- Recordatorio de marcar visita completada en plataforma.
- Invitación a certificarse / recertificarse.
- Aviso de pago / liquidación.
