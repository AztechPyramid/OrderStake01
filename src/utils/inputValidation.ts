/**
 * Input validation utilities for staking forms
 */

/**
 * Validates and sanitizes numeric input for staking amounts
 * @param value - Raw input value
 * @param maxDecimals - Maximum decimal places allowed (default: 18)
 * @returns Sanitized value or empty string if invalid
 */
export const sanitizeNumericInput = (value: string, maxDecimals: number = 18): string => {
  // Remove any non-numeric characters except decimal point
  let sanitized = value.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    sanitized = parts[0] + '.' + parts[1].substring(0, maxDecimals);
  }
  
  // Remove leading zeros (except for 0.xxx)
  if (sanitized.length > 1 && sanitized[0] === '0' && sanitized[1] !== '.') {
    sanitized = sanitized.substring(1);
  }
  
  // Don't allow just a decimal point
  if (sanitized === '.') {
    sanitized = '0.';
  }
  
  return sanitized;
};

/**
 * Validates if a numeric string is a valid amount for staking
 * @param value - Input value to validate
 * @param maxValue - Maximum allowed value (optional)
 * @param minValue - Minimum allowed value (default: 0)
 * @returns Object with isValid boolean and error message
 */
export const validateStakingAmount = (
  value: string,
  maxValue?: number,
  minValue: number = 0
): { isValid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Invalid number format' };
  }
  
  if (numValue <= minValue) {
    return { isValid: false, error: `Amount must be greater than ${minValue}` };
  }
  
  if (maxValue !== undefined && numValue > maxValue) {
    return { isValid: false, error: `Amount exceeds maximum of ${maxValue}` };
  }
  
  return { isValid: true };
};

/**
 * Safely converts a string to number for staking operations
 * @param value - String value to convert
 * @returns Number value or 0 if invalid
 */
export const safeParseFloat = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats percentage amounts (0.25 -> "25%")
 * @param decimal - Decimal value (0.25)
 * @param precision - Decimal precision (default: 0)
 * @returns Formatted percentage string
 */
export const formatPercentage = (decimal: number, precision: number = 0): string => {
  return `${(decimal * 100).toFixed(precision)}%`;
};

/**
 * Safely converts number to string for input display
 * @param value - Number value
 * @param maxDecimals - Maximum decimal places to show
 * @returns String representation
 */
export const numberToInputString = (value: number, maxDecimals: number = 6): string => {
  if (isNaN(value) || !isFinite(value)) return '';
  return parseFloat(value.toFixed(maxDecimals)).toString();
};