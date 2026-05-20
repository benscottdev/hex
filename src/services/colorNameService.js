/**
 * Color Name API — https://github.com/meodai/color-name-api
 * Uses api.color.pizza for human-readable color names.
 */

const API_BASE = "https://api.color.pizza/v1";

/** In-memory cache (normalized hex without #, lowercase) → name */
const nameCache = new Map();

/**
 * @param {string} hex - Hex e.g. "#ff0000" or "ff0000"
 * @returns {Promise<string|null>}
 */
export async function getColorName(hex) {
	if (!hex || typeof hex !== "string") return null;
	const cleanHex = hex.replace(/^#/, "");
	if (cleanHex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleanHex)) return null;

	const cacheKey = cleanHex.toLowerCase();
	if (nameCache.has(cacheKey)) return nameCache.get(cacheKey);

	try {
		const res = await fetch(`${API_BASE}/?values=${cleanHex}`, {
			headers: { "X-Referrer": "hex-color-app" },
		});
		if (!res.ok) return null;
		const data = await res.json();
		const color = data?.colors?.[0];
		const name = color?.name ?? null;
		if (name) nameCache.set(cacheKey, name);
		return name;
	} catch (error) {
		console.warn("Color name API unavailable:", error?.message);
		return null;
	}
}
