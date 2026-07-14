import "./src/server/config/load-env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://juko:juko_dev_pw@localhost:5433/juko_prospect",
  },
  verbose: true,
  strict: true,
});
