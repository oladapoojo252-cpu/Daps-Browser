import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, RotateCw, Home, Layers, Shield } from 'lucide-react-native';

export const BottomDock = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onReload,
  onHome,
  onTabs,
  isPrivate,
  onTogglePrivate,
}: any) => {
  return (
    <View style={styles.container}>
      <View style={[styles.dock, isPrivate && styles.dockPrivate]}>
        {/* Back */}
        <TouchableOpacity onPress={onBack} disabled={!canGoBack} style={styles.iconButton}>
          <ChevronLeft
            color={isPrivate ? (canGoBack ? '#FFFFFF' : '#444444') : canGoBack ? '#000000' : '#CCCCCC'}
            size={24}
          />
        </TouchableOpacity>

        {/* Forward */}
        <TouchableOpacity onPress={onForward} disabled={!canGoForward} style={styles.iconButton}>
          <ChevronRight
            color={isPrivate ? (canGoForward ? '#FFFFFF' : '#444444') : canGoForward ? '#000000' : '#CCCCCC'}
            size={24}
          />
        </TouchableOpacity>

        {/* Refresh / Reload */}
        <TouchableOpacity onPress={onReload} style={styles.iconButton}>
          <RotateCw
            color={isPrivate ? '#FFFFFF' : '#000000'}
            size={20}
          />
        </TouchableOpacity>

        {/* Home */}
        <TouchableOpacity onPress={onHome} style={[styles.mainBtn, isPrivate && styles.mainBtnPrivate]}>
          <Home color={isPrivate ? '#000000' : '#FFFFFF'} size={18} fill={isPrivate ? '#000000' : '#FFFFFF'} />
        </TouchableOpacity>

        {/* Tabs */}
        <TouchableOpacity onPress={onTabs} style={styles.iconButton}>
          <Layers color={isPrivate ? '#FFFFFF' : '#000000'} size={22} />
        </TouchableOpacity>

        {/* Private Mode */}
        <TouchableOpacity onPress={onTogglePrivate} style={styles.iconButton}>
          <Shield
            size={20}
            color={isPrivate ? '#FFFFFF' : '#000000'}
            fill={isPrivate ? '#FFFFFF' : 'none'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    width: '90%',
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingHorizontal: 8,
  },
  dockPrivate: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333333',
  },
  iconButton: { padding: 8 },
  mainBtn: {
    backgroundColor: '#000000',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBtnPrivate: {
    backgroundColor: '#FFFFFF',
  },
});