# Contributing to Statum Console

Thank you for your interest in contributing.

## Getting started

**Requirements:** Node.js 20+, and a running Statum engine ([engine repository](https://github.com/openstatemachine/engine)).

```bash
git clone https://github.com/openstatemachine/console.git
cd console/frontend && npm install && npm run dev
```

Run the engine separately (`mvn -pl statum-engine spring-boot:run` in the engine repo). The Vite dev server proxies `/api` to `http://localhost:8080`.

## Pull requests

1. Open an issue for large changes when possible.
2. Keep PRs focused; avoid unrelated refactors.
3. Ensure `cd frontend && npm run build` passes.
4. Graph/diagram changes usually belong in `shared/` (`@osml/graph-kit`).

## Shared package

The console depends on `shared/` via `file:../shared`. When changing graph types, layout, or node components, edit `shared/src/` and verify both `frontend` and `site` if applicable.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
