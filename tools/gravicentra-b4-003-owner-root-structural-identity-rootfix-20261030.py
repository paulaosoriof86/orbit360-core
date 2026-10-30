#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else '.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml')
source = path.read_text(encoding='utf-8')
old = r'''            const brand=/Gravicentra Insurance|Insurance OS/i.test(html);
            if(!brand||uniqueAssets.length<10||buildIds.length<1)throw Error('OWNER_ROOT_STABLE_IDENTITY_MISSING:'+path);
            return {title,brand,buildIds,assets:uniqueAssets};'''
new = r'''            const htmlDocument=/<html\b/i.test(html)&&/<\/html>/i.test(html);
            const bodyDocument=/<body\b/i.test(html)&&/<\/body>/i.test(html);
            const nonTrivial=Buffer.byteLength(html,'utf8')>=512;
            const productMarker=/Gravicentra Insurance|Insurance OS/i.test(html);
            if(!htmlDocument||!bodyDocument||!nonTrivial)throw Error('OWNER_ROOT_STRUCTURAL_IDENTITY_MISSING:'+path);
            return {title,htmlDocument,bodyDocument,productMarker,buildIds,assets:uniqueAssets};'''
count = source.count(old)
if count != 1:
    raise SystemExit(f'OWNER_ROOT_IDENTITY_FRAGMENT_COUNT_{count}')
updated = source.replace(old, new)
if 'OWNER_ROOT_STABLE_IDENTITY_MISSING' in updated:
    raise SystemExit('STALE_OWNER_ROOT_MARKER_REMAINS')
if updated.count('OWNER_ROOT_STRUCTURAL_IDENTITY_MISSING') != 1:
    raise SystemExit('STRUCTURAL_OWNER_ROOT_MARKER_INVALID')
path.write_text(updated, encoding='utf-8')
sha = lambda value: hashlib.sha256(value.encode('utf-8')).hexdigest()
print(json.dumps({
    'schema': 'GRAVICENTRA_I65_B4003_OWNER_ROOT_STRUCTURAL_IDENTITY_ROOTFIX_V1',
    'status': 'WORKFLOW_PATCHED_LOCALLY_PENDING_VALIDATION_AND_TRIGGER',
    'path': str(path),
    'beforeSha256': sha(source),
    'afterSha256': sha(updated),
    'replacementCount': count,
    'cause': 'OWNER_CUSTOM_DOMAIN_ROOT_WAS_FALSELY_REQUIRED_TO_EXPOSE_GRAVICENTRA_BUILD_MARKERS',
    'remediation': 'VERIFY_NONTRIVIAL_HTML_DOCUMENT_AND_STABLE_STRUCTURE; KEEP_EXACT_RUNTIME_CONFIG_AND_BEFORE_AFTER_COMPARISON',
    'productSourceChanged': False,
    'livePromotion': False,
    'dataWrites': False,
    'rulesAuthIamChanges': False
}, indent=2))
