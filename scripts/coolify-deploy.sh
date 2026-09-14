#!/usr/bin/env sh
# Triggers a Coolify deployment and waits for it to reach a terminal state.
#
# Coolify answers the deploy webhook with 200 and a deployment_uuid the instant it
# queues the work, long before it builds anything. A job that stops at that 200
# reports success for a deployment that later fails, which is how production served
# #133 for fourteen hours under four green runs of this workflow.
set -eu

: "${COOLIFY_WEBHOOK_URL:?}"
: "${COOLIFY_WEBHOOK_TOKEN:?}"

poll_seconds=${COOLIFY_POLL_SECONDS:-10}
timeout_seconds=${COOLIFY_TIMEOUT_SECONDS:-1800}

# Every API route hangs off the webhook URL's own origin, so deriving the base beats
# a second secret that can go missing the way the first one did (#135).
scheme=${COOLIFY_WEBHOOK_URL%%://*}
host=${COOLIFY_WEBHOOK_URL#*://}
host=${host%%/*}
case "$scheme" in
  http | https) ;;
  *) echo "COOLIFY_WEBHOOK_URL is not an http(s) URL." >&2; exit 1 ;;
esac
[ -n "$host" ] || { echo "COOLIFY_WEBHOOK_URL has no host." >&2; exit 1; }
api_base="$scheme://$host"

auth="Authorization: Bearer $COOLIFY_WEBHOOK_TOKEN"

report_logs() {
  logs=$(printf '%s' "$1" | jq -r '.logs // empty' 2>/dev/null || true)
  if [ -z "$logs" ]; then
    echo "Coolify withheld the build log; the API token needs its \"read sensitive data\" permission." >&2
    return
  fi
  # `>&2` before `2>/dev/null`, or jq's stdout is redirected to the null fd 2 now
  # points at and the build log is swallowed at the one moment it is needed.
  printf '%s' "$logs" | jq -r 'map(.output) | join("\n")' >&2 2>/dev/null ||
    printf '%s\n' "$logs" >&2
}

# Coolify's /deploy route (routes/api.php) routes GET to a "use POST instead" handler,
# so only POST triggers a real deployment, despite what some of its own docs show.
trigger=$(curl --fail --show-error --silent --max-time 30 \
  --request POST "$COOLIFY_WEBHOOK_URL" --header "$auth")
echo "Coolify accepted the trigger: $trigger"

# On "Deployment already queued for this commit" Coolify returns the uuid of the
# deployment it deduplicated against, and bootstrap/helpers/applications.php only ever
# matches one that is still queued or in progress. So this is never a stale success.
deployment_uuid=$(printf '%s' "$trigger" | jq -er '.deployments[0].deployment_uuid')

body=$(mktemp)
trap 'rm -f "$body"' EXIT

deadline=$(( $(date +%s) + timeout_seconds ))
while :; do
  http_code=$(curl --silent --max-time 30 --output "$body" --write-out '%{http_code}' \
    "$api_base/api/v1/deployments/$deployment_uuid" --header "$auth" 2>/dev/null) || http_code=000
  deployment=$(cat "$body")
  status=''

  case "$http_code" in
    200) status=$(printf '%s' "$deployment" | jq -r '.status // empty' 2>/dev/null || true) ;;
    401 | 403)
      # Sanctum answers 401 for a token that lacks the ability, so this never
      # recovers. Retrying to the deadline only buries which permission is missing.
      echo "Coolify refused to report deployment $deployment_uuid (HTTP $http_code)." >&2
      echo "COOLIFY_WEBHOOK_TOKEN can deploy but not read. Add Coolify's \"read\" ability to it, and \"read:sensitive\" for build logs." >&2
      exit 1
      ;;
  esac

  case "$status" in
    finished)
      echo "Deployment $deployment_uuid finished."
      exit 0
      ;;
    failed | cancelled-by-user)
      echo "Deployment $deployment_uuid ended as $status." >&2
      report_logs "$deployment"
      exit 1
      ;;
    # An empty status is a poll that did not land, not a deployment that failed;
    # Coolify reloads its own proxy mid-deploy. The deadline still bounds the wait.
    '' | queued | in_progress) ;;
    *)
      echo "Deployment $deployment_uuid reported an unrecognised status: $status" >&2
      exit 1
      ;;
  esac

  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Deployment $deployment_uuid reached no terminal status in ${timeout_seconds}s (last HTTP $http_code, status ${status:-none})." >&2
    report_logs "$deployment"
    exit 1
  fi
  sleep "$poll_seconds"
done
