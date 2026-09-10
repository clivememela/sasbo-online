import {useState} from "react";
import {Search, X, Printer} from "lucide-react";
import LocationListing from "./LocationListing.jsx";
import {locationService} from "../../services/locationService.js";
import { TextInput, Button } from "../../components/form";
import PageTitle from '../../components/common/PageTitle';

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

    const handleSearch = () => {
        locationService.search(filters).then((data) => {
            setResults(data);
            setSearched(true);
        });
    };

    const handleClear = () => {
        setFilters({ bankName: "", branch: "", area: "", randomAccessNumber: "" });
        setResults([]);
        setSearched(false);
    };

    return (
        <div className="p-6 text-ink">
            <PageTitle
                title="Location Listings"
                subtitle="View and manage branch location records, member listings, and contact details across all financial institutions."
            />
            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-surface mb-8">
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

            {searched && results.length === 0 && (
                <div className="max-w-6xl mx-auto text-center py-12 text-ink-muted text-sm">
                    No locations match your search criteria.
                </div>
            )}

            {results.map((location, index) => (
                <LocationListing key={index} data={location} />
            ))}
        </div>
    );
}
