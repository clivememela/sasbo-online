import {useState} from "react";
import {OrganizerReport} from "./OrganizerReport.jsx";

export function Locations() {
    const [filters, setFilters] = useState({
        bankName: "",
        branch: "",
        area: "",
        randomAccessNumber: "",
    });

    const handleInputChange = (field) => (event) => {
        setFilters((prev) => ({ ...prev, [field]: event.target.value }));
        setPage(1);
    };
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
                Location Listings
            </h2>
            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <label className="flex flex-col gap-2 text-sm">
                        Bank Name
                        <input
                            type="text"
                            value={filters.bankName}
                            onChange={handleInputChange("bankName")}
                            placeholder="Search bank name"
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Branch
                        <input
                            type="text"
                            value={filters.branch}
                            onChange={handleInputChange("branch")}
                            placeholder="Search branch"
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Area
                        <input
                            type="text"
                            value={filters.area}
                            onChange={handleInputChange("area")}
                            placeholder="Search area"
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Random Access Number
                        <input
                            type="text"
                            value={filters.randomAccessNumber}
                            onChange={handleInputChange("randomAccessNumber")}
                            placeholder="Search RAN"
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                </div>
            </div>
            <OrganizerReport/>
        </div>
    )
}