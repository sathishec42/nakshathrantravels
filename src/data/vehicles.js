import urbania from '../vehicles/urbania.svg';

const vehicles = [
  {
    id: 'urbania-4400-12',
    name: 'Force Urbania DX 4400 (12-seater)',
    seats: 12,
    fuel: 'Diesel',
    engine: '2.6L CRDi (approx)',
    tariff: {
      perDay: 4000,
      perKm: 20
    },
    image: urbania,
    description: 'Comfortable 12-seater van suitable for group tours and short-haul travel across cities and states.'
  }
];

export default vehicles;
