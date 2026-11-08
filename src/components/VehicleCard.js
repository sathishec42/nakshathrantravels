import React from 'react';
import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LocalGasStationRoundedIcon from '@mui/icons-material/LocalGasStationRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import AirportShuttleRoundedIcon from '@mui/icons-material/AirportShuttleRounded';

export default function VehicleCard({ vehicle, onBook }) {
  const { name, seats, fuel, engine, tariff, image, description } = vehicle;

  return (
    <Card className="vehicle-card" elevation={0}>
      <div className="vehicle-visual">
        <div className="vehicle-availability"><span /> SAMPLE FLEET VEHICLE</div>
        <img src={image} alt={name} />
        <div className="vehicle-number">01 <span>/ OUR FLEET</span></div>
      </div>
      <CardContent className="vehicle-content">
        <div className="vehicle-heading">
          <div>
            <Chip className="vehicle-category" icon={<AirportShuttleRoundedIcon />} label="GROUP TRAVEL" size="small" />
            <Typography component="h3" className="vehicle-name">{name}</Typography>
            <Typography className="vehicle-description">{description}</Typography>
          </div>
          <Button className="book-button" variant="contained" size="large" onClick={onBook} endIcon={<ArrowForwardRoundedIcon />}>
            Request to book
          </Button>
        </div>

        <div className="vehicle-details">
          <div><GroupsRoundedIcon /><span><small>CAPACITY</small><strong>{seats} passengers</strong></span></div>
          <div><LocalGasStationRoundedIcon /><span><small>FUEL</small><strong>{fuel}</strong></span></div>
          <div><SpeedRoundedIcon /><span><small>ENGINE</small><strong>{engine}</strong></span></div>
        </div>

        <div className="vehicle-rate">
          <div className="rate-label">
            <small>{vehicle.bookingId ? 'FLEET RATE' : 'SAMPLE TARIFF'}</small>
            <Typography>{vehicle.bookingId ? 'Final quote confirmed by dispatch' : 'Sample rates for planning'}</Typography>
          </div>
          <Stack direction="row" spacing={{ xs: 2, sm: 4 }} className="rate-prices">
            <div><strong>{tariff.perDay ? `₹${tariff.perDay.toLocaleString('en-IN')}` : 'On request'}</strong><small>per day</small></div>
            <span className="rate-divider" />
            <div><strong>{tariff.perKm ? `₹${tariff.perKm.toLocaleString('en-IN')}` : 'On request'}</strong><small>per km</small></div>
          </Stack>
        </div>
      </CardContent>
    </Card>
  );
}
