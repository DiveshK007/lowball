#!/usr/bin/env node
// LOWBALL house-ops CLI. See docs/architecture.md §6.
// Commands (implemented per level): create-drop, close-and-reveal, status, calendar.
// House keys and reserve preimages live in ./vault/ (git-ignored) — never in web/.

const [cmd] = process.argv.slice(2);

switch (cmd) {
  case undefined:
  case "--help":
  case "-h":
    console.log(
      [
        "lowball — house-ops CLI (scaffold)",
        "",
        "Usage: lowball <command>",
        "",
        "Commands (planned):",
        "  create-drop        Generate reserve+salt, submit commitment (L1)",
        "  close-and-reveal   Submit revealReserve, print receipts URL (L3)",
        "  status             List drops, stock, pending reveals (L3)",
      ].join("\n"),
    );
    break;
  default:
    console.error(`unknown command: ${cmd}`);
    process.exit(1);
}
