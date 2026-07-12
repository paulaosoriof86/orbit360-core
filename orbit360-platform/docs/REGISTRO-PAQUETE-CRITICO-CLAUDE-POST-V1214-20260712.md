# Registro — paquete crítico Claude post-v1.214

Fecha: 2026-07-12  
Decisión metodológica: `P0_PRESENTES → UN_PAQUETE_CRITICO`.

## Candidata auditada

```txt
Prototype Development Request - 2026-07-12T084423.733.zip
SHA256: 2ba8c6b03a1b3f5dabbd01f0a311834fe31588f23b539e62cb97fc958289b860
Versión: v1.214
```

## Paquete generado

```txt
ORBIT360_CLAUDE_CIERRE_CRITICO_POST_V1214_V1215_20260712.zip
SHA256: 99b65e66310a72d96ebd4352cb348486408bf3fbf131759c6489b29cdb6da9b8
```

## Contenido

```txt
00_LEEME_PRIMERO.md
01_AUDITORIA_Y_MATRIZ_CRITICA_V1214.md
02_PROMPT_UNICO_CORRECCION_V1215.txt
03_VALIDAR_CANDIDATA_V1215.mjs
04_CHECKLIST_ENTREGA.md
BASE_PROTECTED_SHA256.json
VALIDACION_BASE_V1214.json
MANIFEST-SHA256.json
```

## Alcance

El paquete contiene únicamente correcciones de responsabilidad Claude/prototipo reusable. No contiene:

- backend, Firestore, Auth ni runtime tenant;
- archivos protegidos;
- datos, tasas, reglas, documentos, links o nombres reales;
- configuración específica A&S;
- fuentes históricas o prompts alternativos.

## Validación base

El validador corregido:

- compila todos los JS/MJS;
- verifica hashes de protegidos;
- elimina comentarios antes de inspeccionar patrones ejecutables;
- comprueba persistencia, validación, IDs, permisos, estados honestos, copy técnico, documentación y Academia;
- acepta v1.214 como baseline y falla, como se espera, mientras los P0 sigan abiertos.

Resultado contra v1.214:

```txt
pass: 2
fallas verificables: 37 checks agrupados en 12 P0
advertencias P1: 8
```

Los 37 checks no representan 37 módulos nuevos: son comprobaciones granulares de los 12 bloques P0 documentados.

## Siguiente gate

Al recibir v1.215:

```txt
P0 = 0
→ no generar otro paquete
→ documentar P1/P2
→ empalmar selectivamente
→ actualizar baseline
→ continuar carriles B/C
```

Si persiste un P0, se actualiza el mismo ciclo crítico; no se reconstruye un paquete acumulado histórico.