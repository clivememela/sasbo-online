import { useEffect, useState } from "react";
import { bankService } from "../../services/bankService.js";
import { TextInput, Button } from "../../components/form";

const EMPTY = {
  bankName: "", bankAbbreviation: "", branch: "", branchCode: "", area: "",
  randomAccessNumber: "", phoneNumber: "", fax: "", email: "", managerName: "",
  physicalAddress: "", postalAddress: "", provinceCommitteeCode: "",
  provinceCommitteeName: "", sasboAreaCode: "", bankDepartmentCode: "",
  tableCode: "", subsValueBranch: "", branchStaffComplement: "", branchMemberComplement: "",
};

const normalizeText = (value) => (value === null || value === undefined ? "" : String(value)).trim();

export default function BankBranchModal({ onClose, onCreated, onUpdated, selectedBank }) {
  const [isEditing, setIsEditing] = useState(false);
  const isReadOnlyView = Boolean(selectedBank) && !isEditing;
  const isEditMode = Boolean(selectedBank) && isEditing;
  const [form, setForm] = useState(selectedBank || EMPTY);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(selectedBank || EMPTY);
    setIsEditing(false);
  }, [selectedBank]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCancel = () => {
    setError(null);
    if (isEditMode) {
      setForm(selectedBank || EMPTY);
      setIsEditing(false);
      return;
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnlyView) return;
    const bankName = normalizeText(form.bankName);
    const branch = normalizeText(form.branch);

    if (!bankName || !branch) {
      setError("Bank Name and Branch are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEditMode) {
        const updated = await bankService.updateBank(form.id, form);
        const effectiveUpdated = updated && typeof updated === "object"
          ? { ...form, ...updated }
          : { ...form };
        setForm(effectiveUpdated);
        setIsEditing(false);
        onUpdated?.(effectiveUpdated);
      } else {
        const created = await bankService.createBank(form);
        onCreated?.(created);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <h3 className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">
            {isReadOnlyView ? "Bank Details" : isEditMode ? "Edit Bank/Branch Details" : "Add Bank/Branch Details"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isReadOnlyView ? (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
            <section className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">General Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailItem label="Bank Name" value={form.bankName} />
                <DetailItem label="Abbreviation" value={form.bankAbbreviation} />
                <DetailItem label="Branch" value={form.branch} />
                <DetailItem label="Branch Code" value={form.branchCode} />
                <DetailItem label="Area" value={form.area} />
                <DetailItem label="Random Access Number" value={form.randomAccessNumber} />
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">Contact & Management</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailItem label="Phone Number" value={form.phoneNumber} />
                <DetailItem label="Fax" value={form.fax} />
                <DetailItem label="Email" value={form.email} />
                <DetailItem label="Manager Name" value={form.managerName} />
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label="Physical Address" value={form.physicalAddress} />
                <DetailItem label="Postal Address" value={form.postalAddress} />
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">Operations & Codes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailItem label="Province Committee Code" value={form.provinceCommitteeCode} />
                <DetailItem label="Province Committee Name" value={form.provinceCommitteeName} />
                <DetailItem label="SASBO Area Code" value={form.sasboAreaCode} />
                <DetailItem label="Bank Department Code" value={form.bankDepartmentCode} />
                <DetailItem label="Table Code" value={form.tableCode} />
                <DetailItem label="Subs Value Branch" value={form.subsValueBranch} />
                <DetailItem label="Staff Complement" value={form.branchStaffComplement} />
                <DetailItem label="Member Complement" value={form.branchMemberComplement} />
              </div>
            </section>
          </div>
        ) : (
          <form id="add-bank-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
          <section className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">General Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <TextInput label="Bank Name *" value={form.bankName} onChange={set("bankName")} placeholder="e.g. Standard Bank" />
              <TextInput label="Abbreviation" value={form.bankAbbreviation} onChange={set("bankAbbreviation")} placeholder="e.g. STD" />
              <TextInput label="Branch *" value={form.branch} onChange={set("branch")} placeholder="e.g. Sandton" />
              <TextInput label="Branch Code" value={form.branchCode} onChange={set("branchCode")} placeholder="6-digit code" />
              <TextInput label="Area" value={form.area} onChange={set("area")} placeholder="e.g. Gauteng North" />
              <TextInput label="Random Access Number" value={form.randomAccessNumber} onChange={set("randomAccessNumber")} placeholder="RAN" />
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">Contact & Management</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <TextInput label="Phone Number" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="Phone" />
              <TextInput label="Fax" value={form.fax} onChange={set("fax")} placeholder="Fax" />
              <TextInput label="Email" value={form.email} onChange={set("email")} placeholder="Email" type="email" />
              <TextInput label="Manager Name" value={form.managerName} onChange={set("managerName")} placeholder="Manager" />
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Physical Address" value={form.physicalAddress} onChange={set("physicalAddress")} placeholder="Street address" />
              <TextInput label="Postal Address" value={form.postalAddress} onChange={set("postalAddress")} placeholder="Postal address" />
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">Operations & Codes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <TextInput label="Province Committee Code" value={form.provinceCommitteeCode} onChange={set("provinceCommitteeCode")} placeholder="e.g. GP" />
              <TextInput label="Province Committee Name" value={form.provinceCommitteeName} onChange={set("provinceCommitteeName")} placeholder="e.g. Gauteng" />
              <TextInput label="SASBO Area Code" value={form.sasboAreaCode} onChange={set("sasboAreaCode")} placeholder="Area code" />
              <TextInput label="Bank Department Code" value={form.bankDepartmentCode} onChange={set("bankDepartmentCode")} placeholder="Dept code" />
              <TextInput label="Table Code" value={form.tableCode} onChange={set("tableCode")} placeholder="Table code" type="number" />
              <TextInput label="Subs Value Branch" value={form.subsValueBranch} onChange={set("subsValueBranch")} placeholder="0.00" type="number" />
              <TextInput label="Staff Complement" value={form.branchStaffComplement} onChange={set("branchStaffComplement")} placeholder="0" type="number" />
              <TextInput label="Member Complement" value={form.branchMemberComplement} onChange={set("branchMemberComplement")} placeholder="0" type="number" />
            </div>
          </section>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          </form>
        )}

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <Button type="button" onClick={isReadOnlyView ? onClose : handleCancel} variant="secondary">{isReadOnlyView ? "Close" : "Cancel"}</Button>
          {isReadOnlyView ? (
            <Button type="button" variant="primary" onClick={() => setIsEditing(true)}>Edit</Button>
          ) : (
            <Button type="submit" form="add-bank-form" variant="primary" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Save Changes" : "Save"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  const displayValue = formatDetailValue(value);

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
        {label}
      </label>
      <p className="font-semibold text-gray-800 dark:text-gray-200 text-lg break-words">
        {displayValue}
      </p>
    </div>
  );
}

function formatDetailValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";

  if (Array.isArray(value)) {
    const items = value
      .map((item) => (item === null || item === undefined ? "" : String(item).trim()))
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : "N/A";
  }

  if (typeof value === "object") {
    const preferredAddressParts = [
      value.complexOrBuilding,
      value.streetNumber,
      value.streetName,
      value.suburbName || value.suburb,
      value.cityName || value.city,
      value.provinceName || value.province,
      value.postalCode,
    ]
      .map((part) => (part === null || part === undefined ? "" : String(part).trim()))
      .filter(Boolean);

    if (preferredAddressParts.length > 0) return preferredAddressParts.join(", ");

    const genericParts = Object.values(value)
      .map((part) => (part === null || part === undefined ? "" : String(part).trim()))
      .filter(Boolean);

    return genericParts.length > 0 ? genericParts.join(", ") : "N/A";
  }

  return String(value);
}
