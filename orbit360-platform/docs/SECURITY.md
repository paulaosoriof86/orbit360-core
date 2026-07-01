# Seguridad y multi-tenant (antes de vender)

> El documento maestro lo dice claro: **no comercializar a terceros sin una etapa de hardening.** La plataforma actual de T&A tiene reglas RTDB/Storage públicas en rutas operativas — aceptable para un prototipo interno, inadmisible para datos de clientes. Esta base comercial parte limpia y **sin backend acoplado** justamente para construir la seguridad bien desde el inicio.

## Estado de esta base

- ✅ Corre **sin backend** (datos mock locales) → no hay datos sensibles expuestos.
- ✅ Marca y datos **neutrales** (sin T&A) → sin riesgo de PI.
- ✅ Navegación y vistas **segmentadas por rol** en el cliente.
- ⛔ **Falta** (trabajo de producción): Auth real, reglas por tenant, auditoría, cifrado en tránsito/almacenamiento, separación de ambientes.

> La segmentación por rol en el cliente es **UX, no seguridad**. La seguridad real se impone en el backend (reglas + Auth). Nunca confiar en el front.

## Checklist de hardening (Fase 1 del roadmap)

### Autenticación
- [ ] Firebase Auth (email/contraseña + opción SSO para enterprise).
- [ ] Sesiones con expiración y *refresh* controlado.
- [ ] Recuperación de contraseña y verificación de correo.

### Autorización (4 roles)
| Rol | Acceso |
|---|---|
| **Super Admin** | Todo |
| **Equipo administrativo** | Operación + finanzas |
| **Equipo operativo** | Solo operación |
| **Shopper** | Solo su portal y sus datos |

- [ ] Permisos por módulo **validados en el backend** (no solo en `CX.NAV`).
- [ ] El shopper solo lee/escribe **sus** visitas, postulaciones y pagos.

### Multi-tenant
- [ ] `tenantId` en cada nodo; reglas que impiden cruzar tenants.
- [ ] Aislamiento de datos por cliente y por proyecto.
- [ ] Onboarding de tenant sin tocar a otros.

### Reglas RTDB/Firestore (ejemplo de intención)
```
match /tenants/{tenant}/{document=**} {
  allow read, write: if request.auth != null
    && request.auth.token.tenant == tenant
    && hasRole(request.auth, requiredRoleFor(resource));
}
```
- [ ] **Cerrar** lectura/escritura pública (el error del prototipo actual).
- [ ] Storage: archivos privados con URLs firmadas y expiración.

### Ambientes
- [ ] `dev` / `staging` / `prod` con **datos aislados** (el preview no debe tocar prod).
- [ ] Backups automáticos + plan de *rollback*.

### Cumplimiento / datos personales
- [ ] Política de privacidad, términos, consentimiento, retención y borrado.
- [ ] Registro de auditoría (quién hizo qué y cuándo) — ya previsto en el modelo (`aprobadaPor`, timestamps).

### Propiedad intelectual
- [ ] Marca separada de T&A (hecho: base white-label).
- [ ] Titularidad del software y límites de uso de marca/datos definidos por contrato.

## Cómo conectar el backend (cuando esté endurecido)
1. Completar `core/config.js → CX.FIREBASE` con las llaves del proyecto **prod**.
2. Implementar el *adapter* que respeta la interfaz de `CX.data` (ver ARCHITECTURE.md).
3. Activar reglas + Auth **antes** de cargar cualquier dato real.
4. Pilotos solo con datos ficticios hasta pasar el checklist.
