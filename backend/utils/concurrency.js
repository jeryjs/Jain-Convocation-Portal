const DEFAULT_LIMIT = 50;

async function limitedMap(items, iterator, limit = DEFAULT_LIMIT) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  if (typeof iterator !== 'function') {
    throw new TypeError('limitedMap requires an async iterator function');
  }

  const results = new Array(items.length);
  const workerCount = Math.min(limit, items.length);
  let index = 0;

  async function worker() {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= items.length) {
        break;
      }

      results[currentIndex] = await iterator(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

module.exports = {
  limitedMap,
};
