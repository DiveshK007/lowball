# ops/

House-side CLI for LOWBALL. See `docs/architecture.md` §6.

```
npm install
npm run build
node dist/index.js --help
```

The CLI's vault (`ops/vault/`) stores reserve preimages and house key material.
**Never commit the vault** — `.gitignore` excludes `ops/vault*`.
