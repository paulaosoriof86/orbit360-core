# CIERRE STOP_RETRY — AUTH ACCESS v2 Y ROOT FIX v3

Fecha local: 2026-08-05 09:06 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Resultado del único run autorizado v2

```text
Gate: block-auth-access-recovery-lab-v2-20260805
Preflight: 13/13 PASS
Decisión: STOP_RETRY_CENSUS
Clasificación observada: DATA_CONTRACT_FAILURE
Código: ADVISOR_PAULA_ACCESS_CONFIG_INCOMPLETE
```

La corrección autorizada del correo oficial de Paula sí quedó aplicada:

```text
registro fuente: legacy_tenantId
campo modificado: email
Firestore writes de configuración: 1
Auth writes: 0
membership writes: 0
CRM writes: 0
```

No se desplegó `orbit360ProvisionTeamAccess`; no se crearon usuarios ni memberships; no se enviaron correos. El request v2 quedó consumido e inmutable.

## 2. Causa raíz

El orquestador v2 `tools/orbit360-auth-access-recovery-lab-v20260805.mjs` exigió que el mismo documento legacy del asesor contuviera simultáneamente:

- correo;
- roles;
- rol default;
- países;
- scopes derivados.

Sin embargo, las fuentes aprobadas vigentes ya separan esas responsabilidades:

1. `rc12-cumulative-candidate-unified-manifest.json` conserva roles y rol default del roster aprobado;
2. el commit sellado `34fa84a60ebc38b0035ed664da87ca78aaa73ff7` conserva la identidad autorizada por digest;
3. `orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs` obtiene países desde el registro del asesor y, si faltan, desde la membresía técnica activa del tenant;
4. el perfil aprobado define scopes por Dirección, Operativo y Asesor.

Por ello, el síntoma fue un documento legacy incompleto, pero la causa raíz del STOP es:

```text
VALIDATOR_STALE
```

Owner exacto:

```text
tools/orbit360-auth-access-recovery-lab-v20260805.mjs
resolveTargets()
rolesFrom()
defaultRoleFrom()
countriesFrom()
scopesFrom()
```

## 3. Contrato aprobado recuperado

### Paula — Dirección

```text
roles: SuperAdmin, AdminTenant, Asesor, Operativo
defaultRole: SuperAdmin
countries: configuración del asesor o fallback del tenant
scopes: todos para dominios operativos
```

### Carlos — Operativo

```text
roles: Operativo, Asesor
defaultRole: Operativo
countries: configuración del asesor o fallback del tenant
scopes: todos para operación autorizada
```

### Samuel — Asesor

```text
roles: Asesor, Operativo
defaultRole: Asesor
countries: configuración del asesor o fallback del tenant
scopes principales: propios
cobros: ninguno salvo permisos operativos explícitos
```

El frontend multipaís vigente contiene GT y CO como países operativos configurados. El runtime v3 deberá confirmar la fuente tenant/membership antes de escribir; no asumirá valores si el backend no los respalda.

## 4. Root fix v3 obligatorio

La próxima composición debe seguir esta precedencia:

```text
Identidad:
  registro de asesor configurado
  + verificación contra digest del roster aprobado

Roles y rol default:
  manifiesto aprobado del tenant
  → no inferidos desde nombre ni hardcodeados en módulo genérico

Países:
  registro del asesor
  → si está vacío, membresía técnica/configuración activa del tenant
  → si ambas están vacías, STOP exacto antes de Auth

Scopes:
  contrato aprobado del perfil
  → base + extras - restringidos
```

Antes de cualquier nuevo runtime deberán sincronizarse juntos:

- resolver/orquestador v3;
- lifecycle;
- registro canónico;
- preflight;
- workflow;
- evidencia y cierre;
- Academia;
- acumulado Claude reusable.

## 5. Frontera de seguridad

No se permite:

- reutilizar request v1 o v2;
- ejecutar un tercer runtime sin autorización nueva;
- desplegar otras Functions;
- crear contraseñas temporales;
- hardcodear usuarios, correos, roles o países en módulos genéricos;
- modificar CRM, Hosting, Rules, datos migrados, producción, main o merge.

## 6. Continuidad del plan

El STOP de Auth no detiene el Bloque 4:

```text
PASS_COBROS_FULL_REPLAY
ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan la clasificación de los 365 pagos, la ingesta mensual asistida, el root fix del importador inteligente y el contrato planilla → CxC/CxP → factura posterior.
