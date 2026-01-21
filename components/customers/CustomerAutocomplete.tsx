'use client';

import { useState, useCallback, useEffect, useMemo, type ReactElement, type SyntheticEvent } from 'react';
import Autocomplete, { 
  createFilterOptions, 
  type AutocompleteChangeReason,
} from '@mui/material/Autocomplete';
import type { FilterOptionsState } from '@mui/material';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useCustomerSearch } from '@/hooks/queries/useCustomersQueries';
import CustomerDialog from './CustomerDialog';
import type { CustomerSummary } from '@/types';

const DEBOUNCE_DELAY = 300;
const MIN_SEARCH_LENGTH = 2;

// Extended type for autocomplete options including "add new" option
interface CustomerOption extends CustomerSummary {
  isAddNew?: boolean;
}

const filter = createFilterOptions<CustomerOption>();

interface CustomerAutocompleteProps {
  value?: CustomerSummary | null;
  onChange: (customer: CustomerSummary | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
}

export default function CustomerAutocomplete({
  value,
  onChange,
  label = 'Customer',
  placeholder = 'Search for a customer...',
  disabled = false,
  required = false,
  error = false,
  helperText,
  size = 'medium',
}: Readonly<CustomerAutocompleteProps>): ReactElement {
  const [inputValue, setInputValue] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(inputValue);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Fetch customers based on debounced search
  const { data: customers = [], isLoading } = useCustomerSearch(debouncedInput);

  // Convert customers to options
  const options: CustomerOption[] = useMemo(() => {
    return customers.map((customer) => ({
      ...customer,
      isAddNew: false,
    }));
  }, [customers]);

  // Handle input change
  const handleInputChange = useCallback(
    (_event: SyntheticEvent, newInputValue: string) => {
      setInputValue(newInputValue);
    },
    []
  );

  // Handle selection change
  const handleChange = useCallback(
    (
      _event: SyntheticEvent,
      newValue: string | CustomerOption | null,
      _reason: AutocompleteChangeReason
    ) => {
      // Handle string input (from freeSolo)
      if (typeof newValue === 'string') {
        return;
      }

      if (newValue?.isAddNew) {
        // Open dialog to create new customer
        setDialogOpen(true);
      } else if (newValue) {
        // Selected an existing customer
        const { isAddNew, ...customer } = newValue;
        onChange(customer);
      } else {
        onChange(null);
      }
    },
    [onChange]
  );

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // Handle successful customer creation
  const handleCustomerCreated = useCallback(
    (message: string) => {
      // The customer was created - for now just close dialog
      // In a real app, we might want to select the newly created customer
      setDialogOpen(false);
      // Clear input to trigger a new search
      setInputValue('');
    },
    []
  );

  // Filter options to include "Add new" when searching
  const filterOptions = useCallback(
    (options: CustomerOption[], state: FilterOptionsState<CustomerOption>): CustomerOption[] => {
      const filtered = filter(options, state);

      // Add "create new" option if search has results or search is active
      if (state.inputValue.length >= MIN_SEARCH_LENGTH) {
        filtered.push({
          id: -1 as CustomerSummary['id'],
          customerId: '',
          name: `Add "${state.inputValue}"`,
          phone: null,
          isAddNew: true,
        });
      }

      return filtered;
    },
    []
  );

  // Render option
  const renderOption = useCallback(
    (props: React.HTMLAttributes<HTMLLIElement> & { key: string }, option: CustomerOption) => {
      if (option.isAddNew) {
        return (
          <Box
            component="li"
            {...props}
            key="add-new"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'primary.main',
              fontStyle: 'italic',
            }}
          >
            <PersonAddIcon fontSize="small" aria-hidden="true" />
            <span>{option.name}</span>
          </Box>
        );
      }

      return (
        <Box
          component="li"
          {...props}
          key={String(option.id)}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <Typography variant="body1">{option.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {option.phone ?? 'No phone'} • ID: {option.customerId}
          </Typography>
        </Box>
      );
    },
    []
  );

  // Get option label
  const getOptionLabel = useCallback((option: CustomerOption | string): string => {
    if (typeof option === 'string') {
      return option;
    }
    return option.name;
  }, []);

  // Check option equality
  const isOptionEqualToValue = useCallback(
    (option: CustomerOption, value: CustomerOption): boolean => {
      return option.id === value.id;
    },
    []
  );

  return (
    <>
      <Autocomplete
        value={value as CustomerOption | null}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={options}
        loading={isLoading}
        disabled={disabled}
        filterOptions={filterOptions}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        renderOption={renderOption}
        freeSolo
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        size={size}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            error={error}
            helperText={helperText}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading ? (
                      <CircularProgress color="inherit" size={20} aria-label="Loading customers" />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
              htmlInput: {
                ...params.inputProps,
                'aria-label': label,
              },
            }}
          />
        )}
        noOptionsText={
          inputValue.length < MIN_SEARCH_LENGTH
            ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
            : 'No customers found'
        }
        loadingText="Searching customers..."
      />

      {/* Dialog for creating new customer */}
      <CustomerDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        mode="create"
        onSuccess={handleCustomerCreated}
      />
    </>
  );
}
