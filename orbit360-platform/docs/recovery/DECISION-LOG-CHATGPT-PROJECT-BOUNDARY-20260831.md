# Decision Log — Frontera Proyecto ChatGPT Gravicentra Insurance

**Fecha:** 2026-08-31

## Decisión final
Crear un Proyecto ChatGPT nuevo llamado `Gravicentra Insurance`, configurado con `Memoria solo del proyecto`, iniciar con chat limpio y fuentes curadas. El Proyecto histórico `Orbit 360` queda como archivo de contexto y no ejecuta recovery.

## Decisión supersedida
Inicialmente se recomendó continuar dentro del Proyecto histórico `Orbit 360`. Esa recomendación quedó invalidada después de revisar el riesgo de contaminación contextual y la documentación oficial vigente de Proyectos en ChatGPT.

## Razón del cambio
- Los chats dentro de un mismo proyecto pueden referenciar otras conversaciones del mismo proyecto.
- Con Memoria solo del proyecto, los chats no pueden referenciar conversaciones externas al proyecto.
- El proyecto histórico contiene chats, fuentes e instrucciones asociados a mecanismos de release/integración ya supersedidos.
- La recuperación exige una frontera contextual fuerte y auditable.

## Impacto
- GitHub: sin cambio de repositorio.
- Firebase: sin cambio de proyecto para esta salida.
- Número de iteraciones: sin cambio.
- Producto/código: sin cambio por esta decisión.
- Branding: el Proyecto ChatGPT y marca visible se normalizan a `Gravicentra Insurance`; `Orbit 360` permanece solo como identificador técnico/genealógico cuando sea necesario.

## Autoridades resultantes
- `ADDENDUM_PREVALENTE_CHATGPT_PROJECT_BOUNDARY_20260831.md`
- `orbit360-recovery-state-v1.json`
- `GRAVICENTRA-INSURANCE-FASE-A-RECOVERY-MASTER-PLAN-v1.3-20260831.md`
- `INSTRUCCIONES-PROYECTO-CHATGPT-GRAVICENTRA-INSURANCE-RECOVERY-20260831.txt`

## Estado de la contradicción
`CLOSED_SUPERSEDED_WITH_TRACEABLE_SUCCESSOR`
