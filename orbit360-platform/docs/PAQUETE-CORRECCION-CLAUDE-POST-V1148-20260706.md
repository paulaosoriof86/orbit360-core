# Paquete corrección mínima Claude — Post v1.148 — 2026-07-06

Claude, v1.148 avanzó, pero todavía no pasa gate. Entrega v1.149 mínima, sin tocar `index.html`, sin tocar backend protegido y sin tocar tools.

---

## 1. No tocar index

No regeneres ni edites `index.html`.

ChatGPT/Codex hará el bump del index vivo únicamente cuando el archivo fuente pase gate.

---

## 2. Configuración

En `core/config.js`, buscar y corregir:

```txt
Doble conciliación: pago aplicado a póliza creada
```

Debe quedar:

```txt
Doble conciliación: cobro confirmado/conciliado con póliza
```

Verificar cero coincidencias del texto viejo.

---

## 3. Importador

En `core/importa.js`, buscar y corregir:

```txt
Todo cuadra — nada por crear.
```

Debe quedar:

```txt
Sin diferencias detectadas.
```

Además, en `step3`, cambiar frases que prometen integración directa:

```txt
los registros se integrarán a ... crea lo nuevo, actualiza lo existente, sin duplicar
Los registros se integran a la capa de datos y quedan disponibles en todos los módulos relacionados.
```

Usar lenguaje honesto:

```txt
los registros quedan listos para revisión/aprobación en ...
Las propuestas quedan disponibles para revisión en los módulos relacionados.
```

---

## 4. Mantener lo que ya quedó bien

No regresiones en:

```txt
Cliente360
Cobros
Finanzas
Automatizaciones
Academia plus + seed
Importador: revisión previa, alcance permitido, se propondrán para revisión, confirmar mapeo, revisar propuestas de conciliación
```

---

## 5. QA obligatorio

Confirmar 0 resultados visibles para:

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
Todo cuadra — nada por crear
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

ZIP v1.149 con solo:

```txt
core/config.js
core/importa.js
docs/BITACORA-CAMBIOS.md
```

si realmente son los únicos archivos tocados. Si tocas otros, explicar por qué.