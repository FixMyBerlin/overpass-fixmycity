# Access Restriction Options

## Evaluation Criteria

- Security strength
- Operational complexity
- Application compatibility
- Ongoing maintenance burden

## Option Comparison

| Option | Security Strength | Ops Complexity | App Compatibility | Maintenance | Notes |
|---|---|---|---|---|---|
| Proxy IP allow-list | Medium | Low | Medium | Low | Fastest to adopt, but weak for mobile/dynamic client IPs. |
| Private network/VPN | High | Medium | Medium | Medium | Strong boundary; requires network client setup. |
| mTLS between client and gateway | High | Medium-High | Medium | Medium-High | Strong identity, cert lifecycle overhead. |
| Token gateway in front of Overpass | Medium-High | High | High | High | Flexible for app auth, adds custom service complexity. |
| Cloud security groups/private LB | High | Medium | Medium-High | Medium | Effective in cloud-native deployments. |

## Recommended Default

1. Private network/VPN for service boundary.
2. Proxy IP allow-list as immediate short-term hardening.

## Recommended Fallback

mTLS on reverse proxy if VPN rollout is not feasible for all consumers.
