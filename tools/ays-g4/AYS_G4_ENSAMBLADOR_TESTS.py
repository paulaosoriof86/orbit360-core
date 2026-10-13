#!/usr/bin/env python3
"""Synthetic offline test cases. No Firebase, remote GitHub, or user data."""
import importlib.util,json,subprocess,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location("assembler",Path(__file__).with_name("AYS_G4_ENSAMBLADOR_HOSTING_READONLY.py"))
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
def git(repo,*args):
 return subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,check=True).stdout.strip()
def write(repo,path,content):
 p=repo/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding="utf-8")
def commit(repo,msg):
 git(repo,"add",".");git(repo,"commit","-qm",msg);return git(repo,"rev-parse","HEAD")
def fixture(root):
 repo=root/"repo";repo.mkdir()
 git(repo,"init","-q","-b","main")
 git(repo,"config","user.email","fixture@example.invalid")
 git(repo,"config","user.name","G4 Fixture")
 write(repo,"firebase.json",json.dumps({"hosting":{"public":"orbit360-platform","ignore":["docs/**"]}}))
 write(repo,"orbit360-platform/index.html","<html>shared</html>")
 write(repo,"orbit360-platform/core/util.js","const stable=true;")
 write(repo,"orbit360-platform/tools/safe.sh","#!/bin/sh\nexit 0\n")
 (repo/"orbit360-platform/tools/safe.sh").chmod(0o755)
 common=commit(repo,"common")
 git(repo,"checkout","-qb","portal",common)
 for p,m in a.PORTAL_FILES.items():write(repo,p,m+" source")
 pref=commit(repo,"portal")
 git(repo,"checkout","-qb","siniestros",common)
 for p,m in a.SIN_FILES.items():write(repo,p,m+" source")
 bref=commit(repo,"siniestros")
 return repo,bref,pref
def must_fail(fn):
 try:fn()
 except (ValueError,RuntimeError):return
 raise AssertionError("FAIL_CLOSED was expected")
cases=[]
with tempfile.TemporaryDirectory(prefix="ays-g4-") as t:
 root=Path(t);repo,bref,pref=fixture(root);out=root/"bundle"
 receipt=a.build(repo,out,bref,pref,expected_count=5)
 manifest=json.loads((out/"SOURCE_FILE_MANIFEST.json").read_text())
 assert receipt["result"]=="SOURCE_PRESERVATION_PASS" and manifest["assembled_count"]==7
 assert manifest["preserved_identical_count"]==3
 assert all((out/"candidate"/p).exists() for p in a.DIFFERENCES)
 cases.append("merge_both_modules_and_preserve_common")
 assert (out/"candidate"/"orbit360-platform/tools/safe.sh").stat().st_mode & 0o111
 cases.append("executable_file_mode_preserved")
 must_fail(lambda:a.build(repo,out,bref,pref,expected_count=5))
 cases.append("never_overwrite_existing_staging")
 must_fail(lambda:a.build(repo,root/"wrongcount",bref,pref,expected_count=2706))
 cases.append("unexpected_inventory_size_fails")
 git(repo,"checkout","portal");write(repo,"orbit360-platform/index.html","unauthorized change")
 drift=commit(repo,"unexpected shared modification")
 must_fail(lambda:a.build(repo,root/"diverge",bref,drift,expected_count=5))
 cases.append("shared_source_mutation_fails")
 git(repo,"rm","orbit360-platform/core/portal-p01-s511f.js")
 missing=commit(repo,"portal JS removed")
 must_fail(lambda:a.build(repo,root/"missing",bref,missing,expected_count=None))
 cases.append("missing_required_asset_fails")
 git(repo,"checkout","portal");write(repo,"firebase.json",json.dumps({"hosting":{"public":"other-folder"}}))
 cfg=commit(repo,"changed config")
 must_fail(lambda:a.build(repo,root/"cfg",bref,cfg,expected_count=5))
 cases.append("hosting_configuration_drift_fails")
 git(repo,"checkout","portal")
 write(repo,"firebase.json",json.dumps({"hosting":{"public":"orbit360-platform","ignore":["docs/**"]}}))
 write(repo,"orbit360-platform/index.html","<html>shared</html>")
 write(repo,"orbit360-platform/core/portal-p01-s511f.js",a.PORTAL_FILES["orbit360-platform/core/portal-p01-s511f.js"]+" source")
 write(repo,"orbit360-platform/portal-p01-lab.html","bad page")
 nomarker=commit(repo,"contract marker missing")
 must_fail(lambda:a.build(repo,root/"marker",bref,nomarker,expected_count=5))
 cases.append("critical_contract_marker_missing_fails")
assert len(cases)==8, f"Expected eight independent synthetic cases; found {len(cases)}"
print(json.dumps({"classification":"SYNTHETIC_OFFLINE_UNIT_TESTS_ONLY","pass":len(cases),"total":len(cases),"tests":[{"name":c,"result":"PASS"} for c in cases]},ensure_ascii=False,indent=2))
