import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { RotateCw, Home, ChevronDown, ChevronUp, AlertTriangle, WifiOff, Globe, ShieldAlert } from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
  const [showDetails, setShowDetails] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const dark = isDarkMode || isPrivate;

  useEffect(() => {
    // Subtle, elegant floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle radar pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, pulseAnim]);

  // Extract clean domain for presentation
  let displayDomain = url;
  try {
    if (url && url !== 'home') {
      const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      displayDomain = new URL(formatted).hostname;
    }
  } catch {
    displayDomain = url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }

  // Determine error classification
  const desc = (errorDescription || '').toUpperCase();
  const isOffline = desc.includes('DISCONNECTED') || desc.includes('NETWORK') || desc.includes('INTERNET') || errorCode === -6;
  const isDnsError = desc.includes('NAME_NOT_RESOLVED') || desc.includes('HOST_LOOKUP') || errorCode === -2;
  const isTimeout = desc.includes('TIMED_OUT') || desc.includes('TIMEOUT') || errorCode === -8;
  const isSsl = desc.includes('SSL') || desc.includes('CERT') || errorCode === -11;

  let title = "Can't Reach This Page";
  let explanation = "The website is currently unreachable. Check your network connection or ensure the address is correct.";
  let IconComponent = Globe;

  if (isOffline) {
    title = "You're Offline";
    explanation = "No internet connection detected. Check your Wi-Fi or cellular network connection and try again.";
    IconComponent = WifiOff;
  } else if (isDnsError) {
    title = "Site Address Not Found";
    explanation = `The server IP for ${displayDomain || 'this address'} could not be found. Check for typos in the web address.`;
    IconComponent = Globe;
  } else if (isTimeout) {
    title = "Connection Timed Out";
    explanation = `${displayDomain || 'The site'} took too long to respond. The server may be overloaded or temporarily unavailable.`;
    IconComponent = AlertTriangle;
  } else if (isSsl) {
    title = "Security Handshake Warning";
    explanation = "A secure HTTPS connection could not be established with this domain.";
    IconComponent = ShieldAlert;
  }

  const theme = {
    bg: dark ? '#000000' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#0B0B0C',
    subtext: dark ? '#8E8E93' : '#636366',
    accent: dark ? '#FFFFFF' : '#000000',
    accentText: dark ? '#000000' : '#FFFFFF',
    card: dark ? '#141416' : '#F6F6F8',
    border: dark ? '#242426' : '#E5E5EA',
    pillBg: dark ? '#1C1C1E' : '#EFEFF4',
    svgVector: dark ? '#FFFFFF' : '#1C1C1E',
    svgMuted: dark ? '#3A3A3C' : '#D1D1D6',
    svgGlow: dark ? '#545458' : '#AEAEB2',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.contentWrapper}>
        {/* Animated Custom Vector SVG Illustration */}
        <Animated.View
          style={[
            styles.svgContainer,
            {
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <Svg width={180} height={140} viewBox="0 0 180 140">
            <Defs>
              <LinearGradient id="dishGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={theme.svgVector} stopOpacity="0.9" />
                <Stop offset="1" stopColor={theme.svgMuted} stopOpacity="0.4" />
              </LinearGradient>
              <LinearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.svgVector} stopOpacity="0.7" />
                <Stop offset="1" stopColor={theme.svgVector} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Orbit rings */}
            <Circle
              cx={90}
              cy={70}
              r={56}
              stroke={theme.svgMuted}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <Circle
              cx={90}
              cy={70}
              r={36}
              stroke={theme.svgMuted}
              strokeWidth={1}
              opacity={0.35}
            />

            {/* Broken Signal Waves */}
            <Path
              d="M74 46 A22 22 0 0 1 106 46"
              stroke={theme.svgGlow}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeDasharray="3 3"
              opacity={0.7}
            />
            <Path
              d="M66 38 A34 34 0 0 1 114 38"
              stroke={theme.svgGlow}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="4 4"
              opacity={0.4}
            />

            {/* Floating Deep Space Stars */}
            <Circle cx={28} cy={35} r={1.5} fill={theme.svgVector} opacity={0.6} />
            <Circle cx={152} cy={42} r={1.75} fill={theme.svgVector} opacity={0.7} />
            <Circle cx={38} cy={105} r={1.25} fill={theme.svgVector} opacity={0.4} />
            <Circle cx={146} cy={98} r={1.5} fill={theme.svgVector} opacity={0.5} />

            {/* Plus sparkle glyphs */}
            <Line x1={20} y1={68} x2={26} y2={68} stroke={theme.svgGlow} strokeWidth={1} opacity={0.5} />
            <Line x1={23} y1={65} x2={23} y2={71} stroke={theme.svgGlow} strokeWidth={1} opacity={0.5} />
            <Line x1={158} y1={75} x2={164} y2={75} stroke={theme.svgGlow} strokeWidth={1} opacity={0.5} />
            <Line x1={161} y1={72} x2={161} y2={78} stroke={theme.svgGlow} strokeWidth={1} opacity={0.5} />

            {/* Central Satellite Body */}
            <G>
              {/* Left Solar Panel */}
              <Rect
                x={58}
                y={64}
                width={18}
                height={12}
                rx={2}
                fill="url(#dishGrad)"
                stroke={theme.svgVector}
                strokeWidth={1}
              />
              <Line x1={64} y1={64} x2={64} y2={76} stroke={theme.border} strokeWidth={0.8} />
              <Line x1={70} y1={64} x2={70} y2={76} stroke={theme.border} strokeWidth={0.8} />

              {/* Connecting strut */}
              <Line x1={76} y1={70} x2={80} y2={70} stroke={theme.svgVector} strokeWidth={2} />

              {/* Main Core */}
              <Rect
                x={80}
                y={60}
                width={20}
                height={20}
                rx={5}
                fill={theme.card}
                stroke={theme.svgVector}
                strokeWidth={1.8}
              />
              <Circle cx={90} cy={70} r={4} fill={theme.svgVector} />

              {/* Connecting strut right */}
              <Line x1={100} y1={70} x2={104} y2={70} stroke={theme.svgVector} strokeWidth={2} />

              {/* Right Solar Panel */}
              <Rect
                x={104}
                y={64}
                width={18}
                height={12}
                rx={2}
                fill="url(#dishGrad)"
                stroke={theme.svgVector}
                strokeWidth={1}
              />
              <Line x1={110} y1={64} x2={110} y2={76} stroke={theme.border} strokeWidth={0.8} />
              <Line x1={116} y1={64} x2={116} y2={76} stroke={theme.border} strokeWidth={0.8} />

              {/* Antenna Mast & Orb */}
              <Line x1={90} y1={60} x2={90} y2={50} stroke={theme.svgVector} strokeWidth={1.5} strokeLinecap="round" />
              <Circle cx={90} cy={48} r={2.5} fill={theme.svgVector} />
            </G>
          </Svg>
        </Animated.View>

        {/* Domain Badge */}
        <View style={[styles.domainBadge, { backgroundColor: theme.pillBg, borderColor: theme.border }]}>
          <IconComponent size={13} color={theme.subtext} style={{ marginRight: 6 }} />
          <Text style={[styles.domainText, { color: theme.text }]} numberOfLines={1}>
            {displayDomain}
          </Text>
        </View>

        {/* Heading & Subtitle */}
        <Text style={[styles.errorTitle, { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[styles.errorSubtitle, { color: theme.subtext }]}>
          {explanation}
        </Text>

        {/* Error Code Pill */}
        <View style={[styles.codeBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.codeText, { color: theme.subtext }]}>
            {errorDescription || (errorCode ? `ERROR_CODE_${errorCode}` : 'CONNECTION_FAILED')}
          </Text>
        </View>

        {/* Interactive Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={onReload}
            activeOpacity={0.85}
          >
            <RotateCw size={15} color={theme.accentText} style={{ marginRight: 6 }} />
            <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>
              Try Again
            </Text>
          </TouchableOpacity>

          {onHome && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onHome}
              activeOpacity={0.85}
            >
              <Home size={15} color={theme.text} style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                Daps Home
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Technical Diagnostics Accordion */}
        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.7}
        >
          <Text style={[styles.detailsToggleText, { color: theme.subtext }]}>
            {showDetails ? 'Hide Diagnostics' : 'Show Diagnostics'}
          </Text>
          {showDetails ? (
            <ChevronUp size={14} color={theme.subtext} />
          ) : (
            <ChevronDown size={14} color={theme.subtext} />
          )}
        </TouchableOpacity>

        {showDetails && (
          <View style={[styles.diagnosticsBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: theme.subtext }]}>Requested URL:</Text>
              <Text style={[styles.diagValue, { color: theme.text }]} numberOfLines={1}>{url}</Text>
            </View>
            {errorDomain ? (
              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: theme.subtext }]}>Domain:</Text>
                <Text style={[styles.diagValue, { color: theme.text }]}>{errorDomain}</Text>
              </View>
            ) : null}
            {typeof errorCode === 'number' ? (
              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: theme.subtext }]}>Code:</Text>
                <Text style={[styles.diagValue, { color: theme.text }]}>{errorCode}</Text>
              </View>
            ) : null}
            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: theme.subtext }]}>Status:</Text>
              <Text style={[styles.diagValue, { color: theme.text }]}>{errorDescription || 'Unreachable'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    maxWidth: '90%',
  },
  domainText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  detailsToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  diagnosticsBox: {
    width: '100%',
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  diagValue: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
});
