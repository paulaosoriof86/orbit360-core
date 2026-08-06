# Academia — gates sin generadores anidados

## Aprendizaje principal

Un error del instrumento de validación no se corrige alterando el producto. Primero se identifica la etapa real fallida, se clasifica y se prueba la capa responsable fuera del runtime.

## Caso 2.7.8

El producto no llegó a ejecutarse. Los fallos ocurrieron mientras un generador construía otros archivos ejecutables y un segundo script intentaba repararlo por coincidencia textual.

La solución reusable es:

1. cada owner del gate vive en su propio archivo;
2. el router, lifecycle, engine, preflight, workflow y documentación evolucionan juntos;
3. el preflight canónico termina antes de leer secretos;
4. el request de autorización no existe durante la preparación;
5. una prueba sintética reproduce el contrato sin Firebase, navegador ni deploy;
6. una captura es evidencia auxiliar y su fallo no reemplaza el resultado funcional;
7. un run consumido no se repite.

## Diferencias que debe reconocer cada rol

- Dirección: entiende qué decisión de riesgo habilita un gate y qué queda bloqueado.
- Operativo: identifica la diferencia entre una pantalla vacía honesta, un defecto funcional y un fallo del pipeline.
- Asesor: reconoce que su alcance y sus datos no se amplían para satisfacer una prueba visual.

## Clasificación

`REPLICABLE_CLAUDE_INMEDIATO`: patrón de owners independientes, prueba sintética previa, capturas acotadas/no bloqueantes y separación estricta entre producto, validator y pipeline.


## Compatibilidad del router canónico

Los gates anteriores se delegan al blob inmutable `03d1c45db555a3e482afb4be6aaf8d29c74a79dc`, conservado como `tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs`. El nuevo gate se resuelve directamente desde el entrypoint canónico; no existe transformación textual del router histórico.
