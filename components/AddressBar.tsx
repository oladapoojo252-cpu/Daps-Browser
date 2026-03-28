import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X, Star } from 'lucide-react-native';

interface AddressBarProps {
  url: string;
  onSearch: (val: string) => void;
  onToggleBookmark: () => void;
  isBookmarked: boolean;
  isPrivate?: boolean;
}

export const AddressBar = ({ url, onSearch, onToggleBookmark, isBookmarked, isPrivate }: AddressBarProps) => {
  const [inputText, setInputText] = useState(url);

  useEffect(() => {
    setInputText(url);
  }, [url]);

  const theme = {
    pill: isPrivate ? '#1A1A1A' : '#F0F0F2',
    text: isPrivate ? '#FFF' : '#000',
    placeholder: isPrivate ? '#666' : '#999',
    icon: isPrivate ? '#888' : '#666'
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: isPrivate ? '#000' : '#fff' }]}>
      <View style={[styles.pill, { backgroundColor: theme.pill }]}>
        <Search color={theme.icon} size={16} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => onSearch(inputText)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          selectTextOnFocus={true} 
          returnKeyType="go"
          placeholder="Search or enter URL"
          placeholderTextColor={theme.placeholder}
        />
        
        {url !== '' && (
          <TouchableOpacity onPress={onToggleBookmark} style={styles.iconBtn}>
            <Star 
              size={18} 
              color={isBookmarked ? "#FFCC00" : theme.icon} 
              fill={isBookmarked ? "#FFCC00" : "transparent"} 
            />
          </TouchableOpacity>
        )}

        {inputText.length > 0 && (
          <TouchableOpacity onPress={() => setInputText('')} style={styles.iconBtn}>
            <X color={theme.icon} size={18} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingVertical: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 12, height: 44 },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  iconBtn: { padding: 6 }
});