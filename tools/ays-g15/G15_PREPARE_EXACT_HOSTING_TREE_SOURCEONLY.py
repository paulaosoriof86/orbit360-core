#!/usr/bin/env python3
"""A&S G15: physically prepare a single-Hosting publication tree; NO publish path.

G4 owns bytes; G8 owns physical current-site proof; G14 owns 965-route candidate.
This tool copies the 965 exact allowed bytes to an OUT-OF-CHECKOUT temporary tree
and freezes hosting-only config and rollback reference. It never calls Firebase.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

SITE="ays-orbit-360-lab"
BASE="f873ce1f2b55dc5ad8cac07b58be43faddeb0a99"
PORTAL="1623cac977498bb5bba0092748a8c70a9cd06189"
BASELINE="sites/ays-orbit-360-lab/versions/3087fabd2db9b639"
OLD_PORTAL_VERSION="sites/ays-orbit-360-lab/versions/769971d4c9e54a7a"
MANAGED={"__/firebase/init.js","__/firebase/init.json"}
PORTAL_PATHS={"portal-p01-lab.html","core/portal-p01-s511f.js"}
TOTAL_SOURCE=965
PRESERVED=963
TARGET=967

def hold(ok,reason):
    if not ok:raise AssertionError("G15_HOLD_"+reason)

def digest(b):return hashlib.sha256(b).hexdigest()

def canonical(obj):
    return json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode("utf-8")

def read_json(p):return json.loads(pathlib.Path(p).read_text(encoding="utf-8"))

def source_config(repo):
    process=subprocess.run(["git","-C",str(repo),"show",BASE+":firebase.json"],
                           stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
    hold(process.returncode==0,"FROZEN_FIREBASE_CONFIG_NOT_FOUND")
    cfg=json.loads(process.stdout)
    hosting=cfg.get("hosting")
    hold(isinstance(hosting,dict),"EXPECTED_HOSTING_CONFIG")
    hold(hosting.get("public")=="orbit360-platform","HOSTING_ROOT_DRIFT")
    hold(not hosting.get("target") and not hosting.get("site"),"UNEXPECTED_MULTISITE")
    hold(hosting.get("cleanUrls") is False and hosting.get("trailingSlash") is False,"HOSTING_ROUTING_DRIFT")
    hold(isinstance(hosting.get("headers"),list) and len(hosting["headers"])>=3,"HOSTING_HEADERS_DRIFT")
    hold("docs/**" in hosting.get("ignore",[]) and "_*/**" in hosting.get("ignore",[]),
         "HOSTING_IGNORES_DRIFT")
    cfg_out=copy.deepcopy(hosting)
    cfg_out["public"]="public"
    cfg_out["site"]=SITE
    return {"hosting":cfg_out}

def validate(manifest,rec,g8):
    release=rec.get("release",{})
    tests=rec.get("synthetic_tests",{})
    hold(manifest.get("schema")=="AYS_G14_PUBLICATION_CANDIDATE_FILE_MANIFEST_V1","G14_MANIFEST_ID")
    hold(manifest.get("classification")=="SOURCE_ONLY_NOT_UPLOADED","G14_MANIFEST_SOURCE_ONLY")
    hold(release.get("schema")=="AYS_G14_SINGLE_PUBLISHER_SOURCEONLY_V1","G14_RECEIPT_ID")
    hold(release.get("classification")=="G14_SOURCEONLY_PREPARED__NO_PUBLICATION_AUTHORITY","G14_RELEASE_HOLD")
    hold(tests.get("result")=="PASS" and tests.get("passed")==16,"G14_SELFTEST")
    hold(release.get("deployment_authorized") is False and release.get("hosting_mutations")==0,"NO_RELEASE")
    hold(manifest.get("site")==SITE and release.get("site")==SITE,"SITE")
    hold(manifest.get("baseline_live_version")==BASELINE and release.get("current_live_version")==BASELINE,"LIVE_PARENT")
    hold(release.get("rollback_prechange_version")==BASELINE,"SAFE_ROLLBACK")
    hold(manifest.get("historical_portal_version")==OLD_PORTAL_VERSION,"HISTORICAL_PARENT")
    hold(release.get("candidate_manifest_sha256")==digest(canonical(manifest)),"G14_MANIFEST_DIGEST")
    hold(release.get("fresh_admin_readback")=="NOT_PERFORMED_IN_G14","FRESH_LIVE_GATE_PRESERVED")
    hold(manifest.get("source_upload_path_count")==TOTAL_SOURCE and
         manifest.get("server_managed_path_count")==2 and
         manifest.get("expected_served_path_count")==TARGET,"COUNTS")
    hold(set(manifest.get("excluded_server_managed",[]))==MANAGED,"FIREBASE_RESERVED")
    physical=g8.get("full_physical_equivalence",{})
    hold(physical.get("classification")=="PHYSICAL_963_MATCH" and
         physical.get("checked_count")==PRESERVED and
         physical.get("matched_count")==PRESERVED and
         physical.get("failure_count")==0 and
         physical.get("source_to_public_bytes_identical") is True,"PRESERVED_BYTES")
    hold(g8.get("g8",{}).get("expected_future_path_count")==TARGET and
         g8.get("g8",{}).get("owner_lab_deploy_authorized") is False,"G8_HOLD")
    hold(g8.get("source_staging",{}).get("staged_source_bytes_verified")==2708,"G4_STAGED_COUNT")
    rows=manifest.get("source_files",[])
    hold(len(rows)==TOTAL_SOURCE,"ROW_COUNT")
    seen=set()
    preserved=added=0
    for row in rows:
        p=row.get("path")
        hold(isinstance(p,str) and p and not p.startswith("/") and
             "\\" not in p and "?" not in p and "#" not in p and
             all(seg not in ("","..",".") for seg in p.split("/")),"UNSAFE_PATH")
        hold(p not in seen and p not in MANAGED and not p.startswith("__/"),"RESERVED_OR_DUPLICATE")
        seen.add(p)
        hold(isinstance(row.get("sha256"),str) and len(row["sha256"])==64 and
             all(c in "0123456789abcdef" for c in row["sha256"]),"SHA_FORMAT")
        hold(type(row.get("size"))==int and row["size"]>=0,"FILE_SIZE")
        if p in PORTAL_PATHS:
            hold(row.get("state")=="NEW_PORTAL" and row.get("source_ref")==PORTAL,"PORTAL_SOURCE")
            added+=1
        else:
            hold(row.get("state")=="PRESERVE_EXACT" and row.get("source_ref")==BASE,"PRESERVED_SOURCE")
            preserved+=1
    hold(preserved==PRESERVED and added==2,"DELTAS_EXACT")
    hold(not any(p.startswith("docs/") for p in seen),"DOCS_NEVER_HOSTED")
    return {"preserved":preserved,"new_portal":added,"source_count":len(seen),"served_expected":TARGET}

def tests(manifest,rec,g8):
    validate(manifest,rec,g8)
    modifications=[
       lambda m,r,g:m.update({"source_upload_path_count":964}),
       lambda m,r,g:m.update({"expected_served_path_count":968}),
       lambda m,r,g:m.update({"site":"other"}),
       lambda m,r,g:m["source_files"].pop(),
       lambda m,r,g:m["source_files"][0].update({"path":"../escape"}),
       lambda m,r,g:m["source_files"][0].update({"path":"__/firebase/init.js"}),
       lambda m,r,g:m["source_files"][0].update({"sha256":"wrong"}),
       lambda m,r,g:m["source_files"][0].update({"size":-1}),
       lambda m,r,g:m["source_files"][0].update({"state":"NEW_PORTAL"}),
       lambda m,r,g:m["source_files"][0].update({"source_ref":"untrusted"}),
       lambda m,r,g:r["release"].update({"deployment_authorized":True}),
       lambda m,r,g:r["release"].update({"current_live_version":"changed"}),
       lambda m,r,g:r["release"].update({"rollback_prechange_version":OLD_PORTAL_VERSION}),
       lambda m,r,g:g["full_physical_equivalence"].update({"matched_count":962}),
       lambda m,r,g:g["source_staging"].update({"staged_source_bytes_verified":2707}),
       lambda m,r,g:r["synthetic_tests"].update({"passed":15})
    ]
    for index,fn in enumerate(modifications):
        m,r,g=copy.deepcopy(manifest),copy.deepcopy(rec),copy.deepcopy(g8)
        fn(m,r,g)
        try:validate(m,r,g)
        except (AssertionError,KeyError,ValueError):continue
        raise AssertionError("G15_NEGATIVE_NOT_BLOCKED_"+str(index))
    return {"positive":1,"negative":len(modifications),"total":len(modifications)+1,
            "passed":len(modifications)+1,"result":"PASS"}

def prepare(repo,source,out,manifest,rec,g8):
    counts=validate(manifest,rec,g8)
    tests_result=tests(manifest,rec,g8)
    repo=repo.resolve()
    source=source.resolve()
    out=out.resolve()
    hold(source.is_dir() and (source/"portal-p01-lab.html").is_file(),"G4_SOURCE_MISSING")
    hold(not out.exists(),"OUTPUT_MUST_BE_NEW")
    hold(not out.is_relative_to(repo) and not source.is_relative_to(out),"OUTSIDE_CHECKOUT_ONLY")
    conf=source_config(repo)
    pub=out/"public"
    pub.mkdir(parents=True,exist_ok=False)
    digest_map={}
    for row in manifest["source_files"]:
        relative=pathlib.Path(row["path"])
        inp=source/relative
        hold(inp.is_file() and not inp.is_symlink(),"SOURCE_FILE_MISSING_OR_SYMLINK")
        payload=inp.read_bytes()
        hold(len(payload)==row["size"] and digest(payload)==row["sha256"],
             "SOURCE_BYTE_DRIFT_"+row["path"][:55])
        dest=pub/relative
        hold(dest.resolve().is_relative_to(pub.resolve()),"PATH_ESCAPE")
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(payload)
        hold(digest(dest.read_bytes())==row["sha256"],"COPY_READBACK_"+row["path"][:50])
        digest_map[row["path"]]=row["sha256"]
    found={p.relative_to(pub).as_posix() for p in pub.rglob("*") if p.is_file()}
    hold(found==set(digest_map),"OUTPUT_UNIVERSE")
    (out/"firebase.json").write_text(json.dumps(conf,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    receipt={
      "schema":"AYS_G15_PREPARED_HOSTING_TREE_READONLY_V1",
      "classification":"EXACT_965_FILE_TREE_PREPARED__DEPLOY_NOT_AUTHORIZED",
      "site":SITE,
      "files_created_in_isolated_workspace":counts["source_count"],
      "preserved":counts["preserved"],"new_portal":counts["new_portal"],
      "managed_by_firebase":sorted(MANAGED),
      "expected_served_paths":counts["served_expected"],
      "artifact_manifest_sha256":digest(canonical(manifest)),
      "publish_config_sha256":digest((out/"firebase.json").read_bytes()),
      "all_source_and_output_bytes_verified":True,
      "rollback_target_prechange":BASELINE,
      "unsafe_previous_portal_only_version":OLD_PORTAL_VERSION,
      "rollback_executed":False,
      "fresh_admin_version_revalidated":False,
      "owner_deploy_authorized":False,
      "publisher_enabled":False,
      "firebase_calls":0,"firebase_mutations":0,"production_touched":False,
      "next_action":"ONLY_AFTER_EXPLICIT_OWNER_AUTH_AND_FRESH_FIREBASE_ADMIN_READBACK",
      "tests":tests_result
    }
    (out/"G15_PREPARATION_RECEIPT.json").write_text(
         json.dumps(receipt,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    return receipt

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--repo",type=pathlib.Path,required=True)
    p.add_argument("--source-root",type=pathlib.Path,required=True)
    p.add_argument("--manifest",type=pathlib.Path,required=True)
    p.add_argument("--g14-receipt",type=pathlib.Path,required=True)
    p.add_argument("--g8-receipt",type=pathlib.Path,required=True)
    p.add_argument("--out",type=pathlib.Path,required=True)
    args=p.parse_args()
    result=prepare(args.repo,args.source_root,args.out,
        read_json(args.manifest),read_json(args.g14_receipt),read_json(args.g8_receipt))
    print("G15_SOURCEONLY_PREPARED "+json.dumps(result,sort_keys=True))

if __name__=="__main__":
    try:main()
    except Exception as err:
        print("G15_FAIL_CLOSED "+type(err).__name__+" "+str(err)[:180],file=sys.stderr)
        raise SystemExit(2)
