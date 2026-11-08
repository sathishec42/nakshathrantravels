import React, { useState } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

export default function PlaceAutocomplete({ label, name, onSelection, required = false }) {
  const [inputValue, setInputValue] = useState('');
  const [sessionToken, setSessionToken] = useState(() => window.crypto.randomUUID());
  const [selectionComplete, setSelectionComplete] = useState(false);
  const { data = [], isFetching, error } = useQuery({
    queryKey: ['place-suggestions', inputValue, sessionToken],
    queryFn: async () => {
      const response = await apiClient.get('/places/autocomplete', {
        params: { input: inputValue.trim(), sessionToken },
      });
      return response.data.data;
    },
    enabled: inputValue.trim().length >= 3 && !selectionComplete,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <Autocomplete
      className="w-full"
      freeSolo
      options={data}
      inputValue={inputValue}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.description}
      isOptionEqualToValue={(option, value) => option.placeId === value.placeId}
      onInputChange={(event, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(value);
          setSelectionComplete(false);
          onSelection?.(value, null);
        }
      }}
      onChange={(event, value) => {
        const selected = typeof value === 'string' ? value : value?.description || '';
        setInputValue(selected);
        onSelection?.(selected, typeof value === 'string' ? null : value);
        setSelectionComplete(Boolean(typeof value !== 'string' && value?.placeId));
        if (typeof value !== 'string' && value?.placeId) setSessionToken(window.crypto.randomUUID());
      }}
      loading={isFetching}
      filterOptions={(options) => options}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          required={required}
          error={Boolean(error)}
          helperText={error ? error.response?.data?.error?.message || 'Place suggestions are unavailable.' : undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
