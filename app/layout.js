import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import ThemeRegistry from '../components/ThemeRegistry';

export const metadata = {
  title: 'Nakshathran Travels',
  description: 'Travel booking, custom trips, verified vehicles and route-aware pricing.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
