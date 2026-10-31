/**
 * Comprehensive validation utilities for forms and data
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a single field against its rules
 */
export function validateField(
  value: any,
  rules: ValidationRule
): string | null {
  // Required validation
  if (rules.required) {
    if (value === null || value === undefined || value === "") {
      return rules.message || "This field is required";
    }
  }

  // Skip other validations if value is empty and not required
  if (
    !rules.required &&
    (value === null || value === undefined || value === "")
  ) {
    return null;
  }

  // String length validation
  if (typeof value === "string") {
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `Minimum length is ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `Maximum length is ${rules.maxLength} characters`;
    }
  }

  // Number validation
  if (typeof value === "number") {
    if (rules.min !== undefined && value < rules.min) {
      return rules.message || `Value must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return rules.message || `Value must be at most ${rules.max}`;
    }
  }

  // Pattern validation
  if (
    rules.pattern &&
    typeof value === "string" &&
    !rules.pattern.test(value)
  ) {
    return rules.message || "Invalid format";
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

/**
 * Validate an object against a schema
 */
export function validateObject(
  data: Record<string, any>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(data[field], rules);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Common validation rules
 */
export const commonRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || "This field is required",
  }),

  email: (required = true): ValidationRule => ({
    required,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  }),

  phone: (required = true): ValidationRule => ({
    required,
    pattern: /^\+?[\d\s\-\(\)]+$/,
    message: "Please enter a valid phone number",
  }),

  sku: (required = true): ValidationRule => ({
    required,
    pattern: /^[A-Z0-9-_]+$/,
    message:
      "SKU must contain only uppercase letters, numbers, hyphens, and underscores",
  }),

  price: (required = true, min = 0): ValidationRule => ({
    required,
    min,
    message: required
      ? "Price is required and must be positive"
      : "Price must be positive",
  }),

  percentage: (required = true): ValidationRule => ({
    required,
    min: 0,
    max: 100,
    message: "Percentage must be between 0 and 100",
  }),

  taxRate: (required = false): ValidationRule => ({
    required,
    min: 0,
    max: 1,
    message: "Tax rate must be between 0 and 1 (0% to 100%)",
  }),

  quantity: (required = true, min = 0): ValidationRule => ({
    required,
    min,
    message: required
      ? "Quantity is required and cannot be negative"
      : "Quantity cannot be negative",
  }),

  password: (required = true): ValidationRule => ({
    required,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message:
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
  }),

  url: (required = false): ValidationRule => ({
    required,
    pattern: /^https?:\/\/.+/,
    message: "Please enter a valid URL starting with http:// or https://",
  }),

  date: (required = true): ValidationRule => ({
    required,
    custom: (value) => {
      if (!value) return required ? "Date is required" : null;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return "Please enter a valid date";
      }
      return null;
    },
  }),

  futureDate: (required = true): ValidationRule => ({
    required,
    custom: (value) => {
      if (!value) return required ? "Date is required" : null;
      const date = new Date(value);
      const now = new Date();
      if (isNaN(date.getTime())) {
        return "Please enter a valid date";
      }
      if (date <= now) {
        return "Date must be in the future";
      }
      return null;
    },
  }),

  pastDate: (required = true): ValidationRule => ({
    required,
    custom: (value) => {
      if (!value) return required ? "Date is required" : null;
      const date = new Date(value);
      const now = new Date();
      if (isNaN(date.getTime())) {
        return "Please enter a valid date";
      }
      if (date >= now) {
        return "Date must be in the past";
      }
      return null;
    },
  }),
};

/**
 * Product validation schema
 */
export const productValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 200,
    message: "Product name must be between 2 and 200 characters",
  },
  sku: commonRules.sku(true),
  description: {
    maxLength: 1000,
    message: "Description cannot exceed 1000 characters",
  },
  price: commonRules.price(true),
  quantity: commonRules.quantity(true),
  tax: commonRules.taxRate(false),
  unit: {
    required: true,
    custom: (value) => {
      const validUnits = ["piece", "box", "case", "pound", "gallon", "liter"];
      if (!validUnits.includes(value)) {
        return "Please select a valid unit";
      }
      return null;
    },
  },
};

/**
 * User validation schema
 */
export const userValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: "Name must be between 2 and 100 characters",
  },
  email: commonRules.email(true),
  phone: commonRules.phone(true),
  address: {
    required: true,
    minLength: 5,
    maxLength: 500,
    message: "Address must be between 5 and 500 characters",
  },
  password: commonRules.password(true),
  role: {
    required: true,
    custom: (value) => {
      const validRoles = ["admin", "customer", "driver"];
      if (!validRoles.includes(value)) {
        return "Please select a valid role";
      }
      return null;
    },
  },
};

/**
 * Customer validation schema
 */
export const customerValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 200,
    message: "Customer name must be between 2 and 200 characters",
  },
  email: commonRules.email(false),
  phone: {
    required: false,
    pattern: /^\+?[\d\s\-\(\)]+$/,
    message: "Please enter a valid phone number",
  },
  balance: {
    min: 0,
    message: "Balance cannot be negative",
  },
  creditLimit: {
    min: 0,
    message: "Credit limit cannot be negative",
  },
  paymentTerms: {
    required: false,
    custom: (value) => {
      if (value) {
        const validTerms = ["immediate", "net15", "net30", "net60"];
        if (!validTerms.includes(value)) {
          return "Please select a valid payment term";
        }
      }
      return null;
    },
  },
};

/**
 * Order validation schema
 */
export const orderValidationSchema: ValidationSchema = {
  customerId: {
    required: true,
    message: "Customer is required",
  },
  items: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return "At least one item is required";
      }
      return null;
    },
  },
  requestedDeliveryDate: commonRules.futureDate(false),
  specialInstructions: {
    maxLength: 1000,
    message: "Special instructions cannot exceed 1000 characters",
  },
};

/**
 * Invoice validation schema
 */
export const invoiceValidationSchema: ValidationSchema = {
  customerId: {
    required: true,
    message: "Customer is required",
  },
  items: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return "At least one item is required";
      }
      return null;
    },
  },
  dueDate: commonRules.date(true),
  issueDate: commonRules.date(true),
};

// pricePerUnit, minStock, maxStock and cost validations removed per simplified schema

/**
 * Debounced validation for real-time form validation
 */
export function createDebouncedValidator(
  schema: ValidationSchema,
  delay = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (
    data: Record<string, any>,
    callback: (result: ValidationResult) => void
  ) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validateObject(data, schema);
      callback(result);
    }, delay);
  };
}

/**
 * Async validation for server-side checks (like SKU uniqueness)
 */
export async function validateAsync(
  field: string,
  value: any,
  validator: (value: any) => Promise<string | null>
): Promise<string | null> {
  try {
    return await validator(value);
  } catch (error) {
    console.error(`Async validation error for ${field}:`, error);
    return "Validation error occurred";
  }
}
