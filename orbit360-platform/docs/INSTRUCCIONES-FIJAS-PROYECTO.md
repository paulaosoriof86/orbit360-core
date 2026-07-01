# CXOrbia — Instrucciones fijas del proyecto (pegar como CLAUDE.md en el proyecto nuevo)

> Pega este texto como instrucción persistente (CLAUDE.md) del proyecto NUEVO de migración.

## Contexto
- Este proyecto es **CXOrbia — TyA (producción)**, una COPIA del prototipo maestro white-label.
- El maestro queda intacto como plantilla; aquí personalizamos para TyA y migramos sus datos reales.
- NO trabajar sobre el proyecto viejo de TyA: ese solo se usa para EXTRAER datos (vía el prompt de OpenAI).

## Reglas permanentes
- Genérico y white-label: nada hardcodeado a un cliente; todo configurable desde la plataforma sin tocar código.
- Separación por moneda y país (no solo GT/HN).
- Datos en vivo (KPIs y series calculados de datos reales, nunca fijos).
- Toda importación inteligente debe permitir **iterar/refinar** lo entregado por la IA antes de confirmar.
- Deduplicación por llave natural (sucursal+ciudad+escenario+quincena o extId) — nunca duplicar.
- Cada entrega: actualizar el plan de trabajo y entregar el repo en ZIP.

## Arquitectura
- Frontend vanilla (HTML/CSS/JS), entrada `app/index.html`. Módulos `CX.module(...)`, menú en `core/config.js`.
- Persistencia: hoy semillas + localStorage; en producción → backend (Firebase/Supabase) vía capa `CX.db`.
- Integraciones configurables por tenant: Make (webhooks), Gemini (IA transversal), Outlook/Google.

## ¿Proyecto nuevo o el viejo?
SIEMPRE proyecto NUEVO (copia del maestro). El viejo de TyA NO se modifica.
