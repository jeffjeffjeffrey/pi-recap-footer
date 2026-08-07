# tools

`ask-stamp.py` is the original python implementation the TypeScript port
replaced. It is kept for provenance only — nothing loads it at runtime.

`test/fixture.json` is generated from it, and the test suite asserts the TS
catalog and the sha256 theme selection still match it byte for byte. Regenerate
after any catalog change:

```bash
python3 tools/gen-fixture.py    # see git history for the generator
```
