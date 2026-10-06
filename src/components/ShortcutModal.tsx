import React, { useState, useEffect } from 'react';
import {
  Download,
  FolderPlus,
  Copy,
  Check,
  X,
  ExternalLink,
  Laptop,
  HardDrive,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  User,
  ShieldCheck,
  Lock,
  Smartphone,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  downloadRoleShortcut, 
  downloadRoleHtmlLauncher, 
  getRoleDirectUrl, 
  getRoleSharedUrl,
  ROLE_SHORTCUT_CONFIGS, 
  PortalRole,
  createDriveShortcut 
} from '../utils/shortcutUtils';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: PortalRole;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ 
  isOpen, 
  onClose,
  defaultRole = 'student'
}) => {
  const [selectedRole, setSelectedRole] = useState<PortalRole>(defaultRole);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [isDriveSaving, setIsDriveSaving] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setSelectedRole(defaultRole);
  }, [defaultRole, isOpen]);

  // Listen for native PWA installation event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (role: PortalRole, type: 'shared' | 'direct' = 'shared') => {
    const url = type === 'shared' ? getRoleSharedUrl(role) : getRoleDirectUrl(role);
    navigator.clipboard.writeText(url);
    setCopiedKey(`${role}-${type}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveToGoogleDrive = async () => {
    setIsDriveSaving(true);
    setDriveError(null);
    try {
      const res = await createDriveShortcut();
      setDriveUrl(res.webViewLink);
    } catch (err: any) {
      console.error('Google Drive Shortcut Error:', err);
      setDriveError(err.message || 'Failed to save shortcut to Google Drive.');
    } finally {
      setIsDriveSaving(false);
    }
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    }
  };

  const roles: PortalRole[] = ['student', 'faculty', 'admin'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 max-w-2xl w-full space-y-6 shadow-2xl relative my-auto text-slate-800">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          title="Close shortcut dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-bold">
            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
            <span>Institutional Access Shortcuts</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Portal Shortcuts for Admin, Staff &amp; Student
          </h2>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Download desktop launcher icons (<code className="text-blue-700 font-semibold">.url</code> / <code className="text-blue-700 font-semibold">.html</code>) or bookmark direct URLs for computer lab PCs and personal devices.
          </p>
        </div>

        {/* Native PWA Install Banner if supported */}
        {installPrompt && !isInstalled && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-blue-950">Install Desktop / Mobile App</h4>
                <p className="text-[11px] text-blue-800">Install as standalone application with dedicated dock/taskbar icon</p>
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
            >
              Install App
            </button>
          </div>
        )}

        {/* Role Shortcut Cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Direct Access Shortcut Icons
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {roles.map((role) => {
              const config = ROLE_SHORTCUT_CONFIGS[role];
              const isSelected = selectedRole === role;
              const directUrl = getRoleDirectUrl(role);
              const isCopied = copiedRole === role;

              return (
                <div 
                  key={role}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                    role === 'student'
                      ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400'
                      : role === 'faculty'
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                      : 'bg-purple-50/50 border-purple-200 hover:border-purple-400'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Icon & Badge Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={config.iconPath} 
                          alt={config.title} 
                          className="w-8 h-8 rounded-lg shadow-xs shrink-0 object-contain" 
                        />
                        <div>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            role === 'student'
                              ? 'bg-blue-100 text-blue-800'
                              : role === 'faculty'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {config.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role Title */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {config.shortName}
                      </h4>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons for this Role */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                    {/* Direct Launch Link */}
                    <a
                      href={directUrl}
                      className={`w-full py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                        role === 'student'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : role === 'faculty'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <span>Open {role === 'student' ? 'Student' : role === 'faculty' ? 'Staff' : 'Admin'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {/* Download Desktop Shortcut Button */}
                    <button
                      onClick={() => downloadRoleShortcut(role)}
                      className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Download Windows Desktop Shortcut (.url)"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Desktop Icon (.url)</span>
                    </button>

                    {/* Copy Shared URL Button */}
                    <button
                      onClick={() => handleCopy(role, 'shared')}
                      className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        copiedKey === `${role}-shared`
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Copy official campus/shared permanent link"
                    >
                      {copiedKey === `${role}-shared` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Shared Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Shared Link</span>
                        </>
                      )}
                    </button>

                    {/* Copy Direct URL Button */}
                    <button
                      onClick={() => handleCopy(role, 'direct')}
                      className="w-full py-1 px-2 text-slate-500 hover:text-slate-800 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Copy direct dev instance link"
                    >
                      {copiedKey === `${role}-direct` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Direct URL Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Direct URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Batch Download / Lab Deployment Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Computer Lab &amp; Faculty Desktop Deployment</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            To set up on campus lab computers: click <strong>"Desktop Icon (.url)"</strong> above for each role. Move the downloaded files to the Public Desktop (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[10px]">C:\Users\Public\Desktop</code>) so every student and faculty member can access their respective portal with one double-click.
          </p>
        </div>

        {/* Option 2: Save to Google Drive */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg shrink-0">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Google Drive Cloud Launcher</p>
              <p className="text-[11px] text-slate-500">Creates shortcut inside your Google Drive for quick multi-device access</p>
            </div>
          </div>

          {driveUrl ? (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 text-xs transition-colors shrink-0"
            >
              <span>View in Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              onClick={handleSaveToGoogleDrive}
              disabled={isDriveSaving}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {isDriveSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Save to Drive</span>
                </>
              )}
            </button>
          )}
        </div>

        {driveError && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{driveError}</span>
          </div>
        )}

      </div>
    </div>
  );
};
