## Description

<!-- What does this PR change, and why? Keep it short. -->

Closes #<!-- issue number, or delete this line -->

## Type of change

<!-- Mark one with "x". -->
- [ ] Bug fix
- [ ] New feature or new site
- [ ] Refactor (no behavior change)
- [ ] Docs
- [ ] Tests only

## Checklist

- [ ] `bun run validate` passes
- [ ] Tests added or updated
- [ ] Docs updated if setup or behavior changed
- [ ] Tried it in a browser (for behavior changes)

### Only for new sites

- [ ] Strategy in `src/scraper/sites/` and registered in `index.ts`
- [ ] Fixture `tests/fixtures/<site>/watch.html.fixture` and unit test `tests/scraper/sites/<site>.test.ts`
- [ ] Entries in `tests/e2e/content-script.spec.ts` and `tests/health/live-dom.spec.ts`
- [ ] Site count updated in `tests/scraper/sites/index.test.ts`

## Screenshots

<!-- For new sites or presence changes, add a screenshot of your Discord status. -->
