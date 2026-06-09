const CACHE_NAME = '3d-models-cache-v1';

export const modelCache = {
  async getModel(url: string): Promise<string> {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);

      await cache.put(url, response.clone());
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return url;
    }
  },

  async prefetch(urls: string[]): Promise<void> {
    try {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        urls.map(async (url) => {
          const exists = await cache.match(url);
          if (!exists) await cache.add(url);
        })
      );
    } catch {
      // silently skip prefetch failures
    }
  },

  async clear(): Promise<void> {
    await caches.delete(CACHE_NAME);
  }
};
