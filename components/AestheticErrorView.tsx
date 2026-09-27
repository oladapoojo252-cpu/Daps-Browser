import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
} from 'react-native-svg';
import { RotateCw, Home } from 'lucide-react-native';

interface AestheticErrorViewProps {
  url: string;
  errorDomain?: string;
  errorCode?: number;
  errorDescription?: string;
  isDarkMode?: boolean;
  isPrivate?: boolean;
  onReload: () => void;
  onHome?: () => void;
}

export const AestheticErrorView: React.FC<AestheticErrorViewProps> = ({
  url,
  errorDomain,
  errorCode,
  errorDescription,
  isDarkMode = false,
  isPrivate = false,
  onReload,
  onHome,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const dark = isDarkMode || isPrivate;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 5,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  // Determine error classification
  const desc = (errorDescription || '').toUpperCase();
  const isOffline = desc.includes('DISCONNECTED') || desc.includes('NETWORK') || desc.includes('INTERNET') || errorCode === -6;
  const isDnsError = desc.includes('NAME_NOT_RESOLVED') || desc.includes('HOST_LOOKUP') || errorCode === -2;
  const isTimeout = desc.includes('TIMED_OUT') || desc.includes('TIMEOUT') || errorCode === -8;
  const isSsl = desc.includes('SSL') || desc.includes('CERT') || errorCode === -11;

  let title = "Can't Reach This Page";
  let explanation = "Check your connection and try again.";

  if (isOffline) {
    title = "You're Offline";
    explanation = "Check your Wi-Fi or mobile network and try again.";
  } else if (isDnsError) {
    title = "Site Not Found";
    explanation = "The address could not be reached. Check for typos and try again.";
  } else if (isTimeout) {
    title = "Connection Timed Out";
    explanation = "The site took too long to respond. Please try again in a moment.";
  } else if (isSsl) {
    title = "Connection Not Secure";
    explanation = "A secure connection could not be established with this site.";
  }

  const theme = {
    bg: dark ? '#000000' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#000000',
    subtext: dark ? '#8E8E93' : '#6E6E73',
    btnBg: dark ? '#FFFFFF' : '#000000',
    btnText: dark ? '#000000' : '#FFFFFF',
    card: dark ? '#1C1C1E' : '#F2F2F7',
    border: dark ? '#2C2C2E' : '#E5E5EA',
    svgMuted: dark ? '#48484A' : '#C7C7CC',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.centerCard}>
        {/* Crisp Vector SVG Illustration */}
        <Animated.View style={[styles.svgWrapper, { transform: [{ translateY: floatAnim }] }]}>
          <Svg width={96} height={84} viewBox="0 0 96 84" fill="none">
            {/* Outer Signal Wave */}
            <Path
              d="M24 28 C 38 14, 58 14, 72 28"
              stroke={theme.svgMuted}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
            {/* Mid Signal Wave */}
            <Path
              d="M32 36 C 42 26, 54 26, 64 36"
              stroke={theme.text}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
            {/* Inner Signal Wave */}
            <Path
              d="M40 44 C 45 39, 51 39, 56 44"
              stroke={theme.text}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
            {/* Transmitter Point */}
            <Circle cx={48} cy={54} r={4} fill={theme.text} />
            {/* Mast & Base */}
            <Line x1={48} y1={58} x2={48} y2={70} stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={36} y1={70} x2={60} y2={70} stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </Animated.View>

        {/* Clean Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>

        {/* Plain Text Subtitle - No bubbles, no fake pills */}
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          {explanation}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.btnBg }]}
            onPress={onReload}
            activeOpacity={0.8}
          >
            <RotateCw size={15} color={theme.btnText} style={{ marginRight: 8 }} />
            <Text style={[styles.primaryBtnText, { color: theme.btnText }]}>
              Try Again
            </Text>
          </TouchableOpacity>

          {onHome && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onHome}
              activeOpacity={0.8}
            >
              <Home size={15} color={theme.text} style={{ marginRight: 8 }} />
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                Daps Home
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 9999,
    elevation: 999,
  },
  centerCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    // Elevate into the exact visual center between top address bar and floating bottom dock
    transform: [{ translateY: -55 }],
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
