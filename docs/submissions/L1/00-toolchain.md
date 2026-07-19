# LOWBALL — P0 bootstrap toolchain evidence
Captured: 2026-07-19T16:30:05Z

## Node / npm (after `nvm use` — pinned by .nvmrc)
```
v22.18.0
10.9.3
```

## Compact compiler
```
compact 0.5.1
compact compile --version → 0.31.1
```

## Compile hello-world.compact
```
Compiling 1 circuits:

artifacts:
contract/managed/hello-world/contract/index.js
contract/managed/hello-world/contract/index.js.map
contract/managed/hello-world/contract/index.d.ts
contract/managed/hello-world/zkir/storeMessage.bzkir
contract/managed/hello-world/zkir/storeMessage.zkir
contract/managed/hello-world/keys/storeMessage.verifier
contract/managed/hello-world/keys/storeMessage.prover
contract/managed/hello-world/compiler/contract-info.json
```

## Proof server (Docker)
```
NAMES                  IMAGE                               STATUS         PORTS
lowball-proof-server   midnightntwrk/proof-server:latest   Up 9 minutes   0.0.0.0:6300->6300/tcp, [::]:6300->6300/tcp

smoke: HTTP 200 at http://localhost:6300/
```
