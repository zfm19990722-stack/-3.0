import { useState, ChangeEvent } from 'react';
import { ShieldCheck, HardDrive, Download, Upload, Share2, Check, Sparkles, FolderHeart } from 'lucide-react';
import { Wish } from '../types';

interface UserSyncBarProps {
  wishes: Wish[];
  onOpenShareModal?: () => void;
  language?: 'zh' | 'en';
  onImportWishes?: (wishes: Wish[]) => void;
}

export default function UserSyncBar({
  wishes,
  onOpenShareModal,
  language = 'zh',
  onImportWishes,
}: UserSyncBarProps) {
  const isEn = language === 'en';
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Export current wishes & notes as JSON
  const handleExportDataPackage = () => {
    try {
      const abundanceNotes = localStorage.getItem('lumiere_abundance_notes_v1') || '[]';
      const exportPayload = {
        app: 'LUMIERE_MANIFEST',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        wishes,
        abundanceNotes: JSON.parse(abundanceNotes),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `lumiere_manifest_local_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setShowDropdown(false);
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  // Import JSON file
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.wishes && Array.isArray(parsed.wishes)) {
          if (onImportWishes) {
            onImportWishes(parsed.wishes);
          }
          if (parsed.abundanceNotes && Array.isArray(parsed.abundanceNotes)) {
            localStorage.setItem('lumiere_abundance_notes_v1', JSON.stringify(parsed.abundanceNotes));
          }
          setCopiedMsg(true);
          setTimeout(() => {
            setCopiedMsg(false);
            setShowDropdown(false);
          }, 1500);
        }
      } catch (err) {
        console.error('Failed to import JSON backup:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative inline-flex items-center gap-2" id="local-storage-bar">
      {/* Quick Share to Others Button */}
      {onOpenShareModal && (
        <button
          type="button"
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 to-amber-500/15 hover:from-pink-500/20 hover:to-amber-500/25 border border-pink-300/40 shadow-xs hover:shadow text-xs font-bold text-[#8e6d72] transition-all cursor-pointer hover:scale-105 active:scale-95"
          id="quick-share-app-btn"
          title={isEn ? 'Share app link & export data' : '分享网页链接 / 导出备份'}
        >
          <Share2 className="w-3.5 h-3.5 text-pink-600" />
          <span>{isEn ? 'Share & Export' : '📤 分享/备份'}</span>
        </button>
      )}

      {/* Local Storage Indicator Button with Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white border border-[#8e6d72]/20 shadow-xs hover:shadow transition-all text-xs font-semibold text-[#8e6d72] cursor-pointer hover:scale-105 active:scale-95"
          id="local-storage-status-btn"
          title={isEn ? 'All data safely preserved in your local device' : '100% 本地安全私密保存，无需注册'}
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isEn ? 'Local Saved' : '💾 本地已存'}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div
            className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl p-4 shadow-xl border border-white/80 z-50 text-[#4a3a3a] space-y-3 animate-fadeIn text-left"
            id="local-storage-dropdown"
          >
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#8e6d72]/10">
              <div className="w-8 h-8 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#4a3a3a]">
                  {isEn ? 'Local Private Storage' : '本地私密安全存储'}
                </p>
                <p className="text-[10px] text-emerald-700 font-medium">
                  {isEn ? '100% Private • No Cloud Required' : '100% 本地私密 • 自动即时留存'}
                </p>
              </div>
            </div>

            <div className="text-[11px] text-[#6d5b5e] space-y-1.5 bg-[#8e6d72]/5 p-2.5 rounded-xl border border-[#8e6d72]/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{isEn ? 'Local Wishes' : '已存心愿数'}</span>
                <span className="font-bold text-[#8e6d72]">{wishes.length} 个</span>
              </div>
              <p className="text-[9.5px] text-[#8e6d72]/80 leading-relaxed pt-0.5">
                {isEn
                  ? 'All wishes, AI visualizations, and reading notes remain exclusively on your device.'
                  : '心愿详情、AI具象化场景与全部读书笔记均实时保存在浏览器本地，免登录且永久私密。'}
              </p>
            </div>

            {/* Export JSON Button */}
            <button
              type="button"
              onClick={handleExportDataPackage}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-900 transition-colors cursor-pointer"
              id="export-local-backup-btn"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>{isEn ? 'Export JSON Backup' : '📥 导出本地备份 (.json)'}</span>
            </button>

            {/* Import JSON Button */}
            <label className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-[#4a3a3a] transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#8e6d72]" />
              <span>{copiedMsg ? (isEn ? 'Imported Successfully!' : '🎉 导入成功！') : (isEn ? 'Import JSON Backup' : '📤 导入/还原备份')}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {onOpenShareModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenShareModal();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-pink-50 hover:bg-pink-100/70 border border-pink-200 text-xs font-bold text-[#8e6d72] transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-pink-600" />
                <span>{isEn ? 'Share Sanctuary Link' : '🔗 分享专属小屋'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
