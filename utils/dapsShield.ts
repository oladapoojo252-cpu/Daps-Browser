/**
 * Daps Shield: High-Performance Ad & Tracker Protection Engine
 * Built for Daps Browser
 */

export type DapsShieldMode = 'standard' | 'aggressive' | 'disabled';

export interface ShieldStats {
  pageBlockedCount: number;
  totalBlockedCount: number;
  dataSavedBytes: number;
  timeSavedMs: number;
}

// Media domains that should NEVER be blocked (so embeds & video playback always work)
const WHITELISTED_MEDIA_DOMAINS = [
  'youtube.com/embed',
  'youtube-nocookie.com/embed',
  'googlevideo.com',
  'player.vimeo.com',
  'vimeo.com',
  'dailymotion.com',
  'rumble.com',
  'streamable.com',
  'spotify.com/embed',
  'soundcloud.com',
  'twitch.tv',
];

// Curated high-impact ad network and tracking domains
export const DAPS_BLOCKED_DOMAINS = [
  // Google Ad & Tracking
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'stats.g.doubleclick.net',
  // Popular Ad Networks & Exchanges
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'adnxs.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'casalemedia.com',
  'contextweb.com',
  'advertising.com',
  'bidswitch.net',
  'mediav.com',
  'adform.net',
  'adroll.com',
  'adblade.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'exoclick.com',
  'adsterra.com',
  'infolinks.com',
  'exponential.com',
  'sovrn.com',
  'revcontent.com',
  'mgid.com',
  'zergnet.com',
  'amazon-adsystem.com',
  'yieldmo.com',
  'sharethrough.com',
  'triplelift.com',
  'smartadserver.com',
  'lijit.com',
  'spotxchange.com',
  'indexexchange.com',
  'appnexus.com',
  // Trackers & Telemetry
  'scorecardresearch.com',
  'quantserve.com',
  'hotjar.com',
  'crazyegg.com',
  'mouseflow.com',
  'fullstory.com',
  'clarity.ms',
  'segment.io',
  'mixpanel.com',
  'amplitude.com',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
  'pixel.facebook.com',
  'ads.tiktok.com',
  'analytics.tiktok.com',
  'ads-twitter.com',
  'static.ads-twitter.com',
  'bat.bing.com',
  'ad.atdmt.com',
  // Cryptomining & Malware
  'coinhive.com',
  'coin-hive.com',
  'jsecoin.com',
  'cryptoloot.pro',
  'webminepool.com',
];

export const DAPS_BLOCKED_PATTERNS = [
  /\/pagead\//i,
  /\/adservice\//i,
  /\/googleads\//i,
  /\/advertisement\//i,
  /\/ads\/\d+x\d+/i,
  /\/popunder/i,
  /\/adserver/i,
  /\/adsystem/i,
  /\/outbrain\.js/i,
  /\/taboola\.js/i,
  /\/adsense/i,
];

/**
 * Checks if a given network URL is flagged by Daps Shield
 */
export function isBlockedByDapsShield(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();

  // 1. NEVER block embedded media players or video streams
  for (let i = 0; i < WHITELISTED_MEDIA_DOMAINS.length; i++) {
    if (lower.includes(WHITELISTED_MEDIA_DOMAINS[i])) {
      return false;
    }
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    for (let i = 0; i < DAPS_BLOCKED_DOMAINS.length; i++) {
      const blocked = DAPS_BLOCKED_DOMAINS[i];
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return true;
      }
    }

    for (let i = 0; i < DAPS_BLOCKED_PATTERNS.length; i++) {
      if (DAPS_BLOCKED_PATTERNS[i].test(lower)) {
        return true;
      }
    }
  } catch {
    for (let i = 0; i < DAPS_BLOCKED_DOMAINS.length; i++) {
      if (lower.includes(DAPS_BLOCKED_DOMAINS[i])) return true;
    }
  }
  return false;
}

/**
 * Injected script for Daps Shield:
 * - Neutralizes tracker globals without breaking normal page scripts
 * - Intercepts fetch & XHR ad calls
 * - Hides visual ad banners while preserving embedded videos and iframes
 * - Restores body scrolling from anti-adblock modals
 */
export function generateDapsShieldScript(
  enabled: boolean,
  mode: DapsShieldMode = 'standard'
): string {
  if (!enabled || mode === 'disabled') {
    return '/* Daps Shield Disabled */ true;';
  }

  const aggressive = mode === 'aggressive';

  return `
(function() {
  if (window.__daps_shield_initialized) return;
  window.__daps_shield_initialized = true;

  var domainBlockList = ${JSON.stringify(DAPS_BLOCKED_DOMAINS)};
  var mediaWhitelist = ${JSON.stringify(WHITELISTED_MEDIA_DOMAINS)};

  function shouldBlockUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var lower = url.toLowerCase();

    // Always allow media embeds
    for (var m = 0; m < mediaWhitelist.length; m++) {
      if (lower.indexOf(mediaWhitelist[m]) !== -1) return false;
    }

    for (var i = 0; i < domainBlockList.length; i++) {
      if (lower.indexOf(domainBlockList[i]) !== -1) return true;
    }

    if (/\\/(pagead|adservice|googleads|advertisement|outbrain|taboola|adsbygoogle|banner-ad)/i.test(lower)) {
      return true;
    }

    ${aggressive ? `
    if (/\\/(telemetry|collector|stats)/i.test(lower)) {
      return true;
    }
    ` : ''}

    return false;
  }

  function notifyBlocked(sourceUrl, filterType) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DAPS_SHIELD_BLOCKED',
          count: 1,
          url: sourceUrl || '',
          filter: filterType || 'network'
        }));
      }
    } catch(e) {}
  }

  // 1. Scriptlets: Defuse tracker globals safely
  try {
    window.adsbygoogle = {
      push: function() {
        notifyBlocked('adsbygoogle.push', 'scriptlet');
        return 1;
      },
      loaded: true
    };

    window.googletag = {
      cmd: {
        push: function(cb) {
          try { if (typeof cb === 'function') cb(); } catch(e) {}
        }
      },
      display: function() { notifyBlocked('googletag.display', 'scriptlet'); },
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
      defineSlot: function() {
        return {
          addService: function() { return this; },
          setTargeting: function() { return this; }
        };
      }
    };

    window.ga = function() { notifyBlocked('google-analytics', 'scriptlet'); };
    window.gtag = function() { notifyBlocked('gtag', 'scriptlet'); };
    window.fbq = function() { notifyBlocked('facebook-pixel', 'scriptlet'); };
  } catch(e) {}

  // 2. Fetch Interception
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function() {
      var url = arguments[0];
      if (typeof url === 'object' && url !== null && url.url) {
        url = url.url;
      }
      if (shouldBlockUrl(url)) {
        notifyBlocked(url, 'fetch');
        return Promise.resolve(new Response('', { status: 204, statusText: 'Blocked by Daps Shield' }));
      }
      return origFetch.apply(this, arguments);
    };
  }

  // 3. XMLHttpRequest Interception
  if (window.XMLHttpRequest) {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.__targetUrl = url;
      if (shouldBlockUrl(url)) {
        this.__blockedByDaps = true;
      }
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
      if (this.__blockedByDaps) {
        notifyBlocked(this.__targetUrl, 'xhr');
        try {
          Object.defineProperty(this, 'readyState', { value: 4, writable: true });
          Object.defineProperty(this, 'status', { value: 204, writable: true });
          Object.defineProperty(this, 'responseText', { value: '', writable: true });
        } catch(e) {}
        return;
      }
      return origSend.apply(this, arguments);
    };
  }

  // 4. Cosmetic Stylesheet: Target ad containers, NEVER video elements or iframes
  var cosmeticCss = \`
    .ad, .ads, .advert, .advertising, .advertisement,
    .ad-banner, .banner-ad, .ad-container, .ads-container,
    .ad-wrapper, .ad-box, .ad-slot, .ad-unit,
    [id^="ad_"], [id^="ads_"], [id^="google_ads_"],
    [class*="sponsored-"], [class*="sponsored_"],
    .adsbygoogle, .taboola, .outbrain,
    [data-ad], [data-ad-unit], [data-ad-slot], [data-dfp-id],
    .ad-placeholder, .native-ad,
    #ad-container, #advertisement, #adblock-banner
    {
      display: none !important;
      visibility: hidden !important;
      height: 0px !important;
      min-height: 0px !important;
      width: 0px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }
  \`;

  function injectStyle() {
    if (document.getElementById('daps-shield-cosmetic')) return;
    var style = document.createElement('style');
    style.id = 'daps-shield-cosmetic';
    style.textContent = cosmeticCss;
    var target = document.head || document.documentElement;
    if (target) target.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyle);
  } else {
    injectStyle();
  }

  // 5. DOM MutationObserver: Hide ad banners, NEVER remove iframes so video embeds always play
  function setupDomShield() {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType === 1) {
            // Only hide explicit ad widgets, DO NOT remove iframes
            if (node.matches && node.matches('.adsbygoogle, [id^="google_ads_"], .taboola, .outbrain')) {
              node.style.setProperty('display', 'none', 'important');
              notifyBlocked('cosmetic_element', 'dom');
            }
          }
        }
      }

      // Counteract anti-adblock body scroll lock
      if (document.body && document.body.style.overflow === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDomShield);
  } else {
    setupDomShield();
  }
})();
true;
`;
}

/**
 * Calculates estimated data and time saved from blocked ads
 */
export function calculateShieldSavings(totalBlocked: number) {
  const bytesSaved = totalBlocked * 55 * 1024;
  const timeSavedSeconds = totalBlocked * 0.045;

  const formattedData =
    bytesSaved > 1024 * 1024 * 1024
      ? `${(bytesSaved / (1024 * 1024 * 1024)).toFixed(1)} GB`
      : bytesSaved > 1024 * 1024
      ? `${(bytesSaved / (1024 * 1024)).toFixed(1)} MB`
      : `${(bytesSaved / 1024).toFixed(0)} KB`;

  const formattedTime =
    timeSavedSeconds > 60
      ? `${(timeSavedSeconds / 60).toFixed(1)}m`
      : `${timeSavedSeconds.toFixed(1)}s`;

  return {
    bytesSaved,
    formattedData,
    formattedTime,
  };
}
