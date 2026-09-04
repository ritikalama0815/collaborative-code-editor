/**
 * @fileoverview Optional Core Web Vitals reporter (Create React App default).
 */

/**
 * Loads `web-vitals` and reports CLS, FID, FCP, LCP, and TTFB when a callback is passed.
 *
 * @param {function(object): void} [onPerfEntry] Metrics callback, e.g. `console.log`.
 * @returns {void}
 */
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
