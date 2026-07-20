import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: {
		// Prisma CLI operations (especially migrations) must use a direct database
		// connection. The application itself continues to use DATABASE_URL via its
		// PrismaPg adapter, which may safely point to a connection pooler.
		url: env("DIRECT_URL"),
	},
});
