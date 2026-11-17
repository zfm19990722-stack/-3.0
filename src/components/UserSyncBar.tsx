import { useState, useEffect, ChangeEvent } from 'react';
import { ShieldCheck, HardDrive, Download, Upload, Share2, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Wish } from '../types';
import {
  ABUNDANCE_NOTES_UPDATED_EVENT,
  downloadBackupFile,
  getReadingNotesCount,
  hasPreImportSnapshot,
  importBackupFromJsonText,
  restorePreImportSnapshot,
} from '../services/backupService';

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
  const [notesCount, setNotesCount] = useState<number>(() => getReadingNotesCount());
  const [hasSnapshot, setHasSnapshot] = useState<boolean>(() => Boolean(hasPreImportSnapshot()));
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const refreshCounts = () => {
      setNotesCount(getReadingNotesCount());
      setHasSnapshot(Boolean(hasPreImportSnapshot()));
    };
    refreshCounts();
    window.addEventListener(ABUNDANCE_NOTES_UPDATED_EVENT, refreshCounts);
    return () => {
      window.removeEventListener(ABUNDANCE_NOTES_UPDATED_EVENT, refreshCounts);
    };
  }, [showDropdown, wishes]);

  // Export current wishes & reading notes as unified JSON
  const handleExportDataPackage = () => {
    const ok = downloadBackupFile(wishes, 'lumiere_manifest_local_backup');
    if (ok) {
      setImportFeedback({
        type: 'success',
        message: isEn
          ? `Exported ${wishes.length} wishes & ${getReadingNotesCount()} reading notes.`
          : `已导出 ${wishes.length} 个愿望与 ${getReadingNotesCount()} 条读书笔记。`,
      });
      setTimeout(() => setImportFeedback(null), 3000);
    } else {
      setImportFeedback({
        type: 'error',
        message: isEn ? 'Failed to export backup file.' : '导出备份失败，请重试。',
      });
    }
  };

  // Validate & import JSON file with pre-import snapshot protection
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = typeof event.target?.result === 'string' ? event.target.result : '';
      const result = importBackupFromJsonText(content, wishes, (importedWishes) => {
        if (onImportWishes) {
          onImportWishes(importedWishes);
        }
      });

      if ('errorZh' in result) {
        setImportFeedback({
          type: 'error',
          message: isEn ? result.errorEn : result.errorZh,
        });
      } else {
        setNotesCount(getReadingNotesCount());
        setHasSnapshot(Boolean(hasPreImportSnapshot()));
        setImportFeedback({
          type: 'success',
          message: isEn
            ? `Imported ${result.wishesCount} wishes${result.notesImported ? ` & ${result.notesCount} notes` : ''}. Pre-import snapshot saved.`
            : `🎉 导入成功！已恢复 ${result.wishesCount} 个愿望${result.notesImported ? `、${result.notesCount} 条读书笔记` : ''}（已自动留存导入前快照）。`,
        });
        setTimeout(() => {
          setImportFeedback(null);
          setShowDropdown(false);
        }, 2500);
      }
      inputEl.value = '';
    };
    reader.onerror = () => {
      setImportFeedback({
        type: 'error',
        message: isEn ? 'Failed to read selected file.' : '读取文件失败，请重试。',
      });
      inputEl.value = '';
    };
    reader.readAsText(file);
  };

  const handleRestoreSnapshot = () => {
    const res = restorePreImportSnapshot((restoredWishes) => {
      if (onImportWishes) {
        onImportWishes(restoredWishes);
      }
    });
    if ('errorZh' in res) {
      setImportFeedback({
        type: 'error',
        message: isEn ? res.errorEn : res.errorZh,
      });
    } else {
      setNotesCount(getReadingNotesCount());
      setImportFeedback({
        type: 'success',
        message: isEn
          ? `Restored pre-import snapshot (${res.wishesCount} wishes).`
          : `已恢复至导入前备份快照（${res.wishesCount} 个愿望与原笔记）。`,
      });
      setTimeout(() => setImportFeedback(null), 3000);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2" id="local-storage-bar">
      {/* Quick Share to Others Button */}
      {onOpenShareModal && (
        <button
          type="button"
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border-strong)] text-xs font-medium text-[var(--amnd-text-primary)] transition-colors cursor-pointer whitespace-nowrap"
          id="quick-share-app-btn"
          title={isEn ? 'Share app link & export data' : '分享网页链接 / 导出备份'}
        >
          <Share2 className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
          <span>{isEn ? 'Share & Export' : '分享/备份'}</span>
        </button>
      )}

      {/* Local Storage Indicator Button with Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowDropdown(!showDropdown);
            setImportFeedback(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border-strong)] transition-colors text-xs font-medium text-[var(--amnd-text-primary)] cursor-pointer whitespace-nowrap"
          id="local-storage-status-btn"
          title={isEn ? 'All data safely preserved in your local device' : '100% 本地安全私密保存，无需注册'}
        >
          <HardDrive className="w-3.5 h-3.5 text-[var(--amnd-success)]" />
          <span>{isEn ? 'Local Saved' : '本地已存'}</span>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div
            className="absolute right-0 mt-2 w-72 bg-[var(--amnd-bg-elevated)] rounded-2xl p-4 shadow-[var(--amnd-shadow-md)] border border-[var(--amnd-border-strong)] z-50 text-[var(--amnd-text-primary)] space-y-3 animate-fadeIn text-left"
            id="local-storage-dropdown"
          >
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[var(--amnd-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--amnd-success-soft)] text-[var(--amnd-success)] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-[var(--amnd-text-primary)]">
                  {isEn ? 'Local Private Storage' : '本地私密安全存储'}
                </p>
                <p className="text-[11px] text-[var(--amnd-success)] font-medium">
                  {isEn ? '100% Private · No Cloud Required' : '100% 本地私密 · 自动即时留存'}
                </p>
              </div>
            </div>

            <div className="text-xs text-[var(--amnd-text-secondary)] space-y-1.5 bg-[var(--amnd-bg-secondary)] p-3 rounded-xl border border-[var(--amnd-border)]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--amnd-text-muted)]">{isEn ? 'Local Wishes' : '已存心愿数'}</span>
                <span className="font-semibold tabular-nums text-[var(--amnd-text-primary)]">{wishes.length} {isEn ? '' : '个'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--amnd-text-muted)]">{isEn ? 'Reading Notes' : '读书笔记数'}</span>
                <span className="font-semibold tabular-nums text-[var(--amnd-text-primary)]">{notesCount} {isEn ? '' : '条'}</span>
              </div>
              <p className="text-[11px] text-[var(--amnd-text-muted)] leading-relaxed pt-1">
                {isEn
                  ? 'All wishes, AI visualizations, and reading notes remain exclusively on your device. An automatic snapshot is saved before any import.'
                  : '心愿详情、AI具象化场景与全部读书笔记均实时保存在浏览器本地，导入前会自动留存保护快照。'}
              </p>
            </div>

            {/* Export JSON Button */}
            <button
              type="button"
              onClick={handleExportDataPackage}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--amnd-gold-soft)] hover:bg-[var(--amnd-gold)]/20 border border-[var(--amnd-gold)]/30 text-xs font-semibold text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
              id="export-local-backup-btn"
            >
              <Download className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'Export JSON Backup' : '导出本地备份 (.json)'}</span>
            </button>

            {/* Import JSON Button */}
            <label className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border-strong)] text-xs font-medium text-[var(--amnd-text-primary)] transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'Import JSON Backup' : '导入 / 还原备份'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="sync-bar-import-input"
              />
            </label>

            {hasSnapshot && (
              <button
                type="button"
                onClick={handleRestoreSnapshot}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] border border-[var(--amnd-border)] text-[11px] font-medium text-[var(--amnd-text-secondary)] transition-colors cursor-pointer"
                id="restore-pre-import-snapshot-btn"
              >
                <RotateCcw className="w-3 h-3 text-[var(--amnd-wood)]" />
                <span>{isEn ? 'Undo Last Import (Restore Snapshot)' : '撤销导入（恢复导入前数据）'}</span>
              </button>
            )}

            {importFeedback && (
              <div
                className={`p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-1.5 ${
                  importFeedback.type === 'error'
                    ? 'bg-[var(--amnd-danger-soft)] text-[var(--amnd-danger)] border border-[var(--amnd-danger)]/20'
                    : 'bg-[var(--amnd-success-soft)] text-[var(--amnd-success)] border border-[var(--amnd-success)]/20'
                }`}
                id="sync-bar-import-feedback"
              >
                {importFeedback.type === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{importFeedback.message}</span>
              </div>
            )}

            {onOpenShareModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenShareModal();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--amnd-wood-soft)] hover:bg-[var(--amnd-wood)]/15 border border-[var(--amnd-wood)]/25 text-xs font-medium text-[var(--amnd-wood)] transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Share Sanctuary Link' : '分享专属页面'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
