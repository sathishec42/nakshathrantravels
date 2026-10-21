'use client';

import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  Drawer,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import PhoneIcon from '@mui/icons-material/Phone';
import RouteIcon from '@mui/icons-material/Route';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  navItems,
  trustHighlights,
  destinationCards,
  packageOffers,
  travelReasons,
  adminStats,
} from '../src/data/siteContent';
import { vehicles } from '../src/data/mockData';

export default function Page() {
  const drawer = (
    <Box sx={{ width: 240, mt: 2 }}>
      <List>
        {navItems.map((item) => (
          <ListItemButton key={item.label} href={item.href} component="a">
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ px: 2, py: 2 }}>
        <Button fullWidth variant="contained" sx={{ mb: 1 }} href="#planner">
          Book a Ride
        </Button>
        <Button fullWidth variant="outlined" href="#contact">
          Contact Us
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', background: '#f3f7fb' }}>
      <AppBar position="sticky" sx={{ background: '#ffffff', color: '#0b1f3a', boxShadow: 0, borderBottom: '1px solid rgba(11,31,58,0.08)' }}>
        <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto' }}>
          <IconButton color="inherit" edge="start" sx={{ mr: 2, display: { md: 'none' } }} aria-label="Open menu">
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #0b1f3a 0%, #203d74 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>
              N
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Nakshathran Travels
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            {navItems.map((item) => (
              <Button key={item.label} href={item.href} sx={{ color: '#0b1f3a', fontWeight: 600, textTransform: 'none' }}>
                {item.label}
              </Button>
            ))}
          </Stack>

          <Button variant="contained" sx={{ ml: 2, display: { xs: 'none', sm: 'inline-flex' } }}>
            Get Quote
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer variant="temporary" open={false} onClose={() => {}} ModalProps={{ keepMounted: true }}>
        {drawer}
      </Drawer>

      <Box id="home" sx={{ background: 'linear-gradient(135deg, rgba(11,31,58,0.96), rgba(32,61,116,0.92)), url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80) center/cover no-repeat', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip label="Trusted intercity travel partner" sx={{ mb: 2, background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 999 }} />
              <Typography variant="h2" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.08, mb: 2 }}>
                Premium vehicle booking for unforgettable journeys.
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, maxWidth: 620 }}>
                From family trips and airport transfers to custom multi-stop routes, we help you travel comfortably with transparent pricing and verified drivers.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" color="secondary" size="large" href="#planner">
                  Plan My Trip
                </Button>
                <Button variant="outlined" size="large" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }} href="#vehicles">
                  Browse Vehicles
                </Button>
              </Stack>
              <Stack direction="row" spacing={2} sx={{ mt: 4, flexWrap: 'wrap', gap: 2 }}>
                {trustHighlights.map((item) => (
                  <Chip key={item} label={item} sx={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} />
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.98)' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0b1f3a', mb: 2 }}>
                  Quick quote
                </Typography>
                <TextField fullWidth label="From" value="Chennai" sx={{ mb: 2 }} />
                <TextField fullWidth label="To" value="Madurai" sx={{ mb: 2 }} />
                <TextField fullWidth select label="Vehicle type" defaultValue="SUV" sx={{ mb: 2 }}>
                  <MenuItem value="SUV">SUV</MenuItem>
                  <MenuItem value="Tempo Traveller">Tempo Traveller</MenuItem>
                  <MenuItem value="Mini Bus">Mini Bus</MenuItem>
                  <MenuItem value="Hatchback">Hatchback</MenuItem>
                </TextField>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Estimated fare</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0b1f3a' }}>₹3,600</Typography>
                </Stack>
                <Button variant="contained" fullWidth size="large">
                  Request Booking
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 7 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="overline" sx={{ color: '#203d74', fontWeight: 700, letterSpacing: 1.5 }}>
            Why choose us
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#0b1f3a', mb: 2 }}>
            Journeys designed for comfort, safety and trust.
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {travelReasons.map((item) => (
            <Grid item xs={12} md={6} lg={3} key={item.title}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <CheckCircleIcon color="primary" sx={{ mb: 2, fontSize: 34 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.text}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box id="destinations" sx={{ py: 7, background: '#edf4ff' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="overline" sx={{ color: '#203d74', fontWeight: 700, letterSpacing: 1.5 }}>
              Popular destinations
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#0b1f3a' }}>
              Explore India with confidence.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {destinationCards.map((destination) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={destination.title}>
                <Card sx={{ height: '100%' }}>
                  <CardMedia component="img" height="220" image={destination.image} alt={destination.title} />
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{destination.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{destination.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="packages" sx={{ py: 7 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="overline" sx={{ color: '#203d74', fontWeight: 700, letterSpacing: 1.5 }}>
              Travel packages
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#0b1f3a' }}>
              Handpicked escapes for every kind of traveller.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {packageOffers.map((pkg) => (
              <Grid item xs={12} md={4} key={pkg.title}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>{pkg.duration}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>{pkg.title}</Typography>
                    <Typography variant="h6" sx={{ color: '#0b1f3a', fontWeight: 700, my: 2 }}>{pkg.price}</Typography>
                    <Typography variant="body2" color="text.secondary">{pkg.description}</Typography>
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button variant="contained" fullWidth>
                      View package
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="vehicles" sx={{ py: 7, background: '#f7f9fc' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="overline" sx={{ color: '#203d74', fontWeight: 700, letterSpacing: 1.5 }}>
                Fleet
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#0b1f3a' }}>
                Available vehicles
              </Typography>
            </Box>
            <Button variant="outlined">View all vehicles</Button>
          </Box>

          <Grid container spacing={3}>
            {vehicles.map((vehicle) => (
              <Grid item xs={12} md={6} lg={4} key={vehicle.id}>
                <Card sx={{ height: '100%' }}>
                  <CardMedia component="img" height="220" image={vehicle.image} alt={vehicle.name} />
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{vehicle.name}</Typography>
                    <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Chip label={`${vehicle.seats} seats`} size="small" />
                      <Chip label={vehicle.fuel} size="small" />
                      <Chip label={vehicle.category} size="small" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{vehicle.description}</Typography>
                    <Typography variant="body2"><strong>Per day:</strong> ₹{vehicle.tariff.perDay.toLocaleString()}</Typography>
                    <Typography variant="body2"><strong>Per km:</strong> ₹{vehicle.tariff.perKm}</Typography>
                  </CardContent>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Button variant="contained" fullWidth>
                      Book now
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="planner" sx={{ py: 7 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="overline" sx={{ color: '#203d74', fontWeight: 700, letterSpacing: 1.5 }}>
              Custom trip planner
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#0b1f3a' }}>
              Plan a multi-stop route with route-aware pricing.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2}>
                  <TextField label="Pickup location" defaultValue="Chennai" />
                  <TextField label="Stop 1" defaultValue="Mahabalipuram" />
                  <TextField label="Stop 2" defaultValue="Pondicherry" />
                  <TextField label="Final destination" defaultValue="Chennai Airport" />
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Button variant="outlined" startIcon={<RouteIcon />}>
                      Add stop
                    </Button>
                    <TextField select label="Order mode" defaultValue="manual" sx={{ minWidth: 180 }}>
                      <MenuItem value="manual">Manual order</MenuItem>
                      <MenuItem value="optimized">Optimized order</MenuItem>
                    </TextField>
                  </Stack>
                  <Button variant="contained" size="large">
                    Calculate route
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="overline" color="primary">Route summary</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Live estimate</Typography>
                  </Box>
                  <Chip label="Manual mode" color="primary" variant="outlined" />
                </Stack>
                <Box sx={{ background: '#edf4ff', borderRadius: 3, p: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Distance</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>240 km</Typography>
                  <Typography variant="body2" color="text.secondary">Estimated duration: 4.2 hrs</Typography>
                </Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Rate</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>₹15/km</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Estimated fare</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0b1f3a' }}>₹3,600</Typography>
                </Stack>
                <Button variant="contained" fullWidth size="large">
                  Save trip
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="about" sx={{ py: 7, background: '#0b1f3a', color: '#fff' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="overline" sx={{ color: '#9fc1ff', fontWeight: 700, letterSpacing: 1.5 }}>
                About us
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
                Building dependable travel experiences across South India.
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.82)' }}>
                We help individuals, families and groups book verified vehicles, plan custom routes and travel with confidence from pickup to drop-off. Our focus is safety, transparency, and seamless journeys across every mile.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {adminStats.map((item) => (
                  <Grid item xs={12} sm={6} key={item.label}>
                    <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>{item.value}</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>{item.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="contact" sx={{ py: 7 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="overline" sx={{ color: '#203d74', fontWeight: 700 }}>
                Contact us
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#0b1f3a', mb: 2 }}>Let us plan your next trip.</Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PhoneIcon color="primary" />
                  <Typography>+91 98765 43210</Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <WhatsAppIcon color="success" />
                  <Typography>WhatsApp support</Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <InstagramIcon color="primary" />
                  <Typography>@nakshathrantravels</Typography>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2}>
                  <TextField label="Your name" />
                  <TextField label="Phone number" />
                  <TextField label="Travel requirements" multiline minRows={4} />
                  <Button variant="contained" size="large">Send enquiry</Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 4, background: '#071528' }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              © 2026 Nakshathran Travels. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button href="#home" sx={{ color: '#fff', textTransform: 'none' }}>Home</Button>
              <Button href="#vehicles" sx={{ color: '#fff', textTransform: 'none' }}>Vehicles</Button>
              <Button href="#contact" sx={{ color: '#fff', textTransform: 'none' }}>Contact</Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
