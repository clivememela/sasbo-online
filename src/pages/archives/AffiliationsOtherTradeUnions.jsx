import { Download, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function AffiliationsOtherTradeUnions() {
  const [expandedFolders, setExpandedFolders] = useState({});

  const fileStructure = {
    "COSATU Congress": [
      "BEC-CosatuCongress-Details-2009.xls",
      "Speech WFTU General Secretary at the 10 COSATU Congress engl.doc",
      "2010Feb-EdwinVanda.doc"
    ],
    "Membership Figures": [
      "2001 Cosatu-Fiet Membership Figures.xls",
      "2002 Cosatu-Fiet Membership Figures.xls",
      "2003 Cosatu-Fiet Membership Figures .xls",
      "2004 Cosatu-Fiet Membership Figures.xls",
      "2005 Cosatu-Fiet Membership Figures.xls",
      "2007 Cosatu-Uni Membership FiguresJune.xls",
      "2007 Cosatu-UniMembershipFiguresDec.xls",
      "2008 Cosatu-UniMembershipFigures.xls",
      "2009Cosatu-UniMembershipFigures.xls",
      "2010Cosatu-UniMembershipFigures.xls",
      "2011June-SasboMembFigures-Cosatu-Uni.xlsx"
    ],
    "Monthly Reports": [
      "July2007.doc",
      "June2007.doc",
      "2009July.doc",
      "2009May-MonthlyReport.doc",
      "2009May.doc",
      "2009Nov_Dec.doc",
      "AprilMay2010.doc",
      "JanFeb2010.doc",
      "July2010.doc",
      "June2010.doc",
      "March2010.doc",
      "April2011.doc",
      "Jan2011.doc"
    ],
    "Central Committee": [
      "2007-CentralCommitteeResolutions.doc",
      "2011Jan-CosatuReport-GovNewGrowthPathFramework.doc"
    ],
    "General Documents": [
      "AntiDrugCentreLetter.pdf",
      "Constitutional Structures.doc",
      "StatsMay2006-07.xls",
      "2009-LeadershipGenderStatsQuestionnaire.doc",
      "2009-LeadershipGenderStatsQuestionnaire.pdf"
    ],
    "Bargaining": [
      "AnnualReportOnBargaining-Feb2008.pdf",
      "CEC_Report-Annual_CollectiveBargaining-2008.pdf",
      "CollectiveBargainingWorkshop-2008.pdf",
      "Naledi workers survey 2006.pdf",
      "2011Jan-NedlacLabourPolicyConference.docx",
      "RoadTransportBargCouncil-WageAgreement-2009.pdf"
    ],
    "Trade Union Constitutions": [
      "BifawuConstitution-2007.pdf",
      "DenosaConstitution-2007.pdf",
      "IBSA INFO.doc",
      "IbsaConstitution-2007.pdf",
      "ImatuConstitution-2007.pdf",
      "NumConstitution-2007.pdf",
      "NumsaConstitution-2007.pdf",
      "SaccawuConstitution-2007.pdf",
      "SadtuConstitution-2007.pdf",
      "SamwuConstitution-2007.pdf",
      "SolidarityConstitution-2007.pdf"
    ],
    "Trade Union Information": [
      "Article-SAAssocTradeUnionOfficials.pdf",
      "Registered Trade Unions in South Africa.doc"
    ],
    "UNI Finance": [
      "Minutes of 8th Executive Committee Meeting, Dakar 2007.doc",
      "Report Finance Steering Group meeting Johannesburg 2007.doc",
      "Report UNI Finance Barclays meeting Johannesburg 2007.doc",
      "UNIBulletinNov07EngLite.pdf",
      "UNIeBulletinSept07EngLite.pdf",
      "UNI on Fin Crisis Oct 2008.doc",
      "UNIBulletinFeb08EngLite.pdf",
      "USSubPrimeEffectsOnLocalFinanceSector-2008.doc",
      "MNEs mapping exercise 2009.doc",
      "UNI Finance_lflt_FinancialReform.pdf",
      "Uni-HIVAidsTrainingManual-July2010.docm"
    ],
    "UNI Finance Conference 2011": [
      "00 UF Cnf 11, agenda & program-en.pdf",
      "00 UF Cnf 11, proedures etc-en.pdf",
      "00 UF Cnf 11, rules & SO.pdf",
      "04-UF Cnf 11, strategic plan-en.pdf",
      "05-UF Cnf 11, future finance-en.pdf",
      "BusDayArticle-16Mar2011.docx",
      "ReportOnUNIFinanceEuropa&UNIFinanceWorldCongresses.pptx"
    ],
    "Memorandums of Understanding": [
      "CapeTownBrief-Aug2010.doc",
      "HivAidsProjectApplication.pdf",
      "MemoUnderst-CIAWU,TGLSSWU,COWU&Applic.pdf",
      "MemoUnderstanding-BIFU&Applic.pdf",
      "MemoUnderstanding-CASWUZ&Applic.pdf",
      "MemoUnderstanding-COWU&Applic.pdf",
      "MemoUnderstanding-CWU&Applic.pdf",
      "MemoUnderstanding-CWUZ&Applic.pdf",
      "MemoUnderstanding-KUCFAW&Applic.pdf",
      "MemoUnderstanding-KUPRIPUPA&Applic.pdf",
      "MemoUnderstanding-NUCIW&Applic.pdf",
      "MemoUnderstanding-NUCW&Applic.pdf",
      "MemoUnderstanding-SACCAWU&Applic.pdf",
      "MemoUnderstanding-SASBO&Applic.pdf",
      "MemoUnderstanding-ZAGRAWU&Applic.pdf",
      "MemoUnderstanding-ZGWU&Applic.pdf",
      "MemoUnderstanding-ZIBAWU&Applic.pdf",
      "MemoUnderstanding-ZUFIAW&Applic.pdf",
      "MemoUnderstanding-ZUSAW&Applic.pdf"
    ],
    "Agreements": [
      "004.17.7_Signed_Transnet_WageSettlementAgreement-2011.pdf",
      "2011-RegisteredTradeUnions-DoL.doc"
    ]
  };

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const totalFiles = Object.values(fileStructure).reduce((sum, files) => sum + files.length, 0);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">
        Affiliations & Other Trade Unions
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        {totalFiles} documents in {Object.keys(fileStructure).length} categories
      </p>

      <div className="max-w-4xl mx-auto">
        {Object.entries(fileStructure).map(([folder, files]) => (
          <div key={folder} className="mb-2">
            <button
              onClick={() => toggleFolder(folder)}
              className="w-full flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 text-left"
            >
              {expandedFolders[folder] ? (
                <ChevronDown size={18} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              ) : (
                <ChevronRight size={18} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              )}
              <span className="font-semibold text-sm">{folder}</span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({files.length})</span>
            </button>

            {expandedFolders[folder] && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                {files.map((file, index) => (
                  <div
                    key={index}
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
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
