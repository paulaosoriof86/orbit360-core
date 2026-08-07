# Claude acumulado · v18 · patrón reusable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## Reutilizable
- separar binding estable del data owner de la carga progresiva de consumidores/módulos;
- no destruir referencias originales durante reintentos parciales;
- considerar `mounted` válido solo si existe owner original demostrable;
- probar instalación progresiva parcial → retry → completa;
- aislar evidencia por run y no usar artifacts anteriores cuando una etapa actual fue `skipped`;
- diferenciar fallas de composición/pipeline de fallas reales de contrato de datos.

## No enviar a Claude
- secretos, credenciales o usuarios reales;
- datos reales A&S;
- reglas Firestore/Auth;
- mecanismos exactos de consumer/sealer/relay protegidos;
- rutas o configuración sensible de backend.

El patrón reusable es arquitectónico/UX-control; la implementación exacta del control-plane continúa `BACKEND_PROTEGIDO_NO_CLAUDE`.