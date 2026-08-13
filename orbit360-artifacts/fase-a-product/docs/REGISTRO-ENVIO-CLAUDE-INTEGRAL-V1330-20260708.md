# Registro — envío Claude integral v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo

Paula confirmó que Claude tiene capacidad. Se preparó paquete integral para que Claude genere nueva candidata frontend/prototipo/Academia incorporando todos los patrones reutilizables acumulados desde backend, sin tocar backend protegido.

## Carpeta creada

```txt
orbit360-platform/docs/paquete-claude-v1330-integral-post-m5-documentos-portal/
```

## Archivos creados

```txt
00_LEEME-CLAUDE.md
01_PROMPT-CLAUDE-INTEGRAL-V1330.md
02_ALCANCE-MODULOS-Y-UX.md
03_REGLAS-BACKEND-A-CONSERVAR.md
04_ACADEMIA-PROFUNDA-ACTUALIZAR.md
05_CHECKLIST-ENTREGA-CANDIDATA.md
06_PROMPT-CORTO-PARA-PEGAR.md
07_MAPA-DOCUMENTOS-BASE.md
```

## Incluye

- Equipo/Config gates.
- M5 Conciliaciones gates.
- Documentos + Storage futuro + adjuntos.
- Portal pago reportado con soporte visible.
- Cobros revisión documental con motivo/auditoría.
- Cliente360 documentos visibles.
- Academia profunda por rol.
- Copy honesto y estados no técnicos.
- Reglas de backend a conservar.
- Checklist de entrega y rechazo.

## Restricciones reiteradas para Claude

No tocar:

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
orbit360-platform/index.html
```

No incluir datos reales, secretos, Storage real, URLs públicas, base64 ni credenciales.

## Próximo paso

Paula puede abrir Claude y usar:

```txt
orbit360-platform/docs/paquete-claude-v1330-integral-post-m5-documentos-portal/01_PROMPT-CLAUDE-INTEGRAL-V1330.md
```

Si Claude necesita versión corta, usar:

```txt
orbit360-platform/docs/paquete-claude-v1330-integral-post-m5-documentos-portal/06_PROMPT-CORTO-PARA-PEGAR.md
```

## Estado

Paquete listo para enviar a Claude. ChatGPT debe continuar backend/documentación mientras Claude genera candidata, y luego auditar la candidata real antes de empalmar.