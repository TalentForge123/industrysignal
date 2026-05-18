# Justice.cz fixtures

The HTML files in this directory are **synthetic** — hand-crafted to
mirror the published or.justice.cz markup as documented at the time
of writing (Sprint 2). They exercise the parser's selectors against
the layout we expect, but they are **not** a snapshot of any real
company.

Before relying on this connector in production, do one live capture
per page type — search results, PLATNY detail, Sbírka listin — and
diff against these fixtures. justice.cz revises markup occasionally;
the parser is written defensively but real-world variance is the only
true regression test.

To capture a live fixture (one request, polite UA):

```bash
curl -sSL \
  -H "User-Agent: ${ARES_USER_AGENT}" \
  -H "Accept: text/html" \
  "https://or.justice.cz/ias/ui/rejstrik-\$firma?ico=00177041" \
  > test/fixtures/justice/search-00177041.html
```

Save under a name that hints at provenance (ICO + date) and keep
synthetic fixtures around — they pin the parser contract independent
of upstream drift.
