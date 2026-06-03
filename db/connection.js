function normalizeDatabaseUrl(databaseUrl) {
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not set");
	}

	const url = new URL(databaseUrl);
	const sslmode = url.searchParams.get("sslmode");
	const compatibilityModes = new Set(["prefer", "require", "verify-ca"]);

	if (compatibilityModes.has(sslmode) && !url.searchParams.has("uselibpqcompat")) {
		url.searchParams.set("uselibpqcompat", "true");
	}

	return url.toString();
}

module.exports = { normalizeDatabaseUrl };