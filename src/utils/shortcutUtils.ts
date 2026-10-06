import { googleSignIn, getAccessToken } from './googleAuth';

export type PortalRole = 'student' | 'faculty' | 'admin';

export interface RoleShortcutConfig {
  role: PortalRole;
  title: string;
  shortName: string;
  badge: string;
  description: string;
  iconPath: string;
  themeColor: string;
  filenamePrefix: string;
}

export const ROLE_SHORTCUT_CONFIGS: Record<PortalRole, RoleShortcutConfig> = {
  student: {
    role: 'student',
    title: 'Student Assessment Portal',
    shortName: 'Student Portal',
    badge: 'Candidate Login',
    description: 'Direct student cognitive & mathematics competency evaluation test terminal',
    iconPath: '/icon-student.svg',
    themeColor: '#2563eb',
    filenamePrefix: 'CIT_Student_Assessment_Portal'
  },
  faculty: {
    role: 'faculty',
    title: 'Staff & Faculty Evaluation Portal',
    shortName: 'Staff/Faculty',
    badge: 'Faculty Access',
    description: 'Faculty valuation, review, student security unlock, and report analytics',
    iconPath: '/icon-faculty.svg',
    themeColor: '#059669',
    filenamePrefix: 'CIT_Staff_Faculty_Portal'
  },
  admin: {
    role: 'admin',
    title: 'Admin Examination Portal',
    shortName: 'Exam Admin',
    badge: 'Institutional Admin',
    description: 'Examination timing, roster allocation, security audits, and system configuration',
    iconPath: '/icon-admin.svg',
    themeColor: '#7c3aed',
    filenamePrefix: 'CIT_Admin_Examination_Portal'
  }
};

/**
 * Generates direct URL for a specific role portal.
 */
export function getRoleDirectUrl(role: PortalRole): string {
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?role=${role}`;
  } catch {
    return `/?role=${role}`;
  }
}

/**
 * Returns the permanent shared production origin of the application.
 */
export function getSharedOrigin(): string {
  try {
    const origin = window.location.origin;
    if (origin.includes('-dev-')) {
      return origin.replace('-dev-', '-pre-');
    }
    return origin;
  } catch {
    return 'https://ais-pre-75eouhd6rsqnlbfrfeayfc-375066525996.asia-southeast1.run.app';
  }
}

/**
 * Generates permanent shared URL for a specific role portal.
 */
export function getRoleSharedUrl(role: PortalRole): string {
  const sharedOrigin = getSharedOrigin();
  return `${sharedOrigin}/?role=${role}`;
}

/**
 * Downloads a role-specific Windows/Cross-Platform Desktop Shortcut (.url).
 */
export function downloadRoleShortcut(role: PortalRole): void {
  const config = ROLE_SHORTCUT_CONFIGS[role];
  const targetUrl = getRoleDirectUrl(role);
  const filename = `${config.filenamePrefix}.url`;

  // Standard Windows Internet Shortcut (.url) format
  const iconUrl = `${window.location.origin}${config.iconPath}`;
  const shortcutContent = [
    '[InternetShortcut]',
    `URL=${targetUrl}`,
    `IconFile=${iconUrl}`,
    'IconIndex=0',
    `Comment=Coimbatore Institute of Technology - ${config.title}`,
    ''
  ].join('\r\n');

  const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  // Also download companion HTML launcher for Mac/Linux compatibility
  downloadRoleHtmlLauncher(role);
}

/**
 * Downloads a role-specific HTML redirect launcher for macOS, Linux, and ChromeOS.
 */
export function downloadRoleHtmlLauncher(role: PortalRole): void {
  const config = ROLE_SHORTCUT_CONFIGS[role];
  const targetUrl = getRoleDirectUrl(role);
  const filename = `${config.filenamePrefix}_Launcher.html`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <title>CIT ${config.title}</title>
  <link rel="icon" type="image/svg+xml" href="${config.iconPath}">
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      padding: 1rem;
    }
    .card {
      background: #1e293b;
      padding: 2.5rem;
      border-radius: 16px;
      border: 1px solid #334155;
      max-width: 520px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: ${config.themeColor}25;
      color: ${config.themeColor};
      border: 1px solid ${config.themeColor}60;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 1.4rem;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 20px 0;
    }
    .btn {
      display: inline-block;
      padding: 10px 24px;
      background: ${config.themeColor};
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .subtext { font-size: 11px; color: #64748b; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${config.badge}</div>
    <h2>Coimbatore Institute of Technology</h2>
    <p>Redirecting to <strong>${config.title}</strong>...</p>
    <a class="btn" href="${targetUrl}">Launch ${config.shortName}</a>
    <div class="subtext">If not redirected automatically, click the button above.</div>
  </div>
  <script>
    window.location.href = "${targetUrl}";
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Downloads a local desktop / browser shortcut file (.url and launcher.html) to the user's computer.
 */
export function downloadLocalAppShortcut(): void {
  downloadRoleShortcut('student');
}

/**
 * Downloads an HTML redirect launcher for macOS/Linux/Chrome OS desktop shortcutting.
 */
export function downloadHtmlLauncher(appUrl: string): void {
  downloadRoleHtmlLauncher('student');
}

/**
 * Creates a Shortcut File directly inside the user's Google Drive.
 */
export async function createDriveShortcut(): Promise<{ fileId: string; webViewLink: string }> {
  let token = getAccessToken();
  if (!token) {
    const authRes = await googleSignIn();
    token = authRes?.accessToken || null;
  }

  if (!token) {
    throw new Error('Google Authentication is required to save shortcut to Google Drive.');
  }

  const appUrl = window.location.href;
  const fileName = 'CIT Mathematics Competency Assessment - Shortcut.html';

  const fileMetadata = {
    name: fileName,
    mimeType: 'text/html',
    description: 'Direct launcher shortcut for Coimbatore Institute of Technology Mathematics Competency Assessment.',
  };

  const fileContent = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${appUrl}">
  <title>CIT Mathematics Competency Assessment Launcher</title>
</head>
<body style="font-family:sans-serif; background:#0f172a; color:#fff; text-align:center; padding:50px;">
  <h1>Coimbatore Institute of Technology</h1>
  <p>Launching Mathematics Competency Assessment...</p>
  <p><a href="${appUrl}" style="color:#38bdf8;">Click here to enter portal</a></p>
  <script>window.location.href = "${appUrl}";</script>
</body>
</html>`;

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'text/html' }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create shortcut in Google Drive.');
  }

  const data = await res.json();
  return { fileId: data.id, webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view` };
}
