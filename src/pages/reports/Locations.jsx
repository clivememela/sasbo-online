import {useState} from "react";
import {Search, X} from "lucide-react";
import LocationListing from "./LocationListing.jsx";
import {locationService} from "../../services/locationService.js";
import { TextInput, Button } from "../../components/form";

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
        setResults(locationService.search(filters));
        setSearched(true);
    };

    const handleClear = () => {
        setFilters({ bankName: "", branch: "", area: "", randomAccessNumber: "" });
        setResults([]);
        setSearched(false);
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">
                Location Listings
            </h2>
            <p className="max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                View and manage branch location records, member listings, and contact details across all financial institutions.
            </p>
            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <TextInput label="Bank Name" value={filters.bankName} onChange={handleInputChange("bankName")} placeholder="Search bank name" />
                    <TextInput label="Branch" value={filters.branch} onChange={handleInputChange("branch")} placeholder="Search branch" />
                    <TextInput label="Area" value={filters.area} onChange={handleInputChange("area")} placeholder="Search area" />
                    <TextInput label="Random Access Number" value={filters.randomAccessNumber} onChange={handleInputChange("randomAccessNumber")} placeholder="Search RAN" />
                </div>

                <div className="flex items-center justify-between mt-4">
                    {searched && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {results.length} location{results.length !== 1 ? "s" : ""} found
                        </p>
                    )}
                    <div className="flex gap-2 ml-auto">
                        {searched && (
                            <Button onClick={handleClear} className="flex items-center gap-2">
                                <X size={14} /> Clear
                            </Button>
                        )}
                        <button
                            onClick={handleSearch}
                            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition text-sm shadow-sm"
                        >
                            <Search size={16} strokeWidth={2}/>
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {searched && results.length === 0 && (
                <div className="max-w-6xl mx-auto text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                    No locations match your search criteria.
                </div>
            )}

            {results.map((location, index) => (
                <LocationListing key={index} data={location} />
            ))}
        </div>
    );
}
