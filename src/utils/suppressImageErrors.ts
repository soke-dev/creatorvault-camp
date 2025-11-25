// Suppress Next.js image errors in console
export const suppressImageErrors = () => {
  if (typeof window !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Filter out Next.js image errors
      if (
        args[0] &&
        typeof args[0] === 'string' &&
        (args[0].includes('upstream image response failed') ||
         args[0].includes('Image with src') ||
         args[0].includes('failed to load'))
      ) {
        // Suppress the error
        return;
      }
      // Allow other errors to be logged
      originalConsoleError.apply(console, args);
    };
  }
};
