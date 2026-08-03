#!/usr/bin/env python3
from pathlib import Path

path = Path('tools/orbit360-validar-gate711-runtime-chain-static-v20260802-v2.mjs')
text = path.read_text(encoding='utf-8')
old = "add('READINESS_PATH_CONTRACT',has(readiness,'WORKFLOW_IDENTITY_PATH_CONTRACT','explicitTokenPathHonored','explicitConfigPathHonored'));"
new = "add('READINESS_PATH_CONTRACT',has(readiness,'export ORBIT360_CUSTOM_TOKEN_FILE=\"$TOKEN_FILE\"','export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE=\"$CONFIG_FILE\"','.explicitTokenPathHonored==true','.explicitConfigPathHonored==true'));"
if text.count(old) != 1:
    raise SystemExit('READINESS_PATH_CONTRACT_STALE_ANCHOR_INVALID')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('READINESS_PATH_CONTRACT_SEMANTIC_CORRECTION_APPLIED')
