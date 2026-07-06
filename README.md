# Statum Console

Web UI for the [Open State Machine](https://openstatemachine.org) project: author OSML workflows visually, inspect executions, and use the step debugger.

> The **Statum engine** (headless API) lives in [**openstatemachine/engine**](https://github.com/openstatemachine/engine). This repository contains the React console (`frontend/`), the shared graph package (`shared/`), and the marketing site (`site/`).

## Architecture

| Component | Path | Role |
|-----------|------|------|
| Console | `frontend/` | React + Vite SPA (machine editor, executions, debugger) |
| Graph kit | `shared/` | `@osml/graph-kit` — OSML graph model, ELK layout, React Flow nodes |
| Site | `site/` | Astro marketing site for openstatemachine.org |

The console is always a **separate artifact** from the engine jar. In production, nginx serves the SPA and proxies `/api` to the engine.

## Requirements

- Node.js 20+
- A running Statum engine ([engine repo](https://github.com/openstatemachine/engine))

## Local development

Terminal 1 — engine (from the engine repository):

```bash
mvn -pl statum-engine spring-boot:run
```

Terminal 2 — console:

```bash
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://localhost:8080`.

On first visit, complete the **setup wizard** to create the admin account. Optionally set an API key in **Settings** when the engine has `statum.security.api-key` configured.

### Shared graph package

OSML graph code lives in `shared/` and is linked from the console via `file:../shared`. Edit `shared/src/` and both the console and site pick up changes.

## Build

```bash
cd frontend && npm run build
```

### Docker image

Build from this repository root (the Dockerfile needs the sibling `shared/` directory):

```bash
docker build -f frontend/Dockerfile -t statum-console .
```

Run with an engine upstream:

```bash
STATUM_API_UPSTREAM=http://host.docker.internal:8080 docker compose up --build
```

Or with `docker run`:

```bash
docker run -p 9000:9000 -e STATUM_API_UPSTREAM=http://host.docker.internal:8080 statum-console
```

## Site

```bash
cd site && npm install && npm run dev
```

## CI

`npm run build` in `frontend/` on every push/PR (see `.github/workflows/ci.yml`).

## Related repositories

| Repository | Description |
|------------|-------------|
| [openstatemachine/engine](https://github.com/openstatemachine/engine) | Statum runtime, OSML language module, REST API |
| [openstatemachine.org](https://openstatemachine.org) | Project site |

## License

Apache License 2.0. See [LICENSE](LICENSE).

## Community

- [Security policy](SECURITY.md)
