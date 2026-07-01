# Prompt Codex - limpieza de contaminacion Orbit / Orbia / CXOrbia

Contexto: Orbit 360 es producto independiente. No mezclar con Orbia, CXOrbia, TyA, mystery shopping, shoppers, visitas, rutas, cuestionarios ni Proyecto Retail.

Antes de tocar archivos, leer:
- docs/AUDITORIA-CONTAMINACION-ORBIT-ORBIA-CXORBIA-20260701.md
- docs/DECISION-SEPARACION-PREVIEW-VISUAL-Y-BACKEND-LAB-20260701.md
- docs/CONTRATO-BACKEND-LAB-NO-FALLBACK.md

Reglas:
- No tocar backend LAB, scripts *.local.js, index-dev-firestore.html ni data/store-firestore-lab.local.js.
- No hacer push ni deploy.
- No borrar manualmente sin backup.
- Separar preview visual de Backend LAB.
- Limpiar referencias cruzadas solo si son de app activa o documentacion del paquete comercializable.

Tarea:
1. Confirmar si hay contaminacion critica en app activa.
2. Si existe, proponer fix minimo por archivo.
3. Si solo existe en docs/comentarios, limpiar texto visible/comercializable y dejar notas internas correctas.
4. Documentar todo en BITACORA-ERRORES.md y BITACORA-CAMBIOS.md.
5. Validar preview visual en 5178 e index-dev-firestore en 5177 sin mezclar rutas.
