import { Capacitor } from '@capacitor/core';
import { xsd } from '@_linked/xsd/ontologies/xsd';

/**
 * Retries a function call if it fails, with a specified number of retries.
 *
 * @param fn
 * @param retries
 * @param delayMs
 * @returns
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> => {
  return await fn().catch(async (error) => {
    console.warn(`error: ${error}. retries left: ${retries}`);
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs);
    } else {
      throw error;
    }
  });
};

/**
 * Capitalizes the first letter of each word in a string.
 * Example: "hello world" becomes "Hello World".
 * @param str
 * @returns
 */
export const capitalizeFirstLetterEachWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Format display name currently used to support LinkedLiveUpdate
 * example: "hello world" becomes "Hello World".
 */
export const formatDisplayName = (
  ...parts: Array<string | undefined>
): string => {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) =>
      part.replace(/\w\S*/g, (word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
    )
    .join(' ')
    .trim();
};

export function fromNativeDate(nativeDate: Date) {
  if (!nativeDate) return null;

  var value = nativeDate.toISOString();
  // TODO: Literal was removed in @_linked/core migration - revisit date handling
  return value;
}

export function toNativeDate(value: any) {
  return value
    ? new Date(typeof value === 'string' ? value : value.value)
    : null;
}

/** Android dev builds still point image URLs at localhost. Rewrite them to SITE_ROOT. */
export function replaceLocalhostWithSiteRoot(croppedImage: string): string {
  let imageSrc = croppedImage;
  if (
    imageSrc &&
    process.env.NODE_ENV !== 'production' &&
    Capacitor.getPlatform() === 'android' &&
    imageSrc.includes('localhost')
  ) {
    const siteRoot = process.env.SITE_ROOT;
    if (siteRoot) {
      imageSrc = imageSrc.replace(/http:\/\/localhost:\d+/, siteRoot);
    }
  }
  return imageSrc;
}

/** Client-side upload name. Example: `photo.jpg` -> `photo_<time>_<random>.jpg`. */
export function generateUniqueFileName(originalName: string) {
  const ext = originalName.substring(originalName.lastIndexOf('.') + 1);
  const base = originalName.substring(0, originalName.lastIndexOf('.'));
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${base}_${timestamp}_${randomStr}.${ext}`;
}
