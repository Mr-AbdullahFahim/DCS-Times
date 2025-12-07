import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, Platform, StyleProp, TextStyle, ViewStyle } from 'react-native';

// 1. Define the mapping: Key = SF Symbol (iOS), Value = Material Icon (Android)
const MAPPING = {
  // See Material Icons here: https://icons.expo.fyi
  // See SF Symbols here: https://developer.apple.com/sf-symbols/
  'calendar': 'today',
  'paperplane.fill': 'info',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'book':'upcoming'
} as const;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  
  // 2. iOS Implementation: Use Apple's Native SF Symbols
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name={name}
        style={[
          {
            width: size,
            height: size,
          },
          style,
        ]}
      />
    );
  }

  // 3. Android/Web Implementation: Use Material Icons via the MAPPING
  return (
    <MaterialIcons 
      color={color} 
      size={size} 
      name={MAPPING[name]} 
      style={style as StyleProp<TextStyle>} 
    />
  );
}