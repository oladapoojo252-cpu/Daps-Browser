import * as FileSystemLegacy from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@daps_cached_favicons_v1';
const FAVICON_DIR = `${FileSystemLegacy.documentDirectory || FileSystemLegacy.cacheDirectory || ''}favicons/`;

// In-memory instant lookup map (domain -> local file URI)
const memoryCache: Record<string, string> = {};
const pendingDownloads: Map<string, Promise<string | null>> = new Map();
const listeners: Map<string, Set<(uri: string) => void>> = new Map();

let isInitialized = false;
let dirReadyPromise: Promise<boolean> | null = null;

/**
 * Extracts a normalized hostname/domain from a URL.
 */
export function extractDomain(url: string): string {
  if (!url || url === 'home') return '';
  try {
    const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const parsed = new URL(formatted);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    const clean = url.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split('#')[0];
    return clean.toLowerCase().replace(/^www\./, '');
  }
}

/**
 * Sanitizes domain name to a safe filename on disk.
 */
function getLocalFilename(domain: string): string {
  const safeName = domain.replace(/[^a-z0-9_-]/gi, '_');
  return `fav_${safeName}.png`;
}

/**
 * Ensures the favicons directory exists on disk.
 */
async function ensureDirExists(): Promise<boolean> {
  if (dirReadyPromise) return dirReadyPromise;

  dirReadyPromise = (async () => {
    try {
      if (!FileSystemLegacy || (!FileSystemLegacy.documentDirectory && !FileSystemLegacy.cacheDirectory)) {
        return false;
      }
      const dirInfo = await FileSystemLegacy.getInfoAsync(FAVICON_DIR);
      if (!dirInfo.exists) {
        await FileSystemLegacy.makeDirectoryAsync(FAVICON_DIR, { intermediates: true });
      }
      return true;
    } catch (e) {
      console.warn('[FaviconCache] Failed to ensure favicon dir:', e);
      return false;
    }
  })();

  return dirReadyPromise;
}

/**
 * Initializes the in-memory cache from persistent AsyncStorage.
 */
export async function initFaviconCache(): Promise<void> {
  if (isInitialized) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(memoryCache, parsed);
    }
    isInitialized = true;
  } catch (e) {
    console.warn('[FaviconCache] Init error:', e);
  }
}

/**
 * Synchronous cache lookup for instantaneous 0ms UI rendering without flickering.
 */
export function getSynchronousCachedFavicon(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;
  return memoryCache[domain] || null;
}

/**
 * Returns remote fallback URL for a domain.
 */
export function getRemoteFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Subscribes to cache updates for a specific domain.
 */
export function subscribeFavicon(domain: string, callback: (uri: string) => void): () => void {
  if (!listeners.has(domain)) {
    listeners.set(domain, new Set());
  }
  listeners.get(domain)!.add(callback);

  return () => {
    const domainListeners = listeners.get(domain);
    if (domainListeners) {
      domainListeners.delete(callback);
      if (domainListeners.size === 0) {
        listeners.delete(domain);
      }
    }
  };
}

function notifyFaviconReady(domain: string, localUri: string) {
  memoryCache[domain] = localUri;
  const domainListeners = listeners.get(domain);
  if (domainListeners) {
    domainListeners.forEach(cb => {
      try {
        cb(localUri);
      } catch (err) {
        console.warn('[FaviconCache] Callback error:', err);
      }
    });
  }

  // Persist updated cache map
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)).catch(() => {});
}

/**
 * Downloads and caches the favicon for a URL to local device storage.
 * If already cached on disk, returns the local URI immediately.
 */
export async function cacheFavicon(url: string): Promise<string | null> {
  const domain = extractDomain(url);
  if (!domain) return null;

  // 1. In-memory check
  if (memoryCache[domain]) {
    return memoryCache[domain];
  }

  // 2. Prevent duplicate concurrent downloads
  if (pendingDownloads.has(domain)) {
    return pendingDownloads.get(domain)!;
  }

  const downloadPromise = (async () => {
    try {
      await initFaviconCache();
      if (memoryCache[domain]) return memoryCache[domain];

      const dirReady = await ensureDirExists();
      const localPath = `${FAVICON_DIR}${getLocalFilename(domain)}`;

      if (dirReady) {
        // Check if file is already on disk
        const fileInfo = await FileSystemLegacy.getInfoAsync(localPath);
        if (fileInfo.exists && typeof fileInfo.size === 'number' && fileInfo.size > 0) {
          notifyFaviconReady(domain, localPath);
          return localPath;
        }

        // Download from Google's high-res favicon CDN to local disk
        const remoteUrl = getRemoteFaviconUrl(domain);
        const downloadRes = await FileSystemLegacy.downloadAsync(remoteUrl, localPath);

        if (downloadRes && downloadRes.status >= 200 && downloadRes.status < 300) {
          const downloadedInfo = await FileSystemLegacy.getInfoAsync(downloadRes.uri);
          if (downloadedInfo.exists && typeof downloadedInfo.size === 'number' && downloadedInfo.size > 0) {
            notifyFaviconReady(domain, downloadRes.uri);
            return downloadRes.uri;
          }
        }
      }

      // If disk cache is unavailable, fallback to remote
      return getRemoteFaviconUrl(domain);
    } catch (e) {
      console.warn(`[FaviconCache] Failed to cache favicon for ${domain}:`, e);
      return getRemoteFaviconUrl(domain);
    } finally {
      pendingDownloads.delete(domain);
    }
  })();

  pendingDownloads.set(domain, downloadPromise);
  return downloadPromise;
}

/**
 * Batch prefetch and cache favicons for a list of bookmarks.
 */
export function prefetchBookmarkFavicons(bookmarks: { url: string }[]) {
  if (!bookmarks || !bookmarks.length) return;
  // Initialize and prefetch in the background
  initFaviconCache().then(() => {
    bookmarks.forEach(bm => {
      if (bm.url && bm.url !== 'home') {
        const domain = extractDomain(bm.url);
        if (domain && !memoryCache[domain]) {
          cacheFavicon(bm.url).catch(() => {});
        }
      }
    });
  });
}
