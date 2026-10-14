#!/usr/bin/env python3
"""G11: read-only repository-wide branch/source inventory of potential Firebase Hosting publishers.

Inspects remote branch workflow *sources*, never invokes workflows or Firebase. This is not
a GitHub Actions enablement/IAM audit, and no scanner can prove absence of indirect publishers.
"""
from __future__ import annotations
import argparse
import collections
import json
import pathlib
import re
import subprocess
import sys

HOSTING_SITE = "ays-orbit-360-lab"
CRITICAL = {
    "Portal S5.11F": ("ays/portal-p01-s511f-customer-shell-lab-20261007",
                     ".github/workflows/portal-p01-s511f-customer-shell-lab.yml"),
    "Siniestros S5.12D": ("ays/siniestros-s512d-public-resolver-lab-20261007",
                         ".github/workflows/siniestros-s512d-public-resolver-lab.yml"),
    "Gravicentra S5.09": ("ays/gravicentra-s509-new-lead-attention-20261007",
                         ".github/workflows/gravicentra-s509-new-lead-attention-lab.yml"),
    "Gravicentra S5.10": ("ays/gravicentra-s510-lead-card-summary-20261007",
                         ".github/workflows/gravicentra-s510-lead-card-summary-lab.yml"),
}
SCOPE = re.compile(r'ays-orbit-360-lab|FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB|FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB',re.I)
ACTION = re.compile(r'\bFirebaseExtended/action-hosting-deploy\b|\bfirebase\s+hosting:(?:channel:deploy|channel:clone|clone)\b',re.I)
DEPLOY = re.compile(r'\bfirebase\s+deploy\b([^\n]*)',re.I)
SCRIPT_INDIRECTION = re.compile(r'\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:deploy|publish)(?:\b|:)', re.I)
SITE_ONLY = re.compile(r'\bhosting\b', re.I)
WORKFLOW = re.compile(r'^\.github/workflows/[^/]+\.(?:yml|yaml)$')

def git(root,*args):
    p=subprocess.run(["git","-C",str(root),*args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
    if p.returncode:
        raise RuntimeError("G11_GIT_READ_ERROR:"+args[0])
    return p.stdout.decode("utf-8",errors="replace")

def classify(content):
    body="\n".join(line for line in content.splitlines() if not line.lstrip().startswith("#"))
    identified_scope=bool(SCOPE.search(body))
    findings=[]
    for match in DEPLOY.finditer(body):
        tail=match.group(1).strip()
        # A deploy with no --only may deploy all resources, including Hosting.
        # If --only exists, require 'hosting' in the selector string to classify an explicit Hosting write.
        if "--only" not in tail:
            findings.append("FIREBASE_DEPLOY_UNSCOPED")
        elif SITE_ONLY.search(tail):
            findings.append("FIREBASE_DEPLOY_HOSTING")
    if ACTION.search(body):
        findings.append("FIREBASE_HOSTING_ACTION")
    indirect=bool(SCRIPT_INDIRECTION.search(body))
    return {
        "target_credential_or_site":identified_scope,
        "hosting_write":bool(findings),
        "signals":sorted(set(findings)),
        "indirect_deploy_review":indirect and identified_scope,
        "workflow_dispatch":bool(re.search(r'(?m)^\s*workflow_dispatch\s*:',body)),
    }

def synthetic():
    base="name: test\non:\n  workflow_dispatch:\nenv:\n  GCLOUD_PROJECT: ays-orbit-360-lab\nsteps:\n"
    cases=[
        (base+' run: firebase deploy --only hosting --project "$GCLOUD_PROJECT"',True),
        (base+' run: firebase deploy --only "functions:x,hosting" --project "$GCLOUD_PROJECT"',True),
        (base+' run: firebase deploy --only "functions:x" --project "$GCLOUD_PROJECT"',False),
        (base+' run: firebase deploy --only functions:x --project "$GCLOUD_PROJECT"',False),
        (base+' run: firebase deploy --project "$GCLOUD_PROJECT"',True),
        (base+' run: firebase hosting:channel:deploy stage',True),
        (base+' uses: FirebaseExtended/action-hosting-deploy@v0',True),
        (base+' # run: firebase deploy --only hosting',False),
        (base+' run: node --test checks.test.js',False),
        ('name: unrelated\nsteps:\n run: firebase deploy --only hosting',True),
        (base+' run: npm run deploy',False),
    ]
    for i,(source,expected) in enumerate(cases):
        if classify(source)["hosting_write"]!=expected:
            raise AssertionError("G11_SYNTHETIC_FAILED_"+str(i+1))
    return {"passed":len(cases),"total":len(cases),"result":"PASS"}

def audit(root):
    refs=[x.strip() for x in git(root,"for-each-ref","--format=%(refname:short)","refs/remotes/origin").splitlines()
          if x.strip() and x.strip()!="origin/HEAD"]
    if len(refs)<4:
        raise RuntimeError("G11_INSUFFICIENT_REMOTE_REFS")
    by_sha=collections.defaultdict(list)
    counts={}
    for ref in refs:
        tree=git(root,"ls-tree","-r",ref,".github/workflows")
        c=0
        for line in tree.splitlines():
            if "\t" not in line: continue
            metadata,path=line.split("\t",1)
            if not WORKFLOW.match(path): continue
            fields=metadata.split()
            if len(fields)!=3 or fields[1]!="blob": continue
            by_sha[fields[2]].append((ref.removeprefix("origin/"),path))
            c+=1
        counts[ref.removeprefix("origin/")]=c
    findings=[]
    indirections=[]
    all_workflows=0
    for sha,where in by_sha.items():
        source=git(root,"cat-file","blob",sha)
        cls=classify(source)
        all_workflows+=len(where)
        if cls["hosting_write"] and cls["target_credential_or_site"]:
            for branch,path in where:
                findings.append({"branch":branch,"path":path,"blob":sha,
                                  "signals":cls["signals"],
                                  "manual_dispatch_source":cls["workflow_dispatch"]})
        if cls["indirect_deploy_review"] and not cls["hosting_write"]:
            for branch,path in where:
                indirections.append({"branch":branch,"path":path,"blob":sha})
    critical={}
    for label,(branch,path) in CRITICAL.items():
        ref="origin/"+branch
        if branch not in counts:raise RuntimeError("G11_REQUIRED_BRANCH_MISSING_"+label.replace(" ","_"))
        src=git(root,"show",ref+":"+path)
        c=classify(src)
        critical[label]={"branch":branch,"head":git(root,"rev-parse",ref).strip(),
                         "path":path,"hosting_write":c["hosting_write"],
                         "site_scope":c["target_credential_or_site"],
                         "workflow_dispatch_source":c["workflow_dispatch"]}
    if critical["Portal S5.11F"]["hosting_write"] or critical["Siniestros S5.12D"]["hosting_write"]:
        raise RuntimeError("G11_REGRESSION_IN_G10_PROTECTION")
    if not critical["Gravicentra S5.09"]["hosting_write"] or not critical["Gravicentra S5.10"]["hosting_write"]:
        raise RuntimeError("G11_EXPECTED_GRAVICENTRA_SOURCE_CHANGED_REVIEW")
    hit_paths=collections.Counter(x["path"] for x in findings)
    hit_branches=sorted({x["branch"] for x in findings})
    return {
        "schema":"AYS_G11_HOSTING_PUBLISHER_SOURCE_UNIVERSE_READONLY_V1",
        "classification":"HOLD_ADDITIONAL_SHARED_HOSTING_PUBLISHERS",
        "site":HOSTING_SITE,
        "sampled_remote_branch_count":len(refs),
        "inspected_workflow_instances":all_workflows,
        "unique_workflow_blobs":len(by_sha),
        "source_hosting_writer_instances":len(findings),
        "source_hosting_writer_branches":len(hit_branches),
        "source_hosting_writer_workflow_paths":len(hit_paths),
        "writer_paths":dict(sorted(hit_paths.items())),
        "critical_branches":critical,
        "source_writer_findings":findings,
        "indirect_deploy_review_count":len(indirections),
        "indirect_deploy_review_examples":indirections[:30],
        "limitations":[
           "Git workflow source inspection, not GitHub workflow enabled-status nor manual dispatch permissions",
           "Only workflows with explicit target project/credential identifiers can be attributed to this Firebase LAB site",
           "Indirect scripts, reusable workflows, actions, external callers and unpublished branch refs may require further review",
           "No deployment, Firebase readback, user-data access, workflow execution, merge or publisher creation"
        ],
        "firebase_mutations":0,"repository_mutations":0,
        "merge_authorized":False,"lab_deploy_authorized":False,"production_deploy_authorized":False,
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",default=".")
    p.add_argument("--out",required=True)
    args=p.parse_args()
    report={"selftest":synthetic(),"audit":audit(pathlib.Path(args.root).resolve())}
    target=pathlib.Path(args.out)
    if target.exists():raise RuntimeError("G11_NO_OVERWRITE")
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(report,indent=2,sort_keys=True,ensure_ascii=False)+"\n",encoding="utf-8")
    small={k:v for k,v in report["audit"].items()
           if k in ("classification","sampled_remote_branch_count","inspected_workflow_instances",
                    "unique_workflow_blobs","source_hosting_writer_instances",
                    "source_hosting_writer_branches","writer_paths","critical_branches",
                    "indirect_deploy_review_count")}
    print("G11_AUDIT "+json.dumps(small,sort_keys=True))
    print("G11_SYNTHETIC "+json.dumps(report["selftest"],sort_keys=True))

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("G11_FAIL_CLOSED "+type(exc).__name__+" "+str(exc)[:180],file=sys.stderr)
        sys.exit(2)
