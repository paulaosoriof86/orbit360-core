# Checklist smoke visual/operativo — Conciliaciones Orbit 360 A&S

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** checklist preparado; smoke visual pendiente.

---

## 1. Propósito

Definir criterios de aceptación visual y operativa para el módulo `Conciliaciones` antes de cualquier adapter Firestore LAB real.

Este checklist no autoriza backend real, persistencia, aplicación de pagos, carga de datos reales, deploy ni merge.

---

## 2. Helper PowerShell opcional

Para generar una plantilla de reporte local:

```powershell
.\tools\orbit360-preparar-smoke-visual-conciliaciones-ays.ps1
```

Opcionalmente, para abrir una URL local:

```powershell
.\tools\orbit360-preparar-smoke-visual-conciliaciones-ays.ps1 -LocalUrl http://localhost:5173/orbit360-platform/index.html -OpenBrowser
```

El helper solo genera plantilla y, si se solicita, abre navegador. No valida visualmente de forma automática y no escribe datos operativos.

---

## 3. Precondiciones obligatorias

Antes del smoke visual debe existir evidencia de runner local:

```txt
RESULTADO: OK
Fallidos: 0
Archivos protegidos con cambios: 0
can_write_now=false
can_apply_payments=false
```

Si el runner falla o queda con advertencias no revisadas, no pasar a smoke visual.

---

## 4. Restricciones del smoke

Durante el smoke visual:

- no deploy;
- no merge;
- no datos reales;
- no Firestore writes;
- no `Orbit.store` writes fuera de `conciliaciones`;
- no aplicación de pagos;
- no marcar cobros como pagados;
- no generar cartera;
- no generar producción.

---

## 5. Acceso y navegación

Validar:

- la plataforma carga sin pantalla rota;
- el chrome conserva Orbit 360;
- no aparecen textos técnicos visibles en UI cliente;
- `Conciliaciones` aparece para Dirección;
- `Conciliaciones` aparece para Admin;
- `Conciliaciones` aparece para Finanzas;
- `Conciliaciones` no aparece para roles no autorizados.

---

## 6. Estado vacío honesto

Si no hay propuestas:

- debe mostrar estado vacío claro;
- no debe prometer aplicación automática;
- no debe mostrar pago aplicado sin backend real;
- no debe mostrar producción o cartera generada desde conciliaciones.

---

## 7. Copy y estados seguros

Validar que la UI use estados honestos:

```txt
propuesta
revision
pendiente de validacion
validada
rechazada
bloqueada
```

Reglas:

- `validada` no significa `pagada`;
- no debe aparecer copy de aplicación de pagos sin confirmación;
- no debe aparecer copy de pago finalizado/productivo;
- si aparece país/moneda, debe respetar GT→GTQ y CO→COP;
- no debe sumar monedas distintas en crudo.

---

## 8. Acciones seguras

Validar acciones visibles:

- ver detalle no muta `cobros`;
- aprobar o validar propuesta no marca cobro pagado;
- rechazar propuesta no borra `cobros`, `polizas`, `comisiones` ni `finmovs`;
- enviar a revisión no genera cartera;
- ninguna acción genera producción;
- ninguna acción muestra detalles técnicos en UI cliente.

---

## 9. Trazabilidad visual

Si hay propuestas sintéticas visibles:

- cada propuesta debe mostrar fuente o referencia;
- cada propuesta debe conservar estado de revisión;
- no debe mezclar fuentes separadas en una misma acción;
- no debe inferir clientes o pólizas desde financiero histórico;
- no debe escribir cobros desde estado bancario sin conciliación.

---

## 10. Criterios de aceptación

Resultado `OK` solo si:

- runner local previo quedó OK;
- el módulo renderiza para roles autorizados;
- los roles no autorizados no ven el módulo;
- no hay copy técnico visible;
- estado vacío es honesto;
- acciones no aplican pagos ni mutan cobros;
- no hay generación de cartera o producción;
- no hay mezcla de monedas ni fuentes.

Resultado `OK_CON_OBSERVACIONES` si:

- hay hallazgos visuales menores sin riesgo operativo;
- no hay writes, pagos, cartera, producción ni textos técnicos graves;
- las observaciones quedan documentadas para Claude/front.

Resultado `BLOQUEADO` si:

- aparece pago aplicado sin backend real;
- una acción muta `cobros`, `polizas`, `comisiones`, `finmovs`, cartera o producción;
- aparece copy técnico cliente;
- hay roles no autorizados con acceso;
- se mezclan fuentes o monedas;
- runner previo no está OK.

---

## 11. Evidencia a conservar

Guardar o pegar en la conversación:

```txt
_orbit360_reports/SMOKE-VISUAL-CONCILIACIONES-AYS-*.txt
```

Incluir:

- decisión visual;
- observaciones;
- ruta de capturas si aplica;
- evidencia del runner local previo.

---

## 12. Siguiente paso después del smoke

Si el smoke visual queda OK, el siguiente paso permitido es revisión técnica para adapter Firestore LAB.

No pasar a adapter LAB real sin autorización explícita, ni usar datos reales, ni aplicar pagos.