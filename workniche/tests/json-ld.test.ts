import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from '@/lib/json-ld';

describe('serializeJsonLd', () => {
  it('cannot be broken out of a <script> element', () => {
    const hostile = {
      title: '</script><script>alert(document.cookie)</script>',
      description: '<img src=x onerror=alert(1)> & <!-- <script>',
    };
    const out = serializeJsonLd(hostile);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out.toLowerCase()).not.toContain('</script');
    expect(out).not.toContain('<!--');
  });

  it('round-trips to exactly the same data', () => {
    const data = {
      '@context': 'https://schema.org',
      title: 'Senior </script> Engineer & <b>Lead</b>',
      note: 'line separator here',
      nested: { n: 1, ok: true, list: ['a<b', 'c&d'] },
    };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it('leaves ordinary content readable', () => {
    expect(serializeJsonLd({ a: 'plain text', b: 2 })).toBe('{"a":"plain text","b":2}');
  });
});
