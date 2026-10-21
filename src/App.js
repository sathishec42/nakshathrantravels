import React from 'react';
import { Box, CssBaseline, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, Divider, Container, Grid } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SpeedInsights } from '@vercel/speed-insights/react';
import TravelPoster from './posters/travel1.svg';
import TravelPoster2 from './posters/travel2.svg';
import TravelPoster3 from './posters/travel3.svg';
import vehicles from './data/vehicles';
import VehicleCard from './components/VehicleCard';
import './App.css';

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#f50057' },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Nakshathran Travels — Vehicle Booking
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              {['Home', 'Vehicles', 'Bookings', 'Contact'].map((text) => (
                <ListItem button key={text}>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Divider />
          </Box>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />

          <Container maxWidth="lg">
            <Typography variant="h4" gutterBottom>
              Welcome to Nakshathran Travels
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <img src={TravelPoster} alt="poster 1" style={{ width: '100%', borderRadius: 8 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <img src={TravelPoster2} alt="poster 2" style={{ width: '100%', borderRadius: 8 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <img src={TravelPoster3} alt="poster 3" style={{ width: '100%', borderRadius: 8 }} />
              </Grid>
            </Grid>

            <Typography variant="h5" gutterBottom>
              Available Vehicles
            </Typography>

            <Grid container spacing={2}>
              {vehicles.map((v) => (
                <Grid item xs={12} md={6} lg={4} key={v.id}>
                  <VehicleCard vehicle={v} />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>
      <SpeedInsights />
    </ThemeProvider>
  );
}
