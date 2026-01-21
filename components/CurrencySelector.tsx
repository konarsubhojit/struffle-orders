'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import type { Currency } from '@/types';

function CurrencySelector() {
  const { currency, setCurrency, currencies } = useCurrency();

  return (
    <div className="currency-selector">
      <label htmlFor="currency-select">Currency:</label>
      <select
        id="currency-select"
        value={currency.code}
        onChange={(e) => {
          const selected = currencies.find((c: Currency) => c.code === e.target.value);
          if (selected) setCurrency(selected);
        }}
      >
        {currencies.map((c: Currency) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CurrencySelector;
