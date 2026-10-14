#!/usr/bin/env python3
"""A&S G8: immutable Hosting source verification, fail-closed, read only."""
from __future__ import annotations
import argparse, copy, hashlib, json, os, pathlib, stat, urllib.error, urllib.request

G4_MANIFEST_SHA="dd87b35066098a85973afaabc3666871d939d691ff87dffbcb0626d3a5310e06"
G7_HASHES={
 "G7_G4_SOURCE_PATHS_SHA256.json":"40c4107a0dfd2845070f660bcae48c283e45a2bc499c6852a402edf9e58092e3",
 "G7_LIVE_VERSION_FILE_MANIFEST.json":"53fba67cb3e79807d54d7842193fc17a7001784715f17b80a2d78156f97ff032",
 "G7_PREVIOUS_VERSION_FILE_MANIFEST.json":"bfb06b6581f39e290466d1fa4fc394226270eba9f54167a301dbbcdbbd0a6a12",
 "G7_READONLY_RECEIPT.json":"69fc728a827c53c137de82f04057449494d054553b0b6e96f9c7565202286f44",
}
G4_BASE="f873ce1f2b55dc5ad8cac07b58be43faddeb0a99"
PORTAL_REF="1623cac977498bb5bba0092748a8c70a9cd06189"
LIVE="sites/ays-orbit-360-lab/versions/3087fabd2db9b639"
PREV="sites/ays-orbit-360-lab/versions/769971d4c9e54a7a"
PORTAL={"portal-p01-lab.html","core/portal-p01-s511f.js"}
SIN={"siniestros-asistencia-lab.html","core/siniestros-s512d-public.js"}
MANAGED={"__/firebase/init.js","__/firebase/init.json"}
CRITICAL=PORTAL|SIN
ROOT="orbit360-platform/"
SITE="https://ays-orbit-360-lab.web.app/"

def hold(cond,code):
 if not cond: raise AssertionError("HOLD_"+code)

def digest(raw): return hashlib.sha256(raw).hexdigest()
def read_json(p,expected=None):
 data=pathlib.Path(p).read_bytes()
 if expected: hold(digest(data)==expected,"EVIDENCE_SHA_DRIFT_"+pathlib.Path(p).name)
 return json.loads(data)

def read_evidence(g4dir,g7dir):
 gm=pathlib.Path(g4dir)/"SOURCE_FILE_MANIFEST.json"
 g4=read_json(gm,G4_MANIFEST_SHA)
 assembly=read_json(pathlib.Path(g4dir)/"SOURCE_ASSEMBLY_RECEIPT.json")
 g7={name:read_json(pathlib.Path(g7dir)/name,dig) for name,dig in G7_HASHES.items()}
 hold(assembly.get("manifest_sha256")==G4_MANIFEST_SHA,"G4_RECEIPT")
 return {"g4":g4,"assembly":assembly,"source":g7["G7_G4_SOURCE_PATHS_SHA256.json"],
         "live":g7["G7_LIVE_VERSION_FILE_MANIFEST.json"],
         "previous":g7["G7_PREVIOUS_VERSION_FILE_MANIFEST.json"],
         "receipt":g7["G7_READONLY_RECEIPT.json"]}

def verify(e):
 g4,src,live,prev,rec=[e[k] for k in ("g4","source","live","previous","receipt")]
 hold(g4.get("classification")=="SOURCE_ONLY_NOT_DEPLOYED","SOURCE_NOT_FROZEN")
 hold(g4.get("assembled_count")==2708 and len(g4.get("files",[]))==2708,"ASSEMBLY_COUNT")
 hold(g4.get("baseline_ref")==G4_BASE and g4.get("portal_ref")==PORTAL_REF,"PARENT_REF")
 hold(rec.get("result")=="API_READBACK_COMPLETED_SOURCE_ONLY" and rec.get("firebase_mutations")==0,"G7_AUTHORITY")
 hold(rec.get("g4_source_manifest_sha256")==G4_MANIFEST_SHA,"G7_G4_LINEAGE")
 hold(rec.get("site")=="ays-orbit-360-lab" and rec.get("restore_authorized")==False,"FIREBASE_SITE_GATE")
 hold(live.get("version")==LIVE and prev.get("version")==PREV,"RELEASE_VERSION")
 hold(live.get("observed_file_count")==live.get("declared_file_count")==965,"LIVE_COUNT")
 hold(prev.get("observed_file_count")==prev.get("declared_file_count")==965,"PREVIOUS_COUNT")
 lf,pf=live["files"],prev["files"]
 shared=set(lf)&set(pf)
 hold(len(shared)==963 and all(lf[p]==pf[p] for p in shared),"SHARED_FIREBASE_HASH")
 hold(set(lf)-set(pf)==SIN and set(pf)-set(lf)==PORTAL,"PORTAL_SINIESTROS_DELTA")
 hold(MANAGED<=shared and set(p for p in lf if p.startswith("__"))==MANAGED,"MANAGED_PATHS")
 hold(set(live["statuses"])==set(lf) and all(v=="ACTIVE" for v in live["statuses"].values()),"LIVE_STATUS")
 hold(set(lf)-set(src)==MANAGED and set(src)-set(lf)==PORTAL,"SOURCE_VS_LIVE_PATHS")
 hold(len(src)==965,"SOURCE_COUNT")
 rows={}
 for row in g4["files"]:
  path=row["path"]
  hold(path.startswith(ROOT),"SOURCE_OUTSIDE_PUBLIC")
  p=path[len(ROOT):]
  if p.startswith("docs/") or p==".verify-academia.png": continue
  hold(p not in rows,"DUPLICATE_SOURCE")
  rows[p]=row
 hold({p:r["sha256"] for p,r in rows.items()}==src,"SOURCE_HASH_LINEAGE")
 hold({p for p,r in rows.items() if r.get("critical")}==CRITICAL,"CRITICAL_FLAGS")
 hold(all(rows[p]["source_ref"]==PORTAL_REF for p in PORTAL),"PORTAL_PROVENANCE")
 hold(all(rows[p]["source_ref"]==G4_BASE for p in SIN),"SINIESTROS_PROVENANCE")
 target=set(lf)|PORTAL
 hold(len(target)==967 and target==(set(src)|MANAGED),"EXPECTED_TARGET")
 return {
  "classification":"SOURCE_ONLY_G8_EVIDENCE_PASS_RELEASE_HOLD",
  "live_version_baseline":LIVE,"previous_version":PREV,
  "g4_source_paths":len(src),"firebase_active_paths":len(lf),"unchanged_shared_firebase_hashes":963,
  "firebase_critical_state":{p:{"live":p in lf,"previous":p in pf} for p in sorted(CRITICAL)},
  "firebase_managed":sorted(MANAGED),
  "expected_future_path_count":967,
  "missing_portal":sorted(PORTAL),
  "source_firebase_full_byte_equivalence":False,
  "owner_lab_deploy_authorized":False,"merge_authorized":False,
  "legacy_hosting_publishers_disabled":False,
  "rollback_version":LIVE,
  "required_before_any_deploy":["FRESH_LAB_RELEASE_READBACK","963_COMMON_AND_2_SINIESTROS_SOURCE_TO_HOSTING_BYTE_EQUIVALENCE",
     "LEGACY_PORTAL_AND_SINIESTROS_PUBLISHER_COORDINATION","EXACT_OWNER_LAB_DEPLOY_APPROVAL"]
 }

def staged_bytes(e,stage):
 g4=e["g4"]
 stage=pathlib.Path(stage).resolve()
 root=stage/ROOT
 hold(root.is_dir(),"STAGED_PUBLIC_DIR_MISSING")
 expected={r["path"][len(ROOT):]:r for r in g4["files"]}
 seen={}
 for f in root.rglob("*"):
  if not f.is_file(): continue
  p=f.relative_to(root).as_posix()
  hold(p in expected,"UNAPPROVED_STAGED_PATH")
  raw=f.read_bytes()
  r=expected[p]
  hold(len(raw)==r["size"] and digest(raw)==r["sha256"],"STAGED_SHA_"+p)
  mode=stat.S_IMODE(f.stat().st_mode)
  hold(mode==int(r["git_mode"][-3:],8),"STAGED_GIT_MODE_"+p)
  seen[p]=True
 hold(set(seen)==set(expected) and len(seen)==2708,"STAGED_TREE_INCOMPLETE")
 return {"staged_file_count":len(seen),"staged_source_bytes_verified":len(seen),
         "staged_publishable_count":965,"source_firebase_full_byte_equivalence":False}

def public_smoke(e):
 # Only four already-public, known LAB assets; never inspect client/account data.
 candidates={r["path"][len(ROOT):]:r for r in e["g4"]["files"] if r.get("critical")}
 output={}
 for p in sorted(CRITICAL):
  req=urllib.request.Request(SITE+p,headers={"Accept-Encoding":"identity","User-Agent":"AYS-G8-SourceOnlySmoke/1.0"},method="GET")
  try:
   with urllib.request.urlopen(req,timeout=15) as res:
    hold(res.geturl()==SITE+p,"UNEXPECTED_REDIRECT_"+p)
    body=res.read(1_000_001)
    hold(len(body)<=1_000_000,"PUBLIC_RESPONSE_OVERSIZE_"+p)
    hold(p in SIN,"PORTAL_ALREADY_VISIBLE_RELEASE_DRIFT")
    hold(res.status==200 and digest(body)==candidates[p]["sha256"],"PUBLIC_BYTES_DRIFT_"+p)
    output[p]={"http":200,"byte_sha256_match":True}
  except urllib.error.HTTPError as ex:
   hold(p in PORTAL and ex.code==404,"UNEXPECTED_HTTP_"+p)
   output[p]={"http":404,"state":"PORTAL_NOT_DEPLOYED"}
 return output

def tests(e):
 def bad_change(change):
  x=copy.deepcopy(e)
  change(x)
  try: verify(x)
  except AssertionError:return
  raise AssertionError("NEGATIVE_TEST_DID_NOT_FAIL")
 verify(copy.deepcopy(e))
 changes=[
  lambda x:x["live"]["files"].update({"rogue.js":"a"*64}),
  lambda x:x["live"]["files"].update({"portal-p01-lab.html":"a"*64}),
  lambda x:x["live"]["files"].pop("siniestros-asistencia-lab.html"),
  lambda x:x["live"]["files"].update({"index.html":"a"*64}),
  lambda x:x["live"].update({"version":"WRONG"}),
  lambda x:x["previous"].update({"version":"WRONG"}),
  lambda x:x["live"]["files"].pop("__/firebase/init.js"),
  lambda x:x["source"].update({"portal-p01-lab.html":"a"*64}),
  lambda x:x["g4"].update({"portal_ref":"WRONG"}),
  lambda x:x["receipt"].update({"firebase_mutations":1}),
  lambda x:x["source"].update({"rogue.js":"a"*64}),
  lambda x:x["live"]["statuses"].update({"index.html":"PENDING"}),
  lambda x:next(r for r in x["g4"]["files"] if r["path"]==ROOT+"portal-p01-lab.html").update({"critical":False}),
 ]
 for change in changes:bad_change(change)
 hold(len(changes)==14,"NEGATIVE_TEST_COUNT")
 return {"passed":15,"total":15,"result":"PASS"}

def main():
 pa=argparse.ArgumentParser()
 pa.add_argument("--g4-dir",required=True)
 pa.add_argument("--g7-dir",required=True)
 pa.add_argument("--staged-dir")
 pa.add_argument("--selftest",action="store_true")
 pa.add_argument("--public-smoke",action="store_true")
 pa.add_argument("--out")
 args=pa.parse_args()
 evidence=read_evidence(args.g4_dir,args.g7_dir)
 report={"g8":verify(evidence),"selftest":tests(evidence) if args.selftest else None}
 if args.staged_dir:report["source_staging"]=staged_bytes(evidence,args.staged_dir)
 if args.public_smoke:report["public_smoke"]=public_smoke(evidence)
 if args.out:
  p=pathlib.Path(args.out)
  p.parent.mkdir(parents=True,exist_ok=True)
  hold(not p.exists(),"OUTPUT_EXISTS")
  p.write_text(json.dumps(report,sort_keys=True,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 print("G8_SOURCE_ONLY_VERIFIED "+json.dumps(report,sort_keys=True))
 return 0

if __name__=="__main__":
 try:raise SystemExit(main())
 except Exception as e:
  print("G8_FAIL_CLOSED "+type(e).__name__+" "+str(e)[:210],file=__import__("sys").stderr)
  raise SystemExit(2)
