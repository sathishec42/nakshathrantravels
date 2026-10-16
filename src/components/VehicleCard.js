import React from 'react';
import { Card, CardMedia, CardContent, Typography, CardActions, Button, Stack } from '@mui/material';

export default function VehicleCard({ vehicle }) {
  const { name, seats, fuel, engine, tariff, image, description } = vehicle;

  return (
    <Card>
      <CardMedia component="img" height="160" image={image} alt={name} />
      <CardContent>
        <Typography variant="h6" gutterBottom>{name}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2"><strong>Seats:</strong> {seats}</Typography>
          <Typography variant="body2"><strong>Fuel:</strong> {fuel}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ mt: 1 }}><strong>Engine:</strong> {engine}</Typography>

        <Typography variant="subtitle1" sx={{ mt: 2 }}><strong>Tariff</strong></Typography>
        <Typography variant="body2">Per day: ₹{tariff.perDay.toLocaleString()}</Typography>
        <Typography variant="body2">Per km: ₹{tariff.perKm}</Typography>
      </CardContent>
      <CardActions>
        <Button size="small" variant="contained" color="primary">Book Now</Button>
        <Button size="small">Details</Button>
      </CardActions>
    </Card>
  );
}
