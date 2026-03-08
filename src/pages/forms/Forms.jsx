import {useState} from "react";
import {OrganizerReport} from "../reports/OrganizerReport.jsx";

export function Forms(){
    const [filters, setFilters] = useState({
        bankName: "",
        branch: "",
        area: "",
        randomAccessNumber: "",
        formType: "",
    });

    const optionFormType = ["Select Form Type","Membership Application Form", "Branch Form (online)", "Branch Form (offline)", "Location Listing", "Bulk Listing"];

    const handleInputChange = (field) => (event) => {
        setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    };
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
                Forms
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
                Complete Forms
            </p>
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
                    <label className="flex flex-col gap-2 text-sm">
                        Form Type
                        <select
                            value={filters.formType}
                            onChange={handleInputChange("formType")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        >
                            {optionFormType.map((option) => (
                                <option key={option} value={option === "Select Form Type" ? "" : option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="flex justify-end mt-4">
                    <button
                        type="submit"
                        className="px-2 py-1 rounded-md text-xs border border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
                    >
                        Search
                    </button>
                </div>
                <OrganizerReport/>
            </div>
        </div>
    )
}
