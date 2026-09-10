import {useState} from "react";
import {OrganizerReport} from "../reports/OrganizerReport.jsx";
import GeneralForm from "./GeneralForm.jsx";
import LocationListing from "../reports/LocationListing.jsx";
import MembershipApplication from "./MembershipApplication.jsx";
import {TextInput, Button, FilterForm, SearchableSelect} from "../../components/form";
import { FileSearch } from "lucide-react";
import PageTitle from '../../components/common/PageTitle';

export function Forms(){
    const [filters, setFilters] = useState({
        bankName: "",
        branch: "",
        area: "",
        randomAccessNumber: "",
        formType: "",
    });

    const formTypeOptions = [
        { label: "Select Form Type", value: "" },
        { label: "Membership Application Form", value: "Membership Application Form" },
        { label: "Branch Form (online)", value: "Branch Form (online)" },
        { label: "Branch Form (offline)", value: "Branch Form (offline)" },
        { label: "Location Listing", value: "Location Listing" },
        { label: "Bulk Listing", value: "Bulk Listing" },
        { label: "General Form", value: "General Form" }
    ];

    const handleInputChange = (field) => (event) => {
        setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
    };

    const renderForm = () => {
        switch (filters.formType) {
            case "Membership Application Form":
                return <MembershipApplication />;
            case "Branch Form (online)":
            case "Branch Form (offline)":
                return <OrganizerReport />;
            case "Location Listing":
            case "Bulk Listing":
                return <LocationListing />;
            case "General Form":
                return <GeneralForm />;
            default:
                return null;
        }
    };

    return (
        <div className="p-6 text-ink">
            <PageTitle title="Forms" subtitle="Search and complete Forms" />
            <FilterForm onSubmit={handleSubmit}>
                <TextInput
                    label="Bank Name"
                    value={filters.bankName}
                    onChange={handleInputChange("bankName")}
                    placeholder="Search bank name"
                />
                <TextInput
                    label="Branch"
                    value={filters.branch}
                    onChange={handleInputChange("branch")}
                    placeholder="Search branch"
                />
                <TextInput
                    label="Area"
                    value={filters.area}
                    onChange={handleInputChange("area")}
                    placeholder="Search area"
                />
                <TextInput
                    label="Random Access Number"
                    value={filters.randomAccessNumber}
                    onChange={handleInputChange("randomAccessNumber")}
                    placeholder="Search RAN"
                />
                <div className="lg:col-span-2">
                    <SearchableSelect
                        label="Form Type"
                        value={filters.formType}
                        onChange={handleInputChange("formType")}
                        options={formTypeOptions}
                    />
                </div>
                <div className="lg:col-span-1"></div>
                <div className="flex items-end justify-end">
                    <Button type="submit" variant="primary">
                        <FileSearch size={16} strokeWidth={2} />
                        Search Form
                    </Button>
                </div>
            </FilterForm>
            {filters.formType && (
                <div className="max-w-6xl mx-auto mt-6">
                    {renderForm()}
                </div>
            )}
        </div>
    )
}
