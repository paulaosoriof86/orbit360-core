#!/usr/bin/env python3
"""G6: READ-ONLY public Firebase LAB asset fingerprint verification.

This deliberately cannot fetch Firebase release metadata and cannot authorize deploy.
No auth, no tokens, no client data, no writes to Firebase.
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

SITE="https://ays-orbit-360-lab.web.app"
CRITICAL=(
 "portal-p01-lab.html",
 "core/portal-p01-s511f.js",
 "siniestros-asistencia-lab.html",
 "core/siniestros-s512d-public.js",
)
MAX_BYTES=1024*1024
def git_blob_sha(data:bytes)->str:
 return hashlib.sha1(b"blob "+str(len(data)).encode("ascii")+b"\0"+data).hexdigest()

def manifest_expectations(manifest:dict)->dict:
 if manifest.get("classification")!="SOURCE_ONLY_NOT_DEPLOYED" or manifest.get("assembled_count")!=2708:
  raise ValueError("Unexpected source manifest; fail closed")
 if manifest.get("baseline_ref")!="f873ce1f2b55dc5ad8cac07b58be43faddeb0a99":
  raise ValueError("Unexpected source baseline")
 if manifest.get("portal_ref")!="1623cac977498bb5bba0092748a8c70a9cd06189":
  raise ValueError("Unexpected Portal ref")
 data={r["path"].removeprefix("orbit360-platform/"):r for r in manifest["files"] if r.get("critical")}
 if set(data)!=set(CRITICAL):raise ValueError("Four critical assets mismatch")
 return data

def classify(rows:list[dict])->str:
 m={r["asset"]:r for r in rows}
 if set(m)!=set(CRITICAL):return "INCONCLUSIVE_INVENTORY"
 if any(r["state"]=="DRIFT" for r in rows):return "HOLD_DRIFT_DETECTED"
 if any(r["state"]=="ERROR" for r in rows):return "INCONCLUSIVE_REMOTE"
 missing=[r for r in rows if r["state"]=="MISSING"]
 if missing:
  if all(m[p]["state"]=="MISSING" for p in CRITICAL[:2]) and all(m[p]["state"]=="MATCH" for p in CRITICAL[2:]):
   return "HOLD_PORTAL_MISSING_SINIESTROS_MATCH"
  return "HOLD_OTHER_MISSING"
 if all(r["state"]=="MATCH" for r in rows):return "FOUR_ASSETS_MATCH_SOURCE_ONLY"
 return "INCONCLUSIVE_REMOTE"

def fetch(url:str,expected:dict)->dict:
 asset=url.removeprefix(SITE+"/")
 record={"asset":asset,"url":url,"state":"ERROR","http_status":None}
 req=urllib.request.Request(url,headers={"Accept-Encoding":"identity","User-Agent":"AYS-G6-SourceReadback/1.0"})
 try:
  with urllib.request.urlopen(req,timeout=12) as response:
   final=response.geturl()
   if final!=url:
    record.update(state="DRIFT",reason="UNEXPECTED_REDIRECT",final_url=final)
    return record
   data=response.read(MAX_BYTES+1)
   record.update(http_status=response.status,etag=response.headers.get("ETag"),
      last_modified=response.headers.get("Last-Modified"),content_bytes=len(data))
   if len(data)>MAX_BYTES:
    record.update(state="DRIFT",reason="OVERSIZE")
    return record
   sha=hashlib.sha256(data).hexdigest()
   blob=git_blob_sha(data)
   record.update(sha256=sha,git_blob_sha=blob,
      state="MATCH" if sha==expected["sha256"] and blob==expected["blob_sha"] else "DRIFT")
 except urllib.error.HTTPError as e:
  record.update(http_status=e.code,state="MISSING" if e.code==404 else "ERROR")
 except (urllib.error.URLError,TimeoutError,OSError) as e:
  record.update(state="ERROR",error_type=type(e).__name__)
 return record

def offline_tests():
 example=[{"asset":p,"state":"MISSING" if i<2 else "MATCH"} for i,p in enumerate(CRITICAL)]
 cases=[
  ("historical_404",example,"HOLD_PORTAL_MISSING_SINIESTROS_MATCH"),
  ("all_match",[{"asset":p,"state":"MATCH"} for p in CRITICAL],"FOUR_ASSETS_MATCH_SOURCE_ONLY"),
  ("source_drift",[{"asset":p,"state":"DRIFT" if i==2 else "MATCH"} for i,p in enumerate(CRITICAL)],"HOLD_DRIFT_DETECTED"),
  ("remote_timeout",[{"asset":p,"state":"ERROR" if i==2 else "MATCH"} for i,p in enumerate(CRITICAL)],"INCONCLUSIVE_REMOTE"),
  ("all_missing",[{"asset":p,"state":"MISSING"} for p in CRITICAL],"HOLD_OTHER_MISSING")
 ]
 for name,rows,expected in cases:
  got=classify(rows)
  if got!=expected:raise AssertionError(f"{name}: {got} != {expected}")
 print(json.dumps({"test_suite":"G6_REMOTE_READBACK_OFFLINE_CLASSIFICATION","passed":len(cases),"total":len(cases)},indent=2))

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--manifest",type=Path)
 ap.add_argument("--out",type=Path)
 ap.add_argument("--selftest",action="store_true")
 args=ap.parse_args()
 if args.selftest:offline_tests();return 0
 if not args.manifest or not args.out:ap.error("--manifest and --out are required")
 if args.out.exists():raise ValueError("Do not overwrite existing runtime receipt")
 expected=manifest_expectations(json.loads(args.manifest.read_text(encoding="utf-8")))
 rows=[fetch(SITE+"/"+p,expected[p]) for p in CRITICAL]
 receipt={
  "schema":"ays-g6-public-asset-fingerprint-readonly.v1",
  "observed_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "site":SITE,"read_only":True,"firebase_modified":False,"credentials_used":False,
  "classification":classify(rows),"assets":rows,
  "limitations":["Public file checks do not identify Firebase release/version ID",
     "Firebase Hosting full release inventory and rollback snapshot unavailable without authorized admin access",
     "Pass for source assets does not prove customer login, Portal readiness or production release"],
  "no_deploy":True}
 args.out.parent.mkdir(parents=True,exist_ok=True)
 args.out.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({"classification":receipt["classification"],
   "assets":[{"asset":x["asset"],"status":x["http_status"],"state":x["state"],
     "last_modified":x.get("last_modified")} for x in rows],"receipt_path":str(args.out)},ensure_ascii=False,indent=2))
 return 0
if __name__=="__main__":
 try:sys.exit(main())
 except Exception as e:
  print(json.dumps({"classification":"G6_FAIL_CLOSED","error_type":type(e).__name__,
   "error":str(e)}),file=sys.stderr);sys.exit(2)
