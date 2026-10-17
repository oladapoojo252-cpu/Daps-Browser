import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Keyboard } from 'react-native';
import { Search, X, Star, RotateCw, Lock, Shield, Globe, ArrowUpLeft } from 'lucide-react-native';

export interface SuggestionItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'search' | 'url' | 'bookmark';
  actionValue: string;
}

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
  bookmarks?: { title: string; url: string }[];
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
  bookmarks = [],
}: AddressBarProps) => {
  const [inputText, setInputText] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  useEffect(() => {
    setInputText(url);
  }, [url]);

  // Real-time search autocomplete & recommendations
  useEffect(() => {
    const trimmed = inputText.trim();
    if (!isFocused || trimmed.length === 0) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const q = trimmed.toLowerCase();

      // 1. Local bookmark matches
      const matchedBookmarks: SuggestionItem[] = (bookmarks || [])
        .filter(b => b.title?.toLowerCase().includes(q) || b.url?.toLowerCase().includes(q))
        .slice(0, 2)
        .map(b => ({
          id: `bm-${b.url}`,
          title: b.title || b.url,
          subtitle: b.url.replace(/^https?:\/\//, '').split('/')[0],
          type: 'bookmark',
          actionValue: b.url,
        }));

      // 2. Direct website / domain navigation match
      const isDomainLike = q.includes('.') && !q.includes(' ') && q.length > 3;
      const urlItem: SuggestionItem | null = isDomainLike
        ? {
            id: `url-${q}`,
            title: q,
            subtitle: 'Go to website',
            type: 'url',
            actionValue: q.startsWith('http://') || q.startsWith('https://') ? q : `https://${q}`,
          }
        : null;

      // 3. Search suggestions from Google Suggest API
      fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then(res => res.json())
        .then(data => {
          const searchSuggestions: SuggestionItem[] = Array.isArray(data?.[1])
            ? data[1].slice(0, 5).map((term: string, idx: number) => ({
                id: `sug-${idx}-${term}`,
                title: term,
                type: 'search',
                actionValue: term,
              }))
            : [];

          const combined = [
            ...(urlItem ? [urlItem] : []),
            ...matchedBookmarks,
            ...searchSuggestions,
          ]
            .filter(
              (item, index, self) =>
                index === self.findIndex(t => t.title.toLowerCase() === item.title.toLowerCase())
            )
            .slice(0, 6);

          setSuggestions(combined);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            const fallback = [
              ...(urlItem ? [urlItem] : []),
              ...matchedBookmarks,
            ];
            setSuggestions(fallback);
          }
        });
    }, 160);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [inputText, isFocused, bookmarks]);

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setIsFocused(false);
    setSuggestions([]);
    Keyboard.dismiss();
    onSearch(item.actionValue);
  };

  const handleAppendSuggestion = (item: SuggestionItem) => {
    setInputText(item.title);
  };

  const dark = isDarkMode || isPrivate;
  const theme = {
    pillBg: dark ? '#1A1A1A' : '#F0F0F2',
    pillBorder: dark ? '#2A2A2A' : '#E5E7EB',
    dropdownBg: dark ? '#1A1A1C' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#111827',
    placeholder: dark ? '#666666' : '#9CA3AF',
    icon: dark ? '#888888' : '#6B7280',
    starActive: dark ? '#FFFFFF' : '#111827',
  };

  const isWebPage = url !== '' && url !== 'home';
  const isSecure = url.startsWith('https://');

  return (
    <View style={styles.wrapper}>
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
                fill={dark ? '#FFFFFF' : '#000000'}
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
          onBlur={() => {
            // Slight delay so tap on suggestion completes before blur hides dropdown
            setTimeout(() => {
              setIsFocused(false);
              setSuggestions([]);
            }, 180);
          }}
          onSubmitEditing={() => {
            setIsFocused(false);
            setSuggestions([]);
            onSearch(inputText);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus={true}
          returnKeyType="go"
          underlineColorAndroid="transparent"
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
              onPress={() => {
                setInputText('');
                setSuggestions([]);
              }}
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

      {/* Dynamic Autocomplete / Recommendation Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.dropdownBg,
              borderColor: theme.pillBorder,
            },
          ]}
        >
          {suggestions.map((item, index) => (
            <View key={item.id}>
              {index > 0 && (
                <View style={[styles.divider, { backgroundColor: theme.pillBorder }]} />
              )}
              <TouchableOpacity
                style={styles.suggestionRow}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIconWrap}>
                  {item.type === 'bookmark' ? (
                    <Star size={16} color={dark ? '#FFD60A' : '#FF9500'} fill={dark ? '#FFD60A' : '#FF9500'} />
                  ) : item.type === 'url' ? (
                    <Globe size={16} color={theme.icon} />
                  ) : (
                    <Search size={16} color={theme.icon} />
                  )}
                </View>
                <View style={styles.suggestionTextCol}>
                  <Text
                    style={[styles.suggestionTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text
                      style={[styles.suggestionSubtitle, { color: theme.placeholder }]}
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.appendBtn}
                  onPress={() => handleAppendSuggestion(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowUpLeft size={16} color={theme.icon} />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'relative',
    zIndex: 5000,
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
  dropdown: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 6000,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  suggestionIconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionTextCol: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  appendBtn: {
    padding: 6,
    marginLeft: 8,
  },
});