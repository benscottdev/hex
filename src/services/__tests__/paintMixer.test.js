/**
 * Paint Mixer Tests
 * Verify inverse Kubelka-Munk solver achieves 90%+ matches
 */

import { generatePaintMix, getMatchPercent, simulateMix } from '../paintMixer';

// Test colors covering different hue ranges
const TEST_COLORS = {
	// Olive (the problematic one from user feedback)
	olive: { r: 92, g: 88, b: 2, name: "Olive/Douro" },
	
	// Primary/secondary colors
	red: { r: 200, g: 40, b: 50, name: "Red" },
	yellow: { r: 240, g: 220, b: 30, name: "Yellow" },
	blue: { r: 30, g: 90, b: 180, name: "Blue" },
	green: { r: 50, g: 150, b: 70, name: "Green" },
	orange: { r: 230, g: 120, b: 40, name: "Orange" },
	purple: { r: 140, g: 60, b: 160, name: "Purple" },
	
	// Earth tones
	brown: { r: 120, g: 80, b: 50, name: "Brown" },
	tan: { r: 180, g: 150, b: 110, name: "Tan" },
	
	// Neutrals
	lightGray: { r: 180, g: 180, b: 180, name: "Light Gray" },
	darkGray: { r: 70, g: 70, b: 70, name: "Dark Gray" },
	
	// Pastels
	pink: { r: 240, g: 180, b: 190, name: "Pink" },
	mint: { r: 170, g: 240, b: 200, name: "Mint" },
	lavender: { r: 200, g: 180, b: 230, name: "Lavender" },
	
	// Dark colors
	navy: { r: 20, g: 40, b: 80, name: "Navy" },
	maroon: { r: 100, g: 30, b: 40, name: "Maroon" },
	forestGreen: { r: 30, g: 80, b: 40, name: "Forest Green" },
	
	// Saturated
	cyan: { r: 0, g: 200, b: 200, name: "Cyan" },
	magenta: { r: 220, g: 40, b: 140, name: "Magenta" },
};

function testColor(rgb) {
	console.log(`\n━━━ Testing: ${rgb.name} (${rgb.r}, ${rgb.g}, ${rgb.b}) ━━━`);
	
	const startTime = Date.now();
	const mix = generatePaintMix(rgb);
	const elapsed = Date.now() - startTime;
	
	const matchPercent = getMatchPercent(rgb, mix);
	
	// Verify the mix
	const weights = {};
	for (const [k, v] of Object.entries(mix.pigments)) {
		weights[k] = v.percentage / 100;
	}
	const simulated = simulateMix(weights);
	
	console.log(`Recipe: ${mix.description}`);
	console.log(`Match: ${matchPercent}%`);
	console.log(`Target RGB: (${rgb.r}, ${rgb.g}, ${rgb.b})`);
	console.log(`Simulated RGB: (${simulated.r}, ${simulated.g}, ${simulated.b})`);
	console.log(`Time: ${elapsed}ms`);
	
	const passed = matchPercent >= 90;
	console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'} (${matchPercent >= 90 ? 'meets' : 'BELOW'} 90% target)`);
	
	return {
		name: rgb.name,
		matchPercent,
		elapsed,
		passed,
		recipe: mix.description
	};
}

function runAllTests() {
	console.log('═══════════════════════════════════════════════════════');
	console.log('   PAINT MIXER TEST SUITE - Inverse Kubelka-Munk');
	console.log('   Target: 90%+ match for all colors');
	console.log('═══════════════════════════════════════════════════════');
	
	const results = [];
	let totalTime = 0;
	
	for (const color of Object.values(TEST_COLORS)) {
		const result = testColor(color);
		results.push(result);
		totalTime += result.elapsed;
	}
	
	// Summary
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
	console.log(`  Average time: ${avgTime.toFixed(0)}ms`);
	console.log(`  Total time: ${totalTime}ms`);
	
	if (failed > 0) {
		console.log(`\n⚠️  FAILURES:`);
		results.filter(r => !r.passed).forEach(r => {
			console.log(`  • ${r.name}: ${r.matchPercent}%`);
		});
	}
	
	console.log('\n═══════════════════════════════════════════════════════\n');
	
	return {
		totalTests: results.length,
		passed,
		failed,
		avgMatch,
		minMatch,
		maxMatch,
		allPassed: failed === 0
	};
}

// Run if called directly (not imported)
if (require.main === module) {
	runAllTests();
}

export { runAllTests, testColor, TEST_COLORS };
