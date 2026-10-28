import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
// SecureStore has per-value limits on some OS versions. Split sessions into small
// parts; commit the count last. Never persist tokens in plaintext AsyncStorage.
const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    if (!Number.isInteger(count) || count < 1 || count > 100) return null;
    const values = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${i}`),
      ),
    );
    return values.some((v) => v === null) ? null : values.join('');
  },
  async setItem(key: string, value: string) {
    await this.removeItem(key);
    const pieces = value.match(/.{1,1500}/gs) ?? [];
    for (let i = 0; i < pieces.length; i++)
      await SecureStore.setItemAsync(`${key}.${i}`, pieces[i]!, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    await SecureStore.setItemAsync(`${key}.count`, String(pieces.length));
  },
  async removeItem(key: string) {
    const count = Math.min(
      Number(await SecureStore.getItemAsync(`${key}.count`)) || 0,
      100,
    );
    await SecureStore.deleteItemAsync(`${key}.count`);
    for (let i = 0; i < count; i++)
      await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
};
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const auth =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
