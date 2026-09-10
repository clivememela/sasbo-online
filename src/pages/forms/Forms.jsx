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
            // 🔴 `embedded`, BECAUSE THIS PICKER RENDERS WHOLE PAGES INSIDE A PAGE.
            // Both of these are also routes of their own, so each brought its own page gutter
            // and its own <h1> in here -- two <h1>s on `/reports/forms` the moment a form type
            // was chosen, and 28px of padding inside 28px of padding. Embedded they are only
            // their sheet, captioned by an <h2>, which is what `GeneralForm` and
            // `LocationListing` in the same switch already were.
            case "Membership Application Form":
                return <MembershipApplication embedded />;
            case "Branch Form (online)":
            case "Branch Form (offline)":
                return <OrganizerReport embedded />;
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
        <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
            <PageTitle title="Forms" subtitle="Search and complete Forms" />
            <FilterForm onSubmit={handleSubmit}>
                <TextInput
                    label="Bank"
                    value={filters.bankName}
                    onChange={handleInputChange("bankName")}
                    placeholder="Any"
                />
                <TextInput
                    label="Branch"
                    value={filters.branch}
                    onChange={handleInputChange("branch")}
                    placeholder="Any"
                />
                <TextInput
                    label="Area"
                    value={filters.area}
                    onChange={handleInputChange("area")}
                    placeholder="Any"
                />
                <TextInput
                    label="Random access number"
                    value={filters.randomAccessNumber}
                    onChange={handleInputChange("randomAccessNumber")}
                    placeholder="Any"
                />
                <div className="lg:col-span-2 basis-[220px]!">
                    <SearchableSelect
                        label="Form Type"
                        value={filters.formType}
                        onChange={handleInputChange("formType")}
                        options={formTypeOptions}
                    />
                </div>

                <div className="flex items-end basis-auto!">
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
