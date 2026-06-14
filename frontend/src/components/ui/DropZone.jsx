import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { cn } from '../../utils/formatters';

export default function DropZone({
  onDrop,
  accept = { 'text/csv': ['.csv'] },
  maxFiles = 1,
  label = 'Drop your CSV file here',
  sublabel = 'or click to browse',
  className = '',
  disabled = false,
}) {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      accept,
      maxFiles,
      disabled,
    });

  const hasFile = acceptedFiles.length > 0;

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
        isDragActive
          ? 'border-teal-400 bg-teal-500/5 scale-[1.01]'
          : hasFile
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : 'border-slate-600/50 hover:border-slate-500/50 hover:bg-slate-800/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        {hasFile ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-400">
                {acceptedFiles[0].name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(acceptedFiles[0].size / 1024).toFixed(1)} KB
              </p>
            </div>
          </>
        ) : (
          <>
            <div
              className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300',
                isDragActive
                  ? 'bg-teal-500/20 scale-110'
                  : 'bg-slate-700/50'
              )}
            >
              <Upload
                className={cn(
                  'w-8 h-8 transition-all duration-300',
                  isDragActive ? 'text-teal-400 animate-float' : 'text-slate-400'
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">{label}</p>
              <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
