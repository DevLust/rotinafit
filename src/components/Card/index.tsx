import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../../utils/theme';

type Props = ViewProps & {
  variant?: 'default' | 'surface' | 'highlighted';
  padding?: number;
};

export function Card({ variant = 'default', padding = 16, style, children, ...rest }: Props) {
  return (
    <View style={[styles.base, styles[variant], { padding }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    borderWidth: 1,
  },
  default: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  highlighted: {
    backgroundColor: colors.card,
    borderColor: colors.primary + '60',
  },
});
