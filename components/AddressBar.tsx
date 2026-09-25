import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X, Star, RotateCw, Lock, Shield } from 'lucide-react-native';

interface AddressBarProps {
  url: string;
  onSearch: (val: string) => void;
  onToggleBookmark: () => void;
  onReload: () => void;
  onStopLoading?: () => void;
  isLoading?: boolean;
  isBookmarked: boolean;
  isPrivate?: boolean;
  pageBlockedCount?: number;
  shieldsActive?: boolean;
  onOpenShields?: () => void;
  isDarkMode?: boolean;
}

export const AddressBar = ({
  url,
  onSearch,
  onToggleBookmark,
  onReload,
  onStopLoading,
  isLoading = false,
  isBookmarked,
  isPrivate = false,
  shieldsActive = true,
  onOpenShields,
  isDarkMode = false,
}: AddressBarProps) => {
  const [inputText, setInputText] = useState(url);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setInputText(url);
  }, [url]);

  const dark = isDarkMode || isPrivate;
  const theme = {
    wrapperBg: dark ? '#000000' : '#FFFFFF',
    pillBg: dark ? '#1A1A1A' : '#F0F0F2',
    pillBorder: dark ? '#2A2A2A' : '#E5E7EB',
    text: dark ? '#FFFFFF' : '#111827',
    placeholder: dark ? '#666666' : '#9CA3AF',
    icon: dark ? '#888888' : '#6B7280',
    starActive: dark ? '#FFFFFF' : '#111827',
  };

  const isWebPage = url !== '' && url !== 'home';
  const isSecure = url.startsWith('https://');

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.wrapperBg }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: theme.pillBg,
            borderColor: theme.pillBorder,
          },
        ]}
      >
        {/* Left Side: Lock / Daps Shield / Search Icon */}
        {isWebPage ? (
          <TouchableOpacity
            onPress={onOpenShields}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.leftBtn}
          >
            {shieldsActive ? (
              <Shield
                size={16}
                color={theme.text}
                fill={isPrivate ? '#FFFFFF' : '#000000'}
              />
            ) : isSecure ? (
              <Lock size={15} color={theme.icon} />
            ) : (
              <Search color={theme.icon} size={15} />
            )}
          </TouchableOpacity>
        ) : (
          <Search color={theme.icon} size={15} style={styles.leftIcon} />
        )}

        {/* Input */}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={inputText}
          onChangeText={setInputText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={() => {
            setIsFocused(false);
            onSearch(inputText);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus={true}
          returnKeyType="go"
          placeholder="Search or enter URL"
          placeholderTextColor={theme.placeholder}
        />

        {/* Bookmark Button */}
        {isWebPage && !isFocused && (
          <TouchableOpacity
            onPress={onToggleBookmark}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Star
              size={16}
              color={isBookmarked ? theme.starActive : theme.icon}
              fill={isBookmarked ? theme.starActive : 'transparent'}
            />
          </TouchableOpacity>
        )}

        {/* Dynamic Action:
            - When focused or typing: "X" clears text input
            - While webpage is loading: "X" stops page loading
            - When webpage finishes loading: switches to Reload!
        */}
        {isFocused || inputText !== url ? (
          inputText.length > 0 && (
            <TouchableOpacity
              onPress={() => setInputText('')}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X color={theme.icon} size={16} />
            </TouchableOpacity>
          )
        ) : isWebPage ? (
          isLoading ? (
            <TouchableOpacity
              onPress={onStopLoading}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X color={theme.icon} size={16} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onReload}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCw color={theme.icon} size={15} />
            </TouchableOpacity>
          )
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
  },
  leftBtn: {
    marginRight: 8,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  iconBtn: {
    padding: 4,
    marginLeft: 4,
  },
});