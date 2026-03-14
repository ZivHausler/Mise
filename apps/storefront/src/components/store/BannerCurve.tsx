import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const CURVE_HEIGHT = 36;

/**
 * White wave overlay at the bottom of a banner — starts low on the left,
 * waves up to a high point on the right.
 */
export function BannerCurve() {
  const { width } = useWindowDimensions();

  // S-curve: starts at full height (low white = more banner visible) on the left,
  // dips slightly, then rises to 0 (high white = less banner visible) on the right.
  const h = CURVE_HEIGHT;
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
        <Path
          d={`M0,${h} C${width * 0.25},${h * -0.3} ${width * 0.75},${h * 1.8} ${width},0 L${width},${h} Z`}
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CURVE_HEIGHT,
  },
});
