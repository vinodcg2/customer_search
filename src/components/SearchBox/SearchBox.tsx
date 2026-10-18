import { useId } from 'react';

import './SearchBox.scss';

interface SearchBoxProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  return (
    <form
      className="search-box"
      role="search"
      onSubmit={(event) => {
        // Results already update as you type; Enter must not reload the page.
        event.preventDefault();
      }}
    >
      <label className="search-box__label" htmlFor={inputId}>
        Search customers
      </label>
      <input
        id={inputId}
        className="search-box__input"
        type="search"
        value={value}
        placeholder="Name, email or company"
        autoComplete="off"
        aria-describedby={hintId}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
      />
      <p className="search-box__hint" id={hintId}>
        Results update as you type.
      </p>
    </form>
  );
}
