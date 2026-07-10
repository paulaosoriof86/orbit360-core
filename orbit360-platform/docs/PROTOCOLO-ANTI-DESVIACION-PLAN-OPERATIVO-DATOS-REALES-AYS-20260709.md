# Protocolo anti-desviación — plan operativo con datos reales A&S

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo

Paula alertó que el proyecto acumuló sesiones de arquitectura, auditoría, empalmes y documentación sin mantener visible el carril operativo real de A&S. Posteriormente ocurrió una segunda desviación: después de cerrar el trabajo extenso de Clientes, Pólizas, Vehículos, Recibos, Cobros, Cartera y Comisiones, se continuó con fuentes periféricas y la documentación viva siguió describiendo etapas ya superadas como trabajo futuro.

Este protocolo se actualiza para impedir ambas regresiones.

## Reconocimiento

Sí hubo desviación parcial. El backend, los contratos y los importadores construidos son útiles, pero el plan vivo no reflejó con suficiente precisión qué cruces ya estaban cerrados y cuál era el siguiente delta real.

La solución obligatoria es mantener tres carriles, un baseline de no repetición y un checkpoint antes de cada bloque.

## Regla maestra

Toda continuidad de Orbit 360 A&S debe trabajar con tres carriles:

```txt
Carril A — Última candidata/prototipo/empalme UX.
Carril B — Backend protegido/seguridad/Orbit.store/importadores.
Carril C — Datos reales/migración operativa A&S.
```

Ningún bloque puede avanzar más de una sesión sin indicar qué ocurrió en los carriles aplicables.

## Baseline operativo obligatorio — no repetir

A fecha 2026-07-09 se considera baseline aceptado y no se vuelve a iniciar desde cero:

```txt
1. Clientes Siga CRM:
   - fuente leída y auditada;
   - 440 registros;
   - reglas de normalización y asesores cerradas;
   - deduplicación exacta/probable definida;
   - calidad de datos calculada;
   - dry-run sanitizado ejecutado:
     crear 414 / actualizar 0 / omitir 0 / requiere_validacion 26.

2. Pólizas:
   - fuentes principales y complementarias perfiladas;
   - cruce con clientes, aseguradoras, vigencias y estados realizado;
   - llave canónica de póliza definida;
   - reglas de Renovada, Cancelada e histórico cerradas;
   - prima neta/gastos/IVA/total separadas;
   - motor P0 y wire implementados.

3. Vehículos:
   - fuente Auto tratada como complemento de pólizas, no pólizas adicionales;
   - relación cliente/póliza/vehículo definida.

4. Recibos, Cobros y Cartera:
   - fuentes perfiladas y cruzadas;
   - forma de pago y recibos esperados modelados;
   - cartera diferenciada de financiero histórico;
   - cobros/recaudos diferenciados de finmovs;
   - motores P0 y wires implementados;
   - conciliación propuesta, no aplicación automática.

5. Comisiones y Finanzas relacionadas:
   - planillas/facturas/banco modelados;
   - flujo comisión devengada -> factura -> CxC -> recaudo -> liquidación -> CxP -> pago definido;
   - motores P0 de comisiones y banco implementados;
   - primas pendientes excluidas de CxC/CxP financieras.

6. Dry-run/importación segura:
   - builder sanitizado;
   - manifest;
   - confirmación reforzada;
   - escritura controlada bloqueada;
   - dashboard y confirmación P0;
   - tests y workflow creados.
```

Regla de no repetición:

```txt
No volver a auditar, rediseñar o recalcular estos bloques sin una fuente nueva,
un cambio explícito de regla o una evidencia concreta de fallo.
El trabajo siguiente es integración, cierre documental, smoke y uso operativo del modelo ya creado.
```

## Checkpoint obligatorio antes de responder o actuar

Antes de cada bloque se debe verificar:

```txt
1. ¿Cuál es la última candidata auditada/aceptada?
2. ¿Qué carril estoy trabajando: A, B, C o mixto?
3. ¿Qué avance visible y verificable produce el bloque?
4. ¿Qué parte exacta del plan operativo avanza?
5. ¿Estoy reabriendo un bloque del baseline sin evidencia nueva?
6. ¿Qué fuente real ya recibida se usa?
7. ¿Qué documento/registro se actualiza?
8. ¿Qué impacto reusable debe recibir Claude/prototipo/Academia?
9. ¿Qué queda cerrado al terminar?
10. ¿Cuál es la siguiente acción concreta?
```

## Circuit breaker anti-vueltas

Detener y corregir rumbo si ocurre cualquiera:

```txt
- Dos bloques seguidos sin avance visible, código, test, smoke, matriz o cierre operativo.
- Creación de documentos sin acción siguiente concreta.
- Auditoría repetida sin nuevo insumo.
- Presentar como pendiente un cruce incluido en el baseline.
- Hablar de backend sin indicar efecto en operación real A&S.
- Hablar de Claude/prototipo sin actualizar pendientes, patrones replicables o Academia.
- Trabajar más de un bloque sin mencionar el carril C cuando aplique.
- Usar “pendiente” sin responsable, carril, acción y condición de cierre.
- Abrir fuentes periféricas antes de cerrar el siguiente módulo del orden operativo.
```

Cuando se active el circuit breaker, el siguiente bloque debe contener únicamente:

```txt
Estado real
Desviación detectada
Corrección aplicada
Siguiente acción concreta
Fuente o evidencia usada
```

## Plan operativo vivo reencarrilado

### Fase actual P0 — Cierre CRM/Clientes sobre cruce ya realizado

Objetivo:

```txt
Cerrar integración y trazabilidad de CRM/Clientes usando el modelo de pólizas,
recibos, cartera, cobros y comisiones ya construido, sin recalcularlo.
```

Acciones permitidas:

```txt
- actualizar la documentación del dry-run ejecutado;
- verificar el delta mínimo del importador reusable de clientes;
- conectar el resultado sanitizado al pipeline P0 sin payload real;
- validar estados derivados ya calculados en el cruce;
- validar Cliente360, calidad de datos y scopes por asesor;
- añadir test sanitizado y cobertura de workflow si falta;
- mantener escritura real bloqueada.
```

Condición de cierre:

```txt
CRM/Clientes queda alineado con el dry-run real y con el modelo cruzado existente,
con tests/smoke documentados y sin escritura de datos reales.
```

### Fase siguiente P0/P1 — Aseguradoras operativas

Baseline ya existente:

```txt
- directorios GT/CO procesados;
- importador P0 implementado;
- deduplicación corregida;
- contactos y credentialRef modelados;
- dry-run sanitizado realizado.
```

Trabajo restante:

```txt
- validar módulo real Aseguradoras;
- conectar contactos, país, moneda, productos/ramos y configuración;
- validar desactivar vs borrar;
- preparar vínculo con tarifas, Cotizador y Comparativo;
- smoke técnico y visual.
```

### Fase siguiente P1 — Cotizador/Comparativo configurable

Baseline:

```txt
- módulos existentes;
- fuente avanzada comparativo_final_v110.html disponible;
- auditoría previa documentada;
- no se debe reescribir desde cero.
```

Trabajo restante:

```txt
- extraer patrones funcionales reutilizables;
- retirar dependencias y configuración Firebase directa;
- parametrizar aseguradora/plan/cobertura/deducible/prima/condiciones/exclusiones;
- integrar con Aseguradoras y Orbit.store;
- separar país/moneda;
- documentar y enseñar en Academia.
```

### Fase siguiente P1 — Pólizas/Cartera/Recibos/Comisiones: validación transversal

No es una reconstrucción ni nuevo cruce.

Trabajo permitido:

```txt
- smoke del modelo ya implementado;
- verificar integración con CRM y Aseguradoras;
- corregir únicamente fallos concretos encontrados;
- validar estados, scopes y trazabilidad;
- mantener bloqueada escritura real hasta autorización.
```

### Fase transversal — Academia/Claude

En cada bloque se debe registrar obligatoriamente:

```txt
1. Pendientes Claude/prototipo/UX.
2. Modificaciones locales o backend que Claude debe replicar visualmente.
3. Patrones backend reutilizables para futuros tenants.
4. Reglas, flujos y lógicas replicables.
5. Impacto en Academia por rol/vista activa.
6. Manual/operación que debe actualizarse.
7. Elementos que no se comparten: secretos, datos reales y lógica interna protegida.
```

## Fuentes reales y estado

```txt
Clientes Siga CRM -> procesada, cruzada y con dry-run sanitizado.
Pólizas y complementos -> procesadas y cruzadas; no repetir.
Vehículos Auto -> complemento procesado.
Recibos/cobros/cartera -> procesados y cruzados; no repetir.
Comisiones/facturas/banco -> modelados y cruzados; no repetir.
Directorios aseguradoras GT/CO -> procesados; siguiente módulo operativo.
Movimientos GT/CO -> financiero_historico/finmovs; no clientes/pólizas/cartera.
Calendario Marketing -> procesado y congelado por ahora.
Manual/logo -> procesados y congelados por ahora.
comparativo_final_v110.html -> fuente activa para Cotizador/Comparativo después de Aseguradoras.
```

## Formato obligatorio de cada bloque

Toda respuesta de continuidad debe incluir exactamente:

```txt
Carril actual:
Qué parte del plan avanzó:
Paso intermedio, si hubo:
Qué quedó cerrado:
Qué falta:
Siguiente acción:
Acción manual requerida:
```

Para Acción manual requerida usar únicamente:

```txt
No requerida.
```

o

```txt
Sí, indispensable por [motivo concreto].
```

Además debe incluir una tabla breve:

```txt
Hecho | Evidencia | Estado | Riesgo | Siguiente acción
```

## Registro obligatorio por bloque

Toda mejora, bug, hallazgo, cambio o decisión debe registrar:

```txt
fecha
módulo
necesidad
esperado
causa raíz si aplica
archivo/función
fix/mejora
impacto
estado
```

Separar siempre:

```txt
A. Claude/prototipo/UX/Academia.
B. ChatGPT/Codex/backend/Auth/Firestore/Orbit.store/importadores.
```

## Semáforo de avance

```txt
Verde: cerrado/protegido/estable y no se repite.
Amarillo: implementado o documentado, pendiente de smoke/CI/integración.
Rojo: bloquea operación real o representa regresión.
```

Estado al actualizar este protocolo:

```txt
Verde:
- arquitectura y backend protegido;
- modelos y cruces Clientes/Pólizas/Vehículos/Recibos/Cobros/Cartera/Comisiones;
- reglas de fuentes separadas;
- dry-run seguro y escritura bloqueada.

Amarillo:
- cierre documental y pipeline reusable de Clientes;
- smoke CRM/Calidad/scopes;
- Aseguradoras operativo;
- Cotizador/Comparativo configurable;
- CI visible.

Rojo:
- repetir cruces ya cerrados;
- escribir datos reales;
- tocar main/deploy/producción;
- abrir fuentes periféricas antes de completar el orden operativo.
```

## Estado

Protocolo actualizado y reencarrilado. Este documento prevalece para el orden operativo actual cuando documentos anteriores describan Clientes, Pólizas, Recibos, Cobros, Cartera o Comisiones como etapas no iniciadas.