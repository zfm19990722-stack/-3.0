import React, { useState } from 'react';
import { 
  Share2, Copy, Check, Download, Upload, QrCode, 
  Sparkles, Globe, Smartphone, Heart, Users, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Wish } from '../types';

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
  const [importStatus, setImportStatus] = useState<string | null>(null);

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
      ? `👑 LUMIÈRE MANIFEST - Princess Royal Manifestation & Mindfulness Oasis\n✨ Open now: ${sharedUrl}\nExperience 528Hz Solfeggio sound healing, SOHUM breathwork, Gemini AI wish visualization, and the complete "Abundance" wisdom repository!`
      : `👑 LUMIÈRE MANIFEST • 公主风奢华显化小屋\n✨ 点击链接即刻开启：${sharedUrl}\n包含 528Hz 黄金音频、SOHUM 黄金呼吸实修、Gemini AI 具象化心愿显化，以及《丰盛》全书核心要义与读书心得宝库！无需注册即可畅享。`;
    
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // Export current wishes & data as JSON
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
      downloadAnchor.setAttribute('download', `lumiere_manifest_data_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  // Import JSON data file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.wishes && Array.isArray(parsed.wishes)) {
          if (onImportData) {
            onImportData(parsed.wishes);
          }
          if (parsed.abundanceNotes && Array.isArray(parsed.abundanceNotes)) {
            localStorage.setItem('lumiere_abundance_notes_v1', JSON.stringify(parsed.abundanceNotes));
          }
          setImportStatus(isEn ? 'Data imported successfully!' : '🎉 成功导入数据包！已同步心愿与读书笔记');
          setTimeout(() => {
            setImportStatus(null);
            onClose();
          }, 2000);
        } else {
          setImportStatus(isEn ? 'Invalid data format.' : '❌ 文件格式不匹配');
        }
      } catch (err) {
        console.error('Import parse error:', err);
        setImportStatus(isEn ? 'Failed to parse file.' : '❌ 解析文件失败，请检查文件');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      id="share-app-modal-overlay"
    >
      <div 
        className="relative w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl border border-white text-[#4a3a3a] overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        id="share-app-modal-dialog"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#8e6d72]/10 hover:bg-[#8e6d72]/20 flex items-center justify-center text-[#8e6d72] transition-colors cursor-pointer text-sm font-bold"
          id="close-share-modal-btn"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-100 to-amber-100 text-[#8e6d72] mb-3 shadow-inner">
            <Share2 className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#8e6d72]">
            {isEn ? 'Share & Synchronize with Others' : '分享与同步给他人使用'}
          </h2>
          <p className="text-xs text-[#b49196] mt-1 font-medium">
            {isEn
              ? 'Send the app link or export your wishboard data for friends & family'
              : '复制公开链接或打包心愿数据，让好友与家人随时随地在任何设备上开启显化'}
          </p>
        </div>

        {/* SECTION 1: PUBLIC DIRECT SHARING LINK */}
        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/80 via-white to-amber-50/60 border border-pink-100/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#8e6d72]">
                <Globe className="w-4 h-4 text-[#8e6d72]" />
                <span>{isEn ? 'Public Web Link (No Login Required)' : '公开网页链接（他人打开即用，无需登录）'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" />
                {isEn ? 'Live Ready' : '永久有效'}
              </span>
            </div>

            {/* URL Display and Action */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-[#8e6d72]/15 shadow-inner">
              <input
                type="text"
                readOnly
                value={sharedUrl}
                className="flex-1 bg-transparent text-xs font-mono text-[#5c3e43] px-2 outline-none select-all truncate"
                id="shared-app-url-input"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-lg bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
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
                className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-pink-50 border border-pink-200 text-xs font-bold text-[#8e6d72] flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                id="copy-share-invitation-btn"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{copiedText ? (isEn ? 'Copied Invitation!' : '已复制完整邀请文案！') : (isEn ? 'Copy Social Invite Text' : '复制微信/朋友圈推荐文案')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="py-2 px-3.5 rounded-xl bg-white hover:bg-pink-50 border border-pink-200 text-xs font-bold text-[#8e6d72] flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                id="toggle-qr-code-btn"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQr ? (isEn ? 'Hide QR' : '收起二维码') : (isEn ? 'Show Mobile QR' : '手机扫码体验')}</span>
              </button>
            </div>

            {/* QR Code preview */}
            {showQr && (
              <div className="p-4 bg-white rounded-2xl border border-pink-200 text-center animate-fadeIn space-y-2">
                <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl border border-gray-200 flex items-center justify-center shadow-xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(sharedUrl)}`}
                    alt="App QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-[#8e6d72] font-semibold">
                  {isEn ? 'Scan with your phone camera or WeChat to open directly' : '用微信或手机浏览器扫描，随时随地开启显化实修'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: HOW MULTI-USER WORKS */}
        <div className="mb-6 p-4 rounded-2xl bg-white/70 border border-[#8e6d72]/15 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8e6d72]">
            <Users className="w-4 h-4 text-[#8e6d72]" />
            <span>{isEn ? 'How Multi-User Sharing Works' : '他人使用方式与数据隔离说明'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#6d5b5e]">
            <div className="p-2.5 rounded-xl bg-pink-50/40 border border-pink-100/60">
              <p className="font-bold text-[#8e6d72] mb-0.5">🔒 私密独立空间</p>
              <p>他人打开链接后拥有独立的本地保险库，绝不会泄露或混淆您的个人心愿。</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-100/60">
              <p className="font-bold text-amber-900 mb-0.5">⚡ 免登录全功能畅享</p>
              <p>无需安装任何 App，支持手机/平板/电脑浏览器，随时随地调频与记笔记。</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: DATA PACKAGE BACKUP & TRANSFER */}
        <div className="p-4 rounded-2xl bg-white/70 border border-[#8e6d72]/15 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#8e6d72]">
              <Download className="w-4 h-4 text-[#8e6d72]" />
              <span>{isEn ? 'Sync My Data to Another Device / Friend' : '跨设备迁移 / 将我的心愿与心得分享给好友'}</span>
            </span>
            <span className="text-[10px] text-[#b49196] font-mono font-medium">
              {wishes.length} {isEn ? 'Wishes' : '个心愿'}
            </span>
          </div>

          <p className="text-[11px] text-[#6d5b5e] leading-relaxed">
            {isEn
              ? 'Export your wishes, Gemini imagery details, and Abundance notes as a portable JSON backup to load on any device.'
              : '您可以将您当前的心愿列表、AI 具象化场景与读书笔记一键导出为数据文件，发给好友导入或在您的其他设备上同步。'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            {/* Export button */}
            <button
              type="button"
              onClick={handleExportDataPackage}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8e6d72] to-[#75555a] text-white text-xs font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              id="export-data-pkg-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Export My Data Package' : '📦 导出我的数据包 (JSON)'}</span>
            </button>

            {/* Import button */}
            <label 
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-pink-50/80 border border-[#8e6d72]/30 text-[#8e6d72] text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-center"
              id="import-data-pkg-label"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isEn ? 'Import Data Package' : '📥 导入好友数据包'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="import-data-pkg-input"
              />
            </label>
          </div>

          {importStatus && (
            <div className="p-2.5 rounded-xl bg-pink-100/70 text-xs text-[#8e6d72] font-bold text-center animate-fadeIn">
              {importStatus}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#b49196] hover:text-[#8e6d72] font-bold underline cursor-pointer"
          >
            {isEn ? 'Close Window' : '完成并关闭'}
          </button>
        </div>

      </div>
    </div>
  );
}
