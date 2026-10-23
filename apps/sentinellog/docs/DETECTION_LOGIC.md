# Detection logic and its limitations

Every rule compares **parsed events inside one imported dataset**. A rule match
creates a finding classified `suspicious-pattern`. It is never presented as a
confirmed security incident — analyst conclusions are recorded separately in
the finding's notes and status.

## Rule types

| Rule | Comparison | Finding when | Limitations |
| --- | --- | --- | --- |
| `repeated_failures` | Groups `auth_failure` events by (username, source IP), walks them in a sliding window | `threshold` failures occur within `window_minutes` | Mixed success/failure interleaving is ignored; a distributed attack across many IPs per account is split across groups |
| `multi_account_spray` | Groups `auth_failure` events by source IP, counts distinct usernames in a sliding window | `threshold` distinct accounts are targeted within `window_minutes` | Shared egress IPs (VPN/NAT/proxies/campus gateways) routinely trigger this — the finding says so |
| `success_after_failures` | For each `auth_success`, counts same-username failures before it in the window | `threshold` failures precede the success | A user recovering a forgotten password looks identical to an attacker succeeding. The explanation states both readings |
| `error_spike` | Counts `event_type == error` in a sliding window | `threshold` errors within `window_minutes` | Application faults (not security activity) commonly trigger this; severity defaults to `low` |

## Event classification

- Auth-log lines matching `Failed password …` / `Invalid user …` → `auth_failure`
- `Accepted password|publickey …` → `auth_success`
- Messages containing `error|exception|critical` → `error`
- Everything else → `info`
- CSV files map columns flexibly (timestamp/time/ts, user/username, ip/src, …);
  rows without a recognised event type fall back to message classification.

## What the engine does **not** do

- No anomaly machine-learning, no reputation feeds, no external threat intel.
- No cross-dataset correlation (each analysis run is one dataset).
- No verdicts: the engine never labels activity "malicious", "attack" or
  "confirmed". Repeated-failure findings can be a user mistyping a password;
  spray findings can be a shared NAT; error spikes can be a bad deploy.

## Reproducibility

Rules are stored rows (type, threshold, window, severity, description,
runbook). Each finding stores the matching event IDs, first/last seen times and
sample messages, so any detection can be re-derived from the stored dataset.
