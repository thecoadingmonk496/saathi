import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { useUser } from '../../context/UserContext';
import { mockCrops, mockMandis, mockBuyers } from '../../utils/mockData';

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'crops', label: 'Crops' },
  { id: 'prices', label: 'Market Prices' },
  { id: 'mandi', label: 'Mandi Information' },
  { id: 'buyers', label: 'Buyers' },
];

const TRENDING_SEARCHES = [
  'Wheat Prices',
  'Paddy Market Rates',
  'Nearby Mandis',
  'Find Wheat Buyers',
  'Mustard Rates',
];

// Build a flat suggestion list from mock data
function buildSuggestions() {
  const suggestions = [];

  // Crop names + price queries
  mockCrops.forEach((crop) => {
    suggestions.push({ text: crop.name, type: 'crop', icon: crop.icon, category: 'crops' });
    suggestions.push({ text: `${crop.name} Prices`, type: 'price', icon: '📊', category: 'prices' });
    suggestions.push({ text: `${crop.name} Market Rates`, type: 'price', icon: '📈', category: 'prices' });
    suggestions.push({ text: `Find ${crop.name} Buyers`, type: 'buyer', icon: '🤝', category: 'buyers' });
  });

  // Mandi names
  mockMandis.forEach((mandi) => {
    suggestions.push({ text: mandi.name, type: 'mandi', icon: '🏪', category: 'mandi' });
  });

  // Buyer names
  mockBuyers.forEach((buyer) => {
    suggestions.push({ text: buyer.name, type: 'buyer', icon: '👤', category: 'buyers' });
  });

  return suggestions;
}

export default function HeroSearch() {
  const navigate = useNavigate();
  const { t } = useUser();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(SEARCH_CATEGORIES[0]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const categoryRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  const allSuggestions = useMemo(() => buildSuggestions(), []);

  // Filter suggestions based on query and selected category
  const filteredSuggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    let filtered = allSuggestions.filter((s) =>
      s.text.toLowerCase().includes(trimmed)
    );

    // Filter by category if not "all"
    if (selectedCategory.id !== 'all') {
      filtered = filtered.filter((s) => s.category === selectedCategory.id);
    }

    // Deduplicate by text
    const seen = new Set();
    filtered = filtered.filter((s) => {
      const key = s.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: exact prefix matches first, then contains
    filtered.sort((a, b) => {
      const aStarts = a.text.toLowerCase().startsWith(trimmed) ? 0 : 1;
      const bStarts = b.text.toLowerCase().startsWith(trimmed) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.text.localeCompare(b.text);
    });

    return filtered.slice(0, 8);
  }, [query, selectedCategory, allSuggestions]);

  // Show/hide dropdown
  useEffect(() => {
    setIsDropdownOpen(filteredSuggestions.length > 0 && query.trim().length > 0);
    setActiveIndex(-1);
  }, [filteredSuggestions, query]);

  // Close category dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setIsCategoryOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsCategoryOpen(false);
    };

    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryOpen]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = useCallback((e) => {
    e?.preventDefault();
    setIsDropdownOpen(false);
    const trimmed = query.trim();
    if (!trimmed) {
      if (selectedCategory.id === 'buyers') {
        navigate('/buyers');
      } else {
        navigate('/prices');
      }
      return;
    }

    if (selectedCategory.id === 'buyers' || trimmed.toLowerCase().includes('buyer')) {
      navigate(`/buyers?search=${encodeURIComponent(trimmed)}`);
    } else if (selectedCategory.id === 'mandi' || trimmed.toLowerCase().includes('mandi')) {
      navigate(`/mandis?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate(`/prices?search=${encodeURIComponent(trimmed)}`);
    }
  }, [query, selectedCategory, navigate]);

  const handleSuggestionClick = useCallback((suggestion) => {
    setQuery(suggestion.text);
    setIsDropdownOpen(false);

    // Auto-set category based on suggestion type
    const catMap = { crop: 'crops', price: 'prices', mandi: 'mandi', buyer: 'buyers' };
    const targetCat = SEARCH_CATEGORIES.find((c) => c.id === (catMap[suggestion.type] || 'all'));
    if (targetCat) setSelectedCategory(targetCat);

    // Navigate directly
    const term = suggestion.text;
    if (suggestion.type === 'buyer') {
      navigate(`/buyers?search=${encodeURIComponent(term)}`);
    } else if (suggestion.type === 'mandi') {
      navigate(`/mandis?search=${encodeURIComponent(term)}`);
    } else {
      navigate(`/prices?search=${encodeURIComponent(term)}`);
    }
  }, [navigate]);

  const handleKeyDown = useCallback((e) => {
    if (!isDropdownOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }
  }, [isDropdownOpen, activeIndex, filteredSuggestions, handleSuggestionClick]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-suggestion]');
      if (items[activeIndex]) {
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleTrendingClick = (term) => {
    setQuery(term);
    if (term.toLowerCase().includes('buyer')) {
      setSelectedCategory(SEARCH_CATEGORIES.find((c) => c.id === 'buyers') || SEARCH_CATEGORIES[0]);
    } else if (term.toLowerCase().includes('mandi')) {
      setSelectedCategory(SEARCH_CATEGORIES.find((c) => c.id === 'mandi') || SEARCH_CATEGORIES[0]);
    } else {
      setSelectedCategory(SEARCH_CATEGORIES.find((c) => c.id === 'prices') || SEARCH_CATEGORIES[0]);
    }
    inputRef.current?.focus();
  };

  // Helper to highlight matching text
  const highlightMatch = (text, queryStr) => {
    const idx = text.toLowerCase().indexOf(queryStr.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-black text-[var(--saathi-primary)]">{text.slice(idx, idx + queryStr.length)}</span>
        {text.slice(idx + queryStr.length)}
      </>
    );
  };

  // Category label for suggestion type
  const typeLabel = (type) => {
    switch (type) {
      case 'crop': return 'Crop';
      case 'price': return 'Price';
      case 'mandi': return 'Mandi';
      case 'buyer': return 'Buyer';
      default: return '';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto text-left" ref={containerRef}>
      {/* 3-Part Real Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="relative flex flex-col sm:flex-row items-stretch rounded-lg bg-white p-1.5 shadow-2xl border border-[var(--saathi-border-light)] transition-all"
      >
        {/* 1. Search Text Input with Icon on Left */}
        <div className="relative flex-1 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-[var(--saathi-text-secondary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (filteredSuggestions.length > 0 && query.trim().length > 0) {
                setIsDropdownOpen(true);
              }
            }}
            placeholder={t('hero.searchPlaceholder') || "Search crops, mandi rates, buyers or market trends..."}
            aria-label="Search SAATHI marketplace and mandi rates"
            autoComplete="off"
            role="combobox"
            aria-expanded={isDropdownOpen}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            className="h-12 sm:h-13 w-full bg-transparent px-3 text-base sm:text-lg font-semibold text-[var(--saathi-text)] placeholder:text-[var(--saathi-text-muted)] outline-none"
          />
        </div>

        {/* 2. Category Dropdown Button */}
        <div className="relative border-t sm:border-t-0 sm:border-l border-[var(--saathi-border-light)]" ref={categoryRef}>
          <button
            type="button"
            onClick={() => setIsCategoryOpen((prev) => !prev)}
            aria-expanded={isCategoryOpen}
            aria-haspopup="true"
            aria-label="Filter search category"
            className="flex h-12 sm:h-13 w-full sm:w-auto items-center justify-between sm:justify-start gap-2.5 bg-[var(--saathi-surface-alt)] hover:bg-[var(--saathi-border-light)] px-4 text-sm sm:text-base font-bold text-[var(--saathi-text)] transition focus:outline-none"
          >
            <span className="truncate max-w-[150px]">{t(selectedCategory.label) || selectedCategory.label}</span>
            <ChevronDownIcon className={`h-4 w-4 text-[var(--saathi-text-secondary)] transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Category Dropdown Menu */}
          {isCategoryOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1.5 w-56 rounded-lg border border-[var(--saathi-border-light)] bg-white p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95"
            >
              {SEARCH_CATEGORIES.map((cat) => {
                const isSelected = cat.id === selectedCategory.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs sm:text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-[var(--saathi-surface-alt)] text-[var(--saathi-text)] font-bold'
                        : 'text-[var(--saathi-text-secondary)] hover:bg-slate-100 hover:text-[var(--saathi-text)]'
                    }`}
                  >
                    <span>{t(cat.label) || cat.label}</span>
                    {isSelected && <CheckIcon className="h-4 w-4 text-[var(--saathi-text-secondary)]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Search Action Button */}
        <button
          type="submit"
          className="mt-1.5 sm:mt-0 flex h-12 sm:h-13 items-center justify-center gap-2 rounded-md sm:rounded-lg bg-[var(--saathi-accent)] hover:bg-[var(--saathi-accent-dark)] active:scale-[0.99] px-7 sm:px-9 text-base sm:text-lg font-extrabold text-white shadow transition focus:outline-none"
        >
          <span>{t('hero.searchBtn') || 'Search'}</span>
        </button>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            id="search-suggestions"
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-[var(--saathi-border-light)] bg-white shadow-2xl z-50 max-h-[340px] overflow-y-auto"
          >
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={`${suggestion.text}-${idx}`}
                id={`suggestion-${idx}`}
                data-suggestion
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  idx === activeIndex
                    ? 'bg-slate-100'
                    : 'hover:bg-[var(--saathi-surface-alt)]'
                } ${idx !== filteredSuggestions.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <span className="text-lg shrink-0 w-7 text-center">{suggestion.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm sm:text-base font-semibold text-[var(--saathi-text)] truncate block">
                    {highlightMatch(suggestion.text, query.trim())}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 bg-[var(--saathi-surface-alt)] px-2 py-0.5 rounded">
                  {typeLabel(suggestion.type)}
                </span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Real Trending Searches: Compact neutral chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-2.5 px-2 text-xs sm:text-sm">
        <span className="font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mr-1">{t('hero.trendingLabel') || 'Trending Searches:'}</span>
        {TRENDING_SEARCHES.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => handleTrendingClick(term)}
            className="rounded-full border border-[#BDBDBD] bg-white/95 px-3 py-1 font-semibold text-[#424242] transition hover:bg-[#F7F3EE] hover:text-[#424242] focus:outline-none active:bg-slate-100"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
