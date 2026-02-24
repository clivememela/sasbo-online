import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";

export default function ResearchInformation() {
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

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

  const renderTree = (data, parentPath = "") => {
    return Object.entries(data).map(([key, value]) => {
      const currentPath = parentPath ? `${parentPath}/${key}` : key;
      const isExpanded = expandedFolders[currentPath];

      if (Array.isArray(value)) {
        return (
          <li key={currentPath} className="folder">
            <div
              className="folder-header"
              onClick={() => toggleFolder(currentPath)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="folder-name">{key}</span>
            </div>
            {isExpanded && (
              <ul className="nested">
                {value.map((file, idx) => (
                  <li key={`${currentPath}/${file}`} className="file">
                    <FileText size={14} />
                    <span>{file}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      } else {
        return (
          <li key={currentPath} className="folder">
            <div
              className="folder-header"
              onClick={() => toggleFolder(currentPath)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="folder-name">{key}</span>
            </div>
            {isExpanded && (
              <ul className="nested">{renderTree(value, currentPath)}</ul>
            )}
          </li>
        );
      }
    });
  };

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">
        Information & Research
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Research publications, circulars, legislation, and labour articles
      </p>

      <div className="max-w-4xl mx-auto">
        <style>{`
          .folder-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #e5e7eb;
          }
          .dark .folder-header {
            background: #1f2937;
            border-color: #374151;
          }
          .folder-header:hover {
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            background: #f9fafb;
          }
          .dark .folder-header:hover {
            background: #374151;
          }
          .folder-name {
            font-weight: 600;
          }
          .nested {
            margin-left: 16px;
            margin-top: 4px;
            padding-left: 16px;
            border-left: 2px solid #d1d5db;
          }
          .dark .nested {
            border-left-color: #4b5563;
          }
          .file {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: #f9fafb;
            border-radius: 6px;
            margin: 4px 0;
            transition: background 0.2s;
          }
          .dark .file {
            background: #111827;
          }
          .file:hover {
            background: #f3f4f6;
          }
          .dark .file:hover {
            background: #1f2937;
          }
          .file svg {
            color: #0891b2;
            flex-shrink: 0;
          }
          .dark .file svg {
            color: #22d3ee;
          }
          .folder-header svg {
            color: #0891b2;
            flex-shrink: 0;
          }
          .dark .folder-header svg {
            color: #22d3ee;
          }
          ul {
            list-style: none;
            padding: 0;
          }
          li {
            margin: 4px 0;
          }
        `}</style>
        <ul>
          {renderTree(fileStructure)}
        </ul>
      </div>
    </div>
  );
}
