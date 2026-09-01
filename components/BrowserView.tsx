import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const BrowserView = forwardRef(
  (
    {
      url,
      onNavigationStateChange,
      onProgress,
      adBlockEnabled,
      userAgent,
      isPrivate,
      onDownloadComplete,
    }: any,
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      goBack: () => webViewRef.current?.goBack(),
      goForward: () => webViewRef.current?.goForward(),
      reload: () => webViewRef.current?.reload(),
    }));

    const shieldScript = `
      (function() {
        const selectors = [
          '.ad', '.ads', '.adsbygoogle', '[id^="google_ads_"]', 'iframe[src*="googleads"]',
          'iframe[src*="doubleclick"]', '.taboola', '.outbrain', '[data-ad]', '[data-ad-unit]',
          '.advertisement', '#advertisement', '.banner-ad', '.ad-container'
        ];
        const removeAds = () => {
          selectors.forEach(s => {
            document.querySelectorAll(s).forEach(el => {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('height', '0px', 'important');
            });
          });
        };
        removeAds();
        setInterval(removeAds, 1000);
      })();
      true;
    `;

    const handleDownload = async (downloadUrl: string) => {
      try {
        const rawFileName = downloadUrl.split('/').pop()?.split('?')[0] || `file_${Date.now()}`;
        const baseDirectory = (FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory ?? '';
        const fileUri = `${baseDirectory}${rawFileName}`;
        const result = await FileSystem.downloadAsync(downloadUrl, fileUri);

        const newFile = {
          id: Date.now().toString(),
          name: rawFileName,
          url: result.uri,
          date: new Date().toLocaleDateString(),
          status: 'Completed',
        };

        onDownloadComplete(newFile);

        Alert.alert('Download Complete', `Saved ${rawFileName}.`, [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Share / View',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(result.uri);
              }
            },
          },
        ]);
      } catch (e) {
        Alert.alert('Download Error', 'Could not save file.');
      }
    };

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          userAgent={userAgent}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={e => onNavigationStateChange(e.nativeEvent)}
          onLoadProgress={e => onProgress(e.nativeEvent.progress)}
          injectedJavaScriptBeforeContentLoaded={adBlockEnabled ? shieldScript : undefined}
          injectedJavaScript={adBlockEnabled ? shieldScript : undefined}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          onFileDownload={({ nativeEvent: { downloadUrl } }) => {
            handleDownload(downloadUrl);
          }}
          setSupportMultipleWindows={false}
          style={[styles.webview, { backgroundColor: isPrivate ? '#000000' : '#FFFFFF' }]}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1 },
});