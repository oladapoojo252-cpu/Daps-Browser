import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X, Star, RotateCw } from 'lucide-react-native';

interface AddressBarProps {
  url: string;
  onSearch: (val: string) => void;
  onToggleBookmark: () => void;
  onReload: () => void;
  isBookmarked: boolean;
  isPrivate?: boolean;
}

export const AddressBar = ({
  url,
  onSearch,
  onToggleBookmark,
  onReload,
  isBookmarked,
  isPrivate = false,
}: AddressBarProps) => {
  const [inputText, setInputText] = useState(url);

  useEffect(() => {
    setInputText(url);
  }, [url]);

  const theme = {
    wrapperBg: isPrivate ? '#000000' : '#FFFFFF',
    pillBg: isPrivate ? '#1A1A1A' : '#F0F0F2',
    pillBorder: isPrivate ? '#2A2A2A' : '#E5E7EB',
    text: isPrivate ? '#FFFFFF' : '#111827',
    placeholder: isPrivate ? '#666666' : '#9CA3AF',
    icon: isPrivate ? '#888888' : '#6B7280',
    clearIcon: isPrivate ? '#888888' : '#6B7280',
    starActive: isPrivate ? '#FFFFFF' : '#111827',
  };

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
        <Search color={theme.icon} size={15} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => onSearch(inputText)}
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus={true}
          returnKeyType="go"
          placeholder="Search or enter URL"
          placeholderTextColor={theme.placeholder}
        />

        {/* Reload button for active websites */}
        {url !== '' && (
          <TouchableOpacity onPress={onReload} style={styles.iconBtn}>
            <RotateCw color={theme.icon} size={15} />
          </TouchableOpacity>
        )}

        {/* Bookmark button */}
        {url !== '' && (
          <TouchableOpacity onPress={onToggleBookmark} style={styles.iconBtn}>
            <Star
              size={16}
              color={isBookmarked ? theme.starActive : theme.icon}
              fill={isBookmarked ? theme.starActive : 'transparent'}
            />
          </TouchableOpacity>
        )}

        {/* Clear text input button */}
        {inputText.length > 0 && (
          <TouchableOpacity onPress={() => setInputText('')} style={styles.iconBtn}>
            <X color={theme.clearIcon} size={16} />
          </TouchableOpacity>
        )}
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
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, height: '100%' },
  iconBtn: { padding: 4, marginLeft: 2 },
});