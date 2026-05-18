# ČSÚ fixtures

Synthetic CSVs modelled on ČSÚ Open Data downloads — Czech-locale
semicolons + decimal commas + UTF-8 with BOM. They pin the spec
contract; they are **not** snapshots of any real publication.

Two things still need live verification before this connector goes
to production:

1. **URLs in `src/csu/specs.ts`** — ČSÚ does not maintain a single
   machine-readable index of dataset URLs. The placeholders there
   are modelled on the `apl.czso.cz/pll/eutab` and `data.gov.cz`
   patterns; cross-check each against a real download.

2. **Column names** — the CSV header rows used here (`Období`,
   `Hodnota`) are typical but ČSÚ varies them per dataset.

Live capture recipe (one polite request per indicator):

```bash
INDICATOR=cz.macro.cpi_yoy_index
URL="$(node -e "
  const { getCsuSpec } = require('./packages/connectors-cz/src/csu/specs.ts');
  console.log(getCsuSpec('${INDICATOR}').url);
")"
curl -sSL \
  -H "User-Agent: ${CSU_USER_AGENT:-IndustrySignal-Bot/1.0}" \
  "${URL}" \
  > packages/connectors-cz/test/fixtures/csu/${INDICATOR}.csv
```

Then update the spec's `columns.period` / `columns.value` selectors
to match the real header, and rerun `pnpm test`.
