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
  Rect,
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

  const renderErrorIllustration = () => {
    if (isOffline) {
      return (
        <Svg width={96} height={84} viewBox="0 0 96 84" fill="none">
          {/* Wi-Fi Arcs */}
          <Path
            d="M18 30 C 34 14, 62 14, 78 30"
            stroke={theme.svgMuted}
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M28 40 C 40 28, 56 28, 68 40"
            stroke={theme.text}
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M38 50 C 44 44, 52 44, 58 50"
            stroke={theme.text}
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
          {/* Wi-Fi Base Dot */}
          <Circle cx={48} cy={62} r={4} fill={theme.text} />
          {/* Clean Disconnect Slash */}
          <Line x1={26} y1={20} x2={70} y2={68} stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      );
    }

    if (isDnsError) {
      return (
        <Svg width={96} height={84} viewBox="0 0 96 84" fill="none">
          {/* Globe Outer Circle */}
          <Circle cx={44} cy={42} r={26} stroke={theme.text} strokeWidth={2.5} fill="none" />
          {/* Equator & Meridian lines */}
          <Line x1={18} y1={42} x2={70} y2={42} stroke={theme.svgMuted} strokeWidth={2} strokeLinecap="round" />
          <Path
            d="M44 16 C 33 25, 33 59, 44 68"
            stroke={theme.svgMuted}
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M44 16 C 55 25, 55 59, 44 68"
            stroke={theme.svgMuted}
            strokeWidth={2}
            fill="none"
          />
          {/* Search Magnifier inspecting globe */}
          <Circle cx={62} cy={52} r={10} stroke={theme.text} strokeWidth={2.5} fill={theme.bg} />
          <Line x1={69} y1={59} x2={80} y2={70} stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
          {/* Small 'x' in lens */}
          <Line x1={59} y1={49} x2={65} y2={55} stroke={theme.text} strokeWidth={1.8} strokeLinecap="round" />
          <Line x1={65} y1={49} x2={59} y2={55} stroke={theme.text} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    }

    if (isTimeout) {
      return (
        <Svg width={96} height={84} viewBox="0 0 96 84" fill="none">
          {/* Clock face */}
          <Circle cx={48} cy={42} r={26} stroke={theme.text} strokeWidth={2.5} fill="none" />
          {/* Outer dashed waiting orbit */}
          <Circle
            cx={48}
            cy={42}
            r={33}
            stroke={theme.svgMuted}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
          />
          {/* Clock hands pointing at timeout */}
          <Line x1={48} y1={42} x2={48} y2={26} stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={48} y1={42} x2={60} y2={42} stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
          {/* Center hub */}
          <Circle cx={48} cy={42} r={3} fill={theme.text} />
          {/* Speed/wait dashes */}
          <Line x1={12} y1={36} x2={18} y2={36} stroke={theme.svgMuted} strokeWidth={2} strokeLinecap="round" />
          <Line x1={10} y1={42} x2={18} y2={42} stroke={theme.svgMuted} strokeWidth={2} strokeLinecap="round" />
          <Line x1={14} y1={48} x2={18} y2={48} stroke={theme.svgMuted} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    }

    if (isSsl) {
      return (
        <Svg width={96} height={84} viewBox="0 0 96 84" fill="none">
          {/* Security Shield Outline */}
          <Path
            d="M48 16 L 72 26 C 72 48, 48 66, 48 66 C 48 66, 24 48, 24 26 Z"
            stroke={theme.text}
            strokeWidth={2.5}
            strokeLinejoin="round"
            fill="none"
          />
          {/* Unlocked Shackle */}
          <Path
            d="M43 36 L 43 30 C 43 26, 46 23, 49 23 C 53 23, 56 26, 56 30 L 56 33"
            stroke={theme.text}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          {/* Lock Body */}
          <Rect
            x={38}
            y={36}
            width={20}
            height={14}
            rx={3}
            stroke={theme.text}
            strokeWidth={2}
            fill={theme.bg}
          />
          {/* Keyhole dot */}
          <Circle cx={48} cy={43} r={1.8} fill={theme.text} />
        </Svg>
      );
    }

    // Generic Fallback (Server / Cloud with alert)
    return (
      <Svg width={96} height={84} viewBox="0 0 96 84" fill="none">
        <Path
          d="M28 54 C 20 54, 18 44, 24 38 C 22 28, 34 22, 42 26 C 48 18, 64 18, 68 28 C 76 28, 80 36, 76 44 C 82 48, 78 54, 72 54 Z"
          stroke={theme.text}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line x1={48} y1={32} x2={48} y2={42} stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={48} cy={47} r={1.6} fill={theme.text} />
      </Svg>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.centerCard}>
        {/* Dynamic Vector SVG Illustration for Specific Error */}
        <Animated.View style={[styles.svgWrapper, { transform: [{ translateY: floatAnim }] }]}>
          {renderErrorIllustration()}
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
                Home
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
