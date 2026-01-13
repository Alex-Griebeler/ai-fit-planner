import { useMemo } from 'react';

export interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  strength: 'weak' | 'medium' | 'strong';
  strengthPercent: number;
}

export function usePasswordValidation(password: string): PasswordValidation {
  return useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/\\]/.test(password);

    const criteriaCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSymbol].filter(Boolean).length;
    
    const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSymbol;
    
    let strength: 'weak' | 'medium' | 'strong';
    let strengthPercent: number;
    
    if (criteriaCount <= 2) {
      strength = 'weak';
      strengthPercent = 33;
    } else if (criteriaCount <= 4) {
      strength = 'medium';
      strengthPercent = 66;
    } else {
      strength = 'strong';
      strengthPercent = 100;
    }

    return {
      isValid,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSymbol,
      strength,
      strengthPercent,
    };
  }, [password]);
}
