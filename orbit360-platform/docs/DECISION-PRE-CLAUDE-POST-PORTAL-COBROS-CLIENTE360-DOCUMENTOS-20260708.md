# Decisión pre-Claude — post Portal + Cobros + Cliente360 documentos

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Situación

Ya se acumularon cambios y contratos relevantes para UX/prototipo/Academia:

- Equipo/Config gates administrativos.
- M5 Conciliaciones gates.
- Documentos + Storage futuro + adjuntos.
- Portal + Cobros + Cliente360 documentos visibles.
- Academia impactada por los cuatro bloques.

## Decisión recomendada

Antes de hacer un hotfix visual grande desde backend, enviar paquete integral a Claude cuando tenga capacidad.

Razón:

- Cliente360 necesita vista documental estructurada.
- Portal necesita seguimiento visible de pagos reportados y documentos.
- Cobros necesita revisión documental con acciones/motivo.
- Academia requiere rutas/lecciones/quizzes/certificados.
- Estos cambios son más UX/prototipo que backend protegido.

## Si Claude no tiene capacidad

Continuar desde ChatGPT/GitHub con hotfix quirúrgico mínimo y reversible:

1. Cobros: motivo obligatorio para validar/rechazar/aplicar pago.
2. Portal: al reportar pago, crear documento/adjunto metadata-only además de `soporteNombre`.
3. Cliente360: añadir sección documental simple o documentar pendiente explícito.
4. Sin tocar `index.html`, backend protegido ni Storage real.
5. Validación local solo si el cambio toca JS funcional.

## Criterio para pedir intervención a Paula

Solo pedir intervención manual si:

- se requiere validar en navegador;
- se requiere ejecutar `node --check` tras patch funcional;
- se requiere autorización para deploy/merge/Storage/Firestore;
- se requiere adjuntar nueva candidata Claude.

## Estado

Paquete Claude recomendado próximamente, pero no enviado todavía salvo instrucción de Paula.