/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/adapters/screens/theme';
import { useColorScheme } from '@/adapters/screens/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
