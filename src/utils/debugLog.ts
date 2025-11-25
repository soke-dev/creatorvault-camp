// Debug logging utility that only logs in development
export const debugLog = (...args: any[]) => {
  // Only log in development environment
  if (process.env.NODE_ENV === 'development') {
    devLog(...args);
  }
};

// Alternative: completely silent debug log for production
export const devLog = (...args: any[]) => {
  // Silent in all environments - keeps code structure but produces no output
};
