#!/usr/bin/env bash
set -uo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
TRANSPORT_BRANCH='ays/dispatch-visual-v2-pr-20260805'
WORKFLOW_FILE='.github/workflows/orbit360-dispatch-visual-observable-rootfix-v2-once-v20260805.yml'
REGISTRATION='orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-gate-registration-sanitized-v20260805.json'
PREFLIGHT='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json'
FINAL='orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-final-sanitized-v20260805.json'
LIFECYCLE='tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json'
CLOSURE='orbit360-platform/docs/CIERRE-VISUAL-OBSERVABLE-ROOTFIX-V2-LAB-20260805.md'
STATE_TAR="${RUNNER_TEMP:-/tmp}/orbit360-visual-v2-pr-preflight-state.tar"

emit() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "$1" "$2" >> "$GITHUB_OUTPUT"
  fi
}

fail_transport() {
  emit go false
  emit normalized false
  emit checkpoint "$1"
  exit 41
}

[[ "${GITHUB_EVENT_NAME:-}" == 'pull_request' ]] || fail_transport 'PR_TRANSPORT_EVENT_INVALID'
[[ "${ORBIT360_PR_BASE_REF:-}" == "$BRANCH" ]] || fail_transport 'PR_TRANSPORT_BASE_INVALID'
[[ "${ORBIT360_PR_HEAD_REF:-}" == "$TRANSPORT_BRANCH" ]] || fail_transport 'PR_TRANSPORT_HEAD_INVALID'
[[ -n "${ORBIT360_PR_HEAD_SHA:-}" ]] || fail_transport 'PR_TRANSPORT_HEAD_SHA_MISSING'
[[ "$(git rev-parse HEAD)" == "$ORBIT360_PR_HEAD_SHA" ]] || fail_transport 'PR_TRANSPORT_CHECKOUT_MISMATCH'
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || fail_transport 'PR_TRANSPORT_REPLAY_ATTEMPT'

mapfile -t CHANGED < <(git diff-tree --no-commit-id --name-only -r HEAD)
[[ "${#CHANGED[@]}" == '1' && "${CHANGED[0]}" == "$WORKFLOW_FILE" ]] || fail_transport 'PR_TRANSPORT_COMMIT_NOT_EXCLUSIVE_WORKFLOW'

chmod +x tools/orbit360-preflight-visual-observable-rootfix-v2-once-v20260805.sh
set +e
GITHUB_REF_NAME="$BRANCH" tools/orbit360-preflight-visual-observable-rootfix-v2-once-v20260805.sh
PREFLIGHT_RC=$?
set -e

FILES=(
  tools/orbit360-validar-gate-contracts-v20260717.mjs
  "$REGISTRATION"
  "$PREFLIGHT"
  "$FINAL"
  "$LIFECYCLE"
  "$CLOSURE"
)
PRESENT=()
for file in "${FILES[@]}"; do
  [[ -f "$file" ]] && PRESENT+=("$file")
done
[[ "${#PRESENT[@]}" -gt 0 ]] || fail_transport 'PR_TRANSPORT_STATE_EMPTY'
tar -cf "$STATE_TAR" "${PRESENT[@]}"

git fetch origin "$BRANCH"
git reset --hard
git checkout --detach "origin/$BRANCH"
tar -xf "$STATE_TAR"
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/$BRANCH)" ]] || fail_transport 'PR_TRANSPORT_BASE_CHECKOUT_MISMATCH'
git diff --check || fail_transport 'PR_TRANSPORT_STATE_DIFF_INVALID'

if [[ "$PREFLIGHT_RC" -ne 0 ]]; then
  git config user.name orbit360-gate-bot
  git config user.email orbit360-gate-bot@users.noreply.github.com
  git add tools/orbit360-validar-gate-contracts-v20260717.mjs "$REGISTRATION" "$PREFLIGHT" "$FINAL" "$LIFECYCLE" "$CLOSURE" 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m 'runtime: persist visual v2 PR preflight stop [skip ci]' || true
    git push origin "HEAD:$BRANCH" || true
  fi
  emit go false
  emit normalized true
  emit checkpoint 'PREFLIGHT_STOP_RETRY'
  exit 41
fi

jq -e '.status=="PASS_GATE_REGISTRATION" and .contractVersion=="2.7.5" and .failed==0 and .ok==true and .secretsRead==false and .firestoreRead==false and .browserExecuted==false and .deployExecuted==false' "$REGISTRATION" >/dev/null || fail_transport 'PR_TRANSPORT_REGISTRATION_NOT_PASS'
jq -e '.status=="GO_GATE_CONTRACT" and .contractVersion=="2.7.5" and .failed==0 and .ok==true and .secretAccess==false and .dataAccess==false and .runtimeExecuted==false and .browserExecuted==false and .deployExecuted==false and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0' "$PREFLIGHT" >/dev/null || fail_transport 'PR_TRANSPORT_GO_GATE_CONTRACT_NOT_PASS'

emit go true
emit normalized true
emit checkpoint 'GO_GATE_CONTRACT'
printf '%s\n' 'PR_TRANSPORT_READY: GO_GATE_CONTRACT verified on clean mandatory branch checkout.'
