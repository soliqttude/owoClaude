const { spawnSync } = require("node:child_process");
const path = require("node:path");

const migrationName = "20260814180000_sync_ledger_type";
const migrationFile = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  migrationName,
  "migration.sql",
);
const prismaCli = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);
let resultCode = 1;

function runPrisma(args) {
  const result = spawnSync(prismaCli, args, {
    env: { ...process.env, CI: "1" },
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

function fail(message) {
  console.error(`[startup] ${message}`);
  process.exit(resultCode ?? 1);
}

const deploy = runPrisma(["migrate", "deploy"]);
if (deploy.status !== 0) {
  const output = `${deploy.stdout ?? ""}\n${deploy.stderr ?? ""}`;
  const isExistingSchema = /P3005|database schema is not empty|already contains tables/i.test(
    output,
  );

  if (!isExistingSchema) {
    resultCode = deploy.status;
    fail("Database migrations could not be applied.");
  }

  console.log(
    "[startup] Existing database detected without matching Prisma migration history; applying the safe ledger enum sync.",
  );

  const execute = runPrisma([
    "db",
    "execute",
    "--schema=prisma/schema.prisma",
    `--file=${migrationFile}`,
  ]);
  if (execute.status !== 0) {
    resultCode = execute.status;
    fail("The ledger enum sync could not be applied.");
  }

  const resolve = runPrisma(["migrate", "resolve", "--applied", migrationName]);
  if (resolve.status !== 0) {
    resultCode = resolve.status;
    fail("The ledger enum migration could not be recorded.");
  }

  const retry = runPrisma(["migrate", "deploy"]);
  if (retry.status !== 0) {
    resultCode = retry.status;
    fail("Database migrations did not finish successfully.");
  }
}

const bot = spawnSync(process.execPath, [path.join(process.cwd(), "dist", "index.js")], {
  env: process.env,
  stdio: "inherit",
});

process.exit(bot.status ?? 1);