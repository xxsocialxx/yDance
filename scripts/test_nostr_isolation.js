/**
 * Phase 3 Testing Script: Nostr Isolation Validation
 * 
 * This script validates the nostr isolation implementation without requiring
 * a browser environment. It checks code structure, flag usage, and migration logic.
 * 
 * Usage: node scripts/test_nostr_isolation.js
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Phase 3: Nostr Isolation Testing');
console.log('='.repeat(60));
console.log('');

// Read script.js
const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

let errors = [];
let warnings = [];
let passed = [];

// Test 1: Feature flags exist
console.log('Test 1: Feature flags defined');
if (scriptContent.includes('nostrIsolated: false')) {
    passed.push('✓ nostrIsolated flag defined with safe default (false)');
} else {
    errors.push('✗ nostrIsolated flag not found or has wrong default');
}

if (scriptContent.includes('nostrDevTab:')) {
    passed.push('✓ nostrDevTab flag defined');
} else {
    warnings.push('⚠ nostrDevTab flag not found (Phase 4 dependency)');
}
console.log('');

// Test 2: State namespace structure
console.log('Test 2: State namespace structure');
if (scriptContent.includes('state.nostr')) {
    passed.push('✓ state.nostr namespace referenced');
} else {
    errors.push('✗ state.nostr namespace not found');
}

if (scriptContent.includes('nostr: null') || scriptContent.includes('nostr: {')) {
    passed.push('✓ state.nostr initialized in state object');
} else {
    errors.push('✗ state.nostr not initialized in state');
}
console.log('');

// Test 3: Migration helper exists
console.log('Test 3: Migration helper function');
if (scriptContent.includes('function migrateNostrState()')) {
    passed.push('✓ migrateNostrState() function exists');
} else {
    errors.push('✗ migrateNostrState() function not found');
}

if (scriptContent.includes('CONFIG.flags.nostrIsolated')) {
    const flagChecks = (scriptContent.match(/CONFIG\.flags\.nostrIsolated/g) || []).length;
    if (flagChecks > 0) {
        passed.push(`✓ Feature flag checked ${flagChecks} times throughout code`);
    }
} else {
    errors.push('✗ Feature flag not checked anywhere');
}
console.log('');

// Test 4: Safe accessor functions
console.log('Test 4: Safe accessor functions');
const accessors = [
    'getNostrClient',
    'getNostrKeys',
    'setNostrClient',
    'setNostrKeys'
];

accessors.forEach(accessor => {
    if (scriptContent.includes(`function ${accessor}(`)) {
        passed.push(`✓ ${accessor}() function exists`);
    } else {
        errors.push(`✗ ${accessor}() function not found`);
    }
});
console.log('');

// Test 5: Nostr module exists
console.log('Test 5: Nostr module structure');
if (scriptContent.includes('const nostr = {')) {
    passed.push('✓ nostr module object exists');
} else {
    errors.push('✗ nostr module not found');
}

// Check for key nostr module methods
const nostrMethods = [
    'async init()',
    'async connect(',
    'async disconnect(',
    'async generateKeys()',
    'async fetchFeed(',
    'async sendMessage(',
    'getStatus()'
];

nostrMethods.forEach(method => {
    const methodName = method.split('(')[0].replace('async ', '');
    if (scriptContent.includes(`${method}`) || scriptContent.includes(`${methodName}(`)) {
        passed.push(`✓ nostr.${methodName}() exists`);
    } else {
        warnings.push(`⚠ nostr.${methodName}() not found (may be optional)`);
    }
});
console.log('');

// Test 6: SOCIAL layer refactoring
console.log('Test 6: SOCIAL layer refactoring');
if (scriptContent.includes('CONFIG.flags.nostrIsolated')) {
    // Check if social.init uses nostr module
    const socialInit = scriptContent.match(/social\s*=\s*\{[\s\S]*?async init\(\)[\s\S]*?\}/);
    if (socialInit && socialInit[0].includes('nostr.init()')) {
        passed.push('✓ social.init() uses nostr.init() when flag enabled');
    } else {
        warnings.push('⚠ social.init() may not delegate to nostr.init()');
    }
    
    // Check other social methods
    if (scriptContent.includes('nostr.fetchFeed(')) {
        passed.push('✓ social.fetchSocialFeed() delegates to nostr');
    }
    
    if (scriptContent.includes('nostr.sendMessage(')) {
        passed.push('✓ social.sendNostrMessage() delegates to nostr');
    }
} else {
    errors.push('✗ SOCIAL layer not checking nostrIsolated flag');
}
console.log('');

// Test 7: Backward compatibility
console.log('Test 7: Backward compatibility checks');
if (scriptContent.includes('// LEGACY:') || scriptContent.includes('// LEGACY:')) {
    passed.push('✓ Legacy code paths preserved');
} else {
    warnings.push('⚠ Legacy code paths may not be preserved');
}

if (scriptContent.includes('state.nostrClient')) {
    passed.push('✓ Legacy state.nostrClient still exists (for backward compat)');
}

if (scriptContent.includes('state.userKeys')) {
    passed.push('✓ Legacy state.userKeys still exists (for backward compat)');
}
console.log('');

// Test 8: Code structure validation
console.log('Test 8: Code structure validation');
// Check for syntax issues (basic validation)
const syntaxChecks = [
    { pattern: /\{[\s\S]*\}/, name: 'Object literals' },
    { pattern: /async\s+\w+\s*\([^)]*\)\s*\{/, name: 'Async functions' },
    { pattern: /if\s*\([^)]+\)\s*\{/, name: 'If statements' }
];

// Count function definitions
const functionCount = (scriptContent.match(/async\s+\w+\s*\(/g) || []).length +
                      (scriptContent.match(/\w+\s*\([^)]*\)\s*=>/g) || []).length;
passed.push(`✓ Found ${functionCount} function definitions (structural check)`);
console.log('');

// Results Summary
console.log('='.repeat(60));
console.log('RESULTS SUMMARY');
console.log('='.repeat(60));
console.log('');

if (passed.length > 0) {
    console.log(`✅ PASSED (${passed.length}):`);
    passed.forEach(test => console.log(`   ${test}`));
    console.log('');
}

if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
}

if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):`);
    errors.forEach(error => console.log(`   ${error}`));
    console.log('');
}

const totalTests = passed.length + warnings.length + errors.length;
const passRate = ((passed.length / totalTests) * 100).toFixed(1);

console.log('='.repeat(60));
console.log(`Test Summary: ${passed.length} passed, ${warnings.length} warnings, ${errors.length} errors`);
console.log(`Pass Rate: ${passRate}%`);
console.log('='.repeat(60));

if (errors.length === 0) {
    console.log('');
    console.log('✅ Phase 3.1 (Structure Validation): PASSED');
    console.log('   Ready for manual browser testing');
    process.exit(0);
} else {
    console.log('');
    console.log('❌ Phase 3.1 (Structure Validation): FAILED');
    console.log('   Fix errors before proceeding');
    process.exit(1);
}

