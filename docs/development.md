# Development notes

[← clinguini](../README.md)

## Development

```sh
bun install --frozen-lockfile
bun run build
bun run check
bun run test
bun run test:coverage
bun run lint
bun run format
```

Prettier and ESLint follow the shared agent-tests configuration, without its
Svelte-specific plugins. These tools are development dependencies only.

Tests cover command routing, scoped flags, defaults, params, conversions, factory behavior
and the package's runtime/type export boundaries. Schema fixtures in `tests/schemas.ts`
model bref-ui's CLI at `7096f75` and agent-tests' documented commands at `5e5d90c`.
The agent-tests executable is currently a Hello World stub, so its fixture checks the
documented schema rather than an implemented CLI.

Package tests build and install a tarball offline, exercise the public API with plain Node,
and typecheck a separate TypeScript consumer. To also compile and exercise Bref's real
handlers from a local checkout, run:

```sh
BREF_UI_DIR=/path/to/bref-ui bun run test
```

The Bref integration copies its checkout into a temporary workspace, runs its original
CLI suite unchanged, replaces the executable entry point with clinguini, then reruns the
same suite through Bref's normal packaging and npm/npx fixtures. The suite and its fixture
are checked byte-for-byte against the originals. Their npm install step may use the registry.

Additional checks compare both executables' stdout, stderr, exit status and project files,
including installation, cancellation and overwrite decisions. An argument matrix checks
command/help placement, extra arguments, separators and invalid IDs. The replacement's
old parser is disabled to ensure clinguini performs argument parsing.

The replacement retains Bref's help, error text, exit codes and strict argument rules.
Application-specific validation stays in the adapter; clinguini's generic defaults are unchanged.

## Publishing

`npm pack` and `npm publish` compile TypeScript into `dist/` through `prepack`.
Only compiled JavaScript, declarations and package documentation are shipped.
Consumers need Node.js 22+ and no TypeScript loader or runtime dependencies.
`npm pack --dry-run` builds and previews the package contents.

First publish and configure GitHub Actions trust (npm 11.15+ and account 2FA required):

```sh
npm login
npm publish --access public
npm trust github clinguini --repo feuersteiner/clinguini --file publish.yml --allow-publish
npm trust list clinguini
```

The package must exist on npm before trust can be configured. See
[npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

After setup, bump `version` in `package.json` and push to `main`.
`.github/workflows/publish.yml` checks and publishes directly using OIDC
and provenance, then creates a `clinguini@<version>` GitHub release, like bref-ui.
Manual dispatch is also available; npm rejects already-published versions.
