import React from 'react';
import { View, StyleSheet } from 'react-native';

interface OrderCardAccentStripProps {
  color: string;
  opacity?: number;
}

export const OrderCardAccentStrip = React.memo(
  function OrderCardAccentStrip({ color, opacity = 1.0 }: OrderCardAccentStripProps) {
    return (
      <View
        style={[
          styles.strip,
          {
            backgroundColor: color,
            opacity,
          },
        ]}
      />
    );
  },
  (prev, next) => prev.color === next.color && prev.opacity === next.opacity,
);

const styles = StyleSheet.create({
  strip: {
    width: 4,
    borderTopStartRadius: 16,
    borderBottomStartRadius: 16,
  },
});
