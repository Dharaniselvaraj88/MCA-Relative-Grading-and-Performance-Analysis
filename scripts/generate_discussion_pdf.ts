import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

function buildDiscussionPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Helper colors
  const NAVY = [15, 23, 42];        // #0f172a
  const BLUE = [37, 99, 235];       // #2563eb
  const BLUE_BG = [239, 246, 255];  // #eff6ff
  const BLUE_BORDER = [191, 219, 254];// #bfdbfe
  const SLATE_BG = [248, 250, 252]; // #f8fafc
  const SLATE_BORDER = [226, 232, 240]; // #e2e8f0
  const TEXT_DARK = [30, 41, 59];   // #1e293b
  const TEXT_MUTED = [100, 116, 139]; // #64748b
  const GREEN = [16, 185, 129];     // #10b981
  const INDIGO = [79, 70, 229];     // #4f46e5

  // ==========================================
  // PAGE 1: HOMEPAGE OVERVIEW & SYSTEM ARCHITECTURE
  // ==========================================

  // Header Banner
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Department of Mathematics — Cognitive Assessment Portal', margin, 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(96, 165, 250);
  doc.text('HOMEPAGE & PORTAL DESIGN DOCUMENTATION (FOR DISCUSSION)', margin, 25);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} | Version 2.0`, margin, 31);

  let y = 42;

  // Title Box: Section 1
  doc.setFillColor(BLUE_BG[0], BLUE_BG[1], BLUE_BG[2]);
  doc.setDrawColor(BLUE_BORDER[0], BLUE_BORDER[1], BLUE_BORDER[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text('1. PORTAL HOMEPAGE & OVERVIEW ARCHITECTURE', margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('Central entry hub for MSc Integrated Mathematics, Data Science & Computing students and faculty.', margin + 5, y + 15);

  y += 27;

  // Mockup Box: Homepage Hero Card
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(SLATE_BORDER[0], SLATE_BORDER[1], SLATE_BORDER[2]);
  doc.roundedRect(margin, y, contentWidth, 70, 3, 3, 'FD');

  // Top window control bar mock
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
  doc.rect(margin, y + 5, contentWidth, 5, 'F'); // square bottom corners of header

  doc.setFillColor(239, 68, 68); doc.circle(margin + 5, y + 5, 1.5, 'F');
  doc.setFillColor(245, 158, 11); doc.circle(margin + 10, y + 5, 1.5, 'F');
  doc.setFillColor(16, 185, 129); doc.circle(margin + 15, y + 5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CIT Cognitive Assessment Portal - Desktop Container', margin + 22, y + 6.5);

  let py = y + 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('MSc Integrated Mathematics Cognitive Assessment System', margin + 6, py);

  py += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('An advanced 50-question 60-minute standardized evaluation across 5 core mathematical domains.', margin + 6, py);

  py += 10;
  // Feature Badges Grid
  const features = [
    { title: '50 Questions / 5 Sections', desc: 'Numerical, Verbal, Algorithmic, Working Memory, Abstract' },
    { title: '60 Minutes Duration', desc: 'Strict countdown with automatic session submission' },
    { title: '40% - 30% - 30% Difficulty', desc: '4 Easy, 3 Moderate, 3 Hard questions per section' },
    { title: 'Real-Time Auto-Save', desc: 'Responses synced to browser storage every 30 seconds' }
  ];

  let colX = margin + 6;
  let colY = py;

  features.forEach((feat, idx) => {
    const boxW = (contentWidth - 18) / 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(colX, colY, boxW, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(`[+] ${feat.title}`, colX + 3, colY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(feat.desc, colX + 3, colY + 10.5);

    if (idx % 2 === 0) {
      colX += boxW + 6;
    } else {
      colX = margin + 6;
      colY += 18;
    }
  });

  y += 76;

  // Key Domain Structure Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(SLATE_BORDER[0], SLATE_BORDER[1], SLATE_BORDER[2]);
  doc.roundedRect(margin, y, contentWidth, 115, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('Core Assessment Domains & Question Distribution:', margin + 6, y + 9);

  const sections = [
    { name: '1. Numerical Reasoning & Applied Calculus', detail: 'Calculus, matrices, linear algebra, sequence convergence, probability distributions.' },
    { name: '2. Verbal & Logical Inference', detail: 'Data interpretation, logical deduction, syllogisms, mathematical statement validation.' },
    { name: '3. Algorithmic & Computational Thinking', detail: 'Graph theory, recurrences, time complexity, discrete structures, optimization algorithms.' },
    { name: '4. Working Memory & Reflective Response', detail: 'Pattern retention, multi-step problem solving, error detection, mental calculation speed.' },
    { name: '5. Abstract & Spatial Reasoning', detail: 'Geometric transformations, spatial rotations, topological properties, matrix patterns.' }
  ];

  let sy = y + 17;
  sections.forEach((sec) => {
    doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
    doc.setDrawColor(BLUE_BORDER[0], BLUE_BORDER[1], BLUE_BORDER[2]);
    doc.roundedRect(margin + 6, sy, contentWidth - 12, 17, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(sec.name, margin + 9, sy + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(sec.detail, margin + 9, sy + 12);

    sy += 20;
  });

  // Footer page 1
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Coimbatore Institute of Technology | Discussion PDF - Page 1 of 3', pageWidth / 2, pageHeight - 8, { align: 'center' });


  // ==========================================
  // PAGE 2: STUDENT LOGIN PAGE & ONBOARDING PORTAL
  // ==========================================
  doc.addPage();

  // Top Banner Page 2
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 10);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208);
  doc.text('Student Authentication & Assessment Onboarding Design Specification', margin, 17);

  y = 30;

  // Title Box Page 2
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(4, 120, 87);
  doc.text('2. STUDENT LOGIN & CANDIDATE REGISTRATION PORTAL', margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('Form layout, validation rules, input fields, and pre-examination instructions modal.', margin + 5, y + 14);

  y += 25;

  // Mockup Box: Student Login Form
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(SLATE_BORDER[0], SLATE_BORDER[1], SLATE_BORDER[2]);
  doc.roundedRect(margin, y, contentWidth, 115, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('Student Onboarding Form Layout (UI Wireframe Representation):', margin + 6, y + 10);

  let fy = y + 18;

  // Field 1
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('STUDENT FULL NAME *', margin + 9, fy + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Input Example: "Vaidehi S" [Required Text Field]', margin + 9, fy + 11);

  fy += 20;

  // Field 2
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('REGISTER NUMBER / ROLL NO *', margin + 9, fy + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Input Example: "22MSR045" [Auto-Capitalized on Input]', margin + 9, fy + 11);

  fy += 20;

  // Field 3
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('ACADEMIC DEPARTMENT *', margin + 9, fy + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Dropdown Select: [MSc Data Science | MSc Software Systems | MSc Decision & Computing Sciences]', margin + 9, fy + 11);

  fy += 20;

  // Field 4
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('STUDENT ACCESS PASSCODE *', margin + 9, fy + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Default Access Key: "CIT-2026" [Validation Guard]', margin + 9, fy + 11);

  fy += 20;

  // Submit Button Mock
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('START CANDIDATE ASSESSMENT (60 MINS)', pageWidth / 2, fy + 8, { align: 'center' });

  y += 122;

  // Candidate Instructions Card
  doc.setFillColor(BLUE_BG[0], BLUE_BG[1], BLUE_BG[2]);
  doc.setDrawColor(BLUE_BORDER[0], BLUE_BORDER[1], BLUE_BORDER[2]);
  doc.roundedRect(margin, y, contentWidth, 110, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text('Candidate Test Guidelines & Pre-Examination Rules:', margin + 6, y + 9);

  const studentRules = [
    '1. Test Format & Structure: Exactly 50 multiple-choice questions divided into 5 equal sections.',
    '2. Timer & Countdown: 60 minutes countdown begins immediately upon clicking start button.',
    '3. Synchronized Launch: Includes a 10-second candidate readiness countdown overlay before initial Q1 load.',
    '4. Section Navigation: Free toggle between all 5 sections at any point during test duration.',
    '5. Question Status Flagging: Questions can be flagged for review and tracked in the status palette.',
    '6. Auto-Save Security: Candidate response state saved every 30 seconds to prevent data loss.',
    '7. Time Extension Request: Candidates may request a +5 minute extension subject to admin rule settings.',
    '8. Immediate Analytics: Upon submission, candidate receives detailed cognitive radar & section metrics.'
  ];

  let ry = y + 17;
  studentRules.forEach((rule) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(rule, margin + 6, ry);
    ry += 11;
  });

  // Footer page 2
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Coimbatore Institute of Technology | Discussion PDF - Page 2 of 3', pageWidth / 2, pageHeight - 8, { align: 'center' });


  // ==========================================
  // PAGE 3: FACULTY LOGIN PAGE & ADMIN PORTAL OVERVIEW
  // ==========================================
  doc.addPage();

  // Top Banner Page 3
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 10);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(199, 210, 254);
  doc.text('Faculty Administrator Authentication & Management Portal Design', margin, 17);

  y = 30;

  // Title Box Page 3
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202);
  doc.text('3. FACULTY LOGIN & MASTER ADMIN PORTAL', margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('Faculty authentication layout, PIN security guards, question management & evaluation control.', margin + 5, y + 14);

  y += 25;

  // Mockup Box: Faculty Login Form
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(SLATE_BORDER[0], SLATE_BORDER[1], SLATE_BORDER[2]);
  doc.roundedRect(margin, y, contentWidth, 75, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('Faculty Authentication Form Layout (UI Wireframe Representation):', margin + 6, y + 10);

  fy = y + 18;

  // Faculty Field 1
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('FACULTY INSTITUTIONAL EMAIL *', margin + 9, fy + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Input Example: "faculty@cit.edu.in" [Institutional Domain Filter]', margin + 9, fy + 11);

  fy += 20;

  // Faculty Field 2
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('MASTER ADMIN SECURITY PIN *', margin + 9, fy + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Default Security PIN: "CITADMIN2026" [High Security Access Gate]', margin + 9, fy + 11);

  fy += 20;

  // Submit Button Mock
  doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
  doc.roundedRect(margin + 6, fy, contentWidth - 12, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('AUTHENTICATE & ENTER FACULTY PORTAL', pageWidth / 2, fy + 8, { align: 'center' });

  y += 82;

  // Faculty Admin Capabilities Card
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(SLATE_BORDER[0], SLATE_BORDER[1], SLATE_BORDER[2]);
  doc.roundedRect(margin, y, contentWidth, 140, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('Faculty Administrator Features & Controls Summary:', margin + 6, y + 10);

  const facultyFeatures = [
    { title: '1. Question Bank Management', desc: 'Create, edit, delete, and categorize questions across all 5 cognitive domains with difficulty tags.' },
    { title: '2. Live Assessment Configurator', desc: 'Adjust time limits (default 60 mins), section weights, difficulty ratios, and pass thresholds.' },
    { title: '3. Master Assessment Report Generator', desc: 'Generate datewise, departmentwise, and candidatewise summary analytics and CSV/Excel exports.' },
    { title: '4. Candidate Performance Analytics', desc: 'View colorful domain distribution charts, accuracy rates, average response time, and cognitive levels.' },
    { title: '5. AI Cognitive Synthesis Engine', desc: 'Generates automated Gemini AI qualitative candidate evaluations and research archetype recommendations.' },
    { title: '6. Institutional Security & Controls', desc: 'Access tier controls, password resets, activity logs, and secure data backup/restore utilities.' }
  ];

  let fty = y + 18;
  facultyFeatures.forEach((feat) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(BLUE_BORDER[0], BLUE_BORDER[1], BLUE_BORDER[2]);
    doc.roundedRect(margin + 6, fty, contentWidth - 12, 17, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(INDIGO[0], INDIGO[1], INDIGO[2]);
    doc.text(feat.title, margin + 9, fty + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(feat.desc, margin + 9, fty + 12);

    fty += 20;
  });

  // Footer page 3
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Coimbatore Institute of Technology | Discussion PDF - Page 3 of 3', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Save PDF to public folder & root folder
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicPdfPath = path.join(publicDir, 'CIT_Portal_Discussion_Document.pdf');
  const rootPdfPath = path.join(process.cwd(), 'CIT_Portal_Discussion_Document.pdf');

  const pdfArrayBuffer = doc.output('arraybuffer');
  const buffer = Buffer.from(pdfArrayBuffer);

  fs.writeFileSync(publicPdfPath, buffer);
  fs.writeFileSync(rootPdfPath, buffer);

  console.log('Successfully generated discussion PDF:');
  console.log(' - ' + publicPdfPath);
  console.log(' - ' + rootPdfPath);
}

buildDiscussionPDF();
