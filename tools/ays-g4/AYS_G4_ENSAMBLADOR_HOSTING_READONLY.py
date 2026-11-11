#!/usr/bin/env python3
"""A&S G4. Deterministic source-only shared Hosting candidate. No Firebase writes."""
from __future__ import annotations
import argparse, hashlib, io, json, os, stat, subprocess, sys, tarfile
from pathlib import Path, PurePosixPath

BASE_REF="f873ce1f2b55dc5ad8cac07b58be43faddeb0a99"
PORTAL_REF="1623cac977498bb5bba0092748a8c70a9cd06189"
PREFIX="orbit360-platform/"
PORTAL_FILES={
 "orbit360-platform/portal-p01-lab.html":"Portal P-01 · LAB · READ-ONLY",
 "orbit360-platform/core/portal-p01-s511f.js":"portalP01ReadOnlyS511E"}
SIN_FILES={
 "orbit360-platform/siniestros-asistencia-lab.html":"Siniestros S5.12D · LAB",
 "orbit360-platform/core/siniestros-s512d-public.js":"siniestrosPublicResolverS512D"}
DIFFERENCES=set(PORTAL_FILES)|set(SIN_FILES)

def git(repo:Path,*args:str)->bytes:
 r=subprocess.run(["git","-C",str(repo),*args],capture_output=True)
 if r.returncode:raise RuntimeError(f"git {' '.join(args[:3])}: exit {r.returncode}: {r.stderr.decode(errors='replace')[:300]}")
 return r.stdout

def entries(repo:Path,ref:str)->dict[str,str]:
 raw=git(repo,"ls-tree","-r","-z",ref,"--",PREFIX[:-1]);out={}
 for row in raw.split(b"\0"):
  if not row:continue
  metadata,path=row.split(b"\t",1)
  mode,kind,sha=metadata.decode().split(" ")
  p=path.decode("utf-8")
  if not p.startswith(PREFIX):continue
  if kind!="blob" or mode not in ("100644","100755"):raise ValueError(f"Non-regular asset: {p} [{mode} {kind}]")
  out[p]=(sha,mode)
 return out

def blob_sha(data:bytes)->str:
 return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()

def extract(repo:Path,base_ref:str,dst:Path):
 raw=git(repo,"archive","--format=tar",base_ref,PREFIX[:-1]);root=dst.resolve()
 with tarfile.open(fileobj=io.BytesIO(raw),mode="r:") as tf:
  for member in tf:
   path=PurePosixPath(member.name)
   if path.is_absolute() or any(p in ("..","") for p in path.parts):raise ValueError("Unsafe archive path")
   target=(dst/str(path)).resolve()
   if not target.is_relative_to(root):raise ValueError("Archive path escapes staging root")
   if member.isdir():target.mkdir(parents=True,exist_ok=True);continue
   if not member.isfile():raise ValueError("Link or special file in archive: "+str(path))
   target.parent.mkdir(parents=True,exist_ok=True)
   with tf.extractfile(member) as src:target.write_bytes(src.read())
   target.chmod(member.mode & 0o777)

def build(repo:Path,out:Path,base_ref:str=BASE_REF,portal_ref:str=PORTAL_REF,expected_count:int|None=None):
 repo=repo.resolve();out=out.resolve()
 if out.exists() and any(out.iterdir()):raise ValueError("Output directory is not empty; do not overwrite")
 if out.is_relative_to(repo):raise ValueError("Do not write candidate into checkout")
 baseline=entries(repo,base_ref);portal=entries(repo,portal_ref)
 fb0=git(repo,"show",base_ref+":firebase.json")
 fb1=git(repo,"show",portal_ref+":firebase.json")
 if fb0!=fb1:raise ValueError("Different firebase.json across commits")
 if json.loads(fb0).get("hosting",{}).get("public")!="orbit360-platform":raise ValueError("Unexpected hosting public dir")
 if expected_count is not None and (len(baseline)!=expected_count or len(portal)!=expected_count):
  raise ValueError(f"Expected {expected_count} files each; found {len(baseline)} and {len(portal)}")
 paths=sorted(set(baseline)|set(portal))
 differences=[p for p in paths if baseline.get(p)!=portal.get(p)]
 if set(differences)!=DIFFERENCES:raise ValueError("Unapproved cross-branch delta: "+repr(differences[:30]))
 for p in PORTAL_FILES:
  if p in baseline or p not in portal:raise ValueError("Portal ownership unexpected: "+p)
 for p in SIN_FILES:
  if p not in baseline or p in portal:raise ValueError("Siniestros ownership unexpected: "+p)
 out.mkdir(parents=True,exist_ok=True);stage=out/".candidate_INCOMPLETE"
 extract(repo,base_ref,stage)
 # Git archive may apply tar.umask; canonical permissions come from each Git tree entry.
 for p in baseline:
  (stage/p).chmod(int(baseline[p][1][-3:],8))
 for p in PORTAL_FILES:
  dst=stage/p;dst.parent.mkdir(parents=True,exist_ok=True)
  data=git(repo,"show",portal_ref+":"+p)
  if blob_sha(data)!=portal[p][0]:raise ValueError("Portal overlay hash mismatch: "+p)
  if dst.exists():raise ValueError("Overlay would overwrite inherited file")
  dst.write_bytes(data)
  dst.chmod(int(portal[p][1][-3:],8))
 actual={str(p.relative_to(stage)).replace(os.sep,"/") for p in stage.rglob("*") if p.is_file()}
 if actual!=set(paths):raise ValueError("Missing/extra staging paths: "+repr(sorted(set(paths)^actual)[:12]))
 rows=[]
 for p in paths:
  data=(stage/p).read_bytes();chosen=portal[p] if p in PORTAL_FILES else baseline[p]
  if blob_sha(data)!=chosen[0]:raise ValueError("Inherited Git blob changed: "+p)
  if stat.S_IMODE((stage/p).stat().st_mode)!=int(chosen[1][-3:],8):raise ValueError("Git executable mode lost: "+p)
  marker=(PORTAL_FILES|SIN_FILES).get(p)
  if marker and marker.encode("utf-8") not in data:raise ValueError("Contract marker absent: "+p)
  rows.append({"path":p,"blob_sha":chosen[0],"git_mode":chosen[1],"sha256":hashlib.sha256(data).hexdigest(),"size":len(data),
   "source_ref":portal_ref if p in PORTAL_FILES else base_ref,"critical":bool(marker)})
 manifest={"schema":"ays-g4-source-manifest.v1","classification":"SOURCE_ONLY_NOT_DEPLOYED",
  "baseline_ref":base_ref,"portal_ref":portal_ref,"firebase_config_sha256":hashlib.sha256(fb0).hexdigest(),
  "hosting_public":"orbit360-platform","baseline_file_count":len(baseline),"portal_file_count":len(portal),
  "preserved_identical_count":len(set(baseline)&set(portal)),"merge_added_count":len(PORTAL_FILES),
  "assembled_count":len(rows),"changed_paths":differences,"files":rows}
 (out/"SOURCE_FILE_MANIFEST.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 receipt={"result":"SOURCE_PRESERVATION_PASS","not_deployed":True,"source_only":True,
 "base_ref":base_ref,"portal_ref":portal_ref,"baseline_files":len(baseline),
 "inherited_identical":len(set(baseline)&set(portal)),"added_portal_files":len(PORTAL_FILES),
 "assembled_files":len(rows),"critical_files_verified":4,
 "manifest_sha256":hashlib.sha256((out/"SOURCE_FILE_MANIFEST.json").read_bytes()).hexdigest(),
 "blocking_release_gates":["LATEST_LAB_HOSTING_RELEASE_BASELINE_UNVERIFIED",
 "OWNER_APPROVAL_REQUIRED","REMOTE_READBACK_AFTER_AUTHORIZED_DEPLOY_REQUIRED"]}
 (out/"SOURCE_ASSEMBLY_RECEIPT.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 stage.rename(out/"candidate")
 return receipt

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--repo",type=Path,required=True)
 ap.add_argument("--out",type=Path,required=True)
 ap.add_argument("--base-ref",default=BASE_REF)
 ap.add_argument("--portal-ref",default=PORTAL_REF)
 ap.add_argument("--expected-count",type=int,default=2706)
 args=ap.parse_args()
 try:
  print(json.dumps(build(args.repo,args.out,args.base_ref,args.portal_ref,args.expected_count),ensure_ascii=False,indent=2));return 0
 except Exception as e:
  print(json.dumps({"result":"FAIL_CLOSED","type":type(e).__name__,"error":str(e)},ensure_ascii=False),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
