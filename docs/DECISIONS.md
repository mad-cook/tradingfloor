> Historical design document. This records an earlier development stage and includes superseded plans. For shipped behavior, see [implementation status](LAUNCH_PLAN.md) and the [public README](../README.md).

# Build decisions

- Preflight executed before application work; results are in reports/preflight-report.json. M0 has not passed. No live orders or purchases were attempted.
- Proceed with independently testable development while credential-dependent gates remain blocked. Do not portray demo fixtures as a validated trading universe.
- The original Mirror companion document was not attached. Shared packages are isolated for later reuse.
- Use the requested Next.js / R3F stack and a separate long-running worker. Keep this full-stack development checkout local until deployment connections are configured.
- Original Blender-generated rig, room, props and animations replace any third-party characters. Reference image is visual inspiration only.
- Demo uses accelerated deterministic market fixtures and deterministic analyst/boss decisions. Market adapters and strict model adapter are separate. No live signer is included in the initial build.

