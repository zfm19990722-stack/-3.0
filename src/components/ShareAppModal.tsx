import React, { useState, useEffect } from 'react';
import { 
  Share2, Copy, Check, Download, Upload, QrCode, 
  Sparkles, Globe, Users, RotateCcw, AlertCircle
} from 'lucide-react';
import { Wish } from '../types';
import {
  ABUNDANCE_NOTES_UPDATED_EVENT,
  downloadBackupFile,
  getReadingNotesCount,
  hasPreImportSnapshot,
  importBackupFromJsonText,
  restorePreImportSnapshot,
} from '../services/backupService';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'zh' | 'en';
  wishes: Wish[];
  onImportData?: (importedWishes: Wish[]) => void;
}

export default function ShareAppModal({
  isOpen,
  onClose,
  language = 'zh',
  wishes,
  onImportData,
}: ShareAppModalProps) {
  const isEn = language === 'en';
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [notesCount, setNotesCount] = useState<number>(() => getReadingNotesCount());
  const [hasSnapshot, setHasSnapshot] = useState<boolean>(() => Boolean(hasPreImportSnapshot()));
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const refresh = () => {
      setNotesCount(getReadingNotesCount());
      setHasSnapshot(Boolean(hasPreImportSnapshot()));
    };
    refresh();
    window.addEventListener(ABUNDANCE_NOTES_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(ABUNDANCE_NOTES_UPDATED_EVENT, refresh);
    };
  }, [isOpen, wishes]);

  if (!isOpen) return null;

  // Use the shared app production link or current window origin
  const sharedUrl = window.location.origin.includes('ais-dev')
    ? window.location.origin.replace('ais-dev-', 'ais-pre-')
    : window.location.href.split('?')[0];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyShareText = () => {
    const text = isEn
      ? `AMND Manifestation · Amanda's Digital Sanctuary\nOpen now: ${sharedUrl}\nLearn, and Magic Manifests. Explore 《Abundance》 wisdom reading, SoHum stillness practice, Solfeggio soundscapes, and local-private intention journaling.`
      : `AMND Manifestation · Amanda 的学海魔法屋\n点击链接即刻开启：${sharedUrl}\n学习了，魔法会显化。包含《丰盛》阅读笔记、SoHum 静心呼吸、自然声景与本地私密心愿显化记录，无需注册即可使用。`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // Export current wishes & reading notes as unified JSON
  const handleExportDataPackage = () => {
    const ok = downloadBackupFile(wishes, 'amnd_manifestation_backup');
    if (ok) {
      setImportStatus({
        type: 'success',
        message: isEn
          ? `Exported ${wishes.length} wishes & ${getReadingNotesCount()} reading notes.`
          : `已导出 ${wishes.length} 个愿望与 ${getReadingNotesCount()} 条读书笔记`,
      });
    } else {
      setImportStatus({
        type: 'error',
        message: isEn ? 'Failed to export backup file.' : '导出备份失败，请重试',
      });
    }
  };

  // Validate & import JSON data file using unified backupService
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = typeof event.target?.result === 'string' ? event.target.result : '';
      const result = importBackupFromJsonText(content, wishes, (importedWishes) => {
        if (onImportData) {
          onImportData(importedWishes);
        }
      });

      if ('errorZh' in result) {
        setImportStatus({
          type: 'error',
          message: isEn ? result.errorEn : result.errorZh,
        });
      } else {
        setNotesCount(getReadingNotesCount());
        setHasSnapshot(Boolean(hasPreImportSnapshot()));
        setImportStatus({
          type: 'success',
          message: isEn
            ? `Imported ${result.wishesCount} wishes${result.notesImported ? ` & ${result.notesCount} reading notes` : ''}. Pre-import snapshot saved.`
            : `成功导入！已恢复 ${result.wishesCount} 个愿望${result.notesImported ? `与 ${result.notesCount} 条读书笔记` : ''}（已自动保存导入前快照）。`,
        });
        setTimeout(() => {
          setImportStatus(null);
          onClose();
        }, 2200);
      }
      inputEl.value = '';
    };
    reader.onerror = () => {
      setImportStatus({
        type: 'error',
        message: isEn ? 'Failed to read selected file.' : '读取文件失败，请检查文件。',
      });
      inputEl.value = '';
    };
    reader.readAsText(file);
  };

  const handleRestoreSnapshot = () => {
    const res = restorePreImportSnapshot((restoredWishes) => {
      if (onImportData) {
        onImportData(restoredWishes);
      }
    });
    if ('errorZh' in res) {
      setImportStatus({
        type: 'error',
        message: isEn ? res.errorEn : res.errorZh,
      });
    } else {
      setNotesCount(getReadingNotesCount());
      setImportStatus({
        type: 'success',
        message: isEn
          ? `Restored pre-import snapshot (${res.wishesCount} wishes).`
          : `已恢复至导入前备份快照（${res.wishesCount} 个愿望与原笔记）。`,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#262320]/45 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      id="share-app-modal-overlay"
    >
      <div
        className="relative w-full max-w-xl bg-[var(--amnd-bg-elevated)] rounded-[24px] p-6 sm:p-8 shadow-2xl border border-[var(--amnd-border)] text-[var(--amnd-text-primary)] overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        id="share-app-modal-dialog"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] border border-[var(--amnd-border)] flex items-center justify-center text-[var(--amnd-text-secondary)] transition-colors cursor-pointer text-sm font-medium"
          id="close-share-modal-btn"
          aria-label={isEn ? 'Close modal' : '关闭窗口'}
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border)] text-[var(--amnd-wood)] mb-3">
            <Share2 className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)]">
            {isEn ? 'Share & Backup Sanctuary Data' : '分享空间与本地数据备份'}
          </h2>
          <p className="text-xs text-[var(--amnd-text-muted)] mt-1">
            {isEn
              ? 'Share the public access link or export a portable JSON backup across devices'
              : '复制公开网页链接给朋友，或导出 JSON 数据包实现跨设备安全迁移'}
          </p>
        </div>

        {/* SECTION 1: PUBLIC DIRECT SHARING LINK */}
        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-2xl bg-[var(--amnd-bg-secondary)]/70 border border-[var(--amnd-border)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--amnd-text-primary)]">
                <Globe className="w-4 h-4 text-[var(--amnd-wood)]" />
                <span>{isEn ? 'Public Web Link (No Login Required)' : '公开网页链接（打开即用，无需注册）'}</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] text-[var(--amnd-sage)] font-medium flex items-center gap-1 shrink-0">
                <Check className="w-3 h-3" />
                {isEn ? 'Ready' : '可用'}
              </span>
            </div>

            {/* URL Display and Action */}
            <div className="flex items-center gap-2 bg-[var(--amnd-bg-elevated)] p-2 rounded-xl border border-[var(--amnd-border)]">
              <input
                type="text"
                readOnly
                value={sharedUrl}
                className="flex-1 bg-transparent text-xs font-mono text-[var(--amnd-text-primary)] px-2 outline-none select-all truncate"
                id="shared-app-url-input"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-lg amnd-btn-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
                id="copy-shared-url-btn"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Copied!' : '已复制'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Copy Link' : '复制链接'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyShareText}
                className="flex-1 py-2 px-3 amnd-btn-secondary text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                id="copy-share-invitation-btn"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                <span>{copiedText ? (isEn ? 'Copied Invitation!' : '已复制邀请文案') : (isEn ? 'Copy Invite Text' : '复制推荐文案')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="py-2 px-3.5 amnd-btn-secondary text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                id="toggle-qr-code-btn"
              >
                <QrCode className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                <span>{showQr ? (isEn ? 'Hide QR' : '收起二维码') : (isEn ? 'Mobile QR' : '手机扫码')}</span>
              </button>
            </div>

            {/* QR Code preview */}
            {showQr && (
              <div className="p-4 bg-[var(--amnd-bg-elevated)] rounded-2xl border border-[var(--amnd-border)] text-center animate-fadeIn space-y-2">
                <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl border border-[var(--amnd-border)] flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(sharedUrl)}`}
                    alt="App QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-[var(--amnd-text-secondary)]">
                  {isEn ? 'Scan with your phone camera to open directly' : '使用手机相机或微信扫描，随时随地开启静心与记录'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: HOW MULTI-USER WORKS */}
        <div className="mb-6 p-4 rounded-2xl bg-[var(--amnd-bg-secondary)]/50 border border-[var(--amnd-border)] space-y-2.5 text-left">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--amnd-text-primary)]">
            <Users className="w-4 h-4 text-[var(--amnd-wood)]" />
            <span>{isEn ? 'Local Privacy & Isolation' : '隐私隔离与使用说明'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[var(--amnd-text-secondary)]">
            <div className="p-3 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)]">
              <p className="font-semibold text-[var(--amnd-text-primary)] mb-1">
                {isEn ? 'Private Local Storage' : '私密独立空间'}
              </p>
              <p className="text-[11px] leading-relaxed">
                {isEn
                  ? 'Each visitor keeps an independent local browser vault; personal wishes and notes remain strictly private.'
                  : '他人打开链接后拥有独立的本地浏览器存储，不会接触或覆盖你的任何个人愿望与笔记。'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)]">
              <p className="font-semibold text-[var(--amnd-text-primary)] mb-1">
                {isEn ? 'Zero-Account Access' : '免登录直接使用'}
              </p>
              <p className="text-[11px] leading-relaxed">
                {isEn
                  ? 'Works directly in desktop and mobile browsers without installing an app.'
                  : '无需注册或安装客户端，支持手机、平板与桌面端随时进入阅读与静坐。'}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: DATA PACKAGE BACKUP & TRANSFER */}
        <div className="p-4 rounded-2xl bg-[var(--amnd-bg-secondary)]/70 border border-[var(--amnd-border)] space-y-3 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--amnd-text-primary)]">
              <Download className="w-4 h-4 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'Export & Import JSON Backup' : '跨设备迁移与 JSON 数据备份'}</span>
            </span>
            <span className="text-[11px] text-[var(--amnd-text-muted)] font-mono tabular-nums">
              {wishes.length} {isEn ? 'Wishes' : '愿望'} · {notesCount} {isEn ? 'Notes' : '笔记'}
            </span>
          </div>

          <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
            {isEn
              ? 'Export your wishes, AI sensory details, and Abundance reading notes as a portable JSON backup. Importing automatically saves a pre-import safety snapshot first.'
              : '将当前愿望清单、感官画面与《丰盛》读书笔记一键导出为 JSON 备份文件；导入前会自动留存本地安全快照。'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportDataPackage}
              className="w-full sm:flex-1 py-2.5 px-4 amnd-btn-primary text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
              id="export-data-pkg-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Export JSON Backup' : '导出数据包 (JSON)'}</span>
            </button>

            <label
              className="w-full sm:flex-1 py-2.5 px-4 amnd-btn-secondary text-xs font-medium flex items-center justify-center gap-2 cursor-pointer text-center"
              id="import-data-pkg-label"
            >
              <Upload className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'Import JSON Backup' : '导入数据包 (JSON)'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="import-data-pkg-input"
              />
            </label>
          </div>

          {hasSnapshot && (
            <button
              type="button"
              onClick={handleRestoreSnapshot}
              className="w-full py-2 px-3 rounded-xl bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-subtle)] border border-[var(--amnd-border)] text-xs font-medium text-[var(--amnd-text-secondary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              id="modal-restore-snapshot-btn"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'Restore Pre-Import Snapshot' : '撤销导入（恢复导入前数据快照）'}</span>
            </button>
          )}

          {importStatus && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium text-center animate-fadeIn flex items-center justify-center gap-1.5 ${
                importStatus.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] border border-[var(--amnd-border)]'
              }`}
              id="share-modal-import-status"
            >
              {importStatus.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{importStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)] font-medium underline cursor-pointer"
          >
            {isEn ? 'Close Window' : '完成并关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}
