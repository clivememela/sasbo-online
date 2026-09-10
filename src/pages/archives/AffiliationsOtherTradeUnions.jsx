import { Download, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import PageTitle from '../../components/common/PageTitle';
import { Button, TextInput } from '../../components/form';

export default function AffiliationsOtherTradeUnions() {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const fileStructure = useMemo(() => ({
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
  }), []);

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const totalFiles = Object.values(fileStructure).reduce((sum, files) => sum + files.length, 0);

  const filteredStructure = useMemo(() => {
    if (!searchQuery.trim()) return fileStructure;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(fileStructure).forEach(([folder, files]) => {
      const folderMatches = folder.toLowerCase().includes(query);
      const matchedFiles = files.filter(file => file.toLowerCase().includes(query));

      if (folderMatches || matchedFiles.length > 0) {
        filtered[folder] = folderMatches ? files : matchedFiles;
      }
    });

    return filtered;
  }, [fileStructure, searchQuery]);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
      <PageTitle
        title="Affiliations & Other Trade Unions"
        subtitle="COSATU congress documents, membership figures, trade union constitutions, and international affiliations"
      />
      <p className="mb-6 text-ink-muted">
        {totalFiles} documents in {Object.keys(fileStructure).length} categories
      </p>

      <div className="mb-6 max-w-4xl">
        {/* 🔴 THE CLEAR BUTTON HAD NO ACCESSIBLE NAME -- an `<X>` icon and
            nothing else. `TextInput kind="search"` also brings the search
            keyboard and the "Search" return key on a phone, and the 16px rule. */}
        <div className="flex items-end gap-2">
          <TextInput
            label="Search"
            kind="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents and folders..."
            className="flex-1"
          />
          {searchQuery && (
            <Button variant="ghost" onClick={() => setSearchQuery("")}>Clear</Button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-ink-muted mt-2">
            Found {Object.keys(filteredStructure).length} categories with {Object.values(filteredStructure).reduce((sum, files) => sum + files.length, 0)} matching documents
          </p>
        )}
      </div>

      <div className="max-w-4xl">
        {Object.entries(filteredStructure).map(([folder, files]) => (
          <div key={folder} className="mb-2">
            <button
              type="button"
              onClick={() => toggleFolder(folder)}
              aria-expanded={Boolean(expandedFolders[folder])}
              className="touch-target w-full flex items-center gap-2 p-3 bg-surface rounded-lg shadow hover-hover:hover:shadow-md transition-shadow border border-line text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            >
              {expandedFolders[folder] ? (
                <ChevronDown size={18} className="text-brand-ink flex-shrink-0" />
              ) : (
                <ChevronRight size={18} className="text-brand-ink flex-shrink-0" />
              )}
              <span className="font-semibold text-sm">{folder}</span>
              <span className="ml-auto text-xs text-ink-muted">({files.length})</span>
            </button>

            {expandedFolders[folder] && (
              <div className="ml-2 mt-1 sm:ml-4 space-y-1 border-l-2 border-line-strong pl-2 sm:pl-4">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-surface-2 rounded hover-hover:hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={16} className="text-brand-ink flex-shrink-0" />
                      <span className="text-sm truncate">{file}</span>
                    </div>
                    <Button size="icon" variant="ghost" aria-label={`Download ${file}`} className="ml-2 shrink-0">
                      <Download size={16} aria-hidden="true" className="text-brand-ink" />
                    </Button>
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
