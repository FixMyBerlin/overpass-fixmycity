# Access Restriction Options

## Evaluation Criteria

- Security strength
- Operational complexity
- Application compatibility
- Ongoing maintenance burden

## Option Comparison

| Option                             | Security Strength | Ops Complexity | App Compatibility | Maintenance | Notes                                                     |
| ---------------------------------- | ----------------- | -------------- | ----------------- | ----------- | --------------------------------------------------------- |
| Traefik IP allowlist middleware    | Medium            | Low            | Medium            | Low         | Fastest to adopt, but weak for mobile/dynamic client IPs. |
| Private network/VPN                | High              | Medium         | Medium            | Medium      | Strong boundary; requires network client setup.           |
| mTLS between client and gateway    | High              | Medium-High    | Medium            | Medium-High | Strong identity, cert lifecycle overhead.                 |
| Token gateway in front of Overpass | Medium-High       | High           | High              | High        | Flexible for app auth, adds custom service complexity.    |
| Cloud security groups/private LB   | High              | Medium         | Medium-High       | Medium      | Effective in cloud-native deployments.                    |

## Recommended Default

1. Private network/VPN for service boundary.
2. Traefik IP allowlist middleware as immediate short-term hardening.

## Recommended Fallback

mTLS at ingress if VPN rollout is not feasible for all consumers.

## Related Guidance

- For an ingress-first versus Overpass-internal knob decision framework, see `docs/security/overpass-resource-policy-evaluation.md`.
