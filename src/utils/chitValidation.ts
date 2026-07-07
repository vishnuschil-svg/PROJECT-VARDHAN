/**
 * Validation functions for MITRA NIDHI CHITI PRO
 * Input validation and sanitization
 */

import { CreateChitGroupInput, CreateMemberInput, RecordCollectionInput, PlaceBidInput } from '../types/supabaseBackend';

// ============================================================================
// VALIDATION RESULTS
// ============================================================================
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// CHIT GROUP VALIDATION
// ============================================================================
export const validateChitGroup = (input: CreateChitGroupInput): ValidationResult => {
  const errors: string[] = [];

  if (!input.group_name || input.group_name.trim().length === 0) {
    errors.push('Group name is required');
  }

  if (input.group_name && input.group_name.length > 255) {
    errors.push('Group name must be less than 255 characters');
  }

  if (!input.chit_value || input.chit_value <= 0) {
    errors.push('Chit value must be greater than 0');
  }

  if (!input.member_count || input.member_count < 2) {
    errors.push('Member count must be at least 2');
  }

  if (!input.monthly_installment || input.monthly_installment <= 0) {
    errors.push('Monthly installment must be greater than 0');
  }

  if (!input.duration_months || input.duration_months < 1) {
    errors.push('Duration must be at least 1 month');
  }

  // Check that chit_value = monthly_installment * member_count (approximately)
  const expectedValue = input.monthly_installment * input.member_count;
  if (Math.abs(input.chit_value - expectedValue) > 1000) {
    errors.push('Chit value should equal monthly installment × member count');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// MEMBER VALIDATION
// ============================================================================
export const validateMember = (input: CreateMemberInput): ValidationResult => {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Member name is required');
  }

  if (input.name && input.name.length > 255) {
    errors.push('Member name must be less than 255 characters');
  }

  if (input.email && !isValidEmail(input.email)) {
    errors.push('Invalid email address');
  }

  if (input.phone && !isValidPhone(input.phone)) {
    errors.push('Invalid phone number');
  }

  if (input.aadhaar_masked && !isValidAadhaarMask(input.aadhaar_masked)) {
    errors.push('Invalid Aadhaar format');
  }

  if (input.ifsc_code && !isValidIFSC(input.ifsc_code)) {
    errors.push('Invalid IFSC code');
  }

  if (input.member_number <= 0) {
    errors.push('Member number must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// COLLECTION VALIDATION
// ============================================================================
export const validateCollection = (input: RecordCollectionInput): ValidationResult => {
  const errors: string[] = [];

  if (!input.payment_amount || input.payment_amount <= 0) {
    errors.push('Payment amount must be greater than 0');
  }

  if (!input.payment_method || !['cash', 'cheque', 'bank_transfer', 'upi'].includes(input.payment_method)) {
    errors.push('Invalid payment method');
  }

  if (!input.payment_date) {
    errors.push('Payment date is required');
  }

  if (new Date(input.payment_date) > new Date()) {
    errors.push('Payment date cannot be in the future');
  }

  if (!input.collection_month || !isValidMonthFormat(input.collection_month)) {
    errors.push('Invalid collection month format (use YYYY-MM)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// AUCTION BID VALIDATION
// ============================================================================
export const validateBid = (input: PlaceBidInput, baseAmount: number): ValidationResult => {
  const errors: string[] = [];

  if (!input.bid_amount || input.bid_amount <= 0) {
    errors.push('Bid amount must be greater than 0');
  }

  if (input.bid_amount < baseAmount) {
    errors.push(`Bid amount must be at least ${baseAmount}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// HELPER VALIDATION FUNCTIONS
// ============================================================================
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Accept 10-digit Indian phone numbers
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const isValidAadhaarMask = (mask: string): boolean => {
  // Format: ****-****-1234 or similar
  const aadhaarRegex = /^\*{4}-\*{4}-\d{4}$/;
  return aadhaarRegex.test(mask);
};

export const isValidIFSC = (ifsc: string): boolean => {
  // IFSC format: HDFC0001234 (4 letters, 0, 6 digits/letters)
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc);
};

export const isValidMonthFormat = (month: string): boolean => {
  // Format: YYYY-MM
  const monthRegex = /^\d{4}-\d{2}$/;
  return monthRegex.test(month);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mask Aadhaar number: 123456789012 -> ****-****-9012
 */
export const maskAadhaar = (aadhaar: string): string => {
  const cleaned = aadhaar.replace(/\D/g, '');
  if (cleaned.length !== 12) return '****-****-****';
  const last4 = cleaned.slice(-4);
  return `****-****-${last4}`;
};

/**
 * Mask phone number: 9876543210 -> ****-****-3210
 */
export const maskPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return '****-****-****';
  const last4 = cleaned.slice(-4);
  return `****-****-${last4}`;
};

/**
 * Format currency value
 */
export const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.]/g, ''));
};

/**
 * Format date as YYYY-MM-DD
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * Get current month in YYYY-MM format
 */
export const getCurrentMonth = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

/**
 * Calculate days overdue
 */
export const getDaysOverdue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = today.getTime() - due.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Generate receipt number
 */
export const generateReceiptNumber = (year: number, sequence: number): string => {
  const yearSuffix = year.toString().slice(-2);
  const sequencePadded = String(sequence).padStart(6, '0');
  return `CH${yearSuffix}${sequencePadded}`;
};

/**
 * Check if member is overdue
 */
export const isOverdue = (lastPaymentDate: string | null, days: number = 5): boolean => {
  if (!lastPaymentDate) return true;
  return getDaysOverdue(lastPaymentDate) > days;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Check if date is in current financial year
 */
export const isInCurrentFinancialYear = (date: string, startMonth: number = 4): boolean => {
  const d = new Date(date);
  const today = new Date();

  const yearStart = new Date(d.getFullYear(), startMonth - 1, 1);
  const yearEnd = new Date(d.getFullYear() + 1, startMonth - 1, 0);

  return d >= yearStart && d <= yearEnd;
};
