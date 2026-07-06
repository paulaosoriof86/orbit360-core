# Paquete acumulado para Claude — Post auditoría v1.147 — 2026-07-06

## Instrucción inicial para Claude

Claude, esta es una corrección acumulada para la candidata v1.148. La v1.147 mejoró Cliente360, Academia base e Importador, pero todavía NO pasa gate por `index.html`, `core/config.js` e Importador.

Entrega una nueva candidata v1.148. Prioriza lo crítico. No hagas rediseño general ni cambios amplios innecesarios.

---

## 0. Reglas absolutas

### No tocar backend protegido

No modificar ni reemplazar:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
```

### No tocar `index.html`

Regla principal: no tocar `index.html`.

Tu ZIP v1.147 afirmó conservar scripts LAB, pero el archivo real no los conservó. Para evitar más reprocesos:

```txt
No reemplaces index.html.
No regeneres index.html.
No hagas cache-bust en index.html.
Si necesitas cache-bust, documéntalo en bitácora para que ChatGPT/Codex lo aplique sobre el index vivo.
```

El index vivo debe conservar:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store-firestore-lab.local.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
data/academia-plus.js
```

---

## 1. Corrección crítica pendiente — Configuración

En `core/config.js`, corregir el scope viejo de Finanzas.

Cambiar:

```txt
Doble conciliación: pago aplicado a póliza creada
```

por:

```txt
Doble conciliación: cobro confirmado/conciliado con póliza
```

Revisar también copy similar en Configuración, sidebar, metadata, módulo placeholder o features.

---

## 2. Corrección crítica pendiente — Importador

La v1.147 corrigió cuatro frases, pero el flujo visible aún sugiere escritura/aplicación productiva.

Buscar y ajustar en `core/importa.js`:

```txt
Simulación pre-escritura
Alcance (crea/actualiza)
Se crearán al confirmar
Todo cuadra — nada por crear
Importación lista para aplicar
Aplicar pagos por póliza
Aplicar mapeo
Al confirmar, estos % se cargan en Tarifas de comisión como override
```

Usar lenguaje honesto:

```txt
Revisión previa
Alcance permitido / efecto propuesto
Se propondrán para revisión
Sin diferencias detectadas
Importación lista para revisión/aprobación
Revisar propuestas de conciliación
Guardar mapeo / Confirmar mapeo
Proponer actualización de tarifario para revisión
```

Mantener fuentes separadas:

```txt
Clientes → solo clientes.
Pólizas → pólizas; recibos solo si estado, país, moneda y vigencia son confiables.
Vehículos → vehículos.
Estado de cuenta aseguradora → recibos/cobros propuestos para revisión; no pago confirmado.
Estado bancario → bandeja de conciliación; no crea cobros ni finmovs automáticos.
Planilla de comisión → comisiones/propuestas; no crea cartera ni cobro confirmado.
Financiero histórico → histórico/análisis; no crea cartera, cobros ni producción.
Documentos soporte → propuestas/diff; no actualiza entidades sin confirmación.
```

---

## 3. Mantener lo que ya quedó bien

No regresiones en Cliente360, Cobros, Finanzas, Automatizaciones y Academia.

Academia debe conservar:

```txt
Estados honestos: reportado ≠ confirmado ≠ conciliado
Caso especial junio/julio 2026
Manifest/catálogo de fuentes reales
Fuente separada antes de lectura real
Banco no es cobro confirmado
Estado de cuenta cliente no es pago realizado
Financiero histórico no crea cartera/cobros/producción
Documentos soporte solo proponen datos
Planilla de comisión no crea cartera ni cobro confirmado
País/moneda faltante = REQUIERE_VALIDACION
GT=GTQ, CO=COP, no sumar crudo
```

---

## 4. UI cliente — limpiar textos técnicos

No mostrar en UI cliente/operativa:

```txt
backend
Firebase
Firestore
LAB
mock
demo
localStorage
credenciales
token
API key
ChatGPT/Codex
```

Excepciones: configuración técnica interna/admin puede hablar de API Key si corresponde a integraciones; documentación interna puede hablar de backend/LAB.

---

## 5. QA obligatorio antes de entregar v1.148

Buscar y confirmar 0 resultados visibles en módulos activos para:

```txt
Todo aplicado
Aplicar pago
Pago aplicado
Aplicado a póliza
Pagos no aplicados
pago sin aplicar
pagos aún no aplicados
pagos no aplicados a póliza
Pagado en banco, sin aplicar
pago no aplicado
Doble conciliación: pago aplicado a póliza creada
listas p/ backend
Importación lista para aplicar
Aplicar pagos por póliza
Se crearán al confirmar
```

Confirmar además:

```txt
0 errores JS
index.html no tocado
backend protegido intacto
tools intactos
sin datos reales
bitácora actualizada
lista exacta de archivos tocados
```

---

## 6. Entrega esperada

ZIP v1.148 con bitácora, lista de archivos tocados, confirmación 0 errores JS, confirmación index no tocado, backend protegido intacto, tools intactos, sin datos reales y pendientes honestos para ChatGPT/Codex.