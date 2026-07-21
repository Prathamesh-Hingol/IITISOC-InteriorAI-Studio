import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: {
		// Used by Prisma CLI (migrate, generate, studio) — must be a direct connection,
		// not the pgBouncer pooler, so it can run DDL statements.
		url: env("DIRECT_URL"),
	},
});
