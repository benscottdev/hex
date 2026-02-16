#!/usr/bin/env node

/**
 * Standalone Paint Mixer Test Runner
 * No dependencies - pure Node.js
 */

// Simple module loader for React Native code in Node
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
	// Mock React Native modules
	if (id === 'react-native') {
		return {};
	}
	return originalRequire.apply(this, arguments);
};

// Import paint mixer (will need to handle ES6 modules)
function loadPaintMixer() {
	const fs = require('fs');
	const path = require('path');
	const mixerPath = path.join(__dirname, 'src/services/paintMixer.js');
	const code = fs.readFileSync(mixerPath, 'utf8');
	
	// Convert ES6 exports to CommonJS for Node
	const transformed = code
		.replace(/export function /g, 'exports.')
		.replace(/export {/g, 'module.exports = {')
		.replace(/export const /g, 'exports.');
	
	const mixerModule = { exports: {} };
	const wrapper = new Function('exports', 'module', transformed);
	wrapper(mixerModule.exports, mixerModule);
	
	return mixerModule.exports;
}

const mixer = loadPaintMixer();

// Test colors
const TEST_COLORS = {
	olive: { r: 92, g: 88, b: 2, name: "Olive/Douro (user's example)" },
	red: { r: 200, g: 40, b: 50, name: "Red" },
	yellow: { r: 240, g: 220, b: 30, name: "Yellow" },
	blue: { r: 30, g: 90, b: 180, name: "Blue" },
	green: { r: 50, g: 150, b: 70, name: "Green" },
	orange: { r: 230, g: 120, b: 40, name: "Orange" },
	purple: { r: 140, g: 60, b: 160, name: "Purple" },
	brown: { r: 120, g: 80, b: 50, name: "Brown" },
	tan: { r: 180, g: 150, b: 110, name: "Tan" },
	lightGray: { r: 180, g: 180, b: 180, name: "Light Gray" },
	darkGray: { r: 70, g: 70, b: 70, name: "Dark Gray" },
	pink: { r: 240, g: 180, b: 190, name: "Pink" },
	mint: { r: 170, g: 240, b: 200, name: "Mint" },
	lavender: { r: 200, g: 180, b: 230, name: "Lavender" },
	navy: { r: 20, g: 40, b: 80, name: "Navy" },
	maroon: { r: 100, g: 30, b: 40, name: "Maroon" },
	forestGreen: { r: 30, g: 80, b: 40, name: "Forest Green" },
	cyan: { r: 0, g: 200, b: 200, name: "Cyan" },
	magenta: { r: 220, g: 40, b: 140, name: "Magenta" },
};

function testColor(rgb) {
	console.log(`\n━━━ Testing: ${rgb.name} ━━━`);
	console.log(`RGB: (${rgb.r}, ${rgb.g}, ${rgb.b})`);
	
	const startTime = Date.now();
	const mix = mixer.generatePaintMix(rgb);
	const elapsed = Date.now() - startTime;
	
	const matchPercent = mixer.getMatchPercent(rgb, mix);
	
	// Verify
	const weights = {};
	for (const [k, v] of Object.entries(mix.pigments)) {
		weights[k] = v.percentage / 100;
	}
	const simulated = mixer.simulateMix(weights);
	
	console.log(`Recipe: ${mix.description}`);
	console.log(`Match: ${matchPercent}%`);
	console.log(`Simulated: (${simulated.r}, ${simulated.g}, ${simulated.b})`);
	console.log(`Time: ${elapsed}ms`);
	
	const passed = matchPercent >= 90;
	console.log(`${passed ? '✅ PASS' : '❌ FAIL'} (target: ≥90%)`);
	
	return { name: rgb.name, matchPercent, elapsed, passed, recipe: mix.description };
}

function runTests() {
	console.log('═══════════════════════════════════════════════════════');
	console.log('   PAINT MIXER TEST - Inverse Kubelka-Munk');
	console.log('   Target: 90%+ match for all colors');
	console.log('═══════════════════════════════════════════════════════');
	
	const results = [];
	let totalTime = 0;
	
	for (const color of Object.values(TEST_COLORS)) {
		try {
			const result = testColor(color);
			results.push(result);
			totalTime += result.elapsed;
		} catch (err) {
			console.error(`❌ ERROR testing ${color.name}:`, err.message);
			results.push({ name: color.name, matchPercent: 0, elapsed: 0, passed: false, error: err.message });
		}
	}
	
	console.log('\n\n═══════════════════════════════════════════════════════');
	console.log('                     SUMMARY');
	console.log('═══════════════════════════════════════════════════════');
	
	const passed = results.filter(r => r.passed).length;
	const failed = results.filter(r => !r.passed).length;
	const avgMatch = results.reduce((sum, r) => sum + r.matchPercent, 0) / results.length;
	const minMatch = Math.min(...results.map(r => r.matchPercent));
	const maxMatch = Math.max(...results.map(r => r.matchPercent));
	const avgTime = totalTime / results.length;
	
	console.log(`Total tests: ${results.length}`);
	console.log(`Passed (≥90%): ${passed} ✅`);
	console.log(`Failed (<90%): ${failed} ❌`);
	console.log(`Success rate: ${((passed / results.length) * 100).toFixed(1)}%`);
	console.log(`\nMatch quality:`);
	console.log(`  Average: ${avgMatch.toFixed(1)}%`);
	console.log(`  Min: ${minMatch}%`);
	console.log(`  Max: ${maxMatch}%`);
	console.log(`\nPerformance:`);
	console.log(`  Average time: ${avgTime.toFixed(0)}ms per color`);
	console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s`);
	
	if (failed > 0) {
		console.log(`\n⚠️  FAILURES:`);
		results.filter(r => !r.passed).forEach(r => {
			console.log(`  • ${r.name}: ${r.matchPercent}% ${r.error ? `(${r.error})` : ''}`);
		});
	}
	
	console.log('\n═══════════════════════════════════════════════════════\n');
	
	process.exit(failed > 0 ? 1 : 0);
}

runTests();
