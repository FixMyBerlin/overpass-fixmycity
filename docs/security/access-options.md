# Access Model Options

## Evaluation Criteria

- Security strength
- Operational complexity
- Application compatibility
- Ongoing maintenance burden

## Option Comparison

| Option                                         | Security Strength | Ops Complexity | App Compatibility | Maintenance | Notes                                                               |
| ---------------------------------------------- | ----------------- | -------------- | ----------------- | ----------- | ------------------------------------------------------------------- |
| Publicly accessible endpoint + basic hardening | Medium            | Low            | High              | Low         | Public reachability with TLS, timeouts, monitoring, and rate-limit. |
| Traefik IP allowlist middleware                | Medium            | Low            | Medium            | Low         | Optional tighter perimeter for specific partner/internal use cases. |
| Private network/VPN                            | High              | Medium         | Medium            | Medium      | Strong boundary; requires network client setup.                     |
| mTLS between client and gateway                | High              | Medium-High    | Medium            | Medium-High | Strong identity, cert lifecycle overhead.                           |
| Token gateway in front of Overpass             | Medium-High       | High           | High              | High        | Flexible for app auth, adds custom service complexity.              |
| Cloud security groups/private LB               | High              | Medium         | Medium-High       | Medium      | Effective in cloud-native restricted deployments.                   |

## Recommended Default

1. Publicly accessible endpoint model for broad software compatibility.
2. Keep baseline safeguards enabled: TLS, proxy timeouts, monitoring, and `OVERPASS_RATE_LIMIT`.
3. Document FMC as the primary owner/consumer without applying FMC-only network restrictions.

## Optional Restricted Variant

Use `OVERPASS_ALLOWED_CIDRS` for CIDR-restricted deployments when a partner/internal perimeter is required.

## Related Guidance

- For an ingress-first versus Overpass-internal knob decision framework, see `docs/security/overpass-resource-policy-evaluation.md`.
- This deployment enables `OVERPASS_RATE_LIMIT` as a lightweight internal fairness guard while keeping other internal knobs unset.
