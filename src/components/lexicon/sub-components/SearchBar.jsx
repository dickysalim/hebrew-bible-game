import { useState, useEffect, useRef } from 'react';
import { debounce } from '../../../utils/searchUtils';

/**
 * SearchBar component for the Lexicon Panel
 * Provides real-time search with debouncing and clear functionality
 */
export default function SearchBar({ 
  onSearch, 
  placeholder = 'Search roots, words, or meanings...',
  className = '',
  debounceMs = 300
}) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Create debounced search function
  const debouncedSearchRef = useRef(
    debounce((searchQuery) => {
      onSearch(searchQuery);
    }, debounceMs)
  );

  // Update debounced search when query changes
  useEffect(() => {
    debouncedSearchRef.current(query);
  }, [query]);

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className={`lexicon-search ${className} ${isFocused ? 'lexicon-search--focused' : ''}`}>
      <div className="lexicon-search__container">
        <div className="lexicon-search__icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.7422 10.3439C12.5329 9.2673 13 7.9382 13 6.5C13 2.91015 10.0899 0 6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C7.93858 13 9.26801 12.5327 10.3448 11.7415L10.3439 11.7422C10.3734 11.7822 10.4062 11.8204 10.4424 11.8566L14.2929 15.7071C14.6834 16.0976 15.3166 16.0976 15.7071 15.7071C16.0976 15.3166 16.0976 14.6834 15.7071 14.2929L11.8566 10.4424C11.8204 10.4062 11.7822 10.3734 11.7422 10.3439ZM12 6.5C12 9.53757 9.53757 12 6.5 12C3.46243 12 1 9.53757 1 6.5C1 3.46243 3.46243 1 6.5 1C9.53757 1 12 3.46243 12 6.5Z" 
              fill="currentColor" />
          </svg>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="lexicon-search__input"
          aria-label="Search lexicon"
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="lexicon-search__clear"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" 
                fill="currentColor" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}