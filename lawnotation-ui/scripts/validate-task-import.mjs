// Checks task import files with the same rules as the import dialog.
//
//   node --experimental-strip-types scripts/validate-task-import.mjs task.json [more.json ...]
//
// Prints "OK" or every problem per file; exits 1 if any file would be refused.
import { readFileSync } from "node:fs";
import { validateTaskImport } from "../utils/taskImportFormat.ts";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: node --experimental-strip-types scripts/validate-task-import.mjs task.json [more.json ...]");
  process.exit(2);
}

let refused = 0;
for (const file of files) {
  let problems;
  try {
    problems = validateTaskImport(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    problems = [`cannot be read as JSON: ${error.message}`];
  }
  if (problems.length) {
    refused++;
    console.log(`✗ ${file}`);
    for (const problem of problems) console.log(`    ${problem}`);
  } else {
    console.log(`✓ ${file}: OK`);
  }
}
process.exitCode = refused ? 1 : 0;
