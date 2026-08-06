#!/usr/bin/env bash
# Orbit 360 reusable signal-safe finalization helpers.
# The caller must define rollback_if_needed() and persist().

ORBIT360_SIGNAL_HANDLED="${ORBIT360_SIGNAL_HANDLED:-0}"
ORBIT360_EXIT_GUARD_DONE="${ORBIT360_EXIT_GUARD_DONE:-0}"
ORBIT360_RECEIVED_SIGNAL="${ORBIT360_RECEIVED_SIGNAL:-}"

orbit360_signal_exit_code() {
  case "${1:-TERM}" in
    INT) printf '130' ;;
    HUP) printf '129' ;;
    *) printf '143' ;;
  esac
}

orbit360_call_if_defined() {
  local fn="$1"
  shift || true
  if declare -F "$fn" >/dev/null 2>&1; then
    "$fn" "$@"
  fi
}

orbit360_finalize_failure_once() {
  if [[ "${ORBIT360_EXIT_GUARD_DONE:-0}" == '1' ]]; then
    return 0
  fi
  ORBIT360_EXIT_GUARD_DONE=1
  export ORBIT360_EXIT_GUARD_DONE
  orbit360_call_if_defined rollback_if_needed || true
  orbit360_call_if_defined persist || true
}

orbit360_handle_signal() {
  local signal="${1:-TERM}"
  local code
  code="$(orbit360_signal_exit_code "$signal")"
  if [[ "${ORBIT360_SIGNAL_HANDLED:-0}" == '1' ]]; then
    exit "$code"
  fi
  ORBIT360_SIGNAL_HANDLED=1
  ORBIT360_RECEIVED_SIGNAL="$signal"
  export ORBIT360_SIGNAL_HANDLED ORBIT360_RECEIVED_SIGNAL
  trap - TERM INT HUP EXIT
  orbit360_call_if_defined orbit360_before_signal_stop "$signal" || true
  orbit360_finalize_failure_once
  exit "$code"
}

orbit360_handle_exit() {
  local code=$?
  trap - EXIT
  if [[ "$code" -ne 0 && "${ORBIT360_SIGNAL_HANDLED:-0}" != '1' ]]; then
    orbit360_call_if_defined orbit360_before_abnormal_exit "$code" || true
    orbit360_finalize_failure_once
  fi
  exit "$code"
}

orbit360_install_signal_traps() {
  trap 'orbit360_handle_signal TERM' TERM
  trap 'orbit360_handle_signal INT' INT
  trap 'orbit360_handle_signal HUP' HUP
  trap 'orbit360_handle_exit' EXIT
}
