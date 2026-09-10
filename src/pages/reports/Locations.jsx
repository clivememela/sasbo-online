import {useState} from "react";
import {Search, X, Printer} from "lucide-react";
import LocationListing from "./LocationListing.jsx";
import {locationService} from "../../services/locationService.js";
import { TextInput, Button } from "../../components/form";
import PageTitle from '../../components/common/PageTitle';
import reportError from '../../lib/reportError.js';

export function Locations() {
    const [filters, setFilters] = useState({
        bankName: "",
        branch: "",
        area: "",
        randomAccessNumber: "",
    });
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);

    const handleInputChange = (field) => (event) => {
        setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    };

    /**
     * 🔴 FOUND BY `listStates.test.js` ON ITS FIRST RUN, and it is the third instance of
     * A27's class after the member register and two more in `04.3`.
     *
     * 🔑 AND IT FAILED MORE QUIETLY THAN THE OTHER TWO. Those rendered an EMPTY state
     * against a down backend, which is a wrong answer. This rendered NOTHING: a rejection
     * left `searched` false, so the screen stayed exactly as it was before the button was
     * pressed. Somebody presses Search, the page does not move, and there is no way to
     * tell "the request failed" from "the click did not land" -- so the natural response
     * is to press it again.
     */
    const [searchState, setSearchState] = useState('idle');

    const handleSearch = () => {
        setSearchState('loading');
        locationService.search(filters)
            .then((data) => {
                setResults(data ?? []);
                setSearched(true);
                setSearchState('ready');
            })
            .catch((err) => {
                reportError('Locations.search', err);
                setSearched(true);
                setSearchState('error');
            });
    };

    const handleClear = () => {
        setFilters({ bankName: "", branch: "", area: "", randomAccessNumber: "" });
        setResults([]);
        setSearched(false);
        setSearchState('idle');
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
            <PageTitle
                title="Location Listings"
                subtitle="View and manage branch location records, member listings, and contact details across all financial institutions."
            />
            <div className="mt-5 rounded-lg bg-surface p-5 shadow-(--shadow-1)">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <TextInput label="Bank Name" value={filters.bankName} onChange={handleInputChange("bankName")} placeholder="Search bank name" />
                    <TextInput label="Branch" value={filters.branch} onChange={handleInputChange("branch")} placeholder="Search branch" />
                    <TextInput label="Area" value={filters.area} onChange={handleInputChange("area")} placeholder="Search area" />
                    <TextInput label="Random Access Number" value={filters.randomAccessNumber} onChange={handleInputChange("randomAccessNumber")} placeholder="Search RAN" />
                </div>

                <div className="flex items-center justify-between mt-4">
                    {searched && (
                        <div className="flex items-center gap-2 text-sm text-ink-muted">
                            {results.length} location{results.length !== 1 ? "s" : ""} found
                            {results.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    aria-label="Print these location results"
                                    className="no-print touch-target p-1 rounded hover-hover:hover:bg-surface-2 text-ink-muted transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                                >
                                    <Printer size={16} />
                                </button>
                            )}
                        </div>
                    )}
                    <div className="flex gap-2 ml-auto">
                        {searched && (
                            <Button onClick={handleClear} className="flex items-center gap-2">
                                <X size={14} /> Clear
                            </Button>
                        )}
                        {/* Its visible text IS its name, so it needs no aria-label -- what it
                            was missing was the primitive's hit area and focus ring. */}
                        <Button variant="primary" onClick={handleSearch}>
                            <Search size={16} strokeWidth={2} aria-hidden="true" />
                            Search
                        </Button>
                    </div>
                </div>
            </div>

            {searchState === 'loading' && (
                <div role="status" className="max-w-6xl mx-auto text-center py-12 text-ink-muted text-sm">
                    Searching locations…
                </div>
            )}

            {/* 🔴 THE ERROR BRANCH IS SEPARATE FROM THE EMPTY ONE, and never falls through
                to it. "No locations match your search criteria" against a down backend is
                a statement about the union's branches; this is a statement about the
                server, and they are different facts. */}
            {searchState === 'error' && (
                <div role="alert" className="max-w-6xl mx-auto flex flex-col items-center gap-3 py-12 text-center">
                    <p className="text-sm font-medium text-ink">We could not run that search.</p>
                    <Button onClick={handleSearch}>Try again</Button>
                </div>
            )}

            {searchState === 'ready' && searched && results.length === 0 && (
                <div className="max-w-6xl mx-auto text-center py-12 text-ink-muted text-sm">
                    No locations match your search criteria.
                </div>
            )}

            {searchState === 'ready' && results.map((location, index) => (
                <LocationListing key={index} data={location} />
            ))}
        </div>
    );
}
