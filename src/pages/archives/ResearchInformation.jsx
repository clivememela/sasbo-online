import { Download, FileText, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useState, useMemo } from "react";

export default function ResearchInformation() {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const fileStructure = {
    "Andrew Levy Publications": {
      "2014": [
        "1. March 2014 WSS Q Report.pdf",
        "2. June 2014 WSS Q Report.pdf",
        "3. September 2014 WSS Q Report.pdf",
        "4. December 2014 WSS Q Report.pdf"
      ],
      "2015": [
        "1. WSS Q Report March 2015 (F).pdf",
        "2. WSS Q Report June 2015 (F).pdf",
        "3. WSS Q Report September 2015 (F).pdf",
        "4. WSS Q Report December 2015 (F).pdf"
      ],
      "2016": [
        "Andrew Levy Wage Settlement Survey - March 2016 (F).pdf",
        "WSS Q Report December 2016 (F).docx",
        "WSS Q Report June 2016 (F).pdf",
        "WSS Q Report September 2016.pdf"
      ],
      "2017": [
        "WSS Q Report December 2017 (F).pdf",
        "WSS Q Report March 2017 (F).pdf",
        "WSS Q Report September 2017 (F).pdf",
        "WSS Summary of Key Findings December 2017 (F).doc"
      ]
    },
    "Circulars": {
      "2001": ["2001Nov-Mat leave-LSAwards-cellphone.doc"],
      "2002": [
        "2002Aug-UIFActChanges.pdf",
        "2002Feb-TelephonePrivateUsage.pdf",
        "2002July-CellAllowances.pdf"
      ],
      "2003": ["2003Nov-MatLeaveLSAwardsCellphone.doc"],
      "2005": [
        "2005-HRFunctions.doc",
        "2005-LeaveAccum.doc",
        "2005-LeaveCredits.doc"
      ],
      "2006": [
        "2006Aug-PensionBonus.doc",
        "2006Dec-PostRetirementMedAidSubsidy.pdf",
        "2006Jan-IncentiveScheme.pdf",
        "2006May-Members' AddLifeCover.doc"
      ],
      "2007": [
        "2007Aug-TravelReimbursement&DinnerClaims (2).doc",
        "2007Dec-ClosureOffices.doc",
        "2007Oct-VacancyAGSAbsa.doc",
        "2007Oct-VacancyNationalSecretaryP3.doc"
      ],
      "2008": [
        "2008-RecruitmentYearEndIncentives.doc",
        "2008Apr-ChangesReimbursiveTravel.doc",
        "2008Aug-ChangesCellPhonePolicy.doc",
        "2008Aug-ChangesMeetingAllowancesInclBECs.doc",
        "2008Dec-AnnualSubscriptionIncrease2009.doc"
      ],
      "2009": [
        "2009-CellPhonePolicyChanges.doc",
        "2009Dec-ClosingDateForClaims.doc",
        "2009July-IncentiveScheme.pdf",
        "2009Nov-AnnualSubsIncrease-2010.doc"
      ],
      "2010": [
        "2010-ClaimsDuringUniConference.doc",
        "2010Apr-ChangedReimbursiveTravel.doc",
        "2010Dec-ClosingClaims.doc",
        "2010Dec-SubsIncrease-2011.doc"
      ],
      "2011": [
        "ChangesReimbursiveTravelRate-Mar2011.doc",
        "InfoRequiredfromBanks-Mar2011.msg",
        "SasboDurban-NewRO-BonganiMdluli-June2011.msg"
      ],
      "Recent": [
        "Media Release - Job Cuts - Robotics.pdf",
        "Media Release OAKBAY.pdf",
        "MEDIA RELEASE SASBO 21102016.pdf",
        "Sasbo Communication re Human Rights 23022018.pdf"
      ]
    },
    "Comparisons Between Banks": {
      "Salary Range Comparisons": [
        "GradingCorrelationTable2002.docx",
        "GradingCorrelationTables.pdf",
        "SALARY-RANGE-BENCHMARKS-COMPARISON.docx",
        "SalaryRangeBenchmarkComparison-2010to2011.xlsx"
      ],
      "Salary Scales Comparison": [
        "Big4Salary scales 2012.docx",
        "Big4Salary scales 2013.docx",
        "Big4Salary scales 2014.docx",
        "Big4SalaryScales-2017.docx"
      ],
      "Salary Settlements Comparison": [
        "1 SalarySettlementsComparison-2001.pdf",
        "10 SalarySettlementsComparison-2010.docx",
        "11 SalarySettlementsComparison-2011.docx",
        "12 SalarySettlementsComparison-2012.doc",
        "13 SalarySettlementsComparison-2013.doc",
        "14 SalarySettlementsComparison-2014.doc",
        "15 SalarySettlementComparison- 2015.docx",
        "16 SalarySettlementComparison- 2016.docx",
        "17 SalarySettlementsComparison-2017.docx",
        "18.SalarySettkementComparison-2018.docx"
      ],
      "General": [
        "2014 2015 MINIMUM WAGE.docx",
        "Big4MinWage.doc",
        "Big4StaffComplement.docx",
        "Long Service Awards.docx",
        "Maternity Benefits 4 Big Banks.docx",
        "Severence compared Big 4 Banks.docx",
        "Shift Allowances.docx",
        "Sunday Work Table.docx"
      ]
    },
    "Legislation": {
      "Basic Conditions Employment Act": [
        "BasicConditionsEmploymentAct-1997.pdf",
        "BasicConditionsEmploymentAct-Amended2002.pdf",
        "OvertimeThreshhold-GovGazetteNo34287-13May2011.pdf",
        "ProposedRevisedBCEA-Dec2010.doc"
      ],
      "Employment Equity": [
        "EmploymentEquityAct-1998.pdf",
        "ProposedRevised_EE_Bill-Dec2010.doc",
        "CodeGoodPract EE into HR.doc",
        "EEActCodeGoodPract Sexual Harassment.doc"
      ],
      "Labour Relations Act": [
        "LabourRelationsAct.doc",
        "LRA-Q&A.doc",
        "LRA-UnionReps.doc",
        "ProposedRevisedLRA-Dec2010.doc"
      ],
      "Health & Safety": [
        "Occupational Health and Safety Act.doc",
        "OHS-Facilities Regulations-1988.doc",
        "Regulations on toilets.doc",
        "Ergonomic Workbook.pdf"
      ],
      "UIF": [
        "FormUI2.3-ApplicationForMaternityBenefits.doc",
        "FormUI2.7-RemunerationReceivedByTheEmployeeWhilstStillIinEmployment.doc",
        "FormUI4-ApplicationForContinuationOfPaymentForMaternityBenefits.doc",
        "UIF Act Amendments 4 of 2002.pdf"
      ],
      "Pension Funds": [
        "PENSION-FUNDS-ACT.doc",
        "Pension Funds Surpluses Updates.doc",
        "Ruling-TimeforPayingDeathBenefits.doc"
      ],
      "Medical Schemes": [
        "MedicalSchemesAct 1998.doc",
        "CouncilMedSchemes-AnnualReport-20090902.pdf",
        "SAHealthReview-2008.pdf"
      ]
    },
    "Research Projects": {
      "2007": [
        "DirectorsFees-Aug2007.pdf",
        "GenderIssuesRecommendations-Aug2007.pdf",
        "StrikeHandlingGuidelines-Seifsa2007.doc"
      ],
      "2008": [
        "AgencyShopAgreements.doc",
        "ClosedShopAgreements.doc",
        "GC's-ArticleOnRetrenchments.doc"
      ],
      "2009": [
        "UniCharter-ResponsibleSaleOfBankingProducts.doc",
        "CompareBanksBargainingUnitsExtent.doc"
      ],
      "2010": [
        "NaladiRetrenchmentQuestionnaire-Eugene-Sept2010.doc",
        "ReplacementLabour.doc",
        "RetrenchmentFAQs.doc"
      ],
      "2011": [
        "ExtendedBankingHours-Feb2011.docx"
      ],
      "2017": [
        "Automation and Digitisation.pdf",
        "Banking sector's woes take a toll on employee health.pdf",
        "Capitec is now the second biggest bank in South Africa.docx",
        "How banking has changed since the financial collapse.docx",
        "Roles Of Digitalization VS.docx"
      ]
    },
    "Labour Articles": [
      "Forced ranking.doc",
      "GradingCorrelationTable2002.pdf",
      "Hendersons Consulting ABC to Fraud 2000.pdf",
      "LexisNexis-NewLabourBills-Feb2011.pdf",
      "Paterson Salary Structures 2002.doc",
      "PerformanceManagement-2004.doc",
      "RefusaltoObeyInstructions-Gregory Beck.doc"
    ]
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

  const totalFiles = Object.values(fileStructure).reduce((sum, category) => {
    if (Array.isArray(category)) return sum + category.length;
    return sum + Object.values(category).reduce((s, files) => s + files.length, 0);
  }, 0);

  const filteredStructure = useMemo(() => {
    if (!searchQuery.trim()) return fileStructure;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(fileStructure).forEach(([category, subcategories]) => {
      const categoryMatches = category.toLowerCase().includes(query);
      let matchedSubcategories = {};

      if (Array.isArray(subcategories)) {
        const matchedFiles = subcategories.filter(file => file.toLowerCase().includes(query));
        if (categoryMatches || matchedFiles.length > 0) {
          filtered[category] = categoryMatches ? subcategories : matchedFiles;
        }
      } else {
        Object.entries(subcategories).forEach(([subcategory, files]) => {
          const subcategoryMatches = subcategory.toLowerCase().includes(query);
          const matchedFiles = files.filter(file => file.toLowerCase().includes(query));
          if (subcategoryMatches || matchedFiles.length > 0) {
            matchedSubcategories[subcategory] = subcategoryMatches ? files : matchedFiles;
          }
        });
        if (categoryMatches || Object.keys(matchedSubcategories).length > 0) {
          filtered[category] = categoryMatches ? subcategories : matchedSubcategories;
        }
      }
    });

    return filtered;
  }, [searchQuery]);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">
        Information & Research
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
        Research publications, circulars, legislation, and labour articles
      </p>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        {totalFiles} documents across {Object.keys(fileStructure).length} categories
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
            Found {Object.keys(filteredStructure).length} categories with matching documents
          </p>
        )}
      </div>

      <div className="max-w-4xl mx-auto">
        {Object.entries(filteredStructure).map(([category, subcategories]) => (
          <div key={category} className="mb-2">
            <button
              onClick={() => toggleFolder(category)}
              className="w-full flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 text-left"
            >
              {expandedFolders[category] ? (
                <ChevronDown size={18} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              ) : (
                <ChevronRight size={18} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              )}
              <span className="font-semibold">{category}</span>
            </button>

            {expandedFolders[category] && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                {Array.isArray(subcategories) ? (
                  subcategories.map((file, idx) => (
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
                  Object.entries(subcategories).map(([subcategory, files]) => (
                    <div key={subcategory} className="mb-2">
                      <button
                        onClick={() => toggleSubFolder(`${category}-${subcategory}`)}
                        className="w-full flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
                      >
                        {expandedFolders[`${category}-${subcategory}`] ? (
                          <ChevronDown size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">{subcategory}</span>
                        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({files.length})</span>
                      </button>

                      {expandedFolders[`${category}-${subcategory}`] && (
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
