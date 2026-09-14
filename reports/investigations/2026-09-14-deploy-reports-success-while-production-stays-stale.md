# Investigation Report

Date: 2026-09-14

Author: Mykola Blonskyi

Issue: production stuck on `90104f3` while CI reported every deploy as successful

---

## Problem Description

`todo.blonskyi.dev` has served the image built from `90104f3` since 2026-09-13 21:04. Six
deployments and four green runs of `.github/workflows/ci.yml` have claimed otherwise since. The
site is healthy throughout, which is why the staleness went unnoticed rather than showing up as an
outage.

---

## Symptoms

- `docker ps` on the VPS shows `frontend-8mmctncio636ztnyyf32b1nm` and its backend running
  `…_frontend:90104f31c79753f9d6b795f5b39e13b41e35f4da`, started 2026-09-13T21:04:38Z.
- `/data/coolify/applications/8mmctncio636ztnyyf32b1nm/README.md` reads
  `Latest Deployment Date: 2026-09-13 21:34:53`.
- No image has been built for this application since. `docker images` holds exactly one tag per
  service, both at `90104f31…`.
- The `deploy` job is green on every run, in 3–4 seconds, reporting
  `{"deployments":[{"message":"…deployment queued.","deployment_uuid":"…"}]}`.
- `/api/health` returns 200 and the app works, on the old code.

---

## Root Cause Analysis

### Root cause 1 — the frontend image stopped building

`application_deployment_queues`, joined to the application, gives the whole history:

```
xbamgmsixlsxj2o9zdxtpfx2|cancelled-by-user|HEAD    |2026-09-14 11:10:57|2026-09-14 11:20:06
jg0pjei8ok7orh1fsjsbyybl|cancelled-by-user|HEAD    |2026-09-14 11:05:11|2026-09-14 11:05:23
g5q95cnpmbxz3ygd2hpk4xqm|cancelled-by-user|HEAD    |2026-09-14 10:59:17|2026-09-14 11:01:24
mxwuss9f1qq6ndi9rurs19sm|cancelled-by-user|HEAD    |2026-09-14 10:25:22|2026-09-14 10:59:14
yuja1omisap7qdknfakqvpzo|cancelled-by-user|HEAD    |2026-09-13 23:10:18|2026-09-14 08:01:18
7mgngmvfwmja2kjwm1b1nkoi|cancelled-by-user|cd435da1|2026-09-13 21:31:49|2026-09-13 23:08:46
olhigawudikgozupccuyxfrg|finished         |90104f31|2026-09-13 20:51:00|2026-09-13 21:04:41
```

The first failure, `7mgngmvfwmja2kjwm1b1nkoi` for `cd435da1` (PR #134), has a real build log:

```
45 | >>> RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
target frontend: failed to solve: process "/bin/sh -c pnpm install --frozen-lockfile"
  did not complete successfully: exit code: 1
```

This no longer reproduces. Running the same step against `origin/main` in a clean `node:22-slim`
container, from `git archive` so the tree matches the Docker build context exactly, completes with
`Done in 57.9s using pnpm v11.12.0` and exit 0. The lockfile is in sync.

### Root cause 2 — every later deployment stalled before starting a build

The five deployments after it record `commit` as the literal string `HEAD` rather than a SHA, and
their only log line is:

```
Helper container not yet started. Deployment will be cancelled when job checks status.
```

That string is written by `app/Livewire/Project/Application/DeploymentNavbar.php:143`, the Cancel
button in Coolify's own UI. So `cancelled-by-user` is literal: these deployments hung without ever
starting a build container, and were cancelled by hand. One of them, `yuja1omisap7qdknfakqvpzo`,
sat for eight hours and fifty-one minutes first.

Coolify's queue worker explains the hang. Since 2026-09-13 20:00, `storage/logs/laravel.log` has
carried a steady ~1,774 errors per hour, unbroken, all of them:

```
production.ERROR: Trying to access array offset on null
  at vendor/laravel/horizon/src/JobPayload.php:49
```

The stack is `Worker::getNextJob` → `RedisQueue::pop` → `migrateExpiredJobs` →
`MarkJobsAsMigrated::handle` → `RedisJobRepository::migrated` → `JobPayload::id`. Line 49 is
`return $this->decoded['uuid'] ?? $this->decoded['id'];`, and `decoded` is
`json_decode($value, true)`, so the throw means a payload being migrated did not decode. The
exception aborts the `pop`, which is how a queued `ApplicationDeploymentJob` never reaches a worker.
The onset at 20:00 on 2026-09-13 sits immediately before the last successful deployment at 21:04.

Consistent with that, `coolify_database_queues:high:reserved` holds 394 entries and
`:default:reserved` 30, with `retry_after` scores running out to 2026-09-15 11:11 — a backlog of
jobs reserved by a worker and never acknowledged.

### Root cause 3 — CI could not see any of it

`.github/workflows/ci.yml`'s `deploy` job asserted only that the webhook answered HTTP 200. Coolify
answers 200 the moment it *queues* work, so the job was green for all six failures. Four prior
commits (`0c0c37c`, `524c6f6`, `82690f4`, `ce2cdf2`) each improved the trigger. None checked the
outcome.

### Not the cause

The host hit `ENOSPC` at 11:15–11:16 on 2026-09-14, which put Coolify's Redis into `MISCONF`
read-only and produced a burst of secondary errors. This is a second, later fault: it starts
fifteen hours after the deployments began failing, and free space sampled every 15s over the
following ten minutes stayed between 8.0 GB and 10.9 GB. Worth fixing, but it did not cause this.

---

## Impact

Affected systems: `todo.blonskyi.dev` production, both services.

Affected users: all. Everything merged to `main` after `90104f3` has been absent from production
since 2026-09-13 21:04, including the boot-time environment validation, the `AUTH_URL` default and
the recurrence-bounds fix.

Business impact: no outage. The app stayed healthy on old code, which is the reason this ran for
fourteen hours undetected.

---

## Resolution

Root cause 3 is fixed in `scripts/coolify-deploy.sh`. The `deploy` job now polls
`/api/v1/deployments/{uuid}` until the status is terminal, fails on `failed` and
`cancelled-by-user`, and prints the build log. `deploy-script` runs it against a fake Coolify on
every push and gates `deploy`.

Root cause 1 is no longer reproducible. Root cause 2 is unresolved and lives on the VPS, not in
this repo.

---

## Prevention

The deploy job is now the detector this incident needed. Any future recurrence of root cause 2
turns `deploy` red within the 1800s deadline instead of green in four seconds.

---

## Follow-up Tasks

- [ ] Clear Coolify's Horizon queue backlog and restart the worker, then confirm
      `JobPayload.php:49` stops firing in `storage/logs/laravel.log`.
- [ ] Re-trigger a deployment of current `main` and confirm a new image tag appears in
      `docker images` and the containers restart.
- [ ] Give the `COOLIFY_WEBHOOK_TOKEN` Coolify's "read sensitive data" permission, or the new
      deploy job reports a failure without the build log that explains it.
- [ ] Reclaim disk on the VPS. Docker holds 14.6 GB of images (3.2 GB reclaimable) and 4.3 GB of
      build cache on a 38 GB disk, which is what tipped into `ENOSPC`.
