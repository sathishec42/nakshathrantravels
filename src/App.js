import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  CircularProgress,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AirportShuttleRoundedIcon from '@mui/icons-material/AirportShuttleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import BookOnlineRoundedIcon from '@mui/icons-material/BookOnlineRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import apiClient from './api/client';
import { getCurrentUser, loginWithPassword, logout, registerCustomer } from './api/auth';
import { createBooking, createPaymentOrder, listActiveVehicles, listMyBookings, loadRazorpayCheckout } from './api/bookings';
import PlaceAutocomplete from './components/PlaceAutocomplete';
import PhoneOtpForm from './components/PhoneOtpForm';
import RouteMap from './components/RouteMap';
import vehicles from './data/vehicles';
import VehicleCard from './components/VehicleCard';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#174d43', contrastText: '#ffffff' },
    secondary: { main: '#e9a43a' },
    background: { default: '#f7f8f5', paper: '#ffffff' },
    text: { primary: '#172c27', secondary: '#687772' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
});

export default function App() {
  const [query, setQuery] = useState('');
  const [minimumSeats, setMinimumSeats] = useState('all');
  const [bookingVehicle, setBookingVehicle] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [fleet, setFleet] = useState(null);
  const [fleetError, setFleetError] = useState('');
  const [availabilityConflicts, setAvailabilityConflicts] = useState([]);
  const [searchStartAt, setSearchStartAt] = useState('');
  const [searchEndAt, setSearchEndAt] = useState('');
  const [user, setUser] = useState(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authProvidersError, setAuthProvidersError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authProviders, setAuthProviders] = useState({});
  const [pendingBooking, setPendingBooking] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState('');
  const [paymentBusyId, setPaymentBusyId] = useState('');
  const minimumStart = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  const defaultEnd = new Date(Date.now() + 32 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  useEffect(() => {
    let active = true;
    if (Boolean(searchStartAt) !== Boolean(searchEndAt)) {
      setFleetError('Enter both a pickup and drop-off time to search availability.');
      return () => { active = false; };
    }
    const params = {};
    if (minimumSeats !== 'all') params.minSeats = minimumSeats;
    if (searchStartAt && searchEndAt) {
      params.startAt = new Date(searchStartAt).toISOString();
      params.endAt = new Date(searchEndAt).toISOString();
    }
    listActiveVehicles(params)
      .then((result) => {
        if (active) {
          setFleet(result.vehicles);
          setAvailabilityConflicts(result.conflicts);
          setFleetError('');
        }
      })
      .catch((error) => {
        if (!active) return;
        setFleetError(error.response?.data?.error?.message || 'Live fleet is temporarily unavailable; sample vehicles are shown.');
      });
    return () => { active = false; };
  }, [minimumSeats, searchEndAt, searchStartAt]);

  useEffect(() => {
    let active = true;
    apiClient.get('/auth/providers')
      .then((response) => {
        if (active) {
          setAuthProviders(response.data.providers || {});
          setAuthProvidersError('');
        }
      })
      .catch((error) => {
        if (active) {
          setAuthProviders({});
          setAuthProvidersError(error.response?.data?.error?.message || 'Authentication provider status could not be loaded.');
        }
      });
    getCurrentUser()
      .then((sessionUser) => { if (active) setUser(sessionUser); })
      .catch((error) => {
        if (active && error.response?.status !== 401) {
          setFleetError(error.response?.data?.error?.message || 'Could not restore your sign-in session.');
        }
      });
    return () => { active = false; };
  }, []);

  const displayedVehicles = Array.isArray(fleet) ? fleet.map((vehicle) => ({
    id: vehicle._id,
    bookingId: vehicle._id,
    name: vehicle.modelName || vehicle.type.replaceAll('_', ' '),
    seats: vehicle.seats,
    fuel: 'Confirm with fleet',
    engine: 'Verified fleet vehicle',
    tariff: {
      perDay: vehicle.pricing?.baseFare || null,
      perKm: vehicle.pricing?.ratePerKm || null,
    },
    image: vehicle.photoUrls?.[0] || vehicles[0].image,
    description: `${vehicle.airConditioned ? 'Air-conditioned' : 'Non-AC'} vehicle · ${vehicle.luggageBagLimit ?? 0} luggage bags · ${vehicle.registrationNumber}`,
  })) : vehicles;
  const featuredVehicle = displayedVehicles[0] || vehicles[0];
  const firebaseClientReady = Boolean(
    process.env.REACT_APP_FIREBASE_API_KEY
    && process.env.REACT_APP_FIREBASE_AUTH_DOMAIN
    && process.env.REACT_APP_FIREBASE_PROJECT_ID
    && process.env.REACT_APP_FIREBASE_APP_ID,
  );

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return displayedVehicles.filter((vehicle) => {
      const matchesQuery = !normalizedQuery
        || `${vehicle.name} ${vehicle.description} ${vehicle.fuel}`.toLowerCase().includes(normalizedQuery);
      const matchesSeats = minimumSeats === 'all' || vehicle.seats >= Number(minimumSeats);
      return matchesQuery && matchesSeats;
    });
  }, [displayedVehicles, minimumSeats, query]);

  const reportApiError = (error, fallback) => error.response?.data?.error?.message || error.message || fallback;

  const createLiveBooking = async (vehicle, formValues) => {
    setBookingBusy(true);
    setBookingError('');
    try {
      const result = await createBooking({
        vehicleId: vehicle.bookingId,
        pickup: formValues.pickup,
        dropoff: formValues.destination,
        waypoints: [formValues.viaStop1, formValues.viaStop2, formValues.viaStop3]
          .map((stop) => stop?.trim())
          .filter(Boolean),
        startAt: new Date(formValues.startAt).toISOString(),
        endAt: new Date(formValues.endAt).toISOString(),
        passengers: Number(formValues.passengers),
      });
      setBookingVehicle(null);
      setPendingBooking(null);
      const routeWarnings = result.data.route?.warnings?.map((warning) => warning.text).filter(Boolean) || [];
      const complianceNotice = result.compliance?.flags?.includes('BORDER_PERMIT_REQUIRED')
        ? ' Dispatch will review the interstate permit and border tax requirements.'
        : ' Dispatch will review availability and send a final quote before payment.';
      setConfirmation(`Request received.${complianceNotice}${routeWarnings.length ? ` Route review: ${routeWarnings.join(' ')}` : ''}`);
      if (bookingsOpen) {
        listMyBookings().then(setMyBookings).catch((error) => setBookingsError(reportApiError(error, 'Could not refresh bookings.')));
      }
    } catch (error) {
      setBookingError(reportApiError(error, 'Could not submit the booking request.'));
    } finally {
      setBookingBusy(false);
    }
  };

  const handleBooking = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formValues = Object.fromEntries(formData.entries());
    if (!bookingVehicle?.bookingId) {
      const reference = `NT${Date.now().toString().slice(-6)}`;
      setBookingVehicle(null);
      setConfirmation(`Sample booking preview ${reference} created. No booking was sent or reserved.`);
      return;
    }
    if (!user) {
      setPendingBooking(formValues);
      setAuthMode('login');
      setAuthError('');
      setAuthDialogOpen(true);
      return;
    }
    await createLiveBooking(bookingVehicle, formValues);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    try {
      const result = authMode === 'register'
        ? await registerCustomer({
          name: values.name,
          email: values.email,
          password: values.password,
          ...(values.phone ? { phone: values.phone } : {}),
        })
        : await loginWithPassword({ email: values.email, password: values.password });
      setUser(result.user);
      setAuthDialogOpen(false);
      setConfirmation(`Signed in${result.user?.name ? ` as ${result.user.name}` : ''}.`);
      if (pendingBooking && bookingVehicle) await createLiveBooking(bookingVehicle, pendingBooking);
    } catch (error) {
      setAuthError(reportApiError(error, 'Could not sign in.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePhoneAuthenticated = async (session) => {
    setUser(session.user);
    setAuthDialogOpen(false);
    setConfirmation('Phone number verified and signed in.');
    if (pendingBooking && bookingVehicle) await createLiveBooking(bookingVehicle, pendingBooking);
  };

  const openBookings = async () => {
    if (!user) {
      setAuthMode('login');
      setAuthDialogOpen(true);
      return;
    }
    setBookingsOpen(true);
    setBookingsError('');
    try {
      setMyBookings(await listMyBookings());
    } catch (error) {
      setBookingsError(reportApiError(error, 'Could not load your bookings.'));
    }
  };

  const payForBooking = async (booking) => {
    setPaymentBusyId(booking._id);
    setBookingsError('');
    try {
      await loadRazorpayCheckout();
      const { order, keyId } = await createPaymentOrder(booking._id);
      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Nakshathran Travels',
        description: `Booking ${booking._id}`,
        order_id: order.id,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: '#174d43' },
        handler: async () => {
          setPaymentBusyId('');
          setConfirmation('Payment submitted. Your booking will confirm after the secure payment webhook is verified.');
          try {
            setMyBookings(await listMyBookings());
          } catch (error) {
            setBookingsError(reportApiError(error, 'Could not refresh booking status.'));
          }
        },
        modal: { ondismiss: () => setPaymentBusyId('') },
      });
      checkout.on('payment.failed', (response) => {
        setBookingsError(response.error?.description || 'Payment failed. You can retry from your bookings.');
        setPaymentBusyId('');
      });
      checkout.open();
    } catch (error) {
      setBookingsError(reportApiError(error, 'Could not start payment. Please try again.'));
      setPaymentBusyId('');
    }
  };

  const signOut = async () => {
    try {
      await logout();
      setUser(null);
      setConfirmation('You have been signed out.');
    } catch (error) {
      setFleetError(reportApiError(error, 'Could not sign out.'));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar className="site-header" position="sticky" elevation={0}>
        <Container maxWidth="lg">
          <Toolbar disableGutters className="header-toolbar">
            <a className="brand" href="#home" aria-label="Nakshathran Travels home">
              <span className="brand-mark"><AirportShuttleRoundedIcon /></span>
              <span className="brand-name">nakshathran<span>travels</span></span>
            </a>
            <Box component="nav" className="desktop-nav" aria-label="Main navigation">
              <a href="#fleet">Our vehicles</a>
              <a href="#why-us">Why travel with us</a>
              <a href="#contact">Plan a trip</a>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {user && (
                <>
                  <Button onClick={openBookings} startIcon={<BookOnlineRoundedIcon />}>My trips</Button>
                  <Button onClick={signOut} color="inherit">{user.name?.split(' ')[0] || 'Sign out'}</Button>
                </>
              )}
              {!user && (
                <Button onClick={() => { setAuthMode('login'); setAuthDialogOpen(true); }} startIcon={<AccountCircleRoundedIcon />}>
                  Sign in
                </Button>
              )}
              <Button className="header-cta" variant="contained" href="#fleet" endIcon={<ArrowForwardRoundedIcon />}>
                Find a vehicle
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <main id="home">
        <section className="hero-section">
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 4, md: 5 }} alignItems="center">
              <Grid item xs={12} md={7}>
                <div className="eyebrow"><span /> ROAD TRIPS, MADE ROOMIER</div>
                <Typography component="h1" className="hero-title">
                  More room for<br /><span>the good stuff.</span>
                </Typography>
                <Typography className="hero-copy">
                  Bring your people, your plans, and the extra bags. Find a roomy ride for family
                  days out, pilgrimages, and journeys worth taking together.
                </Typography>
                <Stack direction="row" spacing={1.5} className="hero-actions">
                  <Button variant="contained" size="large" href="#fleet" endIcon={<ArrowForwardRoundedIcon />}>
                    Explore our vehicle
                  </Button>
                  <a className="text-link" href="#why-us">See what makes us different</a>
                </Stack>
                <div className="trust-row">
                  <span className="trust-icon"><GroupsRoundedIcon /></span>
                  <span><strong>Space for the whole crew</strong><small>Family trips · Pilgrimages · Getaways</small></span>
                </div>
                <div className="hero-facts" aria-label="Fleet and fare information">
                  <span><strong>{featuredVehicle.seats}</strong><small>passenger seats</small></span>
                  <span><strong>{featuredVehicle.tariff.perKm ? `₹${featuredVehicle.tariff.perKm}` : 'Quote'}</strong><small>{Array.isArray(fleet) ? 'rate per km' : 'sample rate per km'}</small></span>
                  <span><strong>Easy</strong><small>request preview</small></span>
                </div>
              </Grid>
              <Grid item xs={12} md={5}>
                <div className="hero-art" role="img" aria-label="A comfortable group travel van ready for a road trip">
                  <div className="sun-disc" />
                  <div className="route-line" />
                  <div className="hero-stamp"><TravelExploreRoundedIcon /><span>TAKE<br />THE<br />SCENIC<br />ROUTE</span></div>
                  <img src={featuredVehicle.image} alt="" className="hero-vehicle" />
                  <div className="hero-note"><span className="note-dot" /> YOUR NEXT ADVENTURE AWAITS</div>
                </div>
              </Grid>
            </Grid>
          </Container>
        </section>

        <Container maxWidth="lg">
          {fleetError && (
            <Alert severity="warning" className="fleet-status-alert">
              {fleetError}{!Array.isArray(fleet) && ' Sample fleet entries are for demonstration only; connect the API to submit a real booking.'}
            </Alert>
          )}
          <section className="search-panel" aria-label="Find a vehicle">
            <div className="search-intro">
              <span className="search-icon"><SearchRoundedIcon /></span>
              <span><strong>Find your ride</strong><small>Tell us what your group needs</small></span>
            </div>
            <TextField
              className="search-field"
              size="small"
              label="Search vehicles"
              placeholder="Try “Urbania” or “diesel”"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              inputProps={{ 'aria-label': 'Search vehicles by name, details or fuel type' }}
            />
            <TextField
              className="search-field seats-filter"
              size="small"
              select
              label="Group size"
              value={minimumSeats}
              onChange={(event) => setMinimumSeats(event.target.value)}
            >
              <MenuItem value="all">Any group size</MenuItem>
              <MenuItem value="8">8+ passengers</MenuItem>
              <MenuItem value="12">12+ passengers</MenuItem>
            </TextField>
            <TextField
              className="search-field availability-field"
              size="small"
              label="Pickup time (optional)"
              type="datetime-local"
              value={searchStartAt}
              onChange={(event) => setSearchStartAt(event.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: minimumStart }}
            />
            <TextField
              className="search-field availability-field"
              size="small"
              label="Drop-off time (optional)"
              type="datetime-local"
              value={searchEndAt}
              onChange={(event) => setSearchEndAt(event.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: searchStartAt || minimumStart }}
            />
            <Button className="search-button" variant="contained" href="#fleet" endIcon={<ArrowForwardRoundedIcon />}>
              Browse fleet
            </Button>
          </section>
          {searchStartAt && searchEndAt && availabilityConflicts.length > 0 && (
            <Alert severity="info" className="fleet-status-alert">
              {availabilityConflicts.length} active vehicle{availabilityConflicts.length === 1 ? ' is' : 's are'} unavailable for this window because of the 12-hour turnaround rule or no active driver.
            </Alert>
          )}

          <section id="fleet" className="fleet-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow dark-eyebrow"><span /> READY WHEN YOU ARE</div>
                <Typography component="h2">Your ride, <em>sorted.</em></Typography>
                <Typography className="section-copy">A little more space. A lot more together.</Typography>
              </div>
              <div className="fleet-count"><AirportShuttleRoundedIcon /> {filteredVehicles.length} vehicle{filteredVehicles.length === 1 ? '' : 's'} listed</div>
            </div>

            {filteredVehicles.length > 0 ? (
              <Grid container spacing={3}>
                {filteredVehicles.map((vehicle) => (
                  <Grid item xs={12} key={vehicle.id}>
                    <VehicleCard vehicle={vehicle} onBook={() => setBookingVehicle(vehicle)} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <div className="empty-state">
                <SearchRoundedIcon />
                <Typography component="h3">{searchStartAt && searchEndAt ? 'No vehicles are free for that window' : 'No rides found just yet'}</Typography>
                <Typography>Try different dates, a broader search, or another group size.</Typography>
                <Button onClick={() => { setQuery(''); setMinimumSeats('all'); }}>Clear filters</Button>
              </div>
            )}
          </section>

          <section id="why-us" className="benefits-section">
            <div className="benefit-heading">
              <div className="eyebrow dark-eyebrow"><span /> THE LITTLE THINGS MATTER</div>
              <Typography component="h2">Travel feels better <em>together.</em></Typography>
            </div>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <div className="benefit-card">
                  <span className="benefit-icon"><GroupsRoundedIcon /></span>
                  <Typography component="h3">Room for everyone</Typography>
                  <Typography>Keep your group together, with space to settle in and enjoy the ride.</Typography>
                </div>
              </Grid>
              <Grid item xs={12} sm={4}>
                <div className="benefit-card">
                  <span className="benefit-icon"><LocalOfferRoundedIcon /></span>
                  <Typography component="h3">Clear sample rates</Typography>
                  <Typography>See per-day and per-kilometre estimates before you send a request.</Typography>
                </div>
              </Grid>
              <Grid item xs={12} sm={4}>
                <div className="benefit-card">
                  <span className="benefit-icon"><EventAvailableRoundedIcon /></span>
                  <Typography component="h3">A simple request</Typography>
                  <Typography>Enter your trip details to preview the booking confirmation right here.</Typography>
                </div>
              </Grid>
            </Grid>
          </section>

          <section id="contact" className="contact-banner">
            <div className="contact-copy">
              <span>LET'S GET YOU GOING</span>
              <Typography component="h2">Planning a trip?</Typography>
              <Typography>Pick a vehicle and enter your trip details to preview a booking request.</Typography>
            </div>
            <Button variant="contained" href="#fleet" endIcon={<ArrowForwardRoundedIcon />}>Plan your ride</Button>
            <PlaceRoundedIcon className="contact-decoration" />
          </section>
        </Container>
      </main>

      <footer className="site-footer">
        <Container maxWidth="lg">
          <div className="footer-inner">
            <a className="brand footer-brand" href="#home">
              <span className="brand-mark"><AirportShuttleRoundedIcon /></span>
              <span className="brand-name">nakshathran<span>travels</span></span>
            </a>
            <Typography>© {new Date().getFullYear()} Nakshathran Travels · Travel well, together.</Typography>
            <a href="#contact">Plan your trip</a>
          </div>
          <Typography className="rate-note">Rates shown are sample estimates. Confirm final pricing and availability with Nakshathran Travels.</Typography>
        </Container>
      </footer>

      <Dialog open={Boolean(bookingVehicle)} onClose={() => setBookingVehicle(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleBooking}>
          <DialogTitle className="booking-title">
            <span className="eyebrow dark-eyebrow"><span /> BOOKING REQUEST</span>
            <Typography component="h2">Let’s plan your trip.</Typography>
            {bookingVehicle && <Typography>{bookingVehicle.name}</Typography>}
          </DialogTitle>
          <DialogContent className="booking-form">
            <Typography className="form-note">
              {bookingVehicle?.bookingId
                ? 'Your request will be sent securely to dispatch. The trip is not reserved until availability and the final quote are confirmed.'
                : 'Sample fleet preview only. This form does not send your details or reserve a vehicle.'}
            </Typography>
            {bookingError && <Alert severity="error" sx={{ mb: 2 }}>{bookingError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField name="startAt" label="Pickup date and time" type="datetime-local" defaultValue={defaultStart} InputLabelProps={{ shrink: true }} inputProps={{ min: minimumStart }} required fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField name="endAt" label="Estimated drop-off" type="datetime-local" defaultValue={defaultEnd} InputLabelProps={{ shrink: true }} inputProps={{ min: defaultStart }} required fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField name="passengers" label="Passengers" type="number" inputProps={{ min: 1, max: bookingVehicle?.seats || 100 }} required fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PlaceAutocomplete name="pickup" label="Pickup location" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PlaceAutocomplete name="destination" label="Destination" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PlaceAutocomplete name="viaStop1" label="Via stop 1 (optional)" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PlaceAutocomplete name="viaStop2" label="Via stop 2 (optional)" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PlaceAutocomplete name="viaStop3" label="Via stop 3 (optional)" />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions className="booking-actions">
            <Button onClick={() => setBookingVehicle(null)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" disabled={bookingBusy} endIcon={bookingBusy ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardRoundedIcon />}>
              {bookingVehicle?.bookingId ? 'Send booking request' : 'Preview request'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={authDialogOpen}
        onClose={() => {
          setAuthDialogOpen(false);
          setPendingBooking(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle className="booking-title">
          <span className="eyebrow dark-eyebrow"><span /> CUSTOMER ACCOUNT</span>
          <Typography component="h2">{authMode === 'register' ? 'Create your account.' : 'Welcome back.'}</Typography>
        </DialogTitle>
        <DialogContent className="booking-form">
          {authError && <Alert severity="error" sx={{ mb: 2 }}>{authError}</Alert>}
          {authProvidersError && <Alert severity="warning" sx={{ mb: 2 }}>{authProvidersError}</Alert>}
          <Stack component="form" spacing={2} onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <>
                <TextField name="name" label="Full name" autoComplete="name" required fullWidth />
                <TextField name="phone" label="Mobile number (optional)" type="tel" autoComplete="tel" fullWidth />
              </>
            )}
            <TextField name="email" label="Email" type="email" autoComplete="email" required fullWidth />
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              inputProps={authMode === 'register' ? { minLength: 12, maxLength: 128 } : { maxLength: 128 }}
              helperText={authMode === 'register' ? 'Use at least 12 characters.' : undefined}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={authBusy} startIcon={authBusy ? <CircularProgress size={16} color="inherit" /> : <LockOpenRoundedIcon />}>
              {authMode === 'register' ? 'Create account' : 'Sign in'}
            </Button>
          </Stack>
          <Divider sx={{ my: 2 }}>or continue with</Divider>
          <Stack spacing={1}>
            {['google', 'apple', 'facebook', 'github'].filter((provider) => authProviders[provider]).map((provider) => (
              <Button key={provider} variant="outlined" href={`${process.env.REACT_APP_API_BASE_URL || '/api'}/auth/oauth/${provider}`}>
                Continue with {provider[0].toUpperCase() + provider.slice(1)}
              </Button>
            ))}
            {authProviders.phone && !firebaseClientReady && (
              <Alert severity="info">Mobile sign-in needs Firebase web app settings in the frontend build.</Alert>
            )}
            {authProviders.phone && firebaseClientReady && <PhoneOtpForm onAuthenticated={handlePhoneAuthenticated} />}
          </Stack>
          <Button
            className="auth-mode-toggle"
            onClick={() => {
              setAuthMode(authMode === 'register' ? 'login' : 'register');
              setAuthError('');
            }}
          >
            {authMode === 'register' ? 'Already have an account? Sign in' : 'New to Nakshathran? Create an account'}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={bookingsOpen} onClose={() => setBookingsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle className="booking-title">
          <span className="eyebrow dark-eyebrow"><span /> YOUR TRIPS</span>
          <Typography component="h2">Booking requests</Typography>
        </DialogTitle>
        <DialogContent className="booking-form">
          {bookingsError && <Alert severity="error" sx={{ mb: 2 }}>{bookingsError}</Alert>}
          {myBookings.length === 0 && !bookingsError && (
            <Typography className="form-note">No booking requests yet.</Typography>
          )}
          <Stack divider={<Divider flexItem />} spacing={2}>
            {myBookings.map((booking) => (
              <Box key={booking._id} className="booking-row">
                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography fontWeight={700}>{booking.pickup} → {booking.dropoff}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(booking.startAt).toLocaleString()} · {booking.passengers} passenger{booking.passengers === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                  <Typography className="booking-status">{booking.status.replaceAll('_', ' ')}</Typography>
                </Stack>
                <RouteMap encodedPolyline={booking.route?.encodedPolyline} description={`${booking.pickup} to ${booking.dropoff}`} />
                {booking.permitFlags?.includes('BORDER_PERMIT_REQUIRED') && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    Interstate permit or border-tax review is required for this itinerary.
                  </Alert>
                )}
                {booking.route?.warnings?.map((warning) => (
                  <Alert severity="info" key={`${booking._id}-${warning.code}`} sx={{ mt: 1.5 }}>
                    {warning.text}
                  </Alert>
                ))}
                {booking.status === 'QUOTED' && booking.fare?.total > 0 && (
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1.5}>
                    <Typography fontWeight={700}>₹{booking.fare.total.toLocaleString('en-IN')}</Typography>
                    <Button
                      variant="contained"
                      disabled={paymentBusyId === booking._id}
                      onClick={() => payForBooking(booking)}
                      startIcon={paymentBusyId === booking._id ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                      Pay securely
                    </Button>
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions className="booking-actions">
          <Button onClick={() => setBookingsOpen(false)}>Close</Button>
          <Button onClick={openBookings}>Refresh</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(confirmation)} autoHideDuration={7000} onClose={() => setConfirmation('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setConfirmation('')} severity="success" variant="filled" sx={{ width: '100%' }}>{confirmation}</Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
