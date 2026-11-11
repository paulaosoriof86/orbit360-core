#!/usr/bin/env python3
"""G13: classify source-level triggers for the G11 Hosting publisher census.

READ ONLY. No GitHub Actions enablement, IAM or Firebase claims.
"""
from __future__ import annotations
import argparse
import collections
import fnmatch
import importlib.util
import json
import pathlib
import re
import subprocess
import sys

def git(root, *args):
    proc = subprocess.run(['git','-C',str(root),*args],stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE,check=False)
    if proc.returncode: raise RuntimeError('G13_GIT_READ_FAILED_'+args[0])
    return proc.stdout.decode('utf-8',errors='replace')

def refs_at(root):
    return sorted(x.removeprefix('origin/') for x in
        git(root,'for-each-ref','--format=%(refname:short)','refs/remotes/origin').splitlines()
        if x.startswith('origin/') and x!='origin/HEAD')

def entries(root, ref):
    out=[]
    lines=git(root,'ls-tree','-r',ref,'.github/workflows').splitlines()
    for line in lines:
        if '\t' not in line: continue
        meta,path=line.split('\t',1)
        pieces=meta.split()
        if len(pieces)==3 and pieces[1]=='blob' and re.fullmatch(r'\.github/workflows/[^/]+\.ya?ml',path):
            out.append((path,pieces[2]))
    return out

def clean(source):
    return '\n'.join(x for x in source.splitlines() if not x.lstrip().startswith('#'))

def yaml_events(source):
    """Conservative trigger parser: raw top-level on and two-space event keys."""
    lines=clean(source).splitlines()
    start=next((i for i,s in enumerate(lines) if re.fullmatch(r'on:\s*',s)),None)
    if start is None:
        inline=next((s for s in lines if re.match(r'^on:\s*\S+',s)),None)
        if inline:
            val=inline.split(':',1)[1]
            return {'push':bool(re.search(r'\bpush\b',val)),
                    'dispatch':bool(re.search(r'\bworkflow_dispatch\b',val)),
                    'other':['INLINE_ON_REVIEW'], 'push_branches':[], 'push_ignores':[], 'push_paths':[], 'parse_unknown':True}
        return {'push':False,'dispatch':False,'other':[],'push_branches':[],
                'push_ignores':[],'push_paths':[],'parse_unknown':True}
    sub=[]
    for line in lines[start+1:]:
        if line.strip() and not line[0].isspace():break
        sub.append(line)
    event_names=[]
    for x in sub:
        m=re.match(r'^  ([\w-]+):',x)
        if m:event_names.append(m.group(1))
    def collect(field):
        result=[]
        within_push=False
        within_field=False
        for line in sub:
            event=re.match(r'^  ([\w-]+):',line)
            if event:
                within_push=event.group(1)=='push'
                within_field=False
                continue
            if not within_push:continue
            name=re.match(r'^    ([\w-]+):\s*(.*)$',line)
            if name:
                within_field=name.group(1)==field
                if within_field and name.group(2).strip():
                    raw=name.group(2).strip()
                    if raw.startswith('[') and raw.endswith(']'):
                        result.extend(q.strip().strip('"').strip("'") for q in raw[1:-1].split(',') if q.strip())
                    else:result.append(raw.strip('"').strip("'"))
                continue
            if within_field:
                item=re.match(r'^\s{6,}-\s+(.+?)\s*$',line)
                if item:result.append(item.group(1).strip().strip('"').strip("'"))
                elif line.strip() and len(line)-len(line.lstrip())<=4:
                    within_field=False
        return result
    return {'push':'push' in event_names,'dispatch':'workflow_dispatch' in event_names,
            'other':sorted(x for x in event_names if x not in ('push','workflow_dispatch')),
            'push_branches':collect('branches'),'push_ignores':collect('branches-ignore'),
            'push_paths':collect('paths'),'parse_unknown':False}

def matches_branch(branch,patterns):
    # GitHub branch filter patterns support more than simple glob; this is an estimate,
    # not a certification of GitHub's full micromatch/negation semantics.
    selected=False
    for pattern in patterns:
        if pattern.startswith('!'):
            if fnmatch.fnmatchcase(branch,pattern[1:]):selected=False
        elif fnmatch.fnmatchcase(branch,pattern):selected=True
    return selected

def push_possible(branch,ev):
    if not ev['push']:return False
    allow=ev['push_branches']
    disallow=ev['push_ignores']
    return (not allow or matches_branch(branch,allow)) and not any(fnmatch.fnmatchcase(branch,p) for p in disallow)

def tests():
    samples=[
        ("on:\n  workflow_dispatch:\n  push:\n    branches:\n      - ays/foo\n    paths:\n      - x.js\n", 'ays/foo', True, True),
        ("on:\n  push:\n    branches:\n      - ays/foo\n", 'ays/bar', False, False),
        ("on:\n  push:\n    branches: [ays/foo, ays/bar]\n", 'ays/bar', True, False),
        ("on:\n  push:\n    branches-ignore:\n      - release/**\n", 'release/a', False, False),
        ("on:\n  schedule:\n    - cron: '0 3 * * *'\n", 'main', False, False),
        ("on:\n  push:\n", 'topic', True, False),
        ("on:\n  workflow_dispatch:\n", 'topic', False, True),
        ("on:\n  push:\n    branches:\n      - ays/*\n", 'ays/foo', True, False),
        ("on:\n  push:\n    branches:\n      - ays/*\n", 'main', False, False),
        ("on:\n  pull_request:\n", 'main', False, False),
        ("# on:\n#   push:\non:\n  workflow_dispatch:\n", 'main', False, True),
        ("on: [push, workflow_dispatch]\n", 'main', True, True)
    ]
    for i,(text,branch,p,d) in enumerate(samples):
        x=yaml_events(text)
        if push_possible(branch,x)!=p or x['dispatch']!=d:raise AssertionError('G13_TEST_'+str(i+1))
    return {'passed':len(samples),'total':len(samples),'result':'PASS'}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',default='.')
    parser.add_argument('--out',required=True)
    args=parser.parse_args()
    root=pathlib.Path(args.root).resolve()
    test=tests()
    spec=importlib.util.spec_from_file_location('g11',root/'tools/ays-g11/G11_REPOSITORY_HOSTING_PUBLISHER_READONLY.py')
    g11=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(g11)
    refs=refs_at(root)
    if 'main' not in refs or len(refs)<200:raise RuntimeError('G13_REFS_INCOMPLETE')
    default_paths=set(path for path,_ in entries(root,'origin/main'))
    memo={}
    direct=[]
    counts=collections.Counter()
    for branch in refs:
        for path,blob in entries(root,'origin/'+branch):
            if blob not in memo:
                body=git(root,'cat-file','blob',blob)
                memo[blob]=(g11.classify(body),yaml_events(body))
            finding,ev=memo[blob]
            if not(finding['target_credential_or_site'] and finding['hosting_write']):continue
            counts['all']+=1
            on_push=push_possible(branch,ev)
            registered=path in default_paths
            d=bool(ev['dispatch'] and registered)
            other=[x for x in ev['other'] if x in ('workflow_run','repository_dispatch','workflow_call','schedule')]
            if on_push:counts['push_matching_self_branch']+=1
            if d:counts['dispatch_path_registered_on_default']+=1
            if ev['dispatch'] and not registered:counts['dispatch_declared_but_default_path_missing']+=1
            if ev['parse_unknown']:counts['trigger_parse_unknown']+=1
            if other:counts['other_event_review']+=1
            if on_push or d or other or ev['parse_unknown']:
                direct.append({'branch':branch,'workflow_path':path,'source_blob':blob,
                    'source_push_matching_self':on_push,
                    'source_dispatch_declared':ev['dispatch'],
                    'default_path_registered':registered,
                    'other_event_requires_review':other,
                    'parse_unknown':ev['parse_unknown'],
                    'source_branch_filter':ev['push_branches'],
                    'source_paths_filter':ev['push_paths'],
                    'site_scope_source':True})
    direct.sort(key=lambda a:(a['branch'],a['workflow_path']))
    report={
      'schema':'AYS_G13_HOSTING_RESIDUAL_TRIGGER_CLASSIFICATION_READONLY_V1',
      'classification':'HOLD_SOURCE_EXECUTABILITY_AND_REGISTRATION_REVIEW',
      'selftest':test,'default_branch':'main','default_branch_workflow_count':len(default_paths),
      'remote_branches_scanned':len(refs),'writer_source_instances':counts['all'],
      'source_push_matching_self_branch':counts['push_matching_self_branch'],
      'dispatch_declared_but_default_path_missing':counts['dispatch_declared_but_default_path_missing'],
      'dispatch_path_registered_on_default':counts['dispatch_path_registered_on_default'],
      'other_event_review_count':counts['other_event_review'],
      'trigger_parse_unknown_count':counts['trigger_parse_unknown'],
      'potentially_live_source_findings':direct,
      'potentially_live_source_branch_count':len({x['branch'] for x in direct}),
      'excluded_copy_count':counts['all']-len(direct),
      'limits':[
         'Branch source and declared triggers only; enabled state and actual GitHub permission rules NOT confirmed',
         'GitHub branch filters can have extglob and negation details not modeled fully; unknowns remain HOLD',
         'A declared manual workflow_dispatch on a branch is not proof of successful manual execution',
         'The default branch must register workflow_dispatch for normal manual triggers',
         'Push matching does not mean an event occurred; path conditions must also be satisfied',
         'Other events and indirect publisher wrappers require specialized review',
         'No Firebase calls, deployments, releases, secrets, real data, IAM, merges or GitHub mutating actions'
      ],
      'firebase_mutations':0,'github_mutations':0,'merge_authorized':False,'deployment_authorized':False,
    }
    output=pathlib.Path(args.out)
    if output.exists():raise RuntimeError('G13_NO_OVERWRITE')
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print('G13_CLASSIFICATION '+json.dumps({k:v for k,v in report.items() if k in (
      'classification','default_branch_workflow_count','remote_branches_scanned','writer_source_instances',
      'source_push_matching_self_branch','dispatch_declared_but_default_path_missing',
      'dispatch_path_registered_on_default','other_event_review_count','trigger_parse_unknown_count',
      'potentially_live_source_branch_count','excluded_copy_count','selftest')},sort_keys=True))
    print('G13_POTENTIAL_BRANCHES '+json.dumps(sorted({x['branch'] for x in direct})))

if __name__=='__main__':
    try:main()
    except Exception as err:
        print('G13_FAIL_CLOSED '+type(err).__name__+' '+str(err)[:200],file=sys.stderr)
        sys.exit(2)
