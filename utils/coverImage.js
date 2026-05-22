const fs = require("fs");
const path = require("path");

const FALLBACK_COVER_IMAGE = "/cover-placeholder.svg";

function resolveCoverImageURL(coverImageURL) {
	if (!coverImageURL) {
		return FALLBACK_COVER_IMAGE;
	}

	if (/^https?:\/\//i.test(coverImageURL)) {
		return coverImageURL;
	}

	const normalizedPath = coverImageURL.startsWith("/") ? coverImageURL.slice(1) : coverImageURL;
	const absolutePath = path.resolve("./public", normalizedPath);

	return isRenderableImage(absolutePath) ? coverImageURL : FALLBACK_COVER_IMAGE;
}

function detectMimeTypeFromFile(absolutePath) {
	if (!fs.existsSync(absolutePath)) {
		return null;
	}

	const fileHandle = fs.openSync(absolutePath, "r");
	try {
		const buffer = Buffer.alloc(32);
		const bytesRead = fs.readSync(fileHandle, buffer, 0, buffer.length, 0);
		const header = buffer.subarray(0, bytesRead);
		const signature = header.toString("hex").toUpperCase();
		const asciiStart = header.toString("utf8", 0, Math.min(bytesRead, 32)).trimStart().toLowerCase();

		if (signature.startsWith("89504E470D0A1A0A")) {
			return "image/png";
		}

		if (signature.startsWith("FFD8FF")) {
			return "image/jpeg";
		}

		if (asciiStart.startsWith("<svg") || asciiStart.startsWith("<?xml")) {
			return "image/svg+xml";
		}

		if (signature.startsWith("47494638")) {
			return "image/gif";
		}

		if (signature.startsWith("424D")) {
			return "image/bmp";
		}

		if (signature.length >= 32 && signature.slice(8, 16) === "66747970") {
			const brand = signature.slice(16, 24);
			if (["6D703432", "4D345620", "69736F6D", "61766331"].includes(brand)) {
				return "video/mp4";
			}
		}

		return null;
	} finally {
		fs.closeSync(fileHandle);
	}
}

function isRenderableImage(absolutePath) {
	return Boolean(detectMimeTypeFromFile(absolutePath)?.startsWith("image/"));
}

module.exports = {
	FALLBACK_COVER_IMAGE,
	detectMimeTypeFromFile,
	resolveCoverImageURL,
};