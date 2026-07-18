# Academia · Deploy y propagación

Fecha: 2026-07-18

Un deploy puede finalizar correctamente antes de que el canal entregue el archivo nuevo en todas las lecturas. Por eso un gate debe distinguir:

1. Comando de deploy exitoso.
2. URL del canal encontrada.
3. Manifiesto exacto propagado.
4. Fuentes del runtime verificadas.
5. Navegador y flujo funcional.

La verificación correcta compara commit, run, gate y versión del runtime. Una respuesta HTTP válida con un manifiesto anterior todavía es un estado de propagación pendiente.

Clasificación:

```txt
ENVIRONMENT_FAILURE
```

No corresponde modificar Auth, Store, módulos o datos. Se corrige únicamente la espera y verificación del canal.

Evidencia mínima:

```txt
buildExact: true
propagationAttempts: número acotado
phase: completed
```
