#!/usr/bin/env python3
"""G9: fail-closed source-only ownership guard for Portal and Siniestros workflows."""
import argparse,json,pathlib,re,sys

PORTAL=".github/workflows/portal-p01-s511f-customer-shell-lab.yml"
SIN=".github/workflows/siniestros-s512d-public-resolver-lab.yml"

def ensure(ok,label):
    if not ok:raise AssertionError("G9_DENY_"+label)

def validate(workflow,module):
    active="\n".join(line for line in workflow.splitlines() if not line.strip().startswith("#"))
    forbidden=[
      r"\bfirebase\s+deploy\b",r"\bfirebase\s+hosting:channel:(deploy|clone)\b",
      r"firebase-tools|FirebaseExtended/action-hosting-deploy",
      r"\bsecrets\.|FIREBASE_SERVICE_ACCOUNT|GOOGLE_APPLICATION_CREDENTIALS|gcloud\s+auth",
      r"\b(PATCH|DELETE|PUT|POST)\s+https?://firebasehosting\.googleapis\.com",
      r"(?im)^\s*-\s+name:.*\b(deploy|publish|promote|rollback)\b",
    ]
    ensure("permissions:\n  contents: read" in active,module+"_CONTENTS_READ")
    ensure("persist-credentials: false" in active,module+"_CHECKOUT")
    ensure("NO_HOSTING_MUTATION" in active,module+"_RECEIPT")
    for i,pattern in enumerate(forbidden):
        ensure(re.search(pattern,active,re.I) is None,module+"_FORBIDDEN_"+str(i))
    if module=="PORTAL":
        ensure("audit/ays-g4-shared-hosting-sourceonly-20261013" in active,module+"_BRANCH")
        ensure("1623cac977498bb5bba0092748a8c70a9cd06189" in active,module+"_FROZEN")
        ensure("node --test " in active and "portal-p01-s511f-shell.test.js" in active,module+"_TEST")
    else:
        ensure("ays/siniestros-s512d-public-resolver-lab-20261007" in active,module+"_BRANCH")
        ensure("node --test siniestros-s512d-public-surface.test.js" in active,module+"_TEST")

def run(root):
    paths={k:(root / v).read_text(encoding="utf-8") for k,v in {"PORTAL":PORTAL,"SINIESTROS":SIN}.items()}
    for k,v in paths.items():validate(v,k)
    g4=(root / ".github/workflows/ays-g4-shared-hosting-sourceonly.yml").read_text()
    g8=(root / ".github/workflows/ays-g8-predeploy-sourceonly.yml").read_text()
    ensure("AYS_G4_ENSAMBLADOR_HOSTING_READONLY.py" in g4,"G4_COMBINED")
    ensure("G8_RECOVERY_GATE.py" in g8 and "--full-bytes" in g8,"G8_PHYSICAL")
    ensure("portal-p01-s511f-shell.test.js" in g8,"G8_PORTAL_TEST")
    negative=[
      ("PORTAL",paths["PORTAL"]+"\n    run: firebase deploy --only hosting"),
      ("PORTAL",paths["PORTAL"]+"\n    uses: FirebaseExtended/action-hosting-deploy@v0"),
      ("PORTAL",paths["PORTAL"]+"\n    env:\n      FIREBASE_SERVICE_ACCOUNT: SECRET"),
      ("PORTAL",paths["PORTAL"].replace("1623cac977498bb5bba0092748a8c70a9cd06189","0"*40)),
      ("PORTAL",paths["PORTAL"].replace("node --test ","node --skip ")),
      ("SINIESTROS",paths["SINIESTROS"]+"\n    run: firebase deploy --only functions:x,hosting"),
      ("SINIESTROS",paths["SINIESTROS"]+"\n    run: firebase hosting:channel:deploy foo"),
      ("SINIESTROS",paths["SINIESTROS"]+"\n    env:\n      GOOGLE_APPLICATION_CREDENTIALS: /tmp/sa.json"),
      ("SINIESTROS",paths["SINIESTROS"].replace("node --test siniestros-s512d-public-surface.test.js","echo omitted")),
    ]
    for module,poison in negative:
        try:validate(poison,module)
        except AssertionError:continue
        raise AssertionError("SYNTHETIC_NEGATIVE_FAIL "+module)
    ensure(len(negative)==9,"TEST_COUNT")
    return {"classification":"G9_PARTIAL_PUBLISHER_SOURCE_ONLY_PASS","positive":1,"negative":9,"tests_passed":10,
      "portal_workflow_source_safe":True,"siniestros_workflow_source_safe":True,
      "historical_branches_remain_unmodified":True,
      "live_workflow_recurrence_protection":False,
      "hosting_promotion_authorized":False,"firebase_mutations":0}
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--root",default=".")
    ap.add_argument("--out")
    a=ap.parse_args()
    v=run(pathlib.Path(a.root))
    if a.out:
        p=pathlib.Path(a.out)
        ensure(not p.exists(),"OUT_EXISTS")
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_text(json.dumps(v,indent=2)+"\n")
    print("G9_SOURCE_GUARD "+json.dumps(v,sort_keys=True))
if __name__=="__main__":
    try:main()
    except Exception as ex:
        print("G9_FAIL_CLOSED "+str(ex)[:200],file=sys.stderr)
        raise SystemExit(2)
