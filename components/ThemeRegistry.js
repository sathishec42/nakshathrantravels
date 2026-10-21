'use client';

import { CssBaseline } from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../src/theme';

export default function ThemeRegistry({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
