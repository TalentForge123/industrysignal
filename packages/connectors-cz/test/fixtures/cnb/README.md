# ČNB fixtures

Synthetic but format-faithful samples of the daily FX fixing feed
(`denni_kurz.txt`). The rates are hand-picked plausible mid-2026
numbers, not real historical fixings.

Live capture (one polite request):

```bash
curl -sSL \
  -H "User-Agent: ${CNB_USER_AGENT:-IndustrySignal-Bot/1.0}" \
  "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt?date=15.05.2026" \
  > test/fixtures/cnb/daily-fx-2026-05-15.txt
```

The feed is ~1.5 KB and updates once per business day around 14:30
Prague time. Replay-safe (same date returns identical bytes), so
fixtures pin the parser contract without upstream drift surprise.
