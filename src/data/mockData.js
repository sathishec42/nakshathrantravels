export const vehicles = [
  {
    id: 'urbania-4400-12',
    name: 'Force Urbania DX 4400 (12-seater)',
    seats: 12,
    fuel: 'Diesel',
    category: 'MUV',
    tariff: { perDay: 4000, perKm: 20 },
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80',
    description: 'Comfortable multi-seat van for family trips, pilgrimages and intercity travel.',
  },
  {
    id: 'swift-dzire',
    name: 'Swift Dzire Sedan',
    seats: 4,
    fuel: 'Petrol',
    category: 'Sedan',
    tariff: { perDay: 2200, perKm: 15 },
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80',
    description: 'Economy sedan ideal for airport transfers and business travel.',
  },
  {
    id: 'innova-crysta',
    name: 'Innova Crysta',
    seats: 7,
    fuel: 'Diesel',
    category: 'SUV',
    tariff: { perDay: 3800, perKm: 18 },
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
    description: 'Premium SUV for comfort-first family and executive journeys.',
  },
];

export const routePlans = [
  {
    title: 'Chennai to Mahabalipuram',
    distance: 55,
    duration: '1.5 hrs',
    price: 900,
  },
  {
    title: 'Chennai to Ooty',
    distance: 280,
    duration: '6 hrs',
    price: 4200,
  },
  {
    title: 'Coimbatore to Munnar',
    distance: 145,
    duration: '4 hrs',
    price: 2175,
  },
];

export const adminStats = [
  { label: 'Total customers', value: 1842 },
  { label: 'Pending owner approvals', value: 12 },
  { label: 'Pending driver approvals', value: 8 },
  { label: 'Pending vehicle approvals', value: 9 },
  { label: 'Completed trips', value: 612 },
  { label: 'Revenue (verified)', value: '₹4.8L' },
];

export const approvalQueue = [
  { name: 'Sathish Kumar', type: 'Owner profile', status: 'Pending', submitted: '2 days ago', note: 'Vehicle documents uploaded' },
  { name: 'Priya Nair', type: 'Driver profile', status: 'Pending', submitted: '1 day ago', note: 'Driving license verification needed' },
  { name: 'Ravindran', type: 'Vehicle approval', status: 'Approved', submitted: '3 days ago', note: 'Urbania 12-seater verified' },
  { name: 'Aisha', type: 'Agent profile', status: 'Changes requested', submitted: '5 days ago', note: 'Business ID missing' },
];

export const bookingQueue = [
  { id: 'BK-1024', customer: 'Anand', vehicle: 'Innova Crysta', status: 'Confirmed', fare: '₹11,500' },
  { id: 'BK-1028', customer: 'Meena', vehicle: 'Swift Dzire', status: 'Awaiting payment', fare: '₹2,900' },
  { id: 'BK-1035', customer: 'Karthik', vehicle: 'Urbania 12-seater', status: 'Assigned', fare: '₹18,400' },
];
