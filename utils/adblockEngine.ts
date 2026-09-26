/**
 * Brave Browser adblock-rust Engine Implementation
 * Tokenized pattern matching, rule parsing, serialization cache, and scriptlet defusers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BUNDLED_EASYLIST_RULES, BUNDLED_COSMETIC_RULES } from './adblockRules';

export type RequestType =
  | 'script'
  | 'image'
  | 'stylesheet'
  | 'xmlhttprequest'
  | 'subdocument'
  | 'font'
  | 'media'
  | 'websocket'
  | 'ping'
  | 'other';

export const TYPE_MASKS: Record<RequestType, number> = {
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

export interface NetworkFilter {
  raw: string;
  pattern: string;
  regexStr?: string;
  isException: boolean; // @@
  isHostnameAnchor: boolean; // ||
  isLeftAnchor: boolean; // |
  isRightAnchor: boolean; // | at end
  typeMask: number;
  thirdParty?: boolean;
  domains?: string[];
  excludedDomains?: string[];
  tokens: string[];
}

export interface BlockResult {
  matched: boolean;
  filter?: string;
  isException?: boolean;
  reason?: string;
}

export interface SerializedEngineState {
  version: number;
  timestamp: number;
  rulesCount: number;
  filters: NetworkFilter[];
  cosmeticRules: string[];
}

const STORAGE_CACHE_KEY = '@daps_adblock_serialized_engine_v1';

/**
 * Parses an ABP / uBlock Origin rule string into a structured NetworkFilter
 */
export function parseNetworkRule(ruleLine: string): NetworkFilter | null {
  let line = ruleLine.trim();
  if (!line || line.startsWith('!') || line.startsWith('#')) return null;

  // Ignore cosmetic / snippet rules in network parser
  if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) return null;

  let isException = false;
  if (line.startsWith('@@')) {
    isException = true;
    line = line.substring(2);
  }

  // Parse options ($third-party,script,image,domain=...)
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

  let thirdParty: boolean | undefined = undefined;
  let typeMask = 0;
  const domains: string[] = [];
  const excludedDomains: string[] = [];

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
        typeMask |= TYPE_MASKS[lowerOpt as RequestType];
      }
    }
  }

  // If no specific content type option specified, match all
  if (typeMask === 0) {
    typeMask = ~0;
  }

  // Extract candidate search tokens for adblock-rust token index
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

/**
 * Compiled Regex cache for fast URL pattern checks
 */
const compiledRegexes = new Map<string, RegExp>();

function getRuleRegex(filter: NetworkFilter): RegExp {
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

/**
 * Core Adblock Engine (Brave adblock-rust architecture)
 */
export class AdblockEngine {
  private tokenIndex = new Map<string, NetworkFilter[]>();
  private wildcardRules: NetworkFilter[] = [];
  private exceptionRules: NetworkFilter[] = [];
  private cosmeticRules: string[] = [];
  private totalRulesCount = 0;

  constructor() {
    this.tokenIndex = new Map();
  }

  public addRule(ruleLine: string) {
    const trimmed = ruleLine.trim();
    if (!trimmed || trimmed.startsWith('!')) return;

    // Handle cosmetic rule
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
      // Index under each extracted token
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

  public addRules(ruleLines: string[]) {
    for (let i = 0; i < ruleLines.length; i++) {
      this.addRule(ruleLines[i]);
    }
  }

  /**
   * Fast tokenized matching against incoming requests
   */
  public checkRequest(
    url: string,
    sourceUrl: string = '',
    resourceType: RequestType = 'other'
  ): BlockResult {
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

    const matchesFilter = (f: NetworkFilter): boolean => {
      // Content type filter
      if ((f.typeMask & typeBit) === 0) return false;

      // Third-party constraint
      if (f.thirdParty !== undefined && f.thirdParty !== isThirdParty) return false;

      // Domain constraint
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

      // Pattern regex check
      const reg = getRuleRegex(f);
      return reg.test(lowerUrl);
    };

    // 1. Check Exceptions (Whitelist @@ rules take precedence)
    for (let i = 0; i < this.exceptionRules.length; i++) {
      const ex = this.exceptionRules[i];
      if (matchesFilter(ex)) {
        return { matched: false, isException: true, filter: ex.raw, reason: 'Whitelisted' };
      }
    }

    // 2. Extract tokens from URL and query token index
    const urlTokens = lowerUrl.split(/[^a-z0-9_-]/).filter(t => t.length >= 3);
    const checkedFilters = new Set<NetworkFilter>();

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

    // 3. Check Wildcard fallback rules
    for (let i = 0; i < this.wildcardRules.length; i++) {
      const filter = this.wildcardRules[i];
      if (matchesFilter(filter)) {
        return { matched: true, filter: filter.raw, reason: 'Matched wildcard rule' };
      }
    }

    return { matched: false };
  }

  public getCosmeticSelectors(): string[] {
    return this.cosmeticRules;
  }

  public getRuleCount(): number {
    return this.totalRulesCount;
  }

  /**
   * Serializes the engine state for instant cold-start loading
   */
  public serialize(): SerializedEngineState {
    const allFilters: NetworkFilter[] = [];
    const seen = new Set<NetworkFilter>();

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

  /**
   * Restores the engine from serialized cache in < 5ms
   */
  public static deserialize(state: SerializedEngineState): AdblockEngine {
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

/**
 * Singleton Manager handling list fetching, state serialization, and WebView script generation
 */
class DapsAdblockManager {
  private engine: AdblockEngine = new AdblockEngine();
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  public async init() {
    if (this.isInitialized) return;
    try {
      // 1. Try loading cached serialized state
      const cached = await AsyncStorage.getItem(STORAGE_CACHE_KEY);
      if (cached) {
        const state: SerializedEngineState = JSON.parse(cached);
        this.engine = AdblockEngine.deserialize(state);
        this.isInitialized = true;
        return;
      }
    } catch {}

    // 2. Fallback to bundled snapshot
    this.engine.addRules(BUNDLED_EASYLIST_RULES);
    this.engine.addRules(BUNDLED_COSMETIC_RULES);
    this.isInitialized = true;

    // Cache the compiled snapshot
    try {
      const state = this.engine.serialize();
      await AsyncStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(state));
    } catch {}
  }

  public getEngine(): AdblockEngine {
    return this.engine;
  }

  public enableShields() {
    this.isEnabled = true;
  }

  public disableShields() {
    this.isEnabled = false;
  }

  public isShieldsEnabled(): boolean {
    return this.isEnabled;
  }

  public checkRequest(url: string, sourceUrl?: string, type?: RequestType): BlockResult {
    if (!this.isEnabled) return { matched: false };
    return this.engine.checkRequest(url, sourceUrl, type);
  }

  /**
   * Fetches latest EasyList & EasyPrivacy in the background and compiles/caches them
   */
  public async updateFilterLists(): Promise<{ success: boolean; ruleCount: number }> {
    try {
      const [easyListRes, easyPrivacyRes] = await Promise.all([
        fetch('https://easylist.to/easylist/easylist.txt').then(r => r.text()),
        fetch('https://easylist.to/easylist/easyprivacy.txt').then(r => r.text()),
      ]);

      const newEngine = new AdblockEngine();
      newEngine.addRules(BUNDLED_EASYLIST_RULES); // keep essential overrides
      newEngine.addRules(BUNDLED_COSMETIC_RULES);

      if (easyListRes) {
        const lines = easyListRes.split('\n').slice(0, 3000); // take top 3000 active rules
        newEngine.addRules(lines);
      }
      if (easyPrivacyRes) {
        const lines = easyPrivacyRes.split('\n').slice(0, 3000);
        newEngine.addRules(lines);
      }

      this.engine = newEngine;
      const state = newEngine.serialize();
      await AsyncStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(state));

      return { success: true, ruleCount: newEngine.getRuleCount() };
    } catch {
      return { success: false, ruleCount: this.engine.getRuleCount() };
    }
  }

  /**
   * Generates WebView injection script with brave/adblock-resources scriptlets & cosmetic hiding
   */
  public generateShieldScript(isDarkMode: boolean = false): string {
    const cosmeticSelectors = this.engine.getCosmeticSelectors();
    const selectorsCss = cosmeticSelectors.join(', ');

    return `
(function() {
  // 1. Protect Media & Video Embeds from being blocked
  var isVideoHost = function(url) {
    if (!url) return false;
    var u = url.toLowerCase();
    return (
      u.includes('youtube.com') ||
      u.includes('youtu.be') ||
      u.includes('youtube-nocookie.com') ||
      u.includes('player.vimeo.com') ||
      u.includes('vimeo.com') ||
      u.includes('dailymotion.com') ||
      u.includes('dmcdn.net') ||
      u.includes('twitch.tv') ||
      u.includes('streamable.com') ||
      u.includes('googlevideo.com') ||
      u.includes('jwplatform.com') ||
      u.includes('jwpcdn.com') ||
      u.includes('brightcove') ||
      u.includes('wistia') ||
      u.includes('kaltura') ||
      u.includes('soundcloud.com') ||
      u.includes('spotify.com') ||
      u.includes('rumble.com') ||
      u.includes('odysee.com') ||
      u.includes('bilibili.com') ||
      u.includes('vidsrc') ||
      u.includes('superembed') ||
      u.includes('streamtape') ||
      u.includes('doodstream') ||
      u.includes('dood.') ||
      u.includes('filemoon') ||
      u.includes('mixdrop') ||
      u.includes('mp4upload') ||
      u.includes('megacloud') ||
      u.includes('streamwish') ||
      u.includes('vidcloud') ||
      u.includes('rabbitstream') ||
      u.includes('dokicloud') ||
      u.includes('voe.sx') ||
      u.includes('vidhide') ||
      u.includes('streamembed') ||
      u.includes('2embed') ||
      u.includes('upstream') ||
      u.includes('dropload') ||
      u.includes('cloudemb') ||
      u.includes('uqload') ||
      u.includes('embedrise') ||
      u.includes('smashystream') ||
      u.includes('multiembed') ||
      u.includes('vidmoly') ||
      u.includes('streamcloud') ||
      u.includes('vidplay') ||
      u.includes('mycloud') ||
      u.includes('mcloud') ||
      u.includes('vidfast') ||
      u.includes('streamlare') ||
      u.includes('streamruby') ||
      u.includes('videa') ||
      u.includes('waaw') ||
      u.includes('netu') ||
      u.includes('streamio') ||
      u.includes('closeload') ||
      u.includes('streamin') ||
      u.includes('luluvdo') ||
      u.includes('streamquicker') ||
      u.includes('vidbm') ||
      u.includes('vidoza') ||
      u.includes('streamvid') ||
      u.includes('vidlox') ||
      u.includes('streamhub') ||
      u.includes('rapidcloud') ||
      u.includes('filelions') ||
      u.includes('turbovid') ||
      u.includes('ok.ru') ||
      u.includes('vk.com') ||
      u.includes('/embed') ||
      u.includes('/player') ||
      u.includes('/video/') ||
      u.includes('/watch') ||
      u.includes('/play') ||
      u.includes('.m3u8') ||
      u.includes('.mp4') ||
      u.includes('.webm') ||
      u.includes('.mp3') ||
      u.includes('.wav') ||
      u.includes('.ogg') ||
      u.includes('.ts') ||
      u.includes('.mpd') ||
      u.startsWith('blob:') ||
      u.startsWith('data:')
    );
  };

  // If running inside a subframe (iframe) AND this is a media player, NEVER interfere!
  try {
    if (window !== window.top) {
      var currentHref = (window.location.href || '').toLowerCase();
      if (isVideoHost(currentHref)) {
        return; // Video player runs natively without blocker interference!
      }
    }
  } catch(e) {}

  if (window.__daps_engine_active) {
    // If already active, still re-apply theme if theme mode changed
    try {
      document.documentElement.style.setProperty('color-scheme', '${isDarkMode ? 'dark' : 'light'}', 'important');
    } catch(e) {}
    if (typeof window.__daps_attach_dom === 'function') {
      window.__daps_attach_dom();
    }
    return;
  }
  window.__daps_engine_active = true;

  // 1. Theme Sync: force webview and CSS media queries to match app theme
  try {
    var isDark = ${isDarkMode};
    var themeScheme = isDark ? 'dark' : 'light';

    // Override window.matchMedia so websites (Google search, Twitter, etc.) detect selected theme
    var originalMatchMedia = window.matchMedia;
    window.matchMedia = function(query) {
      if (!query) return originalMatchMedia ? originalMatchMedia.call(window, query) : { matches: false };
      var q = query.toLowerCase();
      if (q.includes('prefers-color-scheme')) {
        var matches = q.includes('dark') ? isDark : !isDark;
        return {
          matches: matches,
          media: query,
          onchange: null,
          addListener: function() {},
          removeListener: function() {},
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return false; }
        };
      }
      return originalMatchMedia ? originalMatchMedia.call(window, query) : { matches: false };
    };

    var meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'color-scheme';
      (document.head || document.documentElement).appendChild(meta);
    }
    meta.content = themeScheme;
    document.documentElement.style.setProperty('color-scheme', themeScheme, 'important');

    var themeStyle = document.createElement('style');
    themeStyle.id = 'daps-theme-override';
    themeStyle.textContent = ':root, html, body { color-scheme: ' + themeScheme + ' !important; }';
    (document.head || document.documentElement).appendChild(themeStyle);
  } catch(e) {}

  // 3. Popup & Tab Takeover Blocker (Defuse malicious window.open redirects -> route to new tab)
  try {
    window.open = function(url, target, features) {
      if (url && typeof url === 'string') {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_window', url: url }));
        }
      }
      return null;
    };
  } catch(e) {}

  // 4. Brave adblock-resources scriptlets & Anti-Adblock Defusers
  try {
    window.canRunAds = true;
    window.hasAdBlocker = false;
    window.isAdBlocked = false;
    window.adBlockerDetected = false;
    window.adblock = false;
    window.abp = false;
    window.fuckAdBlock = {
      on: function(detected, fn) { if (!detected && typeof fn === 'function') fn(); return this; },
      onDetected: function(fn) { return this; },
      onNotDetected: function(fn) { if (typeof fn === 'function') fn(); return this; },
      check: function() { return false; },
      clearEvent: function() {}
    };
    window.BlockAdBlock = window.fuckAdBlock;
    window.Sniffer = {};
    window.adProtector = {};

    window.adsbygoogle = { push: function() { return 1; }, loaded: true };
    window.googletag = {
      cmd: { push: function(cb) { try { if (typeof cb === 'function') cb(); } catch(e) {} } },
      display: function() {},
      enableServices: function() {},
      pubads: function() {
        return {
          addEventListener: function() {},
          clear: function() {},
          enableSingleRequest: function() {},
          collapseEmptyDivs: function() {},
          setTargeting: function() {},
          refresh: function() {}
        };
      },
      defineSlot: function() { return { addService: function() { return this; } }; }
    };
    window.ga = function() {};
    window.gtag = function() {};
    window.fbq = function() {};
    window._taboola = [];
    window.criteo_q = [];
    window.Adf = { banner: { show: function() {} } };
  } catch(e) {}

  // 5. Network Subresource Interception (Block ad fetches and XHR calls)
  var adUrlRegex = /(googleads|doubleclick\.net|pagead|adservice\.google|tpc\.googlesyndication|criteo\.(com|net)|taboola\.com|outbrain\.com|adnxs\.com|rubiconproject\.com|pubmatic\.com|openx\.net|casalemedia\.com|popads\.net|popcash\.net|propellerads\.com|propush|exoclick\.com|exdynsrv|exosrv|contentabc|servserv|adsterra\.com|hilltopads|ad-maven|yllix|deloton|monetag|clickadu|adcash|onclickperformance|juicyads|ero-advertising|trafficstars|trafficjunky|bet365|1xbet|melbet|parimatch|mostbet|realsrv|tsyndicate|etahub|vidoomy|streamad|vidverto|creativecdn|m2pub|revcontent|mgid|zergnet|speakol|adxcore|scorecardresearch\.com|hotjar\.com|clarity\.ms|analytics\.tiktok|fbevents\.js|pixel\.facebook|popunder|direct-link|clicktrack)/i;

  var notifyBlocked = function(blockedUrl) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'shield_blocked', url: blockedUrl }));
      }
    } catch(e) {}
  };

  try {
    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function(input, init) {
        var reqUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (reqUrl && !isVideoHost(reqUrl) && adUrlRegex.test(reqUrl)) {
          notifyBlocked(reqUrl);
          return Promise.resolve(new Response('', { status: 200, statusText: 'OK' }));
        }
        return originalFetch.apply(window, arguments);
      };
    }

    var originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (url && typeof url === 'string' && !isVideoHost(url) && adUrlRegex.test(url)) {
        this.__is_ad_blocked = true;
        notifyBlocked(url);
      }
      return originalXhrOpen.apply(this, arguments);
    };

    var originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
      if (this.__is_ad_blocked) {
        var self = this;
        setTimeout(function() {
          try {
            Object.defineProperty(self, 'readyState', { value: 4, writable: true });
            Object.defineProperty(self, 'status', { value: 200, writable: true });
            Object.defineProperty(self, 'responseText', { value: '', writable: true });
            if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
            if (typeof self.onload === 'function') self.onload();
          } catch(e) {}
        }, 10);
        return;
      }
      return originalXhrSend.apply(this, arguments);
    };
  } catch(e) {}

  // 6. Cosmetic filter element hiding (adblock-rust syntax)
  ${selectorsCss ? `
  try {
    var cosmeticStyle = document.createElement('style');
    cosmeticStyle.id = 'daps-cosmetic-engine';
    cosmeticStyle.textContent = \`
      ${selectorsCss} {
        display: none !important;
        visibility: hidden !important;
        height: 0px !important;
        min-height: 0px !important;
        max-height: 0px !important;
        width: 0px !important;
        min-width: 0px !important;
        max-width: 0px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }
    \`;
    (document.head || document.documentElement).appendChild(cosmeticStyle);
  } catch(e) {}
  ` : ''}

  // 7. Defuse Screen Takeover Overlays & Interstitials (Strictly preserving video & media embeds)
  var defuseTakeovers = function() {
    try {
      var allDivs = document.querySelectorAll('div, section, aside');
      for (var i = 0; i < allDivs.length; i++) {
        var el = allDivs[i];
        if (
          el.tagName === 'VIDEO' ||
          el.tagName === 'AUDIO' ||
          el.tagName === 'IFRAME' ||
          el.tagName === 'EMBED' ||
          el.tagName === 'OBJECT' ||
          el.querySelector('video, audio, iframe, embed, object')
        ) {
          continue; // NEVER touch video players, iframes, audio or embedded media!
        }
        var style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'absolute') {
          var z = parseInt(style.zIndex, 10);
          if (z >= 9999) {
            var rect = el.getBoundingClientRect();
            var coversScreen = rect.width >= window.innerWidth * 0.8 && rect.height >= window.innerHeight * 0.8;
            if (coversScreen) {
              var elId = (el.id || '').toLowerCase();
              var elClass = (el.className || '').toLowerCase();
              var isExplicitAd = /(^|\s|_|-)(ad-modal|modal-ad|interstitial|takeover-ad|ad-takeover|popup-overlay|ad-layer|clickjacking|click-catcher)($|\s|_|-)/i.test(elClass + ' ' + elId);
              if (isExplicitAd || (style.opacity === '0' && !el.innerText)) {
                el.remove();
                if (document.body) document.body.style.overflow = 'auto';
              }
            }
          }
        }
      }
    } catch(e) {}
  };

  // Run initial takeover defuse once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', defuseTakeovers);
  } else {
    defuseTakeovers();
  }

  // 8. Clean dynamically inserted ads without breaking media/video embeds
  var scanAndClean = function(root) {
    if (!root || !root.querySelectorAll) return;
    try {
      // 1. Remove ad iframes (Always preserving media and video embed hosts)
      var iframes = root.querySelectorAll('iframe');
      for (var k = 0; k < iframes.length; k++) {
        var ifr = iframes[k];
        var src = (ifr.src || '').toLowerCase();
        if (isVideoHost(src)) continue; // Keep video players!
        if (adUrlRegex.test(src) || src.includes('/ads') || src.includes('pagead')) {
          ifr.remove();
        }
      }

      // 2. Remove ad images & tracking banners
      var adImages = root.querySelectorAll(
        'img[src*="doubleclick"], img[src*="adservice"], img[src*="/banners/"], img[src*="popads"], ' +
        'img[src*="tpc.googlesyndication.com"], img[src*="exdynsrv"], img[src*="exoclick"], img[src*="adsterra"], ' +
        'img[src*="propellerads"], img[src*="hilltopads"], img[src*="monetag"], img[src*="juicyads"], ' +
        'img[src*="trafficjunky"], img[src*="trafficstars"], img[src*="realsrv"], img[src*="tsyndicate"], ' +
        'img[src*="criteo"], img[src*="revcontent"], img[src*="mgid"], img[src*="zergnet"], img[src*="speakol"], ' +
        'img[src*="creativecdn"], img[src*="/ads/"], ' +
        'a[href*="bet365"] img, a[href*="1xbet"] img, a[href*="melbet"] img, a[href*="parimatch"] img, ' +
        'a[href*="exoclick"] img, a[href*="adsterra"] img, a[href*="popads"] img, a[href*="propeller"] img, ' +
        'a[href*="hilltop"] img, a[href*="clickadu"] img, a[href*="juicyads"] img, a[href*="trafficjunky"] img, ' +
        'a[href*="/adclick"] img, a[href*="/clicktrack"] img, a[href*="affiliate"] img'
      );
      for (var m = 0; m < adImages.length; m++) {
        var adImg = adImages[m];
        var parentLink = adImg.closest('a');
        if (parentLink) parentLink.remove();
        else adImg.remove();
      }

      // 3. Remove pirate video clickjackers and transparent player overlays
      var overlays = root.querySelectorAll(
        'a[target="_blank"][style*="position: fixed"], ' +
        'a[target="_blank"][style*="position: absolute"], ' +
        'div[class*="jw-ad"], ' +
        'div[class*="vpaid"], ' +
        'div[class*="vast"], ' +
        'div[id*="vpaid"], ' +
        'div[id*="vast"], ' +
        'div[class*="click-catcher"], ' +
        'div[id*="player-overlay"], ' +
        'div[class*="vidoomy"], ' +
        'div[class*="fluid_ad"]'
      );
      for (var o = 0; o < overlays.length; o++) {
        var ov = overlays[o];
        if (
          ov.tagName === 'VIDEO' ||
          ov.tagName === 'AUDIO' ||
          ov.tagName === 'IFRAME' ||
          ov.tagName === 'EMBED' ||
          ov.querySelector('video, audio, iframe, embed')
        ) {
          continue; // Never delete video or embedded players!
        }
        ov.remove();
      }

      // Clear click hijacking on body and document
      if (document.body && document.body.onclick) {
        document.body.onclick = null;
      }

      // 4. Remove standard ad containers and banner wrappers
      var adContainers = root.querySelectorAll(
        '.adsbygoogle, [id^="google_ads_"], .taboola, .outbrain, .interstitial-ad, ' +
        '.popup-overlay, .jw-ad-container, .video-ad-overlay, .banner-image, .ad-image, ' +
        '.ad-placement, .ad-holder, .leaderboard-ad, .skyscraper-ad, .rectangle-ad, .mrec'
      );
      for (var n = 0; n < adContainers.length; n++) {
        var ac = adContainers[n];
        if (ac.querySelector('video, audio, iframe, embed')) continue;
        ac.remove();
      }
    } catch(e) {}
  };

  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType === 1) {
          scanAndClean(node);
        }
      }
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scanAndClean(document.documentElement);
  }

  // Periodic cleanup sweep for dynamically injected ads (runs every 800ms for first 10s)
  var sweepCount = 0;
  var sweepInterval = setInterval(function() {
    sweepCount++;
    if (document.documentElement) scanAndClean(document.documentElement);
    if (sweepCount >= 12) clearInterval(sweepInterval);
  }, 800);

  // 9. Attach DOM Listeners (Scroll detection & Download interception)
  var attachDomListeners = function() {
    if (window.__daps_listeners_attached) return;
    if (!document || !document.body) {
      if (document && document.addEventListener) {
        document.addEventListener('DOMContentLoaded', attachDomListeners);
      }
      return;
    }
    window.__daps_listeners_attached = true;

    // A. Native scroll direction detection for floating dock auto-hide
    try {
      var lastScrollY = window.scrollY || 0;
      var scrollTicking = false;
      window.addEventListener('scroll', function() {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(function() {
          var currY = window.scrollY || 0;
          var diff = currY - lastScrollY;
          if (Math.abs(diff) >= 10) {
            var direction = diff > 0 ? 'down' : 'up';
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'scroll_direction',
                direction: direction,
                scrollY: currY
              }));
            }
            lastScrollY = currY;
          }
          scrollTicking = false;
        });
      }, { passive: true });
    } catch(e) {}

    // B. Download link, Magnet URI & Blob URL Interceptor
    try {
      var dlExtRegex = /\.(pdf|zip|rar|7z|tar|gz|bz2|xz|apk|dmg|exe|iso|bin|torrent|docx?|xlsx?|pptx?|csv|epub|mp4|mkv|avi|webm|mov|flv|wmv|3gp|mp3|m4a|wav|flac|aac|ogg|srt|vtt)(\?|$)/i;

      document.addEventListener('click', function(e) {
        var target = e.target;
        var el = target ? (target.closest ? target.closest('a, button, [role="button"]') : target) : null;
        if (!el) return;

        var href = el.href || el.getAttribute('href') || el.getAttribute('data-href') || el.getAttribute('data-url') || '';
        var downloadAttr = el.getAttribute('download');

        // Magnet Links
        if (href && href.startsWith('magnet:')) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_magnet', url: href }));
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Blob & Data URLs
        if (href && href.startsWith('blob:')) {
          try {
            fetch(href)
              .then(function(res) { return res.blob(); })
              .then(function(blob) {
                var reader = new FileReader();
                reader.onloadend = function() {
                  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'start_blob_download',
                      dataUri: reader.result,
                      filename: downloadAttr || 'download_' + Date.now()
                    }));
                  }
                };
                reader.readAsDataURL(blob);
              })
              .catch(function() {});
            e.preventDefault();
            e.stopPropagation();
            return;
          } catch(err) {}
        }

        if (!href) return;

        var text = (el.innerText || el.textContent || '').trim().toLowerCase();
        var className = (el.className || '').toString().toLowerCase();
        var isDownloadBtn = text.includes('download') || text.includes('telecharger') || text.includes('descargar') || className.includes('download');
        var isDownloadFile = dlExtRegex.test(href) || downloadAttr !== null;

        if (isDownloadFile || (isDownloadBtn && !href.startsWith('#') && !href.startsWith('javascript:'))) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'start_download',
              url: href,
              filename: downloadAttr || ''
            }));
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }, true); // Capture phase ensures we intercept before host scripts stop propagation
    } catch(e) {}

    // C. Smart Media & Download Sniffer Scanner
    try {
      var scanMedia = function() {
        try {
          var results = [];
          var seen = {};
          var mediaExtRegex = /\.(mp4|mkv|avi|webm|mov|flv|wmv|3gp|m4v|mp3|m4a|wav|flac|aac|ogg|opus|pdf|zip|rar|7z|tar|gz|bz2|apk|epub|doc|docx|xls|xlsx|ppt|pptx|srt|vtt)(\?|$)/i;

          // 1. Inspect HTML5 <video> elements & child <source>
          var videos = document.querySelectorAll('video');
          for (var i = 0; i < videos.length; i++) {
            var v = videos[i];
            var vSrc = v.currentSrc || v.src || '';
            if (vSrc && !seen[vSrc] && !vSrc.startsWith('blob:http') && !vSrc.startsWith('mediasource:')) {
              seen[vSrc] = true;
              var extMatch = vSrc.match(/\.([a-z0-9]+)(\?|$)/i);
              var ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';
              results.push({
                url: vSrc,
                title: v.getAttribute('title') || v.getAttribute('aria-label') || document.title || 'Video Media',
                type: 'video',
                extension: ext
              });
            }
            var vSources = v.querySelectorAll('source');
            for (var s = 0; s < vSources.length; s++) {
              var sSrc = vSources[s].src || '';
              if (sSrc && !seen[sSrc]) {
                seen[sSrc] = true;
                results.push({
                  url: sSrc,
                  title: vSources[s].getAttribute('title') || document.title || 'Video Stream',
                  type: 'video',
                  extension: (sSrc.match(/\.([a-z0-9]+)(\?|$)/i) || [, 'mp4'])[1].toLowerCase()
                });
              }
            }
          }

          // 2. Inspect HTML5 <audio> elements
          var audios = document.querySelectorAll('audio');
          for (var a = 0; a < audios.length; a++) {
            var au = audios[a];
            var aSrc = au.currentSrc || au.src || '';
            if (aSrc && !seen[aSrc]) {
              seen[aSrc] = true;
              results.push({
                url: aSrc,
                title: au.getAttribute('title') || document.title || 'Audio Media',
                type: 'audio',
                extension: (aSrc.match(/\.([a-z0-9]+)(\?|$)/i) || [, 'mp3'])[1].toLowerCase()
              });
            }
          }

          // 3. Inspect downloadable anchor links (<a href="...">)
          var links = document.querySelectorAll('a[href]');
          for (var j = 0; j < links.length; j++) {
            var link = links[j];
            var href = link.href || '';
            if (!href || href.startsWith('javascript:') || href.startsWith('#') || seen[href]) continue;

            var hasDlAttr = link.hasAttribute('download');
            var extMatch2 = href.match(mediaExtRegex);

            if (hasDlAttr || extMatch2) {
              seen[href] = true;
              var dlAttrVal = link.getAttribute('download');
              var ext2 = extMatch2 ? extMatch2[1].toLowerCase() : (dlAttrVal ? dlAttrVal.split('.').pop() : 'file');
              var linkText = (link.innerText || link.textContent || link.getAttribute('title') || dlAttrVal || '').trim();
              var lastSegment = href.split('/').pop() || '';
              var linkTitle = linkText.length > 2 && linkText.length < 80 ? linkText : (lastSegment.split('?')[0] || 'Download File');

              var mType = 'other';
              if (['mp4', 'mkv', 'avi', 'webm', 'mov', 'flv', 'wmv', '3gp'].indexOf(ext2) !== -1) mType = 'video';
              else if (['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus'].indexOf(ext2) !== -1) mType = 'audio';
              else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'epub'].indexOf(ext2) !== -1) mType = 'document';
              else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'apk'].indexOf(ext2) !== -1) mType = 'archive';

              results.push({
                url: href,
                title: decodeURIComponent(linkTitle),
                type: mType,
                extension: ext2
              });
            }
          }

          if (results.length > 0 && window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'media_detected',
              items: results.slice(0, 30)
            }));
          }
        } catch(err) {}
      };

      // Run scanner on multiple lifecycles
      setTimeout(scanMedia, 800);
      setTimeout(scanMedia, 2500);
      window.addEventListener('play', scanMedia, true);
    } catch(e) {}
  };

  window.__daps_attach_dom = attachDomListeners;
  attachDomListeners();
})();
true;
`;
  }
}

export const adblockManager = new DapsAdblockManager();
