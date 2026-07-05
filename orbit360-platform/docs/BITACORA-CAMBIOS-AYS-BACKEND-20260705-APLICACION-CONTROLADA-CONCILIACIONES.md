# Bitácora backend — Aplicación controlada desde conciliaciones A&S

**Fecha:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** planificador plan-only agregado. No writes, no pagos, no mutación de `cobros/comisiones`.

---

## 2026-07-05 — Planificador de aplicación controlada

- **Módulo/área:** Backend / conciliaciones / cobros / comisiones / auditLog.
- **Necesidad:** después de definir la UI/Bandeja y la acción `preparar_aplicacion_controlada`, faltaba una herramienta backend que permitiera preparar la aplicación sin ejecutarla.
- **Esperado:** recibir una propuesta `VALIDADA`, actor, motivo y frase explícita, y generar un plan auditable para una futura ejecución autorizada.
- **Causa raíz:** no debe existir una ruta directa desde importador, planilla o bandeja hacia `cobros`/`comisiones` sin validación humana y auditLog.
- **Archivos agregados:**
  - `tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs`
  - `tools/orbit360-test-preparar-aplicacion-controlada-conciliacion-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-APLICACION-CONTROLADA-CONCILIACIONES-AYS-20260705.md`
- **Fix/mejora aplicada:** planificador plan-only con validación de estado `VALIDADA`, actor, rol, motivo, frase explícita, país/moneda, monto, fuente, trazabilidad y target permitido.
- **Impacto comercializable:** permite separar revisión, autorización y ejecución, reduciendo riesgo operativo en cobros/comisiones y manteniendo trazabilidad para auditoría.
- **Estado:** LISTO EN RAMA COMO TOOLING / pendiente UI/Bandeja y futuro ejecutor autorizado.

---

## Seguridad aplicada

La herramienta bloquea entradas con:

- propuesta no validada;
- score no aplicable;
- falta de trazabilidad de fuente;
- país/moneda incoherente;
- monto inválido;
- ausencia de target cobro/comisión;
- ausencia de actor/rol/motivo;
- ausencia de frase explícita de aprobación;
- payload o filas de origen reales;
- cualquier marcador de credenciales o ejecución directa;
- cualquier bandera que intente activar escritura o aplicación automática.

---

## Pruebas sintéticas previstas

Suite:

```txt
tools/orbit360-test-preparar-aplicacion-controlada-conciliacion-ays.mjs
```

Casos cubiertos:

1. aplicación lista.
2. propuesta no validada bloqueada.
3. sin target bloqueado.
4. país/moneda incoherente bloqueado.
5. falta frase de aprobación bloqueada.
6. payload de origen bloqueado.
7. score bajo genera advertencia.

---

## Pendiente siguiente

Conectar el planificador a la futura UI/Bandeja:

```txt
botón preparar_aplicacion_controlada -> planificador -> revisión humana -> transición VALIDADA->APLICADA -> futuro ejecutor autorizado
```

La ejecución real sigue bloqueada hasta autorización explícita de Paula.