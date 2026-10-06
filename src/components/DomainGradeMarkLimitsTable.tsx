import React, { useMemo, useState } from 'react';
import { SavedSubmission } from '../types';
import { computeAllDomainMarkLimits, DomainMarkLimitRow } from '../utils/relativeGradingUtils';
import {
  Award,
  Layers,
  FileSpreadsheet,
  Download,
  Printer,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface DomainGradeMarkLimitsTableProps {
  submissions: SavedSubmission[];
}

export const DomainGradeMarkLimitsTable: React.FC<DomainGradeMarkLimitsTableProps> = ({
  submissions
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const markLimitRows: DomainMarkLimitRow[] = useMemo(() => {
    return computeAllDomainMarkLimits(submissions || []);
  }, [submissions]);

  const totalStudents = submissions?.length || 0;
  const isSmallSample = totalStudents < 10;

  // Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const titleRows = [
        ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
        ['RELATIVE NORM-REFERENCED GRADE MARK LIMITS (CUTOFFS) BY DOMAIN'],
        [`Generated On: ${new Date().toLocaleString()}`],
        [`Evaluated Students: ${totalStudents} | Grading Rules: First 25% Grade A | Next 40% Grade B | Last 35% Grade C`],
        ['']
      ];

      const headers = [
        'S.No',
        'Domain Name',
        'Max Marks',
        'Grade A (From and To)',
        'Grade B (From and To)',
        'Grade C (From and To)'
      ];

      const dataRows = markLimitRows.map((row) => [
        row.sNo,
        row.domainName,
        row.maxMarks,
        `${row.gradeAFrom} to ${row.gradeATo} Marks`,
        `${row.gradeBFrom} to ${row.gradeBTo} Marks`,
        `${row.gradeCFrom} to ${row.gradeCTo} Marks`
      ]);

      const wsData = [...titleRows, headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [
        { wch: 8 },  // S.No
        { wch: 42 }, // Domain Name
        { wch: 12 }, // Max Marks
        { wch: 25 }, // Grade A
        { wch: 25 }, // Grade B
        { wch: 25 }  // Grade C
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Grade Mark Limits');
      XLSX.writeFile(wb, `CIT_Domain_Grade_Mark_Limits_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Failed to export mark limits to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'S.No',
      'Domain Name',
      'Max Marks',
      'Grade A (From and To)',
      'Grade B (From and To)',
      'Grade C (From and To)'
    ];

    const dataRows = markLimitRows.map((r) => [
      r.sNo,
      `"${r.domainName.replace(/"/g, '""')}"`,
      r.maxMarks,
      `"${r.gradeAFrom} to ${r.gradeATo} Marks"`,
      `"${r.gradeBFrom} to ${r.gradeBTo} Marks"`,
      `"${r.gradeCFrom} to ${r.gradeCTo} Marks"`
    ]);

    const csvContent = [headers.join(','), ...dataRows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CIT_Domain_Grade_Mark_Limits_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 break-inside-avoid">
      {/* PANEL HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <Layers className="w-5 h-5 text-purple-700" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Domain-Wise Grade Mark Limits (From and To)
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 rounded-full border border-purple-200">
              Norm-Referenced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic college-wide score boundaries calibrated for each domain: First 25% (Grade A), Next 40% (Grade B), and Last 35% (Grade C).
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Download Grade Mark Limits as Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Download Grade Mark Limits as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Print Grade Mark Limits"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* SUMMARY TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="text-xs font-bold text-emerald-950">Grade A</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">First 25% of College</p>
          </div>
          <span className="px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-mono font-bold rounded">
            p ≥ 75
          </span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-xs font-bold text-blue-950">Grade B</span>
            </div>
            <p className="text-[11px] text-blue-800 font-semibold mt-0.5">Next 40% of College</p>
          </div>
          <span className="px-2 py-0.5 bg-blue-600 text-white text-[11px] font-mono font-bold rounded">
            35 ≤ p &lt; 75
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
              <span className="text-xs font-bold text-amber-950">Grade C</span>
            </div>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">Last 35% of College</p>
          </div>
          <span className="px-2 py-0.5 bg-amber-600 text-white text-[11px] font-mono font-bold rounded">
            p &lt; 35
          </span>
        </div>
      </div>

      {isSmallSample && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Note: Cohort size is currently {totalStudents} student(s) (&lt; 10). Relative percentile mark limits will become increasingly precise as more students complete the assessment.
          </span>
        </div>
      )}

      {/* TABULAR COLUMN DISPLAY */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
              <th scope="col" className="p-3 w-14 text-center font-bold border-r border-slate-700">
                S.No
              </th>
              <th scope="col" className="p-3 min-w-[200px] font-bold border-r border-slate-700">
                Domain Name
              </th>
              <th scope="col" className="p-3 min-w-[170px] text-center font-bold border-r border-slate-700 bg-emerald-900/80 text-emerald-100">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-bold">Grade A (From and To)</span>
                  <span className="text-[10px] text-emerald-200 font-normal">First 25% (p ≥ 75)</span>
                </div>
              </th>
              <th scope="col" className="p-3 min-w-[170px] text-center font-bold border-r border-slate-700 bg-blue-900/80 text-blue-100">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-bold">Grade B (From and To)</span>
                  <span className="text-[10px] text-blue-200 font-normal">Next 40% (35 ≤ p &lt; 75)</span>
                </div>
              </th>
              <th scope="col" className="p-3 min-w-[170px] text-center font-bold bg-amber-900/80 text-amber-100">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-bold">Grade C (From and To)</span>
                  <span className="text-[10px] text-amber-200 font-normal">Last 35% (p &lt; 35)</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {markLimitRows.map((row) => {
              const isOverallRow = row.domainId === 'overall';

              return (
                <tr
                  key={row.domainId}
                  className={`transition-colors ${
                    isOverallRow
                      ? 'bg-purple-50/70 font-semibold border-t-2 border-purple-300 hover:bg-purple-100/60'
                      : row.sNo % 2 === 0
                      ? 'bg-slate-50/60 hover:bg-slate-100/70'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {/* S.No */}
                  <td className="p-3 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                    {isOverallRow ? '★' : row.sNo}
                  </td>

                  {/* Domain Name */}
                  <td className="p-3 font-semibold text-slate-900 border-r border-slate-200">
                    <div className="flex items-center gap-2">
                      {isOverallRow ? (
                        <Award className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                      )}
                      <div>
                        <p className={isOverallRow ? 'font-bold text-purple-950' : 'text-slate-800'}>
                          {row.domainName}
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Max Score: {row.maxMarks} Marks
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Grade A (From and To) */}
                  <td className="p-3 text-center border-r border-slate-200 bg-emerald-50/40">
                    <div className="inline-flex flex-col items-center">
                      <div className="flex items-center gap-1 font-mono font-bold text-emerald-800 text-sm">
                        <span>{row.gradeAFrom}</span>
                        <span className="text-emerald-500 font-normal text-xs">to</span>
                        <span>{row.gradeATo}</span>
                        <span className="text-[11px] font-sans font-medium text-emerald-700">Marks</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        (score ≥ {row.gradeAFrom})
                      </span>
                    </div>
                  </td>

                  {/* Grade B (From and To) */}
                  <td className="p-3 text-center border-r border-slate-200 bg-blue-50/40">
                    <div className="inline-flex flex-col items-center">
                      <div className="flex items-center gap-1 font-mono font-bold text-blue-800 text-sm">
                        <span>{row.gradeBFrom}</span>
                        <span className="text-blue-500 font-normal text-xs">to</span>
                        <span>{row.gradeBTo}</span>
                        <span className="text-[11px] font-sans font-medium text-blue-700">Marks</span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-medium">
                        ({row.gradeBFrom} ≤ score ≤ {row.gradeBTo})
                      </span>
                    </div>
                  </td>

                  {/* Grade C (From and To) */}
                  <td className="p-3 text-center bg-amber-50/40">
                    <div className="inline-flex flex-col items-center">
                      <div className="flex items-center gap-1 font-mono font-bold text-amber-800 text-sm">
                        <span>{row.gradeCFrom}</span>
                        <span className="text-amber-500 font-normal text-xs">to</span>
                        <span>{row.gradeCTo}</span>
                        <span className="text-[11px] font-sans font-medium text-amber-700">Marks</span>
                      </div>
                      <span className="text-[10px] text-amber-600 font-medium">
                        (score ≤ {row.gradeCTo})
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER NOTE */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <p className="italic">
          * Mark limits reflect norm-referenced performance across all students in the college cohort. Cutoffs automatically update as new submissions arrive.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Grade A: Top 25%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Grade B: Next 40%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Grade C: Last 35%
          </span>
        </div>
      </div>
    </div>
  );
};
