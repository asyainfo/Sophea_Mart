export const USD_TO_KHR = 4000;
export const fmt = (usd) => `$${usd.toFixed(2)}`;
export const fmtKHR = (usd) => `៛${(usd * USD_TO_KHR).toLocaleString()}`;
