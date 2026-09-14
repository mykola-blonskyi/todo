#!/usr/bin/env sh
# Proves scripts/coolify-deploy.sh fails when the deployment fails.
#
# The bug this guards was never in the trigger, which four fixes in a row got right.
# It was that a failed deployment still exited 0, so only an assertion on the exit
# code of a *failing* deployment can keep it closed.
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"

port=${COOLIFY_FAKE_PORT:-8977}
tmp=$(mktemp -d)
server_pid=''
trap 'kill "$server_pid" 2>/dev/null || true; rm -rf "$tmp"' EXIT

python3 scripts/coolify-fake.py "$port" &
server_pid=$!

until curl --silent --fail --max-time 1 "http://127.0.0.1:$port/ready" >/dev/null 2>&1; do
  kill -0 "$server_pid" 2>/dev/null || { echo "fake Coolify died before it served anything"; exit 1; }
  sleep 0.1
done

failures=0

fail() {
  echo "FAIL $1"
  sed 's/^/       /' "$tmp/$2.out"
  failures=$((failures + 1))
}

run_case() {
  name=$1
  expected=$2
  COOLIFY_WEBHOOK_URL="http://127.0.0.1:$port/api/v1/deploy?uuid=app-1&case=$name" \
  COOLIFY_WEBHOOK_TOKEN=test-token \
  COOLIFY_POLL_SECONDS=0.1 \
  COOLIFY_TIMEOUT_SECONDS=${3:-30} \
    sh scripts/coolify-deploy.sh >"$tmp/$name.out" 2>&1 && actual=0 || actual=$?

  if [ "$actual" -eq "$expected" ]; then
    echo "ok   $name (exit $actual)"
  else
    fail "$name (exit $actual, wanted $expected)" "$name"
  fi
}

expect_output() {
  if grep -q "$2" "$tmp/$1.out"; then
    echo "ok   $1 reports \"$2\""
  else
    fail "$1 never reported \"$2\"" "$1"
  fi
}

run_case finished 0
run_case failed 1
run_case cancelled 1
run_case unknown_status 1
run_case no_uuid 1
run_case flaky 0
run_case never_settles 1 1

# The exit code alone passed while the build log was being swallowed by a redirection
# order bug, which is the whole reason a failed deploy is worth turning red.
expect_output failed 'no space left on device'
expect_output never_settles 'was still'

[ "$failures" -eq 0 ] || { echo "$failures case(s) failed"; exit 1; }
echo "all cases passed"
