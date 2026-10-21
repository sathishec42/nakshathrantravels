import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0b1f3a', light: '#203d74', dark: '#071528' },
    secondary: { main: '#ffb703', contrastText: '#0b1f3a' },
    success: { main: '#2e7d32' },
    warning: { main: '#f57c00' },
    info: { main: '#0288d1' },
    background: {
      default: '#f3f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#12233d',
      secondary: '#4d6179',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.04em' },
    h2: { fontWeight: 800, letterSpacing: '-0.04em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          boxShadow: 'none',
          padding: '10px 18px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(11,31,58,0.08)',
          boxShadow: '0 14px 30px rgba(15, 23, 42, 0.08)',
        },
      },
    },
  },
});

export default theme;
