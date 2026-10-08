import { Shape } from '@_linked/core/shapes/Shape';
const _cache = new Map<string, { timeout: number; value: any }>();

export function cached(fn: () => any, args: any[], cacheTime?: number) {
  if (cacheTime) {
    const now = Date.now();
    args = args.map((a) => {
      if (a instanceof Shape) {
        return a.id;
      } else if (a && typeof a === 'object' && 'id' in a) {
        return a.id;
      } else {
        return a?.toString();
      }
    });
    let key = JSON.stringify(args);
    let cache = _cache.get(key);
    if (cache && cache.timeout < now) {
      _cache.delete(key);
      cache = null;
    }
    if (!cache) {
      let value = fn();
      _cache.set(key, {
        timeout: now + cacheTime,
        value,
      });
    }
    return _cache.get(key).value;
  } else {
    return fn();
  }
}
