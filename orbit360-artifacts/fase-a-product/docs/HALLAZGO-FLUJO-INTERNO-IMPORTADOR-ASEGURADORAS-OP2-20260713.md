# Hallazgo y corrección — flujo interno del importador Aseguradoras OP-2

Fecha: 2026-07-13  
Carril: B/C — seguridad del importador y fuente real

## Hallazgo

El importador especializado exporta funciones como `parseFile` y `applyApproved`, pero su modal original utiliza referencias internas de cierre para analizar y aplicar.

Por tanto, envolver solo:

```txt
Orbit.insurerDirectoryImport.parseFile
Orbit.insurerDirectoryImport.applyApproved
```

no garantiza que la interacción real del botón use esos wrappers.

## Riesgo

Un control adicional de alias colocado únicamente sobre la API exportada podía:

- funcionar en pruebas programáticas;
- no intervenir en el archivo elegido desde el modal;
- permitir que una variante probable de nombre llegara al dry-run interno sin el bloqueo adicional.

Esto habría producido una evidencia engañosa: validador correcto, flujo visual incompleto.

## Corrección

Archivo:

```txt
core/aseguradoras-op2-import-ui-guard.js
```

El guard:

1. envuelve la apertura pública del modal;
2. conecta un listener al archivo real seleccionado;
3. ejecuta una revisión paralela mediante la API pública ampliada;
4. usa `captureSecure=false` para no capturar usuarios, contraseñas o cuentas;
5. mantiene deshabilitada la aprobación durante la revisión;
6. bloquea si encuentra alias o duplicados probables;
7. bloquea también si la revisión falla;
8. no modifica el resultado interno ni fusiona entidades.

## Orden de carga obligatorio

```txt
insurer-directory-import-v1202.js
insurer-directory-import-v1202-security.js
aseguradoras-op2-source-guard.js
aseguradoras-op2-import-ui-guard.js
```

El pipeline verifica físicamente que `source-guard` aparezca antes de `import-ui-guard`; si no, restaura el `index.html` desde backup.

## Estado

```txt
Hallazgo: corregido en código
Validador: actualizado
CI: configurado
Ejecución observable: pendiente
Dry-run real: pendiente
```

## Patrón reusable

Cuando un módulo conserva funciones internas en un cierre, no basta con envolver su API pública. Debe probarse la ruta de interacción real o instalar un guard en la entrada visual/operativa que falle de forma segura.
