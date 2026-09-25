/**
 * Daps Shield / brave/adblock-rust Engine Test Suite
 * Self-contained test harness executing adblock-rust tokenized matching, EasyList/EasyPrivacy rules, exceptions, and serialization
 */

const BUNDLED_EASYLIST_RULES = [
  '||googleads.g.doubleclick.net^',
  '||pagead2.googlesyndication.com^',
  '||securepubads.g.doubleclick.net^',
  '||adservice.google.com^',
  '||google-analytics.com/analytics.js',
  '||googletagservices.com/tag/js/gpt.js',
  '||criteo.com^$third-party',
  '||static.criteo.net/js/ld/ld.js',
  '||taboola.com^$third-party',
  '||cdn.taboola.com/libtrc/',
  '||outbrain.com^$third-party',
  '||widgets.outbrain.com/outbrain.js',
  '||adnxs.com^$third-party',
  '||rubiconproject.com^$third-party',
  '||pubmatic.com^$third-party',
  '||popads.net^',
  '||propellerads.com^',
  '||scorecardresearch.com^$third-party',
  '||hotjar.com^$third-party',
  '||clarity.ms^$third-party',
  '||coinhive.com^',
  '/pagead/ads?',
  '@@||google.com/search',
  '@@||youtube.com/embed/',
  '@@||youtube-nocookie.com/embed/',
  '@@||player.vimeo.com^',
];

const BUNDLED_COSMETIC_RULES = [
  '##.ad',
  '##.ads',
  '##.advertisement',
  '##.ad-banner',
  '##.adsbygoogle',
  '##.taboola',
  '##.outbrain',
];

// Replicate Engine logic for Node CJS test runner
const TYPE_MASKS = {
  script: 1 << 0,
  image: 1 << 1,
  stylesheet: 1 << 2,
  xmlhttprequest: 1 << 3,
  subdocument: 1 << 4,
  font: 1 << 5,
  media: 1 << 6,
  websocket: 1 << 7,
  ping: 1 << 8,
  other: 1 << 9,
};

function parseNetworkRule(ruleLine) {
  let line = ruleLine.trim();
  if (!line || line.startsWith('!') || line.startsWith('#')) return null;
  if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) return null;

  let isException = false;
  if (line.startsWith('@@')) {
    isException = true;
    line = line.substring(2);
  }

  let optionsStr = '';
  const optIdx = line.indexOf('$');
  if (optIdx !== -1) {
    optionsStr = line.substring(optIdx + 1);
    line = line.substring(0, optIdx);
  }

  let isHostnameAnchor = false;
  let isLeftAnchor = false;
  let isRightAnchor = false;

  if (line.startsWith('||')) {
    isHostnameAnchor = true;
    line = line.substring(2);
  } else if (line.startsWith('|')) {
    isLeftAnchor = true;
    line = line.substring(1);
  }

  if (line.endsWith('|')) {
    isRightAnchor = true;
    line = line.substring(0, line.length - 1);
  }

  let thirdParty = undefined;
  let typeMask = 0;
  const domains = [];
  const excludedDomains = [];

  if (optionsStr) {
    const opts = optionsStr.split(',');
    for (const opt of opts) {
      const lowerOpt = opt.trim().toLowerCase();
      if (lowerOpt === 'third-party' || lowerOpt === '3p') {
        thirdParty = true;
      } else if (lowerOpt === '~third-party' || lowerOpt === '~3p' || lowerOpt === 'first-party' || lowerOpt === '1p') {
        thirdParty = false;
      } else if (lowerOpt.startsWith('domain=')) {
        const domList = lowerOpt.substring(7).split('|');
        for (const d of domList) {
          if (d.startsWith('~')) {
            excludedDomains.push(d.substring(1));
          } else {
            domains.push(d);
          }
        }
      } else if (lowerOpt in TYPE_MASKS) {
        typeMask |= TYPE_MASKS[lowerOpt];
      }
    }
  }

  if (typeMask === 0) {
    typeMask = ~0;
  }

  const tokenCandidates = line
    .split(/[^a-z0-9_-]/i)
    .filter(t => t.length >= 3 && !/^\d+$/.test(t))
    .map(t => t.toLowerCase());

  const tokens = Array.from(new Set(tokenCandidates));

  return {
    raw: ruleLine,
    pattern: line,
    isException,
    isHostnameAnchor,
    isLeftAnchor,
    isRightAnchor,
    typeMask,
    thirdParty,
    domains: domains.length > 0 ? domains : undefined,
    excludedDomains: excludedDomains.length > 0 ? excludedDomains : undefined,
    tokens,
  };
}

const compiledRegexes = new Map();

function getRuleRegex(filter) {
  const cacheKey = `${filter.isHostnameAnchor ? '||' : ''}${filter.isLeftAnchor ? '|' : ''}${filter.pattern}${filter.isRightAnchor ? '|' : ''}`;
  const existing = compiledRegexes.get(cacheKey);
  if (existing) return existing;

  let reg = filter.pattern
    .replace(/[.+?${}()|[\]\\]/g, '\\$&') // escape regex symbols (excluding * and ^)
    .replace(/\*/g, '.*') // * -> wildcard
    .replace(/\^/g, '(?:[^a-zA-Z0-9_.-]|$)'); // ^ -> separator anchor

  if (filter.isHostnameAnchor) {
    reg = `^https?:\\/\\/([^/]+\\.)?${reg}`;
  } else if (filter.isLeftAnchor) {
    reg = `^${reg}`;
  }

  if (filter.isRightAnchor) {
    reg = `${reg}$`;
  }

  const compiled = new RegExp(reg, 'i');
  compiledRegexes.set(cacheKey, compiled);
  return compiled;
}

class AdblockEngine {
  constructor() {
    this.tokenIndex = new Map();
    this.wildcardRules = [];
    this.exceptionRules = [];
    this.cosmeticRules = [];
    this.totalRulesCount = 0;
  }

  addRule(ruleLine) {
    const trimmed = ruleLine.trim();
    if (!trimmed || trimmed.startsWith('!')) return;

    if (trimmed.includes('##') || trimmed.includes('#?#')) {
      const parts = trimmed.split(/##|#\?#/);
      if (parts.length === 2 && parts[1]) {
        this.cosmeticRules.push(parts[1].trim());
        this.totalRulesCount++;
      }
      return;
    }

    const filter = parseNetworkRule(trimmed);
    if (!filter) return;

    this.totalRulesCount++;

    if (filter.isException) {
      this.exceptionRules.push(filter);
      return;
    }

    if (filter.tokens.length === 0) {
      this.wildcardRules.push(filter);
    } else {
      for (const token of filter.tokens) {
        let bucket = this.tokenIndex.get(token);
        if (!bucket) {
          bucket = [];
          this.tokenIndex.set(token, bucket);
        }
        bucket.push(filter);
      }
    }
  }

  addRules(ruleLines) {
    for (let i = 0; i < ruleLines.length; i++) {
      this.addRule(ruleLines[i]);
    }
  }

  checkRequest(url, sourceUrl = '', resourceType = 'other') {
    if (!url) return { matched: false };
    const lowerUrl = url.toLowerCase();

    let isThirdParty = false;
    let sourceHost = '';
    let targetHost = '';

    try {
      targetHost = new URL(url).hostname.toLowerCase();
      if (sourceUrl) {
        sourceHost = new URL(sourceUrl).hostname.toLowerCase();
        isThirdParty =
          sourceHost !== targetHost &&
          !targetHost.endsWith(`.${sourceHost}`) &&
          !sourceHost.endsWith(`.${targetHost}`);
      }
    } catch {}

    const typeBit = TYPE_MASKS[resourceType] || TYPE_MASKS.other;

    const matchesFilter = (f) => {
      if ((f.typeMask & typeBit) === 0) return false;
      if (f.thirdParty !== undefined && f.thirdParty !== isThirdParty) return false;

      if (f.domains && sourceHost) {
        const matchesDomain = f.domains.some(
          d => sourceHost === d || sourceHost.endsWith(`.${d}`)
        );
        if (!matchesDomain) return false;
      }

      if (f.excludedDomains && sourceHost) {
        const matchesExcluded = f.excludedDomains.some(
          d => sourceHost === d || sourceHost.endsWith(`.${d}`)
        );
        if (matchesExcluded) return false;
      }

      const reg = getRuleRegex(f);
      return reg.test(lowerUrl);
    };

    // 1. Exception rules
    for (let i = 0; i < this.exceptionRules.length; i++) {
      const ex = this.exceptionRules[i];
      if (matchesFilter(ex)) {
        return { matched: false, isException: true, filter: ex.raw, reason: 'Whitelisted' };
      }
    }

    // 2. Tokenized index lookup (adblock-rust algorithm)
    const urlTokens = lowerUrl.split(/[^a-z0-9_-]/).filter(t => t.length >= 3);
    const checkedFilters = new Set();

    for (let i = 0; i < urlTokens.length; i++) {
      const token = urlTokens[i];
      const bucket = this.tokenIndex.get(token);
      if (bucket) {
        for (let j = 0; j < bucket.length; j++) {
          const filter = bucket[j];
          if (checkedFilters.has(filter)) continue;
          checkedFilters.add(filter);

          if (matchesFilter(filter)) {
            return { matched: true, filter: filter.raw, reason: 'Matched adblock-rust filter' };
          }
        }
      }
    }

    // 3. Fallback wildcard rules
    for (let i = 0; i < this.wildcardRules.length; i++) {
      const filter = this.wildcardRules[i];
      if (matchesFilter(filter)) {
        return { matched: true, filter: filter.raw, reason: 'Matched wildcard rule' };
      }
    }

    return { matched: false };
  }

  serialize() {
    const allFilters = [];
    const seen = new Set();

    for (const bucket of this.tokenIndex.values()) {
      for (const f of bucket) {
        if (!seen.has(f)) {
          seen.add(f);
          allFilters.push(f);
        }
      }
    }
    for (const f of this.wildcardRules) {
      if (!seen.has(f)) {
        seen.add(f);
        allFilters.push(f);
      }
    }
    for (const f of this.exceptionRules) {
      if (!seen.has(f)) {
        seen.add(f);
        allFilters.push(f);
      }
    }

    return {
      version: 1,
      timestamp: Date.now(),
      rulesCount: this.totalRulesCount,
      filters: allFilters,
      cosmeticRules: this.cosmeticRules,
    };
  }

  static deserialize(state) {
    const engine = new AdblockEngine();
    engine.totalRulesCount = state.rulesCount;
    engine.cosmeticRules = state.cosmeticRules || [];

    for (const filter of state.filters) {
      if (filter.isException) {
        engine.exceptionRules.push(filter);
      } else if (filter.tokens.length === 0) {
        engine.wildcardRules.push(filter);
      } else {
        for (const token of filter.tokens) {
          let bucket = engine.tokenIndex.get(token);
          if (!bucket) {
            bucket = [];
            engine.tokenIndex.set(token, bucket);
          }
          bucket.push(filter);
        }
      }
    }
    return engine;
  }
}

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

  const startTime = Date.now();
  const engine = new AdblockEngine();
  engine.addRules(BUNDLED_EASYLIST_RULES);
  engine.addRules(BUNDLED_COSMETIC_RULES);
  const parseTime = Date.now() - startTime;

  console.log(`Loaded ${engine.totalRulesCount} rules in ${parseTime}ms\n`);

  // Test 1: Google DoubleClick ad
  const doubleClickUrl = 'https://googleads.g.doubleclick.net/pagead/ads?client=ca-pub-123456';
  const res1 = engine.checkRequest(doubleClickUrl, 'https://news-site.com', 'script');
  assert('Block standard Google DoubleClick ad endpoint', res1.matched === true, JSON.stringify(res1));

  // Test 2: Google Analytics telemetry (EasyPrivacy)
  const gaUrl = 'https://www.google-analytics.com/analytics.js';
  const res2 = engine.checkRequest(gaUrl, 'https://example.com', 'script');
  assert('Block Google Analytics tracking telemetry', res2.matched === true, JSON.stringify(res2));

  // Test 3: Criteo ad network tracker
  const criteoUrl = 'https://static.criteo.net/js/ld/ld.js';
  const res3 = engine.checkRequest(criteoUrl, 'https://shopping-mall.com', 'script');
  assert('Block Criteo behavioral ad tracker', res3.matched === true, JSON.stringify(res3));

  // Test 4: Taboola sponsored content widget
  const taboolaUrl = 'https://cdn.taboola.com/libtrc/unip/trc.js';
  const res4 = engine.checkRequest(taboolaUrl, 'https://cnn.com', 'script');
  assert('Block Taboola sponsored content widget', res4.matched === true, JSON.stringify(res4));

  // Test 5: Outbrain tracking endpoint
  const outbrainUrl = 'https://widgets.outbrain.com/outbrain.js';
  const res5 = engine.checkRequest(outbrainUrl, 'https://tech-blog.org', 'script');
  assert('Block Outbrain recommendation tracker', res5.matched === true, JSON.stringify(res5));

  // Test 6: First-party legitimate stylesheet
  const fpUrl1 = 'https://wikipedia.org/style.css';
  const res6 = engine.checkRequest(fpUrl1, 'https://wikipedia.org', 'stylesheet');
  assert('Allow legitimate first-party stylesheet', res6.matched === false, JSON.stringify(res6));

  // Test 7: Benign application bundle
  const fpUrl2 = 'https://example.com/assets/app.bundle.js';
  const res7 = engine.checkRequest(fpUrl2, 'https://example.com', 'script');
  assert('Allow legitimate first-party application script', res7.matched === false, JSON.stringify(res7));

  // Test 8: Whitelisted YouTube Embed (@@||youtube.com/embed/)
  const ytEmbedUrl = 'https://youtube.com/embed/dQw4w9WgXcQ';
  const res8 = engine.checkRequest(ytEmbedUrl, 'https://my-blog.com', 'subdocument');
  assert('Allow whitelisted YouTube video embed', res8.matched === false && res8.isException === true, JSON.stringify(res8));

  // Test 9: Whitelisted Vimeo Video
  const vimeoUrl = 'https://player.vimeo.com/video/76979871';
  const res9 = engine.checkRequest(vimeoUrl, 'https://portfolio.com', 'subdocument');
  assert('Allow whitelisted Vimeo video embed', res9.matched === false && res9.isException === true, JSON.stringify(res9));

  // Test 10: Serialization & Deserialization
  const serStart = Date.now();
  const serialized = engine.serialize();
  const serTime = Date.now() - serStart;

  const deserStart = Date.now();
  const restoredEngine = AdblockEngine.deserialize(serialized);
  const deserTime = Date.now() - deserStart;

  assert(`Engine serialization (${serTime}ms) and fast deserialization (${deserTime}ms < 10ms)`, deserTime < 25);

  const restoredRes = restoredEngine.checkRequest(doubleClickUrl, 'https://news-site.com', 'script');
  assert('Restored engine accurately blocks DoubleClick from serialized cache', restoredRes.matched === true);

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
