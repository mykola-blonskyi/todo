#!/usr/bin/env sh
# Counts what still calls the hub's HTTP API, the one dependency ADR-016 did not remove.
#
# "Caller" means backend code that invokes the hub over HTTP. The frontend's HUB_URL is
# deliberately excluded: it only builds a breadcrumb hyperlink back to blonskyi.dev and is
# not a request this app makes. A plain `grep HUB_URL` reports it and is wrong.
set -eu

cd "$(git rev-parse --show-toplevel)"

# Both entry points count. requireProjectMember is the Rule 4 check inside the invite
# path; it calls searchProjectMembers internally, so matching only the latter would
# report a shrinking dependency while it was in fact growing.
callers=$(grep -rnE '\.(searchProjectMembers|requireProjectMember)\(' --include='*.ts' backend/src \
  | grep -v '^backend/src/hub/' || true)
count=$(printf '%s' "$callers" | grep -c . || true)

echo "hub API callers: $count"
if [ "$count" -gt 0 ]; then
  printf '%s\n' "$callers" | sed 's/^/  /'
  echo
  echo "supporting surface, deleted with the last caller:"
  grep -rn 'HubClientService\|HubSessionCookie\|HubModule' --include='*.ts' backend/src \
    | grep -v '^[^:]*:[0-9]*: *\(//\|\*\)' \
    | cut -d: -f1 | sort -u | sed 's/^/  /'
  echo
  echo "Blocked: ADR-016 kept these deliberately. login has no directory/search endpoint to"
  echo "replace the hub's ADR-009 /api/auth/project-members. See docs/TODO.md."
fi
