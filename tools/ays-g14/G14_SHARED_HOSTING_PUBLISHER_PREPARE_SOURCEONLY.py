#!/usr/bin/env python3
"""G14: fail-closed shared-Hosting publisher preparation, NEVER a deployment.

Input: immutable G4/G7 source+release manifests, G8 same-run physical receipt,
and full staged candidate already reconstructed by G4.
Output: a per-path publication manifest and HOLD-only coordination receipt.
No secrets, IAM, Firebase calls, network calls, data writes or publication.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import importlib.util
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
G8 = ROOT / "tools/ays-g8/G8_RECOVERY_GATE.py"
SCHEMA = "AYS_G14_SINGLE_PUBLISHER_SOURCEONLY_V1"
SITE = "ays-orbit-360-lab"
SOURCE_PUBLIC_COUNT = 965
SERVER_MANAGED_COUNT = 2
TARGET_COUNT = 967
PRESERVED_COUNT = 963
PORTAL_COUNT = 2
NEVER_PUBLISH = {"__/firebase/init.js", "__/firebase/init.json"}

def demand(condition:bool, code:str):
    if not condition:
        raise AssertionError("G14_HOLD_" + code)

def sha(obj):
    raw=json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def import_g8():
    spec=importlib.util.spec_from_file_location("ays_g8_recovery_gate",G8)
    demand(spec is not None and spec.loader is not None,"G8_MODULE_MISSING")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def read_receipt(path):
    data=json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    demand(isinstance(data,dict),"G8_RECEIPT_NOT_OBJECT")
    return data

def compose(e,receipt):
    g8=import_g8()
    check=g8.verify(e)
    demand(check["classification"]=="SOURCE_ONLY_G8_EVIDENCE_PASS_RELEASE_HOLD","G8_GATE_CLASS")
    demand(check["expected_future_path_count"]==TARGET_COUNT,"PATH_COUNT")
    demand(check["legacy_hosting_publishers_disabled"] is False,"HISTORICAL_G8_STATE_NOT_FROZEN")
    demand(check["owner_lab_deploy_authorized"] is False,"FORBID_OWNER_IMPLICIT_RELEASE")
    demand(receipt.get("g8")==check,"RECEIPT_INPUT_EVIDENCE_DRIFT")
    demand(receipt.get("selftest",{}).get("result")=="PASS" and
           receipt["selftest"].get("passed")==15,"G8_NEGATIVES_REQUIRED")
    stage=receipt.get("source_staging",{})
    demand(stage.get("staged_source_bytes_verified")==2708 and
           stage.get("staged_publishable_count")==SOURCE_PUBLIC_COUNT,"FULL_STAGE_REQUIRED")
    physical=receipt.get("full_physical_equivalence",{})
    demand(physical.get("classification")=="PHYSICAL_963_MATCH" and
           physical.get("source_to_public_bytes_identical") is True and
           physical.get("checked_count")==PRESERVED_COUNT and
           physical.get("matched_count")==PRESERVED_COUNT and
           physical.get("failure_count")==0,"ALL_963_PHYSICAL_MUST_MATCH")
    smoke=receipt.get("public_smoke",{})
    for p in sorted(g8.PORTAL):
        demand(smoke.get(p,{}).get("http")==404 and
               smoke[p].get("state")=="PORTAL_NOT_DEPLOYED","PORTAL_EXPECTED_ABSENCE")
    for p in sorted(g8.SIN):
        demand(smoke.get(p,{}).get("http")==200 and
               smoke[p].get("byte_sha256_match") is True,"SINIESTROS_EXISTING_MATCH")
    live=e["live"]["files"]
    old=e["previous"]["files"]
    src=e["source"]
    demand(len(live)==SOURCE_PUBLIC_COUNT and len(old)==SOURCE_PUBLIC_COUNT
           and len(src)==SOURCE_PUBLIC_COUNT,"UNIVERSE")
    demand(set(live)-set(src)==NEVER_PUBLISH,"ONLY_SERVER_MANAGED_EXCLUDED")
    demand(set(src)-set(live)==g8.PORTAL,"ONLY_PORTAL_ADDED")
    demand(set(live)&set(src)==set(live)-NEVER_PUBLISH,"ALL_PRESERVED_PATHS")
    demand(len(set(live)&set(src))==PRESERVED_COUNT,"PRESERVED_COUNT")
    demand(set(old)-set(live)==g8.PORTAL and set(live)-set(old)==g8.SIN,
           "ROLLBACK_VERSION_NOT_FULL_TARGET")
    demand(set(src)&NEVER_PUBLISH==set(),"NO_FIREBASE_RESERVED_OVERLAY")
    src_rows={r["path"].removeprefix("orbit360-platform/"):r
              for r in e["g4"]["files"]
              if r["path"].startswith("orbit360-platform/") and
                 not r["path"].startswith("orbit360-platform/docs/") and
                 r["path"]!="orbit360-platform/.verify-academia.png"}
    demand(len(src_rows)==SOURCE_PUBLIC_COUNT and
           set(src_rows)==set(src),"SOURCE_PUBLIC_MANIFEST")
    file_rows=[]
    for path in sorted(src):
        row=src_rows[path]
        demand(row["sha256"]==src[path],"ROW_HASH_"+path[:48])
        demand(isinstance(row["size"],int) and row["size"]>=0,"FILE_SIZE")
        state="NEW_PORTAL" if path in g8.PORTAL else "PRESERVE_EXACT"
        if state=="PRESERVE_EXACT":
            demand(path in live,"PRESERVED_MISSING")
        else:
            demand(path in old,"PORTAL_NOT_FOUND_IN_PREVIOUS")
        file_rows.append({
          "path":path,
          "size":row["size"],
          "sha256":row["sha256"],
          "source_ref":row["source_ref"],
          "state":state
        })
    demand(sum(r["state"]=="PRESERVE_EXACT" for r in file_rows)==PRESERVED_COUNT,
           "PRESERVED_PATH_COUNT")
    demand(sum(r["state"]=="NEW_PORTAL" for r in file_rows)==PORTAL_COUNT,
           "PORTAL_PATH_COUNT")
    publish_manifest={
      "schema":"AYS_G14_PUBLICATION_CANDIDATE_FILE_MANIFEST_V1",
      "classification":"SOURCE_ONLY_NOT_UPLOADED",
      "site":SITE,
      "source_files":file_rows,
      "excluded_server_managed":sorted(NEVER_PUBLISH),
      "source_upload_path_count":SOURCE_PUBLIC_COUNT,
      "server_managed_path_count":SERVER_MANAGED_COUNT,
      "expected_served_path_count":TARGET_COUNT,
      "baseline_live_version":e["live"]["version"],
      "historical_portal_version":e["previous"]["version"],
      "source_manifest_sha256":g8.G4_MANIFEST_SHA,
      "g7_manifest_sha256_locked":g8.G7_HASHES,
    }
    gates=[
      "OWNER_DEPLOY_APPROVAL_SEPARATE",
      "FRESH_ADMIN_LIVE_RELEASE_READBACK_AND_CONFLICT_DENY",
      "PUBLISHER_SINGLE_OWNERSHIP_AND_HISTORY_REVALIDATION",
      "EXACT_PREDEPLOY_963_PHYSICAL_BYTES_AND_TWO_SINIESTROS",
      "SERVER_MANAGED_PATHS_REMAIN_FIREBASE_MANAGED",
      "ROLLBACK_FROZEN_LIVE_VERSION_AND_DRILL",
      "PORTAL_EXTERNAL_AUTH_ACCESS_PERMISSION_UAT",
      "POSTDEPLOY_967_PATH_READBACK_AND_FUNCTIONAL_SMOKE"
    ]
    receipt_out={
      "schema":SCHEMA,
      "classification":"G14_SOURCEONLY_PREPARED__NO_PUBLICATION_AUTHORITY",
      "site":SITE,
      "candidate_manifest_sha256":sha(publish_manifest),
      "source_upload_path_count":SOURCE_PUBLIC_COUNT,
      "preserved_live_files_sha256_match":PRESERVED_COUNT,
      "new_portal_files":PORTAL_COUNT,
      "firebase_server_managed_paths":sorted(NEVER_PUBLISH),
      "future_served_paths_expected":TARGET_COUNT,
      "current_live_version":e["live"]["version"],
      "rollback_prechange_version":e["live"]["version"],
      "previous_version_contains_portal_but_not_siniestros":True,
      "source_assembly_manifest_sha256":g8.G4_MANIFEST_SHA,
      "source_manifest_sha256":sha(src),
      "live_version_manifest_sha256":sha(e["live"]),
      "g8_source_gate":"PASS",
      "fresh_admin_readback":"NOT_PERFORMED_IN_G14",
      "legacy_publisher_enablement":"NOT_CLAIMED_COMPLETE",
      "deployment_authorized":False,
      "hosting_mutations":0,"github_merge":False,
      "rollback_executed":False,"customer_data_used":False,
      "required_before_any_publish":gates
    }
    demand(receipt_out["rollback_prechange_version"]!=e["previous"]["version"],
           "PREVIOUS_ROLLBACK_WOULD_DELETE_SINIESTROS")
    return publish_manifest,receipt_out

def synthetic_tests(e,receipt):
    compose(e,receipt)
    cases=[
      ("live-mutated",lambda x,y:x["live"]["files"].update({"rogue.js":"0"*64})),
      ("live-version",lambda x,y:x["live"].update({"version":"sites/ays-orbit-360-lab/versions/drift"})),
      ("source-added",lambda x,y:x["source"].update({"unapproved.html":"1"*64})),
      ("source-portal-removed",lambda x,y:x["source"].pop("portal-p01-lab.html")),
      ("source-sin-mutated",lambda x,y:x["source"].update({"core/siniestros-s512d-public.js":"2"*64})),
      ("managed-source-added",lambda x,y:x["source"].update({"__/firebase/init.js":"3"*64})),
      ("not-all-physical",lambda x,y:y["full_physical_equivalence"].update({"matched_count":962})),
      ("fake-physical",lambda x,y:y["full_physical_equivalence"].update({"source_to_public_bytes_identical":False})),
      ("unsafe-portal-smoke",lambda x,y:y["public_smoke"]["portal-p01-lab.html"].update({"http":200})),
      ("missing-siniestros",lambda x,y:y["public_smoke"]["siniestros-asistencia-lab.html"].update({"byte_sha256_match":False})),
      ("skip-G8-negative",lambda x,y:y["selftest"].update({"passed":14})),
      ("skip-staging",lambda x,y:y["source_staging"].update({"staged_source_bytes_verified":2707})),
      ("previous-version",lambda x,y:x["previous"].update({"version":"some-other-version"})),
      ("g8-source-manifest",lambda x,y:x["g4"].update({"assembled_count":2707})),
      ("release-flag",lambda x,y:y["g8"].update({"owner_lab_deploy_authorized":True})),
    ]
    for label,mutate in cases:
        x,y=copy.deepcopy(e),copy.deepcopy(receipt)
        mutate(x,y)
        try:
            compose(x,y)
        except (AssertionError,KeyError,ValueError):
            continue
        raise AssertionError("G14_FALSE_ALLOW_"+label)
    demand(len(cases)==15,"SYNTHETIC_COUNT")
    return {"positive":1,"negative":len(cases),"total":16,"passed":16,"result":"PASS"}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--g4-dir",required=True)
    p.add_argument("--g7-dir",required=True)
    p.add_argument("--g8-receipt",required=True)
    p.add_argument("--out-dir",required=True)
    args=p.parse_args()
    out=pathlib.Path(args.out_dir)
    demand(not out.exists(),"OUTPUT_ALREADY_EXISTS")
    g8=import_g8()
    evidence=g8.read_evidence(args.g4_dir,args.g7_dir)
    g8receipt=read_receipt(args.g8_receipt)
    manifest,receipt=compose(evidence,g8receipt)
    tests=synthetic_tests(evidence,g8receipt)
    out.mkdir(parents=True)
    (out/"G14_PUBLISH_CANDIDATE_MANIFEST.json").write_text(
      json.dumps(manifest,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    (out/"G14_SOURCE_ONLY_RELEASE_HOLD_RECEIPT.json").write_text(
      json.dumps({"release":receipt,"synthetic_tests":tests},ensure_ascii=False,
                 indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("G14_SOURCE_ONLY "+json.dumps(receipt,sort_keys=True))
    print("G14_TESTS "+json.dumps(tests,sort_keys=True))

if __name__=="__main__":
    try:main()
    except Exception as err:
        print("G14_FAIL_CLOSED "+type(err).__name__+" "+str(err)[:180],file=sys.stderr)
        raise SystemExit(2)
