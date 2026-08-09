import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * AISS_AES Brand Emblem Component
 * Dynamic theme adaptation serving /aiss_logo_light.svg or /aiss_logo_dark.svg
 */
const AISSLogo = ({ size = 22, className = '' }) => {
  const { theme } = useTheme();

  // Resolve active theme preference
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const logoSrc = isLight ? '/aiss_logo_light.svg' : '/aiss_logo_dark.svg';

  return (
    <img
      src={logoSrc}
      alt="AISS_AES Logo"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', margin: '0 auto', objectFit: 'contain' }}
    />
  );
};

export default AISSLogo;
