export async function retry(fn, options = {}) {
  const { retries = 3, baseDelay = 400 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `[v0] Retry attempt ${attempt + 1}/${retries + 1} after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function withTimeoutOrMock(promise, mockData, timeoutMs = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
    ),
  ]).catch((error) => {
    console.warn(`[v0] API call failed, using mock data:`, error.message);
    return mockData;
  });
}

export async function timed(label, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[v0] ${label} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(
      `[v0] ${label} failed after ${duration.toFixed(2)}ms:`,
      error
    );
    throw error;
  }
}
