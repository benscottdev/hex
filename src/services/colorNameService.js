/**
 * Color Name API integration
 * https://github.com/meodai/color-name-api
 * Uses api.color.pizza for human-readable color names
 */

const API_BASE = "https://api.color.pizza/v1";

/**
 * Get human-readable name for a hex color
 * @param {string} hex - Hex color e.g. "#ff0000" or "ff0000"
 * @returns {Promise<string|null>} Color name or null on failure (falls back to hex in caller)
 */
export async function getColorName(hex) {
	if (!hex || typeof hex !== "string") return null;
	const cleanHex = hex.replace(/^#/, "");
	if (cleanHex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleanHex)) return null;

	try {
		const res = await fetch(`${API_BASE}/?values=${cleanHex}`, {
			headers: { "X-Referrer": "hex-color-app" },
		});
		if (!res.ok) return null;
		const data = await res.json();
		const color = data?.colors?.[0];
		return color?.name ?? null;
	} catch (error) {
		console.warn("Color name API unavailable:", error?.message);
		return null;
	}
}
