# Addendum Cloud / Claude / Academia — acceso, Cobros y rollback RC1.2

Fecha: 2026-08-04

## CL-110 — Registro de equipo no equivale a identidad de acceso

Una interfaz llamada “Usuarios” no debe persistir únicamente registros de asesores o equipo. El onboarding autoadministrable requiere un contrato único y reversible:

```text
Auth user + tenant membership + advisor/team record + invitation/audit
```

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` y `ACADEMIA_ACTUALIZAR`.

## CL-111 — El acceso exitoso debe declarar su autoridad

Las pruebas deben distinguir:

```text
fixed technical identity
normal Firebase Auth identity
tenant membership projection
```

Un smoke con identidad técnica no demuestra que los usuarios normales estén provisionados.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## CL-112 — Rutas absolutas y relativas son contratos distintos

Todo engine que reciba una ruta mediante variable de entorno debe resolverla así:

```javascript
path.isAbsolute(rel) ? rel : path.join(ROOT, rel)
```

Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

## CL-113 — Firestore transaction: todas las lecturas antes de escrituras

Un rollback transaccional debe:

1. leer todos los documentos;
2. validar propiedad y versión;
3. ejecutar todos los deletes o writes.

No debe alternar `tx.get` y `tx.delete` dentro de un ciclo.

Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

## CL-114 — Cobro materializado no equivale a universo cobrado

Los KPIs y contratos deben separar:

- cobros materializados;
- pagos reportados no conciliados;
- pagos inferidos por secuencia;
- ausencia de saldo según aseguradora;
- evidencia de comisión;
- movimientos financieros derivados.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` y `ACADEMIA_ACTUALIZAR`.

## CL-115 — Nuevas planillas se incorporan incrementalmente

La clave de continuidad es:

```text
fuente + compañía + país + moneda + periodo + digest
```

Las nuevas planillas no autorizan reimportación total. Deben producir dry-run, conciliación, diff, confirmación, auditoría y rollback.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## Academia por rol

- **Dirección:** diferencia entre equipo, identidad y membership; lectura correcta de KPIs de Cobros.
- **Operativo:** conciliación de evidencia directa e inferida, HOLD y fuentes sustituidas.
- **Asesor:** visibilidad de pagos reportados sin convertirlos en cobros validados.
- **Administración técnica:** gates antes de secretos, ownership de rollback y verificación de ausencia posterior.

## Seguridad

Los correos, UID, credenciales temporales y source locks reales permanecen `BACKEND_PROTEGIDO_NO_CLAUDE`. No se envió información externa a Cloud/Claude.
