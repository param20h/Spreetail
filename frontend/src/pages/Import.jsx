import { useState, useEffect } from 'react';
import client from '../api/client';
import DropZone from '../components/ui/DropZone';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { formatCurrency } from '../utils/formatters';
import { FileUp, HelpCircle, ArrowRight, AlertTriangle, CheckCircle, RefreshCw, CheckCircle2, ChevronRight, Download, Info } from 'lucide-react';

export default function Import({ currentGroup }) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  
  // Resolutions state: key is row number, value is resolution string ('accept' or 'reject') or resolution object
  const [resolutions, setResolutions] = useState({});
  const [usdDetected, setUsdDetected] = useState(false);
  const [fxRate, setFxRate] = useState('84.00');
  const [importing, setImporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  // 1. Handle file upload (Step 1 -> Step 2)
  const handleFileUpload = async (file) => {
    if (!currentGroup?.id) {
      alert('Please select a group first');
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('group_id', currentGroup.id);

      const res = await client.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data;
      setPreviewData(data);
      
      // Check if USD is present in parsed rows
      const hasUsd = data.parsed_rows?.some(r => r.currency === 'USD') || false;
      setUsdDetected(hasUsd);

      // Pre-populate resolutions
      const initialResolutions = {};
      data.anomalies.forEach(a => {
        // For auto-fixable anomalies, default resolution is accept
        if (!a.requires_approval) {
          initialResolutions[a.row] = 'accept';
        }
      });
      setResolutions(initialResolutions);

      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to parse CSV file');
    } finally {
      setUploading(false);
    }
  };

  // Fetch live exchange rate from API or fallback
  useEffect(() => {
    if (usdDetected) {
      fetch('https://open.er-api.com/v6/latest/USD')
        .then(res => res.json())
        .then(data => {
          if (data && data.rates && data.rates.INR) {
            setFxRate(Number(data.rates.INR).toFixed(2));
          }
        })
        .catch(err => {
          console.warn('Failed to fetch exchange rate, using default 84.00', err);
        });
    }
  }, [usdDetected]);

  // Determine anomaly counts
  const anomaliesList = previewData?.anomalies || [];
  const totalAnomalies = anomaliesList.length;
  
  const requiresApprovalList = anomaliesList.filter(a => a.requires_approval);
  
  // A row requires decision if it's in the requiresApprovalList
  const pendingApprovalsCount = requiresApprovalList.filter(
    a => !resolutions[a.row]
  ).length;

  const handleResolutionChange = (rowNum, decision) => {
    setResolutions(prev => ({
      ...prev,
      [rowNum]: decision
    }));
  };

  const handleProceedFromReview = () => {
    if (usdDetected) {
      setStep(3);
    } else {
      setStep(4);
    }
  };

  // 2. Perform Confirm Import (Step 4)
  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      setError('');

      const res = await client.post('/import/confirm', {
        session_id: previewData.session_id,
        resolutions,
        fx_rate: usdDetected ? parseFloat(fxRate) : null,
        group_id: currentGroup.id
      });

      setReportData(res.data);
      setStep(5);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to confirm import');
    } finally {
      setImporting(false);
    }
  };

  // 3. Download text report
  const downloadReportFile = () => {
    if (!reportData) return;
    
    const lines = [
      `FLATMATE CSV IMPORT REPORT`,
      `===========================`,
      `Timestamp: ${new Date(reportData.timestamp).toLocaleString()}`,
      `Group ID: ${currentGroup.id}`,
      `Group Name: ${currentGroup.name}`,
      `Session ID: ${reportData.session_id}`,
      ``,
      `SUMMARY STATISTICS`,
      `------------------`,
      `Total Rows Processed: ${reportData.total_rows}`,
      `Successfully Imported: ${reportData.imported_rows}`,
      `Skipped Rows: ${reportData.skipped_rows}`,
      `FX Rate USD -> INR: ${reportData.fx_rate_used || 'Not used'}`,
      ``,
      `RESOLUTIONS LOG`,
      `----------------`
    ];

    reportData.resolution_log?.forEach(log => {
      lines.push(`Row ${log.row}: [${log.action}] — ${log.issue}`);
    });

    const fileContent = lines.join('\n');
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `import_report_${reportData.session_id.slice(0, 8)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentGroup) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <FileUp className="w-12 h-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Group Selected</h2>
        <p className="text-slate-400 max-w-sm">Select a group to import expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Wizard Step Progress bar */}
      <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-center text-teal-400 font-bold">
            {step}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {step === 1 && 'Step 1: Upload CSV'}
              {step === 2 && 'Step 2: Review Anomalies'}
              {step === 3 && 'Step 3: Exchange Rate'}
              {step === 4 && 'Step 4: Confirm Import'}
              {step === 5 && 'Step 5: Import Complete'}
            </h2>
            <p className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-wider">Import Wizard</p>
          </div>
        </div>

        {/* Mini progress dots */}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(s => {
            if (s === 3 && !usdDetected) return null; // skip FX rate dot if not needed
            return (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step >= s ? 'bg-teal-500' : 'bg-slate-750'
                }`}
              />
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 1 && (
        <Card className="p-8 flex flex-col items-center justify-center min-h-[350px]">
          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Spinner size="lg" className="animate-spin-slow" />
              <p className="text-sm font-semibold text-white mt-2">Analysing your CSV...</p>
              <p className="text-xs text-slate-500">Checking for 19 anomaly types in the file.</p>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Upload Expenses CSV</h3>
                <p className="text-xs text-slate-400">Drag & drop your exported file or browse from files. The CSV must contain headers: date, description, paid_by, amount, currency, split_type, split_with, split_details, notes.</p>
              </div>

              <DropZone onFileDrop={handleFileUpload} />
            </div>
          )}
        </Card>
      )}

      {/* STEP 2: Anomaly Review */}
      {step === 2 && previewData && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clean Rows</p>
              <p className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">
                {previewData.rows_ok}
              </p>
            </Card>

            <Card className="p-4 bg-amber-500/5 border-amber-500/10 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Decisions</p>
              <p className={`text-2xl font-black mt-1 tabular-nums ${pendingApprovalsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {pendingApprovalsCount}
              </p>
            </Card>

            <Card className="p-4 bg-rose-500/5 border-rose-500/10 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Skipped / Blocked</p>
              <p className="text-2xl font-black text-rose-400 mt-1 tabular-nums">
                {anomaliesList.filter(a => a.action.includes('Skip') || a.action.includes('Block')).length}
              </p>
            </Card>
          </div>

          {/* Anomaly Review Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Detected Anomalies ({totalAnomalies})
              </h3>
              <p className="text-xs text-slate-500">
                Meera's Request: You must approve/decide on all required fields before proceeding.
              </p>
            </div>

            <Card className="overflow-hidden p-0 border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-700/50 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Row #</th>
                      <th className="py-3 px-4">Field</th>
                      <th className="py-3 px-4">Anomaly Issue</th>
                      <th className="py-3 px-4">Raw Value</th>
                      <th className="py-3 px-4">Proposed Action</th>
                      <th className="py-3 px-4 text-right">Your Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-350">
                    {anomaliesList.map((a, idx) => {
                      const isResolved = resolutions[a.row] !== undefined;
                      const requiresApproval = a.requires_approval;
                      
                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            requiresApproval && !isResolved 
                              ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                              : 'hover:bg-slate-800/20'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{a.row}</td>
                          <td className="py-3.5 px-4 font-mono text-teal-400 font-semibold">{a.field || 'all'}</td>
                          <td className="py-3.5 px-4 font-semibold text-white">{a.issue_type}</td>
                          <td className="py-3.5 px-4 font-mono text-rose-400 truncate max-w-[120px]" title={a.raw_value}>{a.raw_value || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">{a.action}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleResolutionChange(a.row, 'accept')}
                                className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                                  resolutions[a.row] === 'accept'
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleResolutionChange(a.row, 'reject')}
                                className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                                  resolutions[a.row] === 'reject'
                                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/10'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setStep(1);
                setPreviewData(null);
              }}
              className="cursor-pointer"
            >
              Start Over
            </Button>
            <Button
              variant="primary"
              onClick={handleProceedFromReview}
              disabled={pendingApprovalsCount > 0}
              className="cursor-pointer"
            >
              {pendingApprovalsCount > 0 
                ? `Resolve ${pendingApprovalsCount} items to proceed` 
                : 'Next Step'}
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Exchange Rate Setting */}
      {step === 3 && (
        <Card className="p-6 space-y-6 max-w-md mx-auto">
          <div className="space-y-2 text-center">
            <TrendingUp className="w-10 h-10 text-teal-400 mx-auto animate-float" />
            <h3 className="text-lg font-bold text-white">Set USD to INR Exchange Rate</h3>
            <p className="text-xs text-slate-400">
              We detected USD expenses in your CSV (e.g. Goa villa booking $540, beach lunch $84).
              Please set the conversion rate to calculate INR equivalent balances.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="USD to INR Exchange Rate"
              type="number"
              step="0.01"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              placeholder="e.g. 84.50"
              required
            />
            <div className="bg-slate-800/30 border border-slate-700/30 p-3 rounded-2xl text-[10px] text-slate-400 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>
                Default fetched dynamically is currently <strong>₹{fxRate}</strong>. 
                You can override this based on your credit card statement conversion rate.
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep(2)}
              className="cursor-pointer"
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep(4)}
              className="cursor-pointer"
            >
              Proceed to Import
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Confirm Import */}
      {step === 4 && (
        <Card className="p-8 max-w-md mx-auto text-center space-y-6">
          <div className="space-y-2">
            <CheckCircle2 className="w-12 h-12 text-teal-400 mx-auto animate-pulse-glow rounded-full" />
            <h3 className="text-lg font-bold text-white">Confirm Import</h3>
            <p className="text-xs text-slate-400">
              Ready to import CSV records into the group <strong className="text-white">{currentGroup.name}</strong>.
            </p>
          </div>

          <div className="border border-slate-800 bg-slate-900/30 p-4 rounded-2xl text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Total Clean Rows:</span>
              <span className="font-bold text-white">{previewData?.rows_ok}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Approved Anomalies:</span>
              <span className="font-bold text-white">{Object.keys(resolutions).filter(k => resolutions[k] === 'accept').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Rejected / Skipped:</span>
              <span className="font-bold text-white">{Object.keys(resolutions).filter(k => resolutions[k] === 'reject').length}</span>
            </div>
            {usdDetected && (
              <div className="flex justify-between border-t border-slate-850 pt-2 text-teal-400">
                <span className="font-semibold">FX Rate Used:</span>
                <span className="font-extrabold">₹{fxRate} / USD</span>
              </div>
            )}
          </div>

          {importing ? (
            <div className="space-y-3">
              <Spinner size="md" className="mx-auto" />
              <p className="text-xs text-slate-500">Writing records to database...</p>
            </div>
          ) : (
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(usdDetected ? 3 : 2)}
                className="cursor-pointer"
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                className="cursor-pointer"
              >
                Confirm & Import
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 5: Import Complete Report */}
      {step === 5 && reportData && (
        <div className="space-y-6 animate-fade-in">
          {/* Report summary */}
          <Card className="p-6 bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-emerald-400 animate-float" />
            
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Import Complete!</h3>
              <p className="text-xs text-slate-500">
                Timestamp: {new Date(reportData.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-8 border-y border-slate-800/80 py-4 px-6 w-full max-w-md justify-around text-center text-xs">
              <div>
                <p className="text-slate-500 uppercase font-semibold">Total Rows</p>
                <p className="text-xl font-black text-white mt-1 tabular-nums">{reportData.total_rows}</p>
              </div>
              <div className="border-l border-slate-800" />
              <div>
                <p className="text-slate-500 uppercase font-semibold text-emerald-400">Imported</p>
                <p className="text-xl font-black text-emerald-400 mt-1 tabular-nums">{reportData.imported_rows}</p>
              </div>
              <div className="border-l border-slate-800" />
              <div>
                <p className="text-slate-500 uppercase font-semibold text-rose-400">Skipped</p>
                <p className="text-xl font-black text-rose-400 mt-1 tabular-nums">{reportData.skipped_rows}</p>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={downloadReportFile}
              className="cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Import Report (.txt)
            </Button>
          </Card>

          {/* Resolutions summary logs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Log Resolutions</h3>
            <Card className="overflow-hidden p-0 border border-slate-800">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-700/50 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">CSV Row</th>
                    <th className="py-2.5 px-3">Import Action</th>
                    <th className="py-2.5 px-3">Details / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-350">
                  {reportData.resolution_log?.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/10">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{log.row}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          log.action.includes('Imported') 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">{log.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setStep(1);
                setPreviewData(null);
                setReportData(null);
                setResolutions({});
                setUsdDetected(false);
              }}
              className="cursor-pointer"
            >
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
