#!/usr/bin/env python3
"""G10 branch-aware, READ-ONLY Hosting publisher risk audit.

Never changes a Git ref, Firebase resource, IAM, Actions configuration, or user data.
A passing G10 audit is NOT a deploy approval: risk remains HOLD until independently remediated.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys

BRANCH_CANDIDATE = 'audit/ays-g4-shared-hosting-sourceonly-20261013'
HISTORICAL = {
    'portal': ('ays/portal-p01-s511f-customer-shell-lab-20261007', '.github/workflows/portal-p01-s511f-customer-shell-lab.yml'),
    'siniestros': ('ays/siniestros-s512d-public-resolver-lab-20261007', '.github/workflows/siniestros-s512d-public-resolver-lab.yml'),
}
FORBIDDEN_HOSTING = (
    r'\bfirebase\s+deploy\b[^\n]*\bhosting\b',
    r'\bfirebase\s+hosting:channel:(?:deploy|clone)\b',
    r'FirebaseExtended/action-hosting-deploy',
    r'\bfirebase\s+hosting:clone\b',
)
PATHS = {k: v[1] for k, v in HISTORICAL.items()}


def active_yaml(source):
    return '\n'.join(line for line in source.splitlines() if not line.lstrip().startswith('#'))


def publishes_hosting(source):
    body = active_yaml(source)
    return any(re.search(pattern, body, flags=re.I) for pattern in FORBIDDEN_HOSTING)


def manual_dispatch(source):
    return bool(re.search(r'(?m)^\s*workflow_dispatch\s*:', active_yaml(source)))


def run_git(root, *args):
    proc = subprocess.run(['git', '-C', str(root), *args], text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode != 0:
        raise RuntimeError('G10_MISSING_LOCAL_GIT_REF_OR_PATH')
    return proc.stdout.strip()


def snapshot(root):
    git_head = run_git(root, 'rev-parse', 'HEAD')
    # Strictly read source in the checkout; no fetch/push/checkout/ref update.
    live = {}
    for name, path in PATHS.items():
        file = root / path
        if not file.is_file():
            raise RuntimeError('G10_CURRENT_WORKFLOW_MISSING_' + name.upper())
        content = file.read_text(encoding='utf-8')
        safe = not publishes_hosting(content)
        if not safe or 'NO_HOSTING_MUTATION' not in active_yaml(content):
            raise RuntimeError('G10_CURRENT_WORKFLOW_NOT_SAFE_' + name.upper())
        if re.search(r'\bsecrets\.|FIREBASE_SERVICE_ACCOUNT|GOOGLE_APPLICATION_CREDENTIALS', active_yaml(content), re.I):
            raise RuntimeError('G10_CURRENT_WORKFLOW_HAS_CREDENTIALS_' + name.upper())
        live[name] = {'hosting_publish_action': False, 'source_only_guard': True}
    hist = {}
    for name, (branch, path) in HISTORICAL.items():
        ref = 'refs/remotes/origin/' + branch
        sha = run_git(root, 'rev-parse', '--verify', ref)
        data = run_git(root, 'show', ref + ':' + path)
        hist[name] = {'branch': branch, 'head': sha, 'hosting_publish_action': bool(publishes_hosting(data)),
                      'manual_dispatch_source': bool(manual_dispatch(data))}
    unsafe = [name for name, item in hist.items() if item['hosting_publish_action']]
    return {
        'schema': 'AYS_G10_LEGACY_PUBLISHERS_READONLY_V1', 'candidate_head': git_head,
        'candidate_branch': BRANCH_CANDIDATE, 'candidate_workflows': live,
        'historical_branches': hist, 'historical_hosting_publisher_sources': unsafe,
        'classification': 'HOLD_LEGACY_HOSTING_PUBLISHERS' if unsafe else 'SOURCE_ONLY_NO_LEGACY_PUBLISHER_FOUND_REVALIDATE_RELEASE',
        'hosting_global_safety_certified': False, 'historical_workflows_enabled_status_verified': False,
        'firebase_release_freshness_verified': False, 'firebase_mutations': 0, 'github_writes': 0,
        'merge_authorized': False, 'lab_deploy_authorized': False, 'production_deploy_authorized': False,
        'next_gate': 'FRESH_FIREBASE_LAB_ADMIN_READBACK_AND_EXPLICIT_PUBLISHER_GOVERNANCE_AUTHORIZATION',
    }


def selftest():
    safe = 'name: A\non:\n  workflow_dispatch:\nsteps:\n - run: node --test smoke.test.js\n - run: echo NO_HOSTING_MUTATION\n'
    positive = [
        'run: firebase deploy --only hosting --project test',
        'run: firebase deploy --only "functions:x,hosting" --project test',
        'run: firebase hosting:channel:deploy scratch',
        'uses: FirebaseExtended/action-hosting-deploy@v0',
        'run: firebase hosting:clone source target',
    ]
    assert not publishes_hosting(safe)
    for change in positive:
        assert publishes_hosting(safe + '\n' + change), 'G10_FALSE_NEGATIVE'
    assert not publishes_hosting(safe + '\n# firebase deploy --only hosting')
    assert manual_dispatch(safe)
    assert not manual_dispatch('name: test\n# workflow_dispatch:\n')
    return {'result': 'PASS', 'cases': 9, 'read_only': True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--out')
    parser.add_argument('--selftest', action='store_true')
    args = parser.parse_args()
    out = {}
    if args.selftest:
        out['selftest'] = selftest()
    out['audit'] = snapshot(pathlib.Path(args.root).resolve())
    if args.out:
        path = pathlib.Path(args.out)
        if path.exists():
            raise RuntimeError('G10_NO_OVERWRITE_EVIDENCE')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps(out, ensure_ascii=False, sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        print('G10_FAIL_CLOSED ' + str(err)[:180], file=sys.stderr)
        sys.exit(2)
