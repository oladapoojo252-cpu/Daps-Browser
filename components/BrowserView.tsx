import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, Linking } from 'react-native';
import { adblockManager, RequestType } from '../utils/adblockEngine';
import { startDownload, saveBase64Download, DownloadItem } from '../utils/downloadManager';
import { SniffedMediaItem } from './SnifferModal';

interface BrowserViewProps {
  url: string;
  onNavigationStateChange: (navState: any) => void;
  onProgress: (progress: number) => void;
  adBlockEnabled: boolean;
  isDarkMode?: boolean;
  userAgent?: string;
  isPrivate?: boolean;
  onDownloadStarted?: (item: DownloadItem) => void;
  onDownloadComplete?: (item: DownloadItem) => void;
  onShieldBlocked?: (blockedUrl: string, filterType: string) => void;
  onOpenNewTab?: (url: string) => void;
  onScrollDirection?: (direction: 'up' | 'down') => void;
  onMediaDetected?: (items: SniffedMediaItem[]) => void;
}

export const BrowserView = forwardRef<any, BrowserViewProps>(
  (
    {
      url,
      onNavigationStateChange,
      onProgress,
      adBlockEnabled,
      isDarkMode = false,
      userAgent,
      isPrivate = false,
      onDownloadStarted,
      onDownloadComplete,
      onShieldBlocked,
      onOpenNewTab,
      onScrollDirection,
      onMediaDetected,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const lastScrollY = useRef(0);

    useImperativeHandle(ref, () => ({
      goBack: () => webViewRef.current?.goBack(),
      goForward: () => webViewRef.current?.goForward(),
      reload: () => webViewRef.current?.reload(),
      stopLoading: () => webViewRef.current?.stopLoading(),
      injectJavaScript: (script: string) => webViewRef.current?.injectJavaScript(script),
    }));

    // Native scroll direction tracker for floating dock auto-hide
    const handleNativeScroll = (event: any) => {
      const currentY = event?.nativeEvent?.contentOffset?.y ?? 0;
      const diff = currentY - lastScrollY.current;
      if (Math.abs(diff) >= 8) {
        if (diff > 0 && currentY > 40) {
          onScrollDirection?.('down');
        } else if (diff < 0) {
          onScrollDirection?.('up');
        }
        lastScrollY.current = currentY;
      }
    };

    // Injected script handles:
    // 1. Theme sync (webview matches app dark/light mode and overrides window.matchMedia)
    // 2. Brave adblock-resources scriptlets (Google Ads, analytics, tags)
    // 3. Subresource Fetch & XHR blocking
    // 4. EasyList cosmetic CSS element hiding
    // 5. Popup & Screen takeover overlay defusers
    // 6. Download links & blob URL interception
    const shieldScript = useMemo(() => {
      if (!adBlockEnabled) {
        const themeScheme = isDarkMode ? 'dark' : 'light';
        return `
          (function(){
            try {
              document.documentElement.style.setProperty('color-scheme', '${themeScheme}', 'important');
              var m = window.matchMedia;
              window.matchMedia = function(q) {
                if (q && q.includes('prefers-color-scheme')) {
                  return { matches: ${isDarkMode}, media: q, onchange: null, addListener: function(){}, removeListener: function(){}, addEventListener: function(){}, removeEventListener: function(){}, dispatchEvent: function(){ return false; } };
                }
                return m ? m.apply(this, arguments) : { matches: false };
              };
            } catch(e) {}
          })();
          true;
        `;
      }
      return adblockManager.generateShieldScript(isDarkMode);
    }, [adBlockEnabled, isDarkMode]);

    // Whitelist media & video embed hosts (YouTube, Vimeo, Dailymotion, Twitch, Streaming hosts, etc.)
    const isWhitelistedMedia = (targetUrl: string): boolean => {
      if (!targetUrl) return false;
      const lower = targetUrl.toLowerCase();
      return (
        lower.includes('youtube.com') ||
        lower.includes('youtu.be') ||
        lower.includes('youtube-nocookie.com') ||
        lower.includes('player.vimeo.com') ||
        lower.includes('vimeo.com') ||
        lower.includes('dailymotion.com') ||
        lower.includes('dmcdn.net') ||
        lower.includes('twitch.tv') ||
        lower.includes('streamable.com') ||
        lower.includes('googlevideo.com') ||
        lower.includes('jwplatform.com') ||
        lower.includes('jwpcdn.com') ||
        lower.includes('brightcove') ||
        lower.includes('wistia') ||
        lower.includes('kaltura') ||
        lower.includes('soundcloud.com') ||
        lower.includes('spotify.com') ||
        lower.includes('rumble.com') ||
        lower.includes('odysee.com') ||
        lower.includes('bilibili.com') ||
        lower.includes('vidsrc') ||
        lower.includes('superembed') ||
        lower.includes('streamtape') ||
        lower.includes('doodstream') ||
        lower.includes('dood.') ||
        lower.includes('filemoon') ||
        lower.includes('mixdrop') ||
        lower.includes('mp4upload') ||
        lower.includes('megacloud') ||
        lower.includes('streamwish') ||
        lower.includes('vidcloud') ||
        lower.includes('rabbitstream') ||
        lower.includes('dokicloud') ||
        lower.includes('voe.sx') ||
        lower.includes('vidhide') ||
        lower.includes('streamembed') ||
        lower.includes('2embed') ||
        lower.includes('upstream') ||
        lower.includes('dropload') ||
        lower.includes('cloudemb') ||
        lower.includes('uqload') ||
        lower.includes('embedrise') ||
        lower.includes('smashystream') ||
        lower.includes('multiembed') ||
        lower.includes('vidmoly') ||
        lower.includes('streamcloud') ||
        lower.includes('vidplay') ||
        lower.includes('mycloud') ||
        lower.includes('mcloud') ||
        lower.includes('vidfast') ||
        lower.includes('streamlare') ||
        lower.includes('streamruby') ||
        lower.includes('videa') ||
        lower.includes('waaw') ||
        lower.includes('netu') ||
        lower.includes('streamio') ||
        lower.includes('closeload') ||
        lower.includes('streamin') ||
        lower.includes('luluvdo') ||
        lower.includes('streamquicker') ||
        lower.includes('vidbm') ||
        lower.includes('vidoza') ||
        lower.includes('streamvid') ||
        lower.includes('vidlox') ||
        lower.includes('streamhub') ||
        lower.includes('rapidcloud') ||
        lower.includes('filelions') ||
        lower.includes('turbovid') ||
        lower.includes('ok.ru') ||
        lower.includes('vk.com') ||
        lower.includes('/embed') ||
        lower.includes('/player') ||
        lower.includes('/video/') ||
        lower.includes('/watch') ||
        lower.includes('/play') ||
        lower.includes('.m3u8') ||
        lower.includes('.mp4') ||
        lower.includes('.webm') ||
        lower.includes('.mp3') ||
        lower.includes('.wav') ||
        lower.includes('.ogg') ||
        lower.includes('.ts') ||
        lower.includes('.mpd') ||
        lower.startsWith('blob:') ||
        lower.startsWith('data:')
      );
    };

    // Detect popup redirect & click-jacking ad networks
    const isAdNetworkRedirect = (targetUrl: string): boolean => {
      if (!targetUrl) return false;
      const lower = targetUrl.toLowerCase();
      return /popads|popcash|propellerads|propush|exoclick|exdynsrv|exosrv|adsterra|hilltopads|ad-maven|yllix|deloton|monetag|richpush|evadav|zeropark|clickadu|adcash|onclickperformance|juicyads|ero-advertising|trafficstars|trafficjunky|doubleclick|googleads|pagead2?\.googlesyndication|adservice\.google|tpc\.googlesyndication/i.test(
        lower
      );
    };

    // Detect standalone downloadable archives, media, documents, installers, and packages
    const isDownloadableUrl = (targetUrl: string): boolean => {
      if (!targetUrl) return false;
      const lower = targetUrl.toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('about:') || lower.startsWith('mailto:')) {
        return false;
      }
      if (lower.startsWith('blob:')) return true;

      const clean = targetUrl.split('?')[0].split('#')[0].toLowerCase();
      const downloadableExtensions = [
        // Documents & eBooks
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.epub', '.rtf', '.odt',
        // Archives, Installers & Packages
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.apk', '.dmg', '.exe', '.iso', '.bin', '.torrent', '.pkg', '.deb', '.rpm', '.msi', '.jar',
        // Media direct file downloads
        '.mp4', '.mkv', '.avi', '.webm', '.mov', '.flv', '.wmv', '.m4v', '.3gp', '.ts', '.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.opus',
        // Subtitles
        '.srt', '.vtt', '.ass',
      ];
      if (downloadableExtensions.some(ext => clean.endsWith(ext))) return true;

      // Check URL query parameters and pathname patterns
      try {
        const u = new URL(targetUrl);
        // Explicit query triggers
        if (
          u.searchParams.has('download') ||
          u.searchParams.get('export') === 'download' ||
          u.searchParams.has('dl') ||
          u.searchParams.get('response-content-disposition')?.includes('attachment')
        ) {
          return true;
        }

        // Query param values ending with downloadable extension
        for (const [, val] of u.searchParams.entries()) {
          const lowerVal = val.toLowerCase();
          if (downloadableExtensions.some(ext => lowerVal.endsWith(ext))) {
            return true;
          }
        }

        // Check path keywords (e.g. /download/, /get/, /dl/ with ID)
        const path = u.pathname.toLowerCase();
        if (/(^|\/)(download|get-file|export|attachment)\/[a-z0-9_-]+/i.test(path)) {
          return true;
        }
      } catch {}

      return false;
    };

    const triggerDownload = async (downloadUrl: string, suggestedFilename?: string) => {
      try {
        const item = await startDownload(downloadUrl, suggestedFilename, completed => {
          onDownloadComplete?.(completed);
        });
        onDownloadStarted?.(item);
      } catch (e) {
        console.error('Download failed', e);
      }
    };

    const handleShouldStartLoad = (request: any): boolean => {
      const targetUrl = request.url;
      if (!targetUrl) return true;
      const lower = targetUrl.toLowerCase();

      // 1. External custom schemes (magnet, intent, market, etc.)
      if (lower.startsWith('magnet:') || lower.startsWith('intent:') || lower.startsWith('market:')) {
        Linking.openURL(targetUrl).catch(() => {});
        return false;
      }

      // 2. Direct downloadable archives / media / documents
      if (isDownloadableUrl(targetUrl)) {
        triggerDownload(targetUrl);
        return false;
      }

      // 3. Subframe / iframe requests: Allow video players and embed frames to load (never show "Embedding blocked")
      if (request.isTopFrame === false) {
        return true;
      }

      // 4. Video & Media Embed Whitelist (Always allowed, never blocked)
      if (isWhitelistedMedia(targetUrl)) {
        return true;
      }

      // 5. Ad network redirect & popup block (ONLY if NOT a download and NOT media)
      if (adBlockEnabled && isAdNetworkRedirect(targetUrl)) {
        onShieldBlocked?.(targetUrl, 'Popup / Redirect Ad Blocked');
        return false;
      }

      // 6. Brave adblock-rust tokenized network check for top-level pages
      if (adBlockEnabled) {
        let reqType: RequestType = 'other';
        if (targetUrl.endsWith('.js') || targetUrl.includes('/script')) reqType = 'script';
        else if (/\.(png|jpe?g|gif|webp|svg)/i.test(targetUrl)) reqType = 'image';
        else if (targetUrl.endsWith('.css')) reqType = 'stylesheet';

        const result = adblockManager.checkRequest(targetUrl, url, reqType);
        if (result.matched) {
          onShieldBlocked?.(targetUrl, result.reason || 'adblock-rust');
          return false;
        }
      }

      return true;
    };

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'shield_blocked') {
          onShieldBlocked?.(data.url, 'Daps Shield');
        } else if (data.type === 'open_magnet' && data.url) {
          Linking.openURL(data.url).catch(() => {});
        } else if (data.type === 'start_download' && data.url) {
          triggerDownload(data.url, data.filename);
        } else if (data.type === 'open_window' && data.url) {
          if (data.url.startsWith('magnet:') || data.url.startsWith('intent:')) {
            Linking.openURL(data.url).catch(() => {});
          } else if (isDownloadableUrl(data.url)) {
            triggerDownload(data.url);
          } else if (adBlockEnabled && isAdNetworkRedirect(data.url)) {
            onShieldBlocked?.(data.url, 'Popup Ad Blocked');
          } else {
            onOpenNewTab?.(data.url);
          }
        } else if (data.type === 'scroll_direction' && data.direction) {
          onScrollDirection?.(data.direction);
        } else if (data.type === 'media_detected' && Array.isArray(data.items)) {
          onMediaDetected?.(data.items);
        } else if (data.type === 'start_blob_download' && data.dataUri) {
          saveBase64Download(data.dataUri, data.filename, item => {
            onDownloadComplete?.(item);
          })
            .then(item => {
              onDownloadStarted?.(item);
            })
            .catch(err => console.error('Blob download error', err));
        }
      } catch (e) {}
    };

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          incognito={isPrivate}
          userAgent={
            userAgent ||
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
          }
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={e => onNavigationStateChange(e.nativeEvent)}
          onLoadProgress={e => onProgress(e.nativeEvent.progress)}
          injectedJavaScriptBeforeContentLoaded={shieldScript}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
          injectedJavaScript={shieldScript}
          injectedJavaScriptForMainFrameOnly={false}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onMessage={handleMessage}
          onOpenWindow={(syntheticEvent) => {
            const targetUrl = syntheticEvent.nativeEvent.targetUrl;
            if (!targetUrl) return;
            if (targetUrl.startsWith('magnet:') || targetUrl.startsWith('intent:')) {
              Linking.openURL(targetUrl).catch(() => {});
              return;
            }
            if (isDownloadableUrl(targetUrl)) {
              triggerDownload(targetUrl);
              return;
            }
            if (adBlockEnabled && isAdNetworkRedirect(targetUrl)) {
              onShieldBlocked?.(targetUrl, 'Popup Ad Blocked');
              return;
            }
            onOpenNewTab?.(targetUrl);
          }}
          onScroll={handleNativeScroll}
          javaScriptEnabled={true}
          domStorageEnabled={!isPrivate}
          originWhitelist={['*']}
          mixedContentMode="always"
          thirdPartyCookiesEnabled={!isPrivate}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          allowsProtectedMedia={true}
          allowsBackForwardNavigationGestures={true}
          javaScriptCanOpenWindowsAutomatically={true}
          setSupportMultipleWindows={true}
          forceDarkOn={isDarkMode}
          onFileDownload={({ nativeEvent: { downloadUrl } }) => {
            triggerDownload(downloadUrl);
          }}
          style={[styles.webview, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});