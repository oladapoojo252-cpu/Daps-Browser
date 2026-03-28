import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, Alert } from 'react-native';

export const BrowserView = forwardRef(({ 
  url, 
  onNavigationStateChange, 
  onProgress, 
  adBlockEnabled, 
  userAgent, 
  isPrivate,
  onDownloadComplete 
}: any, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    goBack: () => webViewRef.current?.goBack(),
    goForward: () => webViewRef.current?.goForward(),
    reload: () => webViewRef.current?.reload(),
  }));

  const adBlockJS = adBlockEnabled ? `
    (function() {
      const selectors = ['.ad', '.ads', '.adsbygoogle', '[id^="google_ads_"]', 'iframe[src*="googleads"]'];
      const removeAds = () => {
        selectors.forEach(s => document.querySelectorAll(s).forEach(el => el.style.display = 'none'));
      };
      removeAds();
      setInterval(removeAds, 2000);
    })();
    true;
  ` : '';

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        userAgent={userAgent}
        onNavigationStateChange={(nav) => {
          onNavigationStateChange(nav);
        }}
        onLoadStart={(e) => onNavigationStateChange(e.nativeEvent)}
        onLoadProgress={(e) => onProgress(e.nativeEvent.progress)}
        injectedJavaScript={adBlockJS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onShouldStartLoadWithRequest={() => true}
        
        // DOWNLOAD LOGIC: Formats file for the Daps Browser settings list
        onFileDownload={({ nativeEvent: { downloadUrl } }) => {
          const fileName = downloadUrl.split('/').pop() || 'downloaded_file';
          const newFile = {
            id: Date.now().toString(),
            name: fileName,
            url: downloadUrl,
            date: new Date().toLocaleDateString(),
            status: 'Completed'
          };
          onDownloadComplete(newFile);
          Alert.alert("Daps Technologies", "Download added to your library.");
        }}

        setSupportMultipleWindows={false}
        style={[styles.webview, { backgroundColor: isPrivate ? '#000' : '#fff' }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1 }
});