# Contributing to AniKehai

Thanks for helping out! This is the whole rulebook on one page.

## Ways to help

| You want to...             | Do this                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Report a bug               | Open a **Bug Report** issue with steps, screenshots and [logs](../docs/troubleshooting.md#how-to-turn-on-logs). |
| Request a site             | Open a **New Site Request** issue with the URL and the player's iframe domain.                                  |
| Add a site yourself        | Follow [Adding a site](../docs/adding-a-site.md).                                                               |
| Fix a bug or add a feature | Follow the workflow below. For big changes, open an issue first.                                                |
| Improve docs               | Edit `docs/` or `README.md`.                                                                                    |

> **Security problem?** Do not open a public issue. See [SECURITY.md](./SECURITY.md).

## Workflow

1. Fork, clone, and set up with [docs/development.md](../docs/development.md).
2. Branch from `main`: `feat/short-name` or `fix/short-name`.
3. Make one small, focused change. Add or update tests.
4. Run `bun run validate` (lint + typecheck + tests). Changed the build, manifest or UI flow? Also run `bun run test:e2e`.
5. Commit with [Conventional Commits](https://www.conventionalcommits.org/).
6. Open a PR into `main` and fill in the template. CI must be green.

## Rules

**Commits:** `type(optional-scope): short description`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. A hook rejects bad messages.

```
feat(scraper): add crunchyroll site strategy
fix: stop timer drifting after pausing
```

**Code**
- Biome formats and lints. Run `bun run lint:fix` instead of formatting by hand.
- TypeScript only. Avoid `any`; if you must, add a `// biome-ignore ...: reason`.
- Use `logger` from `src/shared/logger.ts`, not `console.log`.
- Site strategies return `null` for missing elements and never throw.
- Keep dependencies minimal. Discuss before adding one.

**Tests**
- Every test lives in `tests/`, mirroring `src/` (`src/core/state/playback.ts` is tested by `tests/core/state/playback.test.ts`). Keep `src/` free of test files.
- A bug fix needs a test that fails without the fix.
- A new site needs a fixture, a unit test, an E2E entry and a health entry.
- Coverage minimums: 80% lines/functions/statements, 70% branches.

**Never**
- Commit secrets, tokens or `.env` files (Gitleaks scans every PR).
- Log or expose `discord_token`, or add `host_permissions` for sites we do not support.
- Edit the `<!-- DOWNLOADS:START -->` block in the README (a bot rewrites it daily).
- Mix unrelated changes in one PR.

## Hooks and CI

Lefthook (`bunx lefthook install`) runs on your machine; CI runs the same checks again.

| When                     | What                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `git commit`             | Biome fix on staged files, typecheck, commit message check                         |
| `git push`               | Unit tests                                                                         |
| PR                       | `ci.yml`: lint, typecheck, tests with coverage, E2E, build (Chrome, Firefox, Edge) |
| PR touching Docker files | `docker.yml`: Dockerfile lint and the full suite in containers                     |
| PR and weekly            | `security.yml`: `bun audit` and Gitleaks                                           |

Please do not use `--no-verify`. CI will fail anyway.

## Releases (maintainers)

Bump `version` in `package.json` only (the build test checks the manifest matches). Push a tag `vX.Y.Z` that equals it, and `release.yml` builds the Chrome, Firefox and Edge zips and publishes the release.

Be kind in reviews. See the [Code of Conduct](./CODE_OF_CONDUCT.md).
