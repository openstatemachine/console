# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

Security fixes are applied to the latest release on the `main` branch.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately via [GitHub Security Advisories](https://github.com/fearlessfara/open-state-machine/security/advisories/new) (preferred) or by contacting the maintainers through a private channel if you already have one.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected version(s)
- Any suggested fix, if you have one

We aim to acknowledge reports within a few business days and will coordinate disclosure timing with you.

## Production deployment notes

Statum is a workflow engine with optional API key auth and an admin setup wizard. When exposing an instance to a network:

- Complete admin setup before use (`statum.security` / setup gate).
- Set a strong `statum.security.api-key` for programmatic access.
- Do not expose Postgres or actuator endpoints publicly without authentication.
- Change default Compose credentials (`statum` / `statum`) for any non-local deployment.
- Run behind a reverse proxy with TLS; the console proxies `/api` to the engine.

These are operational recommendations, not a substitute for your own threat model review.
