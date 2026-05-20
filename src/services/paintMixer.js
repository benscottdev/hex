/**
 * Improved Paint Unmixing via Mixbox (Upgrade)
 *
 * - Uses Mixbox latent space for selection + mixing
 * - Solves a simplex-constrained NNLS in latent space (projected gradient descent)
 * - Refines with a small coordinate descent (local)
 * - Expanded pigment set (optional: tune to your paint tubes)
 * - Adds generatePaintMixFromHex(hex) wrapper
 */

import mixbox from "mixbox";

/* ============================
   PAINT PALETTE (EDIT AS NEEDED)
   ============================ */

/**
 * NOTE: Replace RGB values with your actual paint tube swatches where possible.
 * The more accurate the tube RGBs, the closer the physical match will be.
 */
const PIGMENTS = {
	white: { r: 255, g: 255, b: 255, name: "White" },
	black: { r: 20, g: 20, b: 20, name: "Black" },

	/* existing */
	warmYellow: { r: 254, g: 236, b: 0, name: "Warm Yellow" },
	coolYellow: { r: 255, g: 244, b: 79, name: "Cool Yellow" },
	warmRed: { r: 255, g: 39, b: 2, name: "Warm Red" },
	coolRed: { r: 225, g: 44, b: 121, name: "Cool Red" },
	warmBlue: { r: 25, g: 0, b: 89, name: "Warm Blue" },
	coolBlue: { r: 13, g: 27, b: 68, name: "Cool Blue" },
	magenta: { r: 209, g: 0, b: 86, name: "Magenta" },
	turquoise: { r: 0, g: 181, b: 190, name: "Turquoise" },
	warmBrown: { r: 85, g: 55, b: 40, name: "Warm Brown" },
	coolBrown: { r: 102, g: 85, b: 70, name: "Cool Brown" },

	/* added pigments (recommended) */
	// ultramarine: { r: 18, g: 10, b: 120, name: "Ultramarine Blue" },
	// phthaloGreen: { r: 6, g: 110, b: 70, name: "Phthalo Green" },
	// yellowOchre: { r: 204, g: 153, b: 51, name: "Yellow Ochre" },

	// cadmiumOrange: { r: 255, g: 97, b: 0, name: "Cadmium Orange" },
};

const KEYS = Object.keys(PIGMENTS);
const LATENT_SIZE = mixbox.LATENT_SIZE;

/* ============================
   TUNABLES
   ============================ */

const MAX_PIGMENTS = 5;
const MIN_PIGMENTS = 3;

const BLACK_PENALTY = 120;
const SUPER_DARK_LIGHTNESS = 0.06;
const GREY_SATURATION = 0.18;

/* ============================
   PRECOMPUTE LATENTS
   ============================ */

const LATENTS = {};
for (const k of KEYS) {
	const p = PIGMENTS[k];
	LATENTS[k] = mixbox.rgbToLatent(p.r, p.g, p.b);
}

/* ============================
   UTILITIES
   ============================ */

function hexToRgb(hex) {
	const v = hex.replace("#", "");
	return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function clampWeights(weights) {
	return weights.map((w) => Math.max(0, w));
}

function normalize(weights) {
	const sum = weights.reduce((a, b) => a + b, 0) || 1;
	return weights.map((w) => w / sum);
}

function targetLightness(rgb) {
	const [r, g, b] = rgb;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	return (max + min) / 510;
}

function targetSaturation(rgb) {
	const [r, g, b] = rgb;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	if (max === 0) return 0;
	return (max - min) / max;
}

function allowBlackForTarget(targetRgb) {
	const [r, g, b] = targetRgb;
	// Allow black only when all RGB channels are under 25 (actually black)
	return r < 25 && g < 25 && b < 25;
}

/* Perceptual color distance (OkLab) */
function srgbToLinear(c) {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToOklab({ r, g, b }) {
	r = srgbToLinear(r / 255);
	g = srgbToLinear(g / 255);
	b = srgbToLinear(b / 255);

	const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
	const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
	const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

	const l_ = Math.cbrt(l);
	const m_ = Math.cbrt(m);
	const s_ = Math.cbrt(s);

	return {
		L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
		a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
		b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
	};
}

function deltaE(a, b) {
	const A = rgbToOklab({ r: a[0], g: a[1], b: a[2] });
	const B = rgbToOklab({ r: b[0], g: b[1], b: b[2] });
	return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}

/* ============================
   MIXING CORE (latent-based)
   ============================ */

function mixPaints(paints, weights) {
	const latent = paints.map((rgb) => mixbox.rgbToLatent(rgb[0], rgb[1], rgb[2]));
	const mixed = new Array(LATENT_SIZE).fill(0);
	for (let i = 0; i < latent.length; i++) {
		for (let d = 0; d < LATENT_SIZE; d++) {
			mixed[d] += latent[i][d] * weights[i];
		}
	}
	const rgb = mixbox.latentToRgb(mixed);
	return rgb != null ? rgb : [255, 255, 255];
}

/* ============================
   SIMPLEX PROJECTION (Duchi et al.)
   ============================ */

function projectOntoSimplex(v) {
	// projects v onto the probability simplex (non-negative, sum 1)
	const n = v.length;
	const u = Array.from(v).sort((a, b) => b - a);
	let cssv = 0;
	let rho = -1;
	for (let i = 0; i < n; i++) {
		cssv += u[i];
		const t = cssv - 1;
		if (u[i] + t / (i + 1) > 0) rho = i;
	}
	const theta = (u.slice(0, rho + 1).reduce((a, b) => a + b, 0) - 1) / (rho + 1);
	return v.map((vi) => Math.max(0, vi - theta));
}

/* ============================
   NNLS IN LATENT (Projected Gradient Descent)
   ============================ */

/**
 * Solve min_w ||L^T w - t||^2  s.t. w >= 0, sum(w)=1
 * L: array of latent vectors length n: L[i] = latent vector for pigment i
 * t: target latent vector
 * returns weights array length n summing to 1
 */
function solveSimplexNNLS(L, t, opts = {}) {
	const { iters = 2000, lr = 0.7 } = opts;
	const n = L.length;
	// convert L to matrix form M where M^T w approximates t. We'll compute M = transpose(L)
	// We'll use gradient: grad = 2 * M * (M^T w - t)
	// Precompute M (d x n) as L_d_i = L[i][d]
	const d = L[0].length;
	// initialization: uniform
	let w = Array(n).fill(1 / n);

	// helper: compute M^T w
	const MtW = () => {
		const out = new Array(d).fill(0);
		for (let i = 0; i < n; i++) {
			const wi = w[i];
			for (let k = 0; k < d; k++) out[k] += L[i][k] * wi;
		}
		return out;
	};

	for (let iter = 0; iter < iters; iter++) {
		// compute residual r = M^T w - t (dimension d)
		const Mt_w = MtW();
		const r = new Array(d);
		for (let k = 0; k < d; k++) r[k] = Mt_w[k] - t[k];

		// gradient gi = 2 * sum_k L[i][k] * r[k]
		const grad = new Array(n).fill(0);
		for (let i = 0; i < n; i++) {
			let s = 0;
			const Li = L[i];
			for (let k = 0; k < d; k++) s += Li[k] * r[k];
			grad[i] = 2 * s;
		}

		// step
		const step = lr / Math.sqrt(1 + iter * 0.01); // decay a little
		const wTrial = new Array(n);
		for (let i = 0; i < n; i++) wTrial[i] = w[i] - step * grad[i];

		// project onto simplex
		w = projectOntoSimplex(wTrial);
	}

	return w;
}

/* ============================
   SELECTION + REFINEMENT
   ============================ */

/** pick pigments by latent residual projection */
function selectPigmentsByLatent(targetRgb, candidateKeys, maxCount = MAX_PIGMENTS) {
	// target latent
	const targetLatent = mixbox.rgbToLatent(targetRgb[0], targetRgb[1], targetRgb[2]);

	// start with the pigment whose latent is closest to the target latent
	let remaining = [...candidateKeys];
	const selected = [];

	// compute projection relevance
	const latents = remaining.map((k) => LATENTS[k]);

	// pick first by minimal Euclidean in latent
	let best = null,
		bestErr = Infinity;
	for (let i = 0; i < remaining.length; i++) {
		const L = latents[i];
		let s = 0;
		for (let d = 0; d < L.length; d++) s += Math.pow(L[d] - targetLatent[d], 2);
		if (s < bestErr) {
			bestErr = s;
			best = remaining[i];
		}
	}
	selected.push(best);
	remaining.splice(remaining.indexOf(best), 1);

	// greedy: choose pigment that best reduces residual when added
	while (selected.length < maxCount && remaining.length > 0) {
		const selLatents = selected.map((k) => LATENTS[k]);
		const remLatents = remaining.map((k) => LATENTS[k]);
		let bestAdd = null,
			bestMetric = Infinity;

		for (let i = 0; i < remaining.length; i++) {
			const trialKeys = [...selected, remaining[i]];
			const Lmat = trialKeys.map((k) => LATENTS[k]);
			// solve NNLS to get trial weights
			const w = solveSimplexNNLS(Lmat, targetLatent, { iters: 500, lr: 0.9 });
			// compute mixed latent:
			const mixed = new Array(LATENT_SIZE).fill(0);
			for (let j = 0; j < Lmat.length; j++) {
				const lj = Lmat[j];
				const wj = w[j];
				for (let d = 0; d < LATENT_SIZE; d++) mixed[d] += lj[d] * wj;
			}
			// compute latent error
			let e = 0;
			for (let d = 0; d < LATENT_SIZE; d++) e += Math.pow(mixed[d] - targetLatent[d], 2);
			if (e < bestMetric) {
				bestMetric = e;
				bestAdd = remaining[i];
			}
		}

		if (!bestAdd) break;
		selected.push(bestAdd);
		remaining.splice(remaining.indexOf(bestAdd), 1);
	}

	return selected;
}

/** Local refinement (coordinate descent) */
function refineWeightsLocal(targetRgb, pigmentKeys, initWeights, opts = {}) {
	const { iterations = 2000 } = opts;
	let weights = normalize(initWeights.slice());
	let bestWeights = [...weights];
	let bestErr = Infinity;

	// precompute paint RGB arrays
	const paintRgbs = pigmentKeys.map((k) => [PIGMENTS[k].r, PIGMENTS[k].g, PIGMENTS[k].b]);

	for (let step = 0; step < iterations; step++) {
		for (let i = 0; i < weights.length; i++) {
			const delta = 0.02;
			for (const dir of [-1, 1]) {
				const trial = [...weights];
				trial[i] += dir * delta;
				const clamped = normalize(clampWeights(trial));
				const mixed = mixPaints(paintRgbs, clamped);
				const err = deltaE(targetRgb, mixed) + blackPenalty(clamped, pigmentKeys);
				if (err < bestErr) {
					bestErr = err;
					bestWeights = [...clamped];
					weights = [...clamped];
				}
			}
		}
	}

	return bestWeights;
}

/* ============================
   BLACK PENALTY (as before but adjusted)
   ============================ */

function blackPenalty(weights, pigmentKeys) {
	if (!pigmentKeys || pigmentKeys.length !== weights.length) return 0;
	let sum = 0;
	for (let i = 0; i < weights.length; i++) {
		if (pigmentKeys[i] === "black") {
			sum += weights[i] * weights[i];
		}
	}
	return BLACK_PENALTY * sum;
}

/* ============================
   PUBLIC API
   ============================ */

/**
 * Core: generate paint mix (input {r,g,b})
 */
export function generatePaintMix(targetRgb) {
	if (!targetRgb || typeof targetRgb.r !== "number") {
		throw new Error("Invalid target color: expected { r, g, b }");
	}
	const targetArray = [targetRgb.r, targetRgb.g, targetRgb.b];

	// When target is actually black (all RGB < 25), return 100% black so latent selection doesn't pick e.g. warm blue
	if (allowBlackForTarget(targetArray)) {
		const lightness = Math.round(((Math.max(targetRgb.r, targetRgb.g, targetRgb.b) + Math.min(targetRgb.r, targetRgb.g, targetRgb.b)) / 510) * 100);
		return {
			pigments: { black: { name: "Black", percentage: 100, parts: 100 } },
			totalParts: 100,
			description: "100% Black",
			mixingSteps: ["Use Black straight from the tube."],
			lightness,
		};
	}

	const candidateKeys = KEYS.filter((k) => k !== "black");

	// select pigments (latent-based)
	const selected = selectPigmentsByLatent(targetArray, candidateKeys, MAX_PIGMENTS);

	// Build latent matrix L for selected
	const Lmat = selected.map((k) => LATENTS[k]);

	// First-stage solver: NNLS on latent (simplex)
	let w = solveSimplexNNLS(Lmat, mixbox.rgbToLatent(targetArray[0], targetArray[1], targetArray[2]), {
		iters: 2000,
		lr: 0.8,
	});

	// Keep only top N pigments (MIN..MAX) and renormalize
	const pairs = selected.map((k, i) => ({ key: k, w: w[i] || 0 }));
	pairs.sort((a, b) => b.w - a.w);
	const top = pairs.slice(0, Math.max(MIN_PIGMENTS, Math.min(MAX_PIGMENTS, pairs.length)));
	let topKeys = top.map((p) => p.key);
	let topW = normalize(top.map((p) => p.w));

	// refine locally
	topW = refineWeightsLocal(targetArray, topKeys, topW, { iterations: 1200 });

	// Build pigments object
	const pigments = {};
	let total = 0;
	topKeys.forEach((name, i) => {
		const pct = Math.round(topW[i] * 100);
		if (pct > 0) {
			pigments[name] = { name: PIGMENTS[name].name, percentage: pct, parts: pct };
			total += pct;
		}
	});

	// fix rounding drift
	if (total !== 100 && Object.keys(pigments).length > 0) {
		const maxKey = Object.keys(pigments).reduce((a, b) => (pigments[a].percentage > pigments[b].percentage ? a : b));
		pigments[maxKey].percentage += 100 - total;
		pigments[maxKey].parts += 100 - total;
	}

	// produce mixingSteps suggestions
	const mixingSteps = [];
	const sorted = Object.entries(pigments).sort(([, a], [, b]) => b.percentage - a.percentage);
	if (sorted.length) {
		const [, first] = sorted[0];
		mixingSteps.push(`START: Begin with ${first.name} as base (${first.percentage}%).`);
		if (sorted.length > 1) {
			mixingSteps.push("ADD GRADUALLY:");
			sorted.slice(1).forEach(([, p]) => {
				mixingSteps.push(` • Add ${p.name} (${p.percentage}%) in small increments, mixing thoroughly.`);
			});
		}
		// practical short rules
		mixingSteps.push("ADJUST: Too light -> add small amounts of base color; Too dark -> add a touch of white or lighten with opposite hue; Desaturate -> add a touch of burnt umber.");
	}

	const lightness = Math.round(((Math.max(targetRgb.r, targetRgb.g, targetRgb.b) + Math.min(targetRgb.r, targetRgb.g, targetRgb.b)) / 510) * 100);
	return {
		pigments,
		totalParts: 100,
		description: sorted.map(([, p]) => `${p.percentage}% ${p.name}`).join(" + "),
		mixingSteps,
		lightness,
	};
}

/** wrapper to accept hex */
export function generatePaintMixFromHex(hex) {
	const [r, g, b] = hexToRgb(hex);
	return generatePaintMix({ r, g, b });
}

/* ============================
   SIMULATION + HELPERS
   ============================ */

export function simulateMix(weights) {
	const latent = new Array(LATENT_SIZE).fill(0);
	let sum = 0;
	for (const v of Object.values(weights)) sum += v;
	if (!sum) return { r: 255, g: 255, b: 255 };

	for (const [k, w] of Object.entries(weights)) {
		const f = w / sum;
		const l = LATENTS[k];
		for (let i = 0; i < LATENT_SIZE; i++) latent[i] += f * l[i];
	}

	const [r, g, b] = mixbox.latentToRgb(latent);
	return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

export function getMatchPercent(targetRgb, mix) {
	if (!mix || !mix.pigments) return 0;
	const weights = {};
	for (const [k, v] of Object.entries(mix.pigments)) {
		if (v && v.percentage > 0) weights[k] = v.percentage / 100;
	}
	if (!Object.keys(weights).length) return 0;
	const simulated = simulateMix(weights);
	const dE = deltaE([targetRgb.r, targetRgb.g, targetRgb.b], [simulated.r, simulated.g, simulated.b]);
	// Map: ΔE=0 -> 100%, ΔE>=6 -> 0% (linear). Tweak 6 for stricter/looser.
	const percent = Math.round(100 * Math.max(0, 1 - dE / 6));
	return percent;
}

export function getPigmentHex(key) {
	const p = PIGMENTS[key];
	if (!p) return "#999999";
	const hex = (n) =>
		Math.max(0, Math.min(255, Math.round(n)))
			.toString(16)
			.padStart(2, "0");
	return `#${hex(p.r)}${hex(p.g)}${hex(p.b)}`;
}

export function getSimplifiedMixInstructions(mix) {
	if (!mix || !mix.pigments) return "";
	return Object.entries(mix.pigments)
		.filter(([, p]) => p && p.percentage > 0)
		.sort(([, a], [, b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0))
		.map(([, p]) => `${p.parts || p.percentage} parts ${p.name}`)
		.join("\n");
}

export function getHowToMixGuide(mix) {
	if (!mix || !mix.pigments) return "";
	const sorted = Object.entries(mix.pigments)
		.filter(([, p]) => p && p.percentage > 0)
		.sort(([, a], [, b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0));
	if (sorted.length === 0) return "";

	const [, first] = sorted[0];
	let guide = `START\nBegin with ${first.name} (${first.percentage}%). This is your base color.\n\n`;

	if (sorted.length > 1) {
		guide += "ADD GRADUALLY\n";
		sorted.slice(1).forEach(([, p], idx) => {
			const verb = idx === sorted.length - 2 ? "Finally, add" : "Add";
			guide += `${verb} ${p.name} (${p.percentage}%) slowly, a little at a time. Mix thoroughly after each addition.\n`;
		});
		guide += "\n";
	}

	guide += "ADJUST\n";
	guide += "• Too dark? Add a touch of White (or mix a small amount of Ultramarine + Burnt Umber if you want a cooler dark)\n";
	guide += "• Too light? Add complementary color gradually (or minimal Black as last resort)\n";
	guide += "• Hue shift needed? Add a dab of the target-like pigment\n\n";
	guide += "TEST FIRST\nMix a small sample (pea-sized) and compare to your target before mixing a full batch.";

	return guide;
}
