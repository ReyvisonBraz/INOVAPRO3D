/**
 * Model Cache Utility
 * Uses the Browser Cache API to store 3D model files (STL, etc.) 
 * to speed up subsequent loads and reduce data usage.
 */

const CACHE_NAME = '3d-models-cache-v1';

export const modelCache = {
  /**
   * Gets a model from cache or fetches and caches it if not present
   * Returns a Blob URL that can be used in loaders
   */
  async getModel(url: string): Promise<string> {
    // If it's already a blob URL or data URL, return as is
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        console.log(`[ModelCache] Cache hit for: ${url}`);
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }

      console.log(`[ModelCache] Cache miss for: ${url}. Fetching...`);
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);

      // Clone the response to store in cache while using the original
      const responseToCache = response.clone();
      await cache.put(url, responseToCache);

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('[ModelCache] Error:', error);
      return url; // Fallback to original URL if anything fails
    }
  },

  /**
   * Pre-fetches a list of models to cache them
   */
  async prefetch(urls: string[]): Promise<void> {
    try {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        urls.map(async (url) => {
          const exists = await cache.match(url);
          if (!exists) {
            console.log(`[ModelCache] Prefetching: ${url}`);
            await cache.add(url);
          }
        })
      );
    } catch (error) {
      console.error('[ModelCache] Prefetch error:', error);
    }
  },

  /**
   * Clears the model cache
   */
  async clear(): Promise<void> {
    await caches.delete(CACHE_NAME);
  }
};
