import React from 'react';
import { View, StyleSheet } from 'react-native';
import Milk from 'lucide-react-native/dist/esm/icons/milk';
import Wheat from 'lucide-react-native/dist/esm/icons/wheat';
import Nut from 'lucide-react-native/dist/esm/icons/nut';
import Egg from 'lucide-react-native/dist/esm/icons/egg';
import Bean from 'lucide-react-native/dist/esm/icons/bean';
import Fish from 'lucide-react-native/dist/esm/icons/fish';
import Shell from 'lucide-react-native/dist/esm/icons/shell';
import Coffee from 'lucide-react-native/dist/esm/icons/coffee';
import { Wine } from 'lucide-react-native';
import type { PublicAllergen } from '../../api/types';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Milk,
  Wheat,
  Nut,
  Egg,
  Bean,
  Fish,
  Shell,
  Coffee,
  Wine,
};

const DEFAULT_COLOR = '#94A3B8';

interface AllergenBadgeProps {
  allergen: PublicAllergen;
  size?: number;
}

export function AllergenBadge({ allergen, size = 16 }: AllergenBadgeProps) {
  const color = allergen.color || DEFAULT_COLOR;
  const Icon = allergen.icon ? ICON_MAP[allergen.icon] : null;
  const circleSize = size + 12;

  if (!Icon) {
    return (
      <View style={[styles.circle, { width: circleSize, height: circleSize, backgroundColor: `${color}18` }]}>
        <View style={[styles.dot, { width: size * 0.5, height: size * 0.5, backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[styles.circle, { width: circleSize, height: circleSize, backgroundColor: `${color}18` }]}>
      <Icon size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    borderRadius: 999,
  },
});
