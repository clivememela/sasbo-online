import { useState } from 'react';
import './OrganizerReport.css';

export const OrganizerReport = () => {
    const [formData, setFormData] = useState({
        organiserName: '',
        dateOfVisit: '',
        timeIn: '',
        timeOut: '',
        bank: '',
        branchDepartment: '',
        raNumber: '',
        area: '',
        postalAddress: '',
        physicalAddress: '',
        branchDepTelNo: '',
        branchDepFaxNo: '',
        branchDepManager: '',
        branchRepName: '',
        cellPhoneEmail1: '',
        memnetMemName: '',
        cellPhoneEmail2: '',
        becMemberName: '',
        cellPhoneEmail3: '',
        compliment: '',
        noOfNonMembers: '',
        membership: '',
        noOfNewMembersRecruited: '',
        percentagePenetration: '',
        noOfNonMembersInterviewed: '',
        organiserSignature: '',
        organiserSignatureDate: '',
        snrOrganiserSignature: '',
        snrOrganiserSignatureDate: '',
        adminDeptSignature: '',
        dateCaptured: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
    };

    return (
        <div className="organizer-report-container">
            <form onSubmit={handleSubmit} className="organizer-report-form">
                <div className="report-header">
                    <h1>SASBO FINANCE UNION - Organizer's Branch / Department Report Form</h1>
                </div>

                <div className="section">
                    <h2>General Data</h2>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>ORGANISERS NAME:</label>
                            <input
                                type="text"
                                name="organiserName"
                                value={formData.organiserName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>DATE OF VISIT:</label>
                            <input
                                type="date"
                                name="dateOfVisit"
                                value={formData.dateOfVisit}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>TIME IN:</label>
                            <input
                                type="time"
                                name="timeIn"
                                value={formData.timeIn}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>TIME OUT:</label>
                            <input
                                type="time"
                                name="timeOut"
                                value={formData.timeOut}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>BANK:</label>
                            <input
                                type="text"
                                name="bank"
                                value={formData.bank}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>BRANCH / DEPARTMENT:</label>
                            <input
                                type="text"
                                name="branchDepartment"
                                value={formData.branchDepartment}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>R / A NUMBER:</label>
                            <input
                                type="text"
                                name="raNumber"
                                value={formData.raNumber}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>AREA:</label>
                            <input
                                type="text"
                                name="area"
                                value={formData.area}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group full-width">
                            <label>POSTAL ADDRESS:</label>
                            <textarea
                                name="postalAddress"
                                value={formData.postalAddress}
                                onChange={handleChange}
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group full-width">
                            <label>PHYSICAL ADDRESS:</label>
                            <textarea
                                name="physicalAddress"
                                value={formData.physicalAddress}
                                onChange={handleChange}
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>BRANCH / DEP TEL NO:</label>
                            <input
                                type="tel"
                                name="branchDepTelNo"
                                value={formData.branchDepTelNo}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>BRANCH / DEP FAX NO:</label>
                            <input
                                type="tel"
                                name="branchDepFaxNo"
                                value={formData.branchDepFaxNo}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group full-width">
                            <label>BRANCH / DEP MANAGER:</label>
                            <input
                                type="text"
                                name="branchDepManager"
                                value={formData.branchDepManager}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>BRANCH REP NAME:</label>
                            <input
                                type="text"
                                name="branchRepName"
                                value={formData.branchRepName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>CELL PHONE & E-MAIL ADD:</label>
                            <input
                                type="text"
                                name="cellPhoneEmail1"
                                value={formData.cellPhoneEmail1}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>MEMNET MEM NAME:</label>
                            <input
                                type="text"
                                name="memnetMemName"
                                value={formData.memnetMemName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>CELL PHONE & EMAIL ADD:</label>
                            <input
                                type="text"
                                name="cellPhoneEmail2"
                                value={formData.cellPhoneEmail2}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>BEC MEMBER NAME:</label>
                            <input
                                type="text"
                                name="becMemberName"
                                value={formData.becMemberName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>CELL PHONE & EMAIL ADD:</label>
                            <input
                                type="text"
                                name="cellPhoneEmail3"
                                value={formData.cellPhoneEmail3}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="section">
                    <h2>Membership (After Visit)</h2>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>COMPLIMENT:</label>
                            <input
                                type="text"
                                name="compliment"
                                value={formData.compliment}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>NO OF NON-MEMBERS:</label>
                            <input
                                type="number"
                                name="noOfNonMembers"
                                value={formData.noOfNonMembers}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>MEMBERSHIP:</label>
                            <input
                                type="text"
                                name="membership"
                                value={formData.membership}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>NO OF NEW MEMBERS RECRUITED:</label>
                            <input
                                type="number"
                                name="noOfNewMembersRecruited"
                                value={formData.noOfNewMembersRecruited}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>PERCENTAGE PENETRATION:</label>
                            <input
                                type="text"
                                name="percentagePenetration"
                                value={formData.percentagePenetration}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>NO OF NON-MEMBERS INTERVIEWED:</label>
                            <input
                                type="number"
                                name="noOfNonMembersInterviewed"
                                value={formData.noOfNonMembersInterviewed}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="section">
                    <h2>Distribution</h2>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>ORGANISER SIGNATURE:</label>
                            <input
                                type="text"
                                name="organiserSignature"
                                value={formData.organiserSignature}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>DATE:</label>
                            <input
                                type="date"
                                name="organiserSignatureDate"
                                value={formData.organiserSignatureDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>SNR ORGANISER SIGNATURE:</label>
                            <input
                                type="text"
                                name="snrOrganiserSignature"
                                value={formData.snrOrganiserSignature}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>DATE:</label>
                            <input
                                type="date"
                                name="snrOrganiserSignatureDate"
                                value={formData.snrOrganiserSignatureDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group full-width">
                            <label>ADMIN DEPT SIGNATURE:</label>
                            <input
                                type="text"
                                name="adminDeptSignature"
                                value={formData.adminDeptSignature}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>DATE CAPTURED:</label>
                            <input
                                type="date"
                                name="dateCaptured"
                                value={formData.dateCaptured}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-submit">Submit Report</button>
                    <button type="reset" className="btn-reset">Clear Form</button>
                </div>
            </form>
        </div>
    );
};
