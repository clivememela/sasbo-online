import { Download, FileText, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useState, useMemo } from "react";

export default function FinanceHouses() {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const fileStructure = {
    "ABSA": {
      "Policies & Procedures": [
        "Absa Diversity and inclusion Policy 2012.pdf",
        "Absa Sasbo Deep care Retrenchment Policy signed.pdf",
        "Absa's Mission Vision & Values.doc",
        "AbsaValues.pdf",
        "DisciplinaryCode&Procedure-Nov2010.pdf",
        "DisciplinaryPolicy-Sept2010.doc",
        "Disciplinery procedure 2013.pdf",
        "GrievanceProcedure-April2009.pdf",
        "Group Employee Relations Policy 2012.pdf"
      ],
      "Allowances & Benefits": [
        "ActingAllowance-July2008.doc",
        "AirportAllowances-2003.doc",
        "Allowances-Relocation,LongService,FarewellGift-April2007.pdf",
        "CarBenefits-2003.pdf",
        "CardDivisionShiftAllowance-July 2004.doc",
        "CellularChanges-May 04.pdf",
        "Standby&Call-outAllowances-2004.pdf",
        "Shift Allowances.docx"
      ],
      "Leave & Wellness": [
        "Leave&Absenteeism-Oct2010.pdf",
        "MaternityLeave-Feb2011.docx",
        "EmployeeWellness-ChemicalDependency-2006.pdf",
        "EmployeeWellness-EAPHelpline-2001.pdf",
        "EmployeeWellness-Financial-August08.pdf",
        "EmployeeWellness-HIV&LifeThreateningDiseases-2002.pdf",
        "EmployeeWellness-IllHealthIncapacity-Aug2007.pdf",
        "Employee Wellness Policy 2012.pdf"
      ],
      "Recruitment & Development": [
        "Recruitment-PermanentEmployees-March2010.pdf",
        "Learning and Devrlopment Policy 2012.pdf",
        "LearnerContractAddendum-FrontlineAcademy-June2008.pdf",
        "LearnershipAppointLetter-Nov03.doc",
        "FinancialAssistanceFurtherEducation-June2010.pdf"
      ],
      "Salary Negotiations": [
        "FOUR BIG BANKS SALARY SCALES 2013.docx",
        "Severence compared Big 4 BankBranch.docx",
        "Salary Negotiations 2012.pdf",
        "Salary Negotiations 2013.pdf",
        "Salary Negotiations 2014.pdf",
        "Salary Negotiations 2015.pdf",
        "Salary Negotiations 2016.pdf"
      ],
      "Monthly Reports": [
        "April 02.doc",
        "Aug 02.doc",
        "Feb 02.doc",
        "July 02.doc",
        "June 02.doc",
        "Mar 02.doc",
        "May 02.doc",
        "Nov 02.doc",
        "Oct 02.doc",
        "Sept 02.doc"
      ],
      "Pension & Benefits": [
        "Consolidated Rules of the Absa Group Pension Fund.pdf",
        "PensionFundAmendment-14Mar2006.doc",
        "PensionFundFeedback-5April203.doc",
        "Absa Pension Rules March 2021.pdf"
      ]
    },
    "AFRICAN BANK": {
      "Policies & Procedures": [
        "Disciplinary Code Policy Final.pdf",
        "Grievance Procedure final.doc",
        "Leave Policy.pdf",
        "Leave Policy -Study FRL and Annual V23-23 January-changes accepted .pdf",
        "Maternity Leave Policy.pdf",
        "Performance Management Policy - version 1.4.pdf"
      ],
      "Collective Agreements": [
        "Collective Agreement between Sasbo and African Bank.pdf",
        "Collective Agreement btw Sasbo and African Bank re IT Operators Nov 2019.pdf",
        "Collective Agreement on Early Retirement Policy.pdf",
        "Collective Agreement on leave policy.pdf"
      ],
      "Salary Negotiations": [
        "2012 Salary Agreement .pdf",
        "2013 Salary Agreement.pdf",
        "2014 Salary Agreement .pdf",
        "2015 Salary Agreement.pdf",
        "2016 Salary Agreement.pdf",
        "2017 Salary Agreement.pdf",
        "2018 Salary Agreement.pdf",
        "2019 Salary Agreement.pdf",
        "2020 Salary Agreement .pdf",
        "2021 Salary Agreement.pdf"
      ],
      "NCF Minutes": [
        "2009Nov-NCFMinutes.pdf",
        "2010Mar03-NCFMinutes.pdf",
        "2010Mar17-NCFMinutes.pdf",
        "Minutes Of 1st &2nd November 2010 .pdf",
        "Minutes Of 20Th & 21 May 2010.pdf",
        "Minutes Of 25th & 26 November 2009.pdf",
        "Minutes Of 3&4 March 2010.pdf"
      ],
      "Monthly Reports": [
        "2008April.doc",
        "2008December.doc",
        "2008Jan-Feb.doc",
        "2008July-August.doc",
        "2008June.doc",
        "2008March.doc",
        "2008May.doc",
        "2008Oct-Nov.doc",
        "2008Sept.doc"
      ]
    },
    "BANKSERV AFRICA": {
      "Salary Agreements": [
        "2000-SalaryScalesAgreement.pdf",
        "2002-SalaryAgreement.pdf",
        "2003-SalaryAgreement.pdf",
        "2005-SalaryAgreement.pdf",
        "2006-SalaryAgreement.pdf",
        "2007-SalaryAgreement.pdf",
        "2008-SalaryAgreement.pdf",
        "2009-SalaryAgreement.pdf",
        "2010-SalaryAgreement.pdf",
        "2011-Salary Agrement.pdf",
        "2012 Salary Agreement.pdf",
        "2013 Salary Agreement .pdf",
        "2015 Salary Agreement.pdf",
        "2016 Salary Agreement.pdf"
      ],
      "Agreements": [
        "Agreement-2000.pdf",
        "Agreement-2003.pdf",
        "Agreement-Nov2004.pdf",
        "HIV-AIDSPolicy-2002.pdf",
        "Overtime Pay for Shift Employees.pdf",
        "Recognition Agreement 2014.pdf",
        "TransportScheme-2004.pdf",
        "VoluntaryRetrenchmentScheme-2004.pdf"
      ]
    },
    "CAPITEC BANK": {
      "Policies": [
        "Capitec Harassment policy.pdf",
        "Code of Conduct.pdf",
        "Conflict of Interest policy.pdf",
        "Debarment policy.pdf",
        "Disciplinary Code V12.docx.pdf",
        "Disciplinary code.PDF",
        "Dress Code for Capitec Bank Employees policy.pdf",
        "Employee Accounts policy and procedure.pdf",
        "Enterprise Data Privacy policy.pdf",
        "Gifts and invitations policy.pdf",
        "Information Security policy.pdf",
        "Polygraph Testing policy and procedure.pdf",
        "Recognition Agreement Capitec Sasbo.pdf",
        "Sexual Harassment Policy_20080602.pdf"
      ],
      "Communications": [
        "COMMENCEMENT OF COLLECTIVE BARGAINING CAPITEC 20012020.pdf",
        "Know Your Rights Then Exercise Them 08082016.pdf",
        "MEDIA RELEASE SASBO 21102016.pdf",
        "SASBO COMMUNICATION RE VICEROY REPORT 31012018.pdf",
        "SASBO FILES FOR COLLECTIVE BARGAINING RIGHTS AT THE CCMA 16112019.pdf",
        "Sasbo files for Organisational Rights in Capitec Bank at the CCMA 01092018.pdf",
        "Sasbo posts solid membership growth 31072019.pdf",
        "Sasbo Update Victory is Ours 15112018.pdf"
      ]
    },
    "FIRSTRAND / FNB": {
      "Policies & Procedures": [
        "FNB - DISCIPLINARY GRIEVANCE CODE V6 Final 19 Sep (08102014)-1.docx",
        "FNB Gift Policy OCT 2011.doc.pdf",
        "FNB Gift Policy.doc",
        "Grievance Policy and Procedure.pdf",
        "GrievanceProcedure-May2008.pdf",
        "Leave Policy.pdf",
        "Performance Management Policy - version 1.4.pdf",
        "Retrenchment Procedure 2017.pdf",
        "Retrenchment Procedure 2018.pdf"
      ],
      "Salary Negotiations": [
        "2008 Newsflash Salary review.doc",
        "2009-SalarySurvey.doc",
        "2010-NedbankSalaryNegotiationsSurvey.doc",
        "Salary Agreement 2012.pdf",
        "Salary Agreement 2013.pdf",
        "Salary Agreement 2014.pdf",
        "Salary Agreement 2015.pdf",
        "Salary Agreement 2016.pdf",
        "Salary Agreement 2017.pdf",
        "Salary Agreement 2018.pdf",
        "Salary Agreement 2019.pdf",
        "Salary Agreement 2020.pdf",
        "Salary Agreement 2021.pdf"
      ],
      "Recognition Agreements": [
        "FNB Sasbo Retrenchment Agreement 5 Feb 2016.rtf",
        "Recognition Agreement.pdf",
        "RecognitionAgreement-2009.pdf",
        "RecognitionAgreement-2008.pdf",
        "RecognitionAgreement-2007.pdf"
      ]
    },
    "NEDBANK": {
      "Policies": [
        "NEDBANK GROUP HR - Disciplinary Policy and Procedure_FINAL.pdf",
        "NEDBANK GROUP HR - Grievance Policy and Procedure FINAL.pdf",
        "NEDBANK GROUP HR - Leave Policy (3).pdf",
        "Nedbank Group HR - Incapacity Policy and Procedure.pdf",
        "Leave Policy -Study FRL and Annual V23-23 January-changes accepted .pdf",
        "Performance Management Policy - version 1.4.pdf",
        "Recruitment Policy - L1 Policy.pdf",
        "Recruitment Policy Level3.pdf"
      ],
      "Salary Agreements": [
        "1999-SettlementAgreement.pdf",
        "2007SettlementAgreement.pdf",
        "2008-SettlementAgreement.pdf",
        "2009-SettlementAgreement.pdf",
        "2010-SettlementAgreement.pdf",
        "2011-SettlementAgreement.pdf",
        "2012-SettlementAgreement.pdf",
        "2013-SettlementAgreement.pdf",
        "2014-Settlement Agreement.pdf",
        "2015-SettlementAgreement.pdf",
        "2016-SettlementAgreement.pdf",
        "2017-SettlementAgreement.pdf",
        "2018-SettlementAgreement.pdf",
        "2019-SettlementAgreement.pdf",
        "2020-SetttlementAgreement.pdf",
        "2021-SettlementAgreement.pdf",
        "2022-SettlementAgreement.pdf"
      ],
      "Recognition Agreements": [
        "Recognition Agreement 2016.docx.pdf",
        "Recognition Agreement.pdf",
        "RecognitionAgreement.doc",
        "Shop Steward Signed Agreement_26-02-2020.pdf"
      ]
    },
    "OLD MUTUAL": {
      "Policies & Procedures": [
        "Disciplinary code.pdf",
        "DisciplinaryProcedure.pdf",
        "Grievance Procedure Summary.doc",
        "GrievanceProcedure-2005.doc",
        "RecognitionAgreement-Oct2010.docx",
        "Recognition Agreement 2017.pdf",
        "Signed Recognition Agreement.pdf"
      ],
      "Communications": [
        "OldMutualNewsflashAppraisalRatings.doc",
        "OldMutualNewsflashAppraisalRatings.pdf",
        "OM Salary negotiation comm 18 May 2016.doc",
        "Sasbo Comms Old Mutual 30102018.pdf",
        "Sasbo Communication to members in Old Mutual 17042018.pdf"
      ],
      "Policies": [
        "Agreement between Old Mutual and Sasbo on newly defined engagement forums-01012012.PDF",
        "Electronic Communication Policy.pdf",
        "Fairness and the Employment Relationship.pdf",
        "Managing Unfair Discrimination in the Workplace Policy.pdf",
        "Parental Leave Policy.pdf",
        "Performance Management Procedure - OM.pdf",
        "Policy on Fraud, Theft, Corruption, Cyber-crime and Associated Internal Irregularities - Old Mutual.pdf"
      ]
    },
    "STANDARD BANK": {
      "Policies": [
        "Standard Bank - Disciplinary Procedure.pdf",
        "Standard Bank - Grievance Procedure.pdf",
        "Standard bank agreement 2025.pdf",
        "StandardBank Motor Vehicle Benefit Option Scheme Rules (2).pdf",
        "StandardBank Motor Vehicle Benefit Option Scheme Rules.pdf"
      ],
      "Salary Negotiations": [
        "Salary Agreement 2013.pdf",
        "Salary Agreement 2014.pdf",
        "Salary Agreement 2015.pdf",
        "Salary Agreement 2016.pdf",
        "Salary Agreement 2017.pdf",
        "GENERAL STAFF SALARY SCALES March 2018.pdf",
        "Salary Agreement 2018.pdf",
        "Salary Agreement 2019.pdf",
        "Salary Agreement 2020.pdf",
        "Salary Agreement 2021.pdf",
        "Salary Agreement 2022.pdf"
      ],
      "Communications": [
        "SBSA- Salary Negotiations Settlement - Newsflash 03-2024(eh).pdf",
        "SBSA- Salary Negotiations Settlement 2021 - Newsflash 01-2021(final).pdf",
        "SBSA- Salary Negotiations Settlement 2020 - Newsflash 01-2020.docx",
        "Salary Negotiations Settlement 2018 - Newsflash 1-2018.pdf",
        "SASBO MEDIA RELEASE Standard Bank Retrenchments 15112018.docx"
      ]
    },
    "SOUTH AFRICAN RESERVE BANK": {
      "Salary Agreements": [
        "Salary Agreement 2006.pdf",
        "Salary agreement 2008 .pdf",
        "Salary Agreement 2010.pdf",
        "Salary Agreement 2011.pdf",
        "Salary Agreement 2014.tif",
        "Salary Agreement 2015.pdf",
        "Salary Agreement 2019.pdf"
      ],
      "Communications": [
        "SASBO SARB SALARY NEGOTIATIONS 2018 FEEDBACK 10082018.pdf",
        "SASBO SARB SALARY NEGOTIATIONS NEWSFLASH 03072019.pdf",
        "Sasbo SARB Salary Negotiations Newsflash 2 15032022.pdf",
        "Sasbo Salary Negotiations Newsflash 03062020.pdf",
        "SARB New Recognition Agreement Signed with the South African Reserve Bank.msg"
      ],
      "Recognition": [
        "Collective Agreement btw Sasbo and SARB wrt Recognition 25042019.pdf",
        "Collective Agreement btw Sasbo and SARB re Salary Increase 2020-2021.pdf",
        "Recognition Agreement 2024.pdf"
      ]
    },
    "OTHER BANKS": {
      "Bank Athens": [
        "1995-BankAthensSalAgreement.pdf",
        "1996-NewsflashSettlement.pdf",
        "1997-BankAthensSalAgreement.pdf",
        "2000-BankAthensSalAgreement.pdf",
        "2001-BankAthensSalAgreement.pdf",
        "2002-BankAthensSalAgreement.pdf",
        "2003-BankAthensSalAgreement.pdf",
        "2004-BankAthensSalAgreement.pdf",
        "2005-BankAthensSalAgreement.pdf",
        "2006-BankAthensSalAgreement.pdf",
        "2007-BankAthensSalAgreement.pdf",
        "2008-BankAthensSalAgreement.pdf",
        "2009-BankAthensSalAgreement.pdf",
        "2010-BankAthensSalAgreement.pdf",
        "2011-BankAthensSalAgreement.pdf",
        "2013 BankAthensSalAgreement.pdf",
        "2014 BankAthensSalAgreement.pdf",
        "2016 BankAthensSalAgreement.pdf",
        "2018 BankAthensSalAgreement .pdf"
      ],
      "Land Bank": [
        "Recognition Agreement - Land Bank 27 Jan 2021.pdf",
        "Recognition Agreement 1994.pdf",
        "Recognition Agreement 2011.pdf",
        "Recognition Agreement 2017.pdf",
        "Salary Increase Agreement 2019.pdf",
        "Salary Increase Agreement 2020.pdf",
        "Salary Increase Agreement 2014.pdf",
        "Salary Increase Agreement 2015 - 2016.pdf",
        "Salary Increase Agreement 2016 - 2017.pdf",
        "Salary Increase Agreement 2017 - 2018.pdf",
        "Salary Increase Agreement 2018-2019.pdf"
      ],
      "Santam": [
        "AgencyShopAgreement.pdf",
        "RecognitionAgreement-Aug2006.pdf",
        "Salary Agreement 2014.pdf",
        "Salary Agreement 2020.pdf",
        "Salary Agreement 2021.pdf",
        "Salary Agreement 2022.pdf"
      ],
      "VBS Mutual Bank": [
        "VBS SalAgreement - 2016.2017.pdf",
        "VBS SalAgreement - 2017.2018.pdf",
        "VBS SalAgreement 2013.pdf",
        "VBS-SalAgreement-08.pdf",
        "VBS-SalAgreement-2007.pdf",
        "VBS-SalAgreement-2009.pdf",
        "VBS-SalAgreement-2010.pdf",
        "VBS-SalAgreement-2011.pdf",
        "VBS-SalAgreement-2014.pdf",
        "VBS-SalAgreement-2015.pdf"
      ]
    }
  };

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const toggleSubFolder = (key) => {
    setExpandedFolders(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const totalFiles = Object.values(fileStructure).reduce((sum, bank) => {
    if (Array.isArray(bank)) return sum + bank.length;
    return sum + Object.values(bank).reduce((s, files) => s + files.length, 0);
  }, 0);

  const filteredStructure = useMemo(() => {
    if (!searchQuery.trim()) return fileStructure;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(fileStructure).forEach(([bank, categories]) => {
      const bankMatches = bank.toLowerCase().includes(query);
      let matchedCategories = {};

      if (Array.isArray(categories)) {
        const matchedFiles = categories.filter(file => file.toLowerCase().includes(query));
        if (bankMatches || matchedFiles.length > 0) {
          filtered[bank] = bankMatches ? categories : matchedFiles;
        }
      } else {
        Object.entries(categories).forEach(([category, files]) => {
          const categoryMatches = category.toLowerCase().includes(query);
          const matchedFiles = files.filter(file => file.toLowerCase().includes(query));
          if (categoryMatches || matchedFiles.length > 0) {
            matchedCategories[category] = categoryMatches ? files : matchedFiles;
          }
        });
        if (bankMatches || Object.keys(matchedCategories).length > 0) {
          filtered[bank] = bankMatches ? categories : matchedCategories;
        }
      }
    });

    return filtered;
  }, [fileStructure, searchQuery]);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">
        Finance Houses
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
        Access official policies, salary agreements, and collective bargaining documents from South African financial institutions
      </p>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        {totalFiles} documents across {Object.keys(fileStructure).length} financial institutions
      </p>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search documents and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Found {Object.keys(filteredStructure).length} institutions with matching documents
          </p>
        )}
      </div>

      <div className="max-w-4xl mx-auto">
        {Object.entries(filteredStructure).map(([bank, categories]) => (
          <div key={bank} className="mb-2">
            <button
              onClick={() => toggleFolder(bank)}
              className="w-full flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 text-left"
            >
              {expandedFolders[bank] ? (
                <ChevronDown size={18} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              ) : (
                <ChevronRight size={18} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              )}
              <span className="font-semibold">{bank}</span>
            </button>

            {expandedFolders[bank] && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                {Array.isArray(categories) ? (
                  categories.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-sm truncate">{file}</span>
                      </div>
                      <button className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0">
                        <Download size={16} className="text-cyan-600 dark:text-cyan-400" />
                      </button>
                    </div>
                  ))
                ) : (
                  Object.entries(categories).map(([category, files]) => (
                    <div key={category} className="mb-2">
                      <button
                        onClick={() => toggleSubFolder(`${bank}-${category}`)}
                        className="w-full flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
                      >
                        {expandedFolders[`${bank}-${category}`] ? (
                          <ChevronDown size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">{category}</span>
                        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({files.length})</span>
                      </button>

                      {expandedFolders[`${bank}-${category}`] && (
                        <div className="ml-4 mt-1 space-y-1">
                          {files.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText size={14} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                                <span className="text-xs truncate">{file}</span>
                              </div>
                              <button className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0">
                                <Download size={14} className="text-cyan-600 dark:text-cyan-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
