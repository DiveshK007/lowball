# contract/

LOWBALL Compact contract sources. Compile with the pinned Compact toolchain:

```
compact compile hello-world.compact managed/hello-world
```

Build artifacts land in `managed/` (git-ignored — keys and generated JS live here).
The real LOWBALL circuits (`createDrop`, `placeBid`, `revealReserve`, `claimItem`) land in L1.
`hello-world.compact` is a smoke-test to verify the toolchain end-to-end.
