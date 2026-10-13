#!/usr/bin/env python3
"""A&S read-only LAB Hosting preservation gate.

Preflight: validate candidate Hosting directory before any full Hosting deploy.
Postflight: validate remote route/asset readback without modifying Firebase.
This tool does not deploy, write to Firebase or use secrets.
"""
import argparse
import hashlib
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

MANIFEST = {
    "schema": "ays.shared-hosting-preservation.v1",
    "lab_site": "https://ays-orbit-360-lab.web.app",
    "assets": [
        {"path": "portal-p01-lab.html", "marker": "Portal P-01 · LAB · READ-ONLY", "owner": "Portal P-01 S5.11F"},
        {"path": "core/portal-p01-s511f.js", "marker": "portalP01ReadOnlyS511E", "owner": "Portal P-01 S5.11F"},
        {"path": "siniestros-asistencia-lab.html", "marker": "Siniestros S5.12D · LAB", "owner": "Siniestros S5.12D"},
        {"path": "core/siniestros-s512d-public.js", "marker": "siniestrosPublicResolverS512D", "owner": "Siniestros S5.12D"}
    ],
    "policy": "ALL_REQUIRED / FAIL_CLOSED_PREDEPLOY / REMOTE_INCONCLUSIVE_IF_BLOCKED"
}

def check_candidate(root: Path, manifest=MANIFEST):
    output=[]
    root=root.resolve()
    for spec in manifest["assets"]:
        path=(root/spec["path"]).resolve()
        if not path.is_relative_to(root):
            output.append({**spec,"status":"FAIL_PATH_ESCAPE"});continue
        if not path.is_file():
            output.append({**spec,"status":"FAIL_MISSING"});continue
        data=path.read_bytes()
        marker=spec["marker"].encode("utf-8")
        status="PASS" if marker in data else "FAIL_MARKER_MISSING"
        output.append({**spec,"status":status,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()})
    return {"check":"predeploy", "root":str(root),"result":"PASS" if all(r["status"]=="PASS" for r in output) else "FAIL_CLOSED", "assets":output}

def check_remote(site: str, manifest=MANIFEST, timeout=7):
    results=[]
    for spec in manifest["assets"]:
        url=site.rstrip("/")+"/"+spec["path"]
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"AYS-G3-ReadOnlyHostingGuard/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                payload=response.read(4*1024*1024 + 1)
                if len(payload)>4*1024*1024: status="FAIL_OVERSIZE"
                elif spec["marker"].encode("utf-8") not in payload: status="FAIL_MARKER_MISSING"
                else: status="PASS"
                results.append({**spec,"url":url,"http":response.status,"status":status})
        except urllib.error.HTTPError as err:
            results.append({**spec,"url":url,"http":err.code,"status":"FAIL_HTTP"})
        except Exception as err:
            results.append({**spec,"url":url,"status":"INCONCLUSIVE_CONNECTIVITY","error_type":type(err).__name__})
    if any(r["status"].startswith("FAIL") for r in results): result="FAIL_CLOSED"
    elif all(r["status"]=="PASS" for r in results): result="PASS"
    else: result="INCONCLUSIVE"
    return {"check":"remote_readback","site":site,"result":result,"assets":results}

def main():
    parser=argparse.ArgumentParser(description="Read-only A&S LAB hosting preservation gate")
    parser.add_argument("--candidate-dir", type=Path,help="Directory intended as Firebase Hosting public root")
    parser.add_argument("--remote-site", help="Only performs HTTP GET to site; no changes")
    parser.add_argument("--manifest",action="store_true",help="Print required contract manifest")
    parser.add_argument("--receipt",type=Path,help="Save machine-readable result locally")
    args=parser.parse_args()
    if args.manifest:
        print(json.dumps(MANIFEST,ensure_ascii=False,indent=2))
        return 0
    if bool(args.candidate_dir)==bool(args.remote_site): parser.error("Supply exactly one of --candidate-dir or --remote-site")
    result=check_candidate(args.candidate_dir) if args.candidate_dir else check_remote(args.remote_site)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if args.receipt: args.receipt.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return 0 if result["result"]=="PASS" else (3 if result["result"]=="INCONCLUSIVE" else 2)

if __name__=="__main__": sys.exit(main())