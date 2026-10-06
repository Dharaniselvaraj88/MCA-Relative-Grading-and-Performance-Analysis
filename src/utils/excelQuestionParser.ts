import { Question, SectionId, Difficulty } from '../types';

/**
 * Unicode mapping dictionary for Superscript characters
 */
export const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
  'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ'
};

/**
 * Unicode mapping dictionary for Subscript characters
 */
export const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ',
  'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
};

/**
 * Converts a text string into its Unicode superscript representation
 */
export function toSuperscript(str: string): string {
  if (!str) return '';
  return Array.from(str).map((char) => SUPERSCRIPT_MAP[char] || char).join('');
}

/**
 * Converts a text string into its Unicode subscript representation
 */
export function toSubscript(str: string): string {
  if (!str) return '';
  return Array.from(str).map((char) => SUBSCRIPT_MAP[char] || char).join('');
}

/**
 * Parses and converts HTML tags (<sup>, <sub>, entities) into clean Unicode text preserving formatting
 */
export function convertHtmlSubSuperToUnicode(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let s = text;

  // 1. Decode HTML entities for superscripts and subscripts
  s = s.replace(/&sup1;/gi, '¹')
       .replace(/&sup2;/gi, '²')
       .replace(/&sup3;/gi, '³')
       .replace(/&#185;/g, '¹')
       .replace(/&#178;/g, '²')
       .replace(/&#179;/g, '³')
       .replace(/&#8304;/g, '⁰')
       .replace(/&#8308;/g, '⁴')
       .replace(/&#8309;/g, '⁵')
       .replace(/&#8310;/g, '⁶')
       .replace(/&#8311;/g, '⁷')
       .replace(/&#8312;/g, '⁸')
       .replace(/&#8313;/g, '⁹')
       .replace(/&#8314;/g, '⁺')
       .replace(/&#8315;/g, '⁻')
       .replace(/&#8316;/g, '⁼')
       .replace(/&#8317;/g, '⁽')
       .replace(/&#8318;/g, '⁾')
       .replace(/&#8319;/g, 'ⁿ')
       .replace(/&#8320;/g, '₀')
       .replace(/&#8321;/g, '₁')
       .replace(/&#8322;/g, '₂')
       .replace(/&#8323;/g, '₃')
       .replace(/&#8324;/g, '₄')
       .replace(/&#8325;/g, '₅')
       .replace(/&#8326;/g, '₆')
       .replace(/&#8327;/g, '₇')
       .replace(/&#8328;/g, '₈')
       .replace(/&#8329;/g, '₉')
       .replace(/&#8330;/g, '₊')
       .replace(/&#8331;/g, '₋')
       .replace(/&#8332;/g, '₌')
       .replace(/&#8333;/g, '₍')
       .replace(/&#8334;/g, '₎');

  // Math symbols entities
  s = s.replace(/&deg;/gi, '°')
       .replace(/&plusmn;/gi, '±')
       .replace(/&radic;|&sqrt;/gi, '√')
       .replace(/&infin;/gi, '∞')
       .replace(/&ne;/gi, '≠')
       .replace(/&le;/gi, '≤')
       .replace(/&ge;/gi, '≥')
       .replace(/&alpha;/gi, 'α')
       .replace(/&beta;/gi, 'β')
       .replace(/&gamma;/gi, 'γ')
       .replace(/&delta;/gi, 'δ')
       .replace(/&theta;/gi, 'θ')
       .replace(/&lambda;/gi, 'λ')
       .replace(/&mu;/gi, 'μ')
       .replace(/&pi;/gi, 'π')
       .replace(/&sigma;/gi, 'σ')
       .replace(/&sum;/gi, '∑')
       .replace(/&prod;/gi, '∏')
       .replace(/&int;/gi, '∫')
       .replace(/&times;/gi, '×')
       .replace(/&divide;/gi, '÷');

  // Standard XML/HTML entities
  s = s.replace(/&nbsp;/gi, ' ')
       .replace(/&amp;/gi, '&')
       .replace(/&lt;/gi, '<')
       .replace(/&gt;/gi, '>')
       .replace(/&quot;/gi, '"')
       .replace(/&#39;/g, "'");

  // 2. Process HTML <sup> and <sub> tags
  // Process nested or multiple <sup>...</sup>
  s = s.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    return toSuperscript(inner.replace(/<[^>]+>/g, ''));
  });

  // Process nested or multiple <sub>...</sub>
  s = s.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, (_, inner) => {
    return toSubscript(inner.replace(/<[^>]+>/g, ''));
  });

  // Process style="vertical-align: super" or style="vertical-align: sub"
  s = s.replace(/<span[^>]*style="[^"]*vertical-align\s*:\s*super[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, (_, inner) => {
    return toSuperscript(inner.replace(/<[^>]+>/g, ''));
  });
  s = s.replace(/<span[^>]*style="[^"]*vertical-align\s*:\s*sub[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, (_, inner) => {
    return toSubscript(inner.replace(/<[^>]+>/g, ''));
  });

  // 3. Strip remaining structural HTML tags like <p>, </p>, <br/>, <span>, </span>
  s = s.replace(/<br\s*\/?>/gi, '\n')
       .replace(/<[^>]+>/g, '');

  return s;
}

/**
 * Extracts cell formatted text from a SheetJS cell object, preserving rich text runs (cell.r),
 * HTML formatting (cell.h), superscripts, subscripts, and unicode formulas.
 */
export function extractFormattedCellText(cell: any): string {
  if (!cell) return '';

  // Case 1: SheetJS rich text runs array (cell.r)
  // When Excel cells have custom formatted characters (like selected subscript/superscript)
  if (Array.isArray(cell.r) && cell.r.length > 0) {
    let combined = '';
    for (const run of cell.r) {
      if (!run) continue;
      const runText = run.t !== undefined && run.t !== null ? String(run.t) : (typeof run === 'string' ? run : '');
      const vertAlign = run.rPr?.vertAlign || run.vertAlign || run.rPr?.['w:vertAlign'] || run.rPr?.val;

      if (vertAlign === 'superscript' || vertAlign === 'super') {
        combined += toSuperscript(runText);
      } else if (vertAlign === 'subscript' || vertAlign === 'sub') {
        combined += toSubscript(runText);
      } else {
        combined += convertHtmlSubSuperToUnicode(runText);
      }
    }
    if (combined.trim() !== '') {
      return combined;
    }
  }

  // Case 2: SheetJS cell HTML (cell.h) with <sup>, <sub>, entities, or span styles
  if (typeof cell.h === 'string' && (cell.h.includes('<sup') || cell.h.includes('<sub') || cell.h.includes('&sup') || cell.h.includes('vertical-align'))) {
    const parsedHtml = convertHtmlSubSuperToUnicode(cell.h);
    if (parsedHtml.trim() !== '') {
      return parsedHtml;
    }
  }

  // Case 3: Formatted string (cell.w) or raw value (cell.v)
  const rawStr = cell.w !== undefined && cell.w !== null
    ? String(cell.w)
    : (cell.v !== undefined && cell.v !== null ? String(cell.v) : '');

  return convertHtmlSubSuperToUnicode(rawStr);
}

function mapSectionTitleToId(sectionStr: string): SectionId {
  const s = String(sectionStr || '').toLowerCase().trim();
  // 1. Matrices & Determinants (mapped to 'statistics' section)
  if (s.includes('matri') || s.includes('determ') || s.includes('linear')) return 'statistics';
  // 2. Probability & Statistics (mapped to 'trigonometry' section)
  if ((s.includes('prob') && s.includes('stat')) || s.includes('trig') || s.includes('angle') || s.includes('sin') || s.includes('cos')) return 'trigonometry';
  // 3. Differentiation (mapped to 'probability' section)
  if (s.includes('different') || s.includes('diff') || s.includes('deriv') || s.includes('tangent') || s.includes('rate of change')) return 'probability';
  // 4. Integration (mapped to 'numberSystem' section)
  if (s.includes('integ') || s.includes('antideriv') || s.includes('area under')) return 'numberSystem';
  // 5. Limits & Continuity (mapped to 'calculus' section)
  if (s.includes('limit') || s.includes('continu') || s.includes('calc') || s.includes('asymptot')) return 'calculus';

  // Legacy fallbacks
  if (s.includes('stat') || s.includes('mean') || s.includes('data') || s.includes('sd') || s.includes('dev') || s.includes('regress')) return 'statistics';
  if (s.includes('prob') || s.includes('bayes') || s.includes('dice') || s.includes('coin') || s.includes('comb') || s.includes('perm')) return 'trigonometry';
  if (s.includes('num') || s.includes('real') || s.includes('surd') || s.includes('complex')) return 'numberSystem';

  // Default fallback
  return 'calculus';
}

function mapDifficulty(diffStr: any): Difficulty {
  const d = String(diffStr || '').toLowerCase().trim();
  if (d.includes('easy') || d === '1' || d.includes('low') || d.includes('basic') || d.includes('level 1') || d === 'l1') return 'easy';
  if (d.includes('hard') || d.includes('diff') || d === '3' || d.includes('high') || d.includes('adv') || d.includes('level 3') || d === 'l3') return 'hard';
  return 'medium'; // default to medium if 2 or unspecified
}

function parseCorrectAnswer(val: any, options: string[]): number {
  if (val === undefined || val === null) return 0;
  const s = String(val).trim().toUpperCase();
  if (s === 'A' || s === '0' || s === 'OPTION A' || s === 'OPTION 1' || s === '1' || s === 'CHOICE A' || s === 'CHOICE 1') return 0;
  if (s === 'B' || s === '1' || s === 'OPTION B' || s === 'OPTION 2' || s === '2' || s === 'CHOICE B' || s === 'CHOICE 2') return 1;
  if (s === 'C' || s === '2' || s === 'OPTION C' || s === 'OPTION 3' || s === '3' || s === 'CHOICE C' || s === 'CHOICE 3') return 2;
  if (s === 'D' || s === '3' || s === 'OPTION D' || s === 'OPTION 4' || s === '4' || s === 'CHOICE D' || s === 'CHOICE 4') return 3;

  // Check if val matches any option text directly
  const matchIdx = options.findIndex(opt => opt.trim().toLowerCase() === String(val).trim().toLowerCase());
  if (matchIdx !== -1) return matchIdx;

  return 0;
}

/**
 * Normalizes column keys for flexible matching
 */
function normalizeHeaderKey(key: string): string {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Main Question Bank Excel & CSV parser that maintains full fidelity of
 * subscripts (H₂O, a₁, log₂), superscripts (x², y³, tan⁻¹(x), e⁻ˣ), formulas, and options.
 */
export async function parseQuestionBankFromExcel(file: File): Promise<Question[]> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  
  // Read workbook with rich formatting and HTML preservation flags enabled
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellHTML: true,
    cellStyles: true,
    cellFormula: true,
    sheetStubs: true
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName || !workbook.Sheets[firstSheetName]) {
    throw new Error('The uploaded Excel workbook contains no valid sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const ref = worksheet['!ref'];

  if (!ref) {
    throw new Error('The uploaded worksheet contains no data rows or cell coordinates.');
  }

  const range = XLSX.utils.decode_range(ref);
  const totalRows = range.e.r - range.s.r + 1;
  const totalCols = range.e.c - range.s.c + 1;

  if (totalRows < 1 || totalCols < 1) {
    throw new Error('The uploaded file contains no data.');
  }

  // Extract cell grid with full formatted text (preserving rich text subscripts & superscripts)
  const grid: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowCells: string[] = [];
    let hasAnyContent = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellAddress];
      const val = extractFormattedCellText(cell);
      if (val.trim() !== '') {
        hasAnyContent = true;
      }
      rowCells.push(val);
    }
    // Only include rows that are not entirely blank
    if (hasAnyContent || grid.length > 0) {
      grid.push(rowCells);
    }
  }

  if (grid.length === 0) {
    throw new Error('The uploaded file contains no readable data.');
  }

  // Identify Header Row: Look for row containing keywords like "Domain", "Question", "Option A", etc.
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const normalizedRow = grid[r].map(normalizeHeaderKey);
    const isHeaderCandidate = normalizedRow.some((h) =>
      h.includes('question') ||
      h.includes('prompt') ||
      h.includes('optiona') ||
      h.includes('domain') ||
      h.includes('section') ||
      h.includes('correct')
    );
    if (isHeaderCandidate) {
      headerRowIndex = r;
      break;
    }
  }

  const headers = grid[headerRowIndex].map((h) => h.trim());
  const normalizedHeaders = headers.map(normalizeHeaderKey);

  // Helper to find column index from possible names
  const findColIndex = (...candidates: string[]): number => {
    const normalizedCandidates = candidates.map(normalizeHeaderKey);
    for (const cand of normalizedCandidates) {
      const idx = normalizedHeaders.findIndex((h) => h === cand || (h.includes(cand) && cand.length > 2));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const domainColIdx = findColIndex('domain', 'section', 'subject', 'topic', 'category', 'sectionid', 'module', 'cognitivedomain');
  const questionColIdx = findColIndex('questiontext', 'question', 'questionprompt', 'prompt', 'problem', 'statement', 'item', 'qtext', 'questions');
  const optAColIdx = findColIndex('optiona', 'opta', 'option1', 'opt1', 'choicea', 'choice1', 'answera', 'ansa', 'a');
  const optBColIdx = findColIndex('optionb', 'optb', 'option2', 'opt2', 'choiceb', 'choice2', 'answerb', 'ansb', 'b');
  const optCColIdx = findColIndex('optionc', 'optc', 'option3', 'opt3', 'choicec', 'choice3', 'answerc', 'ansc', 'c');
  const optDColIdx = findColIndex('optiond', 'optd', 'option4', 'opt4', 'choiced', 'choice4', 'answerd', 'ansd', 'd');
  const correctColIdx = findColIndex('correctanswer', 'correctoption', 'correctoptionkey', 'correct', 'answer', 'key', 'solutionkey', 'ans');
  const diffColIdx = findColIndex('difficulty', 'difficultylevel', 'level', 'tier', 'diff');
  const explColIdx = findColIndex('explanation', 'solution', 'rationale', 'detailedexplanation', 'details', 'reason', 'description');
  const snippetColIdx = findColIndex('codesnippet', 'formula', 'context', 'mathformula', 'equationsnippet');

  const parsedQuestions: Question[] = [];

  // Parse data rows starting after header
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.every((c) => !c || c.trim() === '')) continue;

    const getVal = (idx: number): string => (idx >= 0 && idx < row.length ? row[idx].trim() : '');

    let questionText = questionColIdx !== -1 ? getVal(questionColIdx) : '';
    let domainVal = domainColIdx !== -1 ? getVal(domainColIdx) : '';
    let optA = optAColIdx !== -1 ? getVal(optAColIdx) : '';
    let optB = optBColIdx !== -1 ? getVal(optBColIdx) : '';
    let optC = optCColIdx !== -1 ? getVal(optCColIdx) : '';
    let optD = optDColIdx !== -1 ? getVal(optDColIdx) : '';
    let correctVal = correctColIdx !== -1 ? getVal(correctColIdx) : '';
    let diffVal = diffColIdx !== -1 ? getVal(diffColIdx) : '';
    let explanation = explColIdx !== -1 ? getVal(explColIdx) : '';
    let codeSnippet = snippetColIdx !== -1 ? getVal(snippetColIdx) : '';

    // Fallback: If header mapping couldn't find question column, check sequential columns
    if (!questionText) {
      const nonEmpties = row.filter((c) => c && c.trim() !== '');
      if (nonEmpties.length >= 5) {
        // Assume format: [Domain, Question, Opt A, Opt B, Opt C, Opt D, Answer, ...]
        domainVal = domainVal || nonEmpties[0];
        questionText = nonEmpties[1];
        optA = optA || nonEmpties[2];
        optB = optB || nonEmpties[3];
        optC = optC || nonEmpties[4];
        optD = optD || (nonEmpties.length >= 6 ? nonEmpties[5] : 'Option D');
        correctVal = correctVal || (nonEmpties.length >= 7 ? nonEmpties[6] : 'A');
      } else if (nonEmpties.length > 0) {
        questionText = nonEmpties[0];
      }
    }

    if (!questionText || questionText.trim().length < 1) continue;

    // Default fallback options if missing
    const options: [string, string, string, string] = [
      optA || 'Option A',
      optB || 'Option B',
      optC || 'Option C',
      optD || 'Option D'
    ];

    const sectionId = mapSectionTitleToId(domainVal);
    const difficulty = mapDifficulty(diffVal);
    const correctAnswer = parseCorrectAnswer(correctVal, options);

    parsedQuestions.push({
      id: `custom-q-${parsedQuestions.length + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sectionId,
      difficulty,
      questionNumber: parsedQuestions.length + 1,
      questionText,
      question: questionText,
      options,
      correctAnswer,
      explanation: explanation || undefined,
      codeSnippet: codeSnippet || undefined
    });
  }

  if (parsedQuestions.length === 0) {
    throw new Error(
      'Could not parse any valid questions. Please ensure your Excel file contains column headers (Domain, Question Text, Option A, Option B, Option C, Option D, Correct Answer).'
    );
  }

  return parsedQuestions;
}

/**
 * Downloads a standardized, rich-text math question bank template with pre-configured
 * subscript (H₂O, a₁, log₂), superscript (x², y³, tan⁻¹(x), e⁻ˣ), and mathematical notations.
 */
export async function downloadSampleQuestionBankTemplate() {
  const XLSX = await import('xlsx');
  const sampleData = [
    {
      'Domain': 'Limits & Continuity',
      'Question Text': 'Evaluate the limit: lim (x → 0) [ sin(5x) / (3x) ] + lim (x → 0) [ (e²ˣ - 1) / x ].',
      'Option A': '5/3',
      'Option B': '11/3',
      'Option C': '2/3',
      'Option D': '8/3',
      'Correct Answer': 'B',
      'Difficulty': 'Level 1',
      'Explanation': 'lim(x→0)[sin(5x)/(3x)] = 5/3 and lim(x→0)[(e²ˣ-1)/x] = 2. Total = 5/3 + 2 = 11/3.',
      'Context / Math Formula': 'lim(u→0) [sin(u)/u] = 1, d/dx(e²ˣ)|_{x=0} = 2'
    },
    {
      'Domain': 'Differentiation',
      'Question Text': 'If f(x) = x³ - 6x² + 9x + 15, find the local maximum value of f(x).',
      'Option A': '15',
      'Option B': '19',
      'Option C': '11',
      'Option D': '23',
      'Correct Answer': 'B',
      'Difficulty': 'Level 2',
      'Explanation': 'f\'(x) = 3x² - 12x + 9 = 3(x-1)(x-3). f\'\'(x) = 6x - 12. At x = 1, f\'\'(1) = -6 < 0 (max). f(1) = 1 - 6 + 9 + 15 = 19.',
      'Context / Math Formula': 'f\'(x) = 0 => x ∈ {1, 3}, f\'\'(1) < 0'
    },
    {
      'Domain': 'Integration',
      'Question Text': 'Evaluate the definite integral: ∫₀¹ (2x + 3) dx.',
      'Option A': '3',
      'Option B': '4',
      'Option C': '5',
      'Option D': '6',
      'Correct Answer': 'B',
      'Difficulty': 'Level 1',
      'Explanation': '∫ (2x + 3) dx = [x² + 3x] from 0 to 1 = (1 + 3) - 0 = 4.',
      'Context / Math Formula': '∫ xⁿ dx = xⁿ⁺¹ / (n+1)'
    },
    {
      'Domain': 'Probability & Statistics',
      'Question Text': 'Two fair dice are rolled simultaneously. What is the probability that the sum of the numbers is greater than 8?',
      'Option A': '5/18',
      'Option B': '1/3',
      'Option C': '7/36',
      'Option D': '11/36',
      'Correct Answer': 'A',
      'Difficulty': 'Level 1',
      'Explanation': 'Sums > 8 are 9 (4 outcomes), 10 (3 outcomes), 11 (2 outcomes), 12 (1 outcome). Total favorable = 10. P = 10/36 = 5/18.',
      'Context / Math Formula': 'P(Sum > 8) = n(E) / n(S) = 10 / 36'
    },
    {
      'Domain': 'Matrices & Determinants',
      'Question Text': 'Find the determinant of the matrix [[2, 3], [1, 4]].',
      'Option A': '5',
      'Option B': '6',
      'Option C': '8',
      'Option D': '11',
      'Correct Answer': 'A',
      'Difficulty': 'Level 1',
      'Explanation': 'det(A) = (2)(4) - (3)(1) = 8 - 3 = 5.',
      'Context / Math Formula': 'det([[a,b],[c,d]]) = ad - bc'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 18 },  // Domain
    { wch: 70 },  // Question Text
    { wch: 22 },  // Option A
    { wch: 22 },  // Option B
    { wch: 22 },  // Option C
    { wch: 22 },  // Option D
    { wch: 16 },  // Correct Answer
    { wch: 16 },  // Difficulty
    { wch: 80 },  // Explanation
    { wch: 45 }   // Context / Math Formula
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QuestionBankTemplate');

  XLSX.writeFile(workbook, 'CIT_Numerical_Assessment_Question_Bank_Template.xlsx');
}
