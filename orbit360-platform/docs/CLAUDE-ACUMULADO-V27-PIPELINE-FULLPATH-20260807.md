# Claude acumulado — v27 full-path validation pattern

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## Patrón reusable
Cuando un gate depende de una cadena externa o de transporte (`spawn`, CLI, batch protocol, stdout binario, parsing), el fixture reusable debe ejecutar esa cadena completa con datos sintéticos antes del gate real.

No basta validar helpers aislados si el camino real contiene:
- diferencias de encoding/texto vs bytes;
- framing de protocolo batch;
- límites de buffer;
- parsing dependiente de versión de runtime;
- estado histórico no presente en el árbol actual.

## Regla
Un fallo del mecanismo de evidencia se clasifica como `PIPELINE_MECHANISM_FAILURE`; no autoriza cambiar producto ni datos para hacer pasar el conteo.

## No transferir
No incluir fingerprints reales, nombres, correos, documentos, códigos A&S, tenant/project secrets ni implementación backend protegida. El patrón de full-path testing es reusable; los resultados concretos del tenant siguen siendo `TENANT_AYS_ONLY`.
