import React from 'react';
import { Alert } from '@mui/material';

export default function RouteMap({ encodedPolyline, description }) {
  if (!encodedPolyline) return null;
  const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return <Alert severity="info" className="route-map-note">Route planned. Set a referrer-restricted Google Maps JavaScript/Static Maps key to display the route preview.</Alert>;
  }
  const path = encodeURIComponent(`color:0x174d43|weight:5|enc:${encodedPolyline}`);
  const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?size=640x300&scale=2&maptype=roadmap&path=${path}&key=${encodeURIComponent(key)}`;
  return (
    <img
      className="route-map-image"
      src={imageUrl}
      alt={description ? `Planned route from ${description}` : 'Planned trip route'}
      loading="lazy"
    />
  );
}
