/* global google */
import { useState, useEffect, useRef, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

/**
 * AddressAutocomplete - A reusable address input with Google Places autocomplete.
 *
 * Uses @vis.gl/react-google-maps to query Google Places directly from the browser,
 * bypassing the backend entirely. Uses the new Places API (not legacy).
 *
 * Props:
 *   label       - Field label text
 *   value       - Current address string
 *   onChange    - Callback(event) when value changes (same signature as TextInput)
 *   placeholder - Input placeholder text
 *   className   - Optional wrapper className (e.g. "md:col-span-2")
 *   error       - Optional error message to display below the input
 *   disabled    - Whether the input is disabled
 */
export default function AddressAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Start typing an address...",
  className = "",
  error,
  disabled = false,
}) {
  const [query, setQuery] = useState(value || "");
  const [predictions, setPredictions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const sessionTokenRef = useRef(null);

  // Load the Places library from Google Maps JS API
  const placesLib = useMapsLibrary("places");

  // Initialize session token when the Places library loads
  useEffect(() => {
    if (!placesLib) return;
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  }, [placesLib]);

  // Sync external value changes (e.g. form reset) into the local query
  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value || "");
    }
    // Only sync when value changes externally — not on every query keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Fetch predictions using the new Places API (AutocompleteSuggestion)
  const fetchPredictions = useCallback(
    async (input) => {
      if (!placesLib || !input || input.trim().length < 3) {
        setPredictions([]);
        return;
      }

      try {
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: input.trim(),
            sessionToken: sessionTokenRef.current,
            includedRegionCodes: ["za"],
          });

        if (suggestions && suggestions.length > 0) {
          setPredictions(
            suggestions
              .filter((s) => s.placePrediction)
              .map((s) => {
                const pred = s.placePrediction;
                return {
                  placeId: pred.placeId,
                  description: pred.text?.text || "",
                  primaryText: pred.structuredFormat?.mainText?.text || pred.text?.text || "",
                  secondaryText: pred.structuredFormat?.secondaryText?.text || "",
                };
              })
          );
        } else {
          setPredictions([]);
        }
      } catch (err) {
        console.error("Autocomplete fetch failed:", err);
        setPredictions([]);
      }
    },
    [placesLib]
  );

  // Debounce predictions fetch
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setPredictions([]);
      return;
    }
    const timer = setTimeout(() => fetchPredictions(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchPredictions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    setHighlightIndex(-1);
    // Propagate every keystroke to the parent form
    onChange(e);
  };

  const handleSelect = async (prediction) => {
    setQuery(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    setHighlightIndex(-1);

    // Fetch place details using the new Place class (same session token for billing)
    if (prediction.placeId) {
      try {
        const place = new google.maps.places.Place(prediction.placeId);
        const result = await place.fetchPlaceDetails({
          fields: ["formattedAddress"],
          sessionToken: sessionTokenRef.current,
        });

        if (result?.formattedAddress) {
          onChange({ target: { value: result.formattedAddress } });
          setQuery(result.formattedAddress);
        } else {
          onChange({ target: { value: prediction.description } });
        }
      } catch (err) {
        console.error("Place details fetch failed:", err);
        onChange({ target: { value: prediction.description } });
      }
    } else {
      onChange({ target: { value: prediction.description } });
    }

    // Reset session token after completing a session
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full rounded-lg px-3 py-2 text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400
    ${disabled ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed" : "bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white"}
    ${hasError ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"}`;

  return (
    <div className={`${className} relative`} ref={wrapperRef}>
      <label htmlFor="address-autocomplete-input" className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <div className="relative">
          <input
            id="address-autocomplete-input"
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (predictions.length > 0) setIsOpen(true); }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className={inputCls(error)}
          />
          {/* Search icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {error && (
          <span className="text-xs text-red-500 dark:text-red-400 font-normal normal-case tracking-normal">
            {error}
          </span>
        )}
      </label>

      {/* Predictions dropdown */}
      {isOpen && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg text-sm">
          {predictions.map((prediction, index) => (
            <li
              key={prediction.placeId || index}
              onMouseDown={() => handleSelect(prediction)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`px-4 py-2.5 cursor-pointer transition-colors ${
                index === highlightIndex
                  ? "bg-cyan-50 dark:bg-cyan-900/30"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              } text-gray-900 dark:text-white`}
            >
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{prediction.primaryText || prediction.description}</p>
                  {prediction.secondaryText && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{prediction.secondaryText}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
