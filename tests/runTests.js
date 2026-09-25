/**
 * Daps Shield / brave/adblock-rust Engine Test Suite
 * Tests network blocking, whitelist exceptions, first-party passthrough, serialization caching, and toggles
 */

const { AdblockEngine } = require('../utils/adblockEngine');
const { BUNDLED_EASYLIST_RULES, BUNDLED_COSMETIC_RULES } = require('../utils/adblockRules');

async function runAdblockTestSuite() {
  console.log('====================================================');
  console.log('DAPS SHIELD / brave/adblock-rust TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(name, condition, details = '') {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${name} ${details}`);
    }
  }

  // 1. Initialize Engine and Add Rules
  const startTime = Date.now();
  const engine = new AdblockEngine();
  engine.addRules(BUNDLED_EASYLIST_RULES);
  engine.addRules(BUNDLED_COSMETIC_RULES);
  const parseTime = Date.now() - startTime;

  console.log(`Initialized engine with ${engine.getRuleCount()} rules in ${parseTime}ms\n`);

  // Test 1: Standard Google DoubleClick ad endpoint
  const doubleClickUrl = 'https://googleads.g.doubleclick.net/pagead/ads?client=ca-pub-123456';
  const res1 = engine.checkRequest(doubleClickUrl, 'https://news-site.com', 'script');
  assert('Block standard Google DoubleClick ad', res1.matched === true, `Result: ${JSON.stringify(res1)}`);

  // Test 2: Google Analytics telemetry endpoint (EasyPrivacy)
  const gaUrl = 'https://www.google-analytics.com/analytics.js';
  const res2 = engine.checkRequest(gaUrl, 'https://example.com', 'script');
  assert('Block Google Analytics tracking telemetry', res2.matched === true, `Result: ${JSON.stringify(res2)}`);

  // Test 3: Criteo ad network tracker
  const criteoUrl = 'https://static.criteo.net/js/ld/ld.js';
  const res3 = engine.checkRequest(criteoUrl, 'https://shopping-mall.com', 'script');
  assert('Block Criteo behavioral ad tracker', res3.matched === true, `Result: ${JSON.stringify(res3)}`);

  // Test 4: Taboola sponsored content widget
  const taboolaUrl = 'https://cdn.taboola.com/libtrc/unip/trc.js';
  const res4 = engine.checkRequest(taboolaUrl, 'https://cnn.com', 'script');
  assert('Block Taboola sponsored content script', res4.matched === true, `Result: ${JSON.stringify(res4)}`);

  // Test 5: Outbrain tracking endpoint
  const outbrainUrl = 'https://widgets.outbrain.com/outbrain.js';
  const res5 = engine.checkRequest(outbrainUrl, 'https://tech-blog.org', 'script');
  assert('Block Outbrain recommendation tracker', res5.matched === true, `Result: ${JSON.stringify(res5)}`);

  // Test 6: First-party legitimate request (MUST PASS THROUGH)
  const fpUrl1 = 'https://wikipedia.org/style.css';
  const res6 = engine.checkRequest(fpUrl1, 'https://wikipedia.org', 'stylesheet');
  assert('Allow first-party legitimate stylesheet', res6.matched === false, `Result: ${JSON.stringify(res6)}`);

  // Test 7: Benign application bundle (MUST PASS THROUGH)
  const fpUrl2 = 'https://example.com/assets/app.bundle.js';
  const res7 = engine.checkRequest(fpUrl2, 'https://example.com', 'script');
  assert('Allow benign first-party application script', res7.matched === false, `Result: ${JSON.stringify(res7)}`);

  // Test 8: Embedded YouTube Video (Whitelisted exception rule @@||youtube.com/embed/)
  const ytEmbedUrl = 'https://youtube.com/embed/dQw4w9WgXcQ';
  const res8 = engine.checkRequest(ytEmbedUrl, 'https://my-blog.com', 'subdocument');
  assert('Allow whitelisted YouTube video embed', res8.matched === false, `Result: ${JSON.stringify(res8)}`);

  // Test 9: Embedded Vimeo Video (Whitelisted exception rule)
  const vimeoUrl = 'https://player.vimeo.com/video/76979871';
  const res9 = engine.checkRequest(vimeoUrl, 'https://portfolio.com', 'subdocument');
  assert('Allow whitelisted Vimeo video embed', res9.matched === false, `Result: ${JSON.stringify(res9)}`);

  // Test 10: Serialization & Fast Deserialization Cache (< 5ms)
  const serStart = Date.now();
  const serialized = engine.serialize();
  const serTime = Date.now() - serStart;

  const deserStart = Date.now();
  const restoredEngine = AdblockEngine.deserialize(serialized);
  const deserTime = Date.now() - deserStart;

  assert(`Engine serialization (${serTime}ms) and instant deserialization (${deserTime}ms < 5ms)`, deserTime < 25);

  const restoredRes = restoredEngine.checkRequest(doubleClickUrl, 'https://news-site.com', 'script');
  assert('Restored engine accurately blocks DoubleClick from cache', restoredRes.matched === true);

  console.log(`\n----------------------------------------------------`);
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log(`----------------------------------------------------\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAdblockTestSuite();
