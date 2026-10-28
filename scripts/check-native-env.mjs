// Fail a release build rather than silently creating an offline/unconfigured app.
const mobile = process.argv.includes('--mobile');
const prefix = mobile ? 'EXPO_PUBLIC_' : 'VITE_';
for (const [key, expected] of [
  ['SUPABASE_URL', 'url'],
  ['SUPABASE_PUBLISHABLE_KEY', 'key'],
  ['API_ORIGIN', 'url'],
]) {
  const value = process.env[`${prefix}${key}`] || '';
  if (expected === 'url') {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(
        `Set ${prefix}${key} to the real HTTPS deployment origin.`,
      );
    }
    if (
      url.protocol !== 'https:' ||
      ['localhost', '0.0.0.0', '::', '::1'].includes(
        url.hostname.replaceAll('[', '').replaceAll(']', ''),
      ) ||
      url.hostname.startsWith('127.') ||
      url.hostname.endsWith('.localhost') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== '/' && url.pathname !== '')
    )
      throw new Error(
        `${prefix}${key} must be an HTTPS origin without credentials or paths.`,
      );
  } else if (!value.startsWith('sb_publishable_')) {
    throw new Error(
      `${prefix}${key} must be a Supabase publishable key, not a privileged secret.`,
    );
  }
}
process.stdout.write(
  'Native deployment configuration is present. Connectivity and device behavior still require verification.\n',
);
