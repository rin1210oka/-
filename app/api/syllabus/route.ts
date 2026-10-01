import syllabus2026 from "./syllabus-2026.json";

const SYLLABUS_ORIGIN = "https://syllabus.ritsumei.ac.jp";
const WEEKLY_SITEMAP = `${SYLLABUS_ORIGIN}/syllabus/s/sitemap-r_syllabus__c-weekly.xml`;

// Some valid courses are intentionally absent from Salesforce's public
// sitemap. Keep verified official URLs here so those courses still open
// directly while the sitemap remains the general lookup source.
const VERIFIED_COURSE_URLS: Record<string, string> = {
  "2026:53109": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003Rx6uQAC/202653109?language=ja",
  "2026:53118": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003RxHEQA0/202653118?language=ja",
  "2026:53265": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003Ry4HQAS/202653265?language=ja",
  "2026:53271": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003RyBhQAK/202653271?language=ja",
  "2026:53283": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003RyNJQA0/202653283?language=ja",
  "2026:53290": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003RyS9QAK/202653290?language=ja",
  "2026:53299": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003RwjbQAC/202653299?language=ja",
  "2026:53302": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003Rwo7QAC/202653302?language=ja",
  "2026:53318": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003Rx5yQAC/202653318?language=ja",
  "2026:53321": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003Rx8sQAC/202653321?language=ja",
  "2026:53323": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003RxAoQAK/202653323?language=ja",
  "2026:54501": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003Rxw6QAC/202654501?language=ja",
  "2026:54601": "https://syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus/a0ifD000003Ry2ZQAS/202654601?language=ja",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? "";
    const hex = entity[1]?.toLowerCase() === "x";
    const number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : "";
  });
}

function textOnly(value: string) {
  return decodeHtml(value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractLabelValue(html: string, label: string) {
  // Salesforce has used both span and div labels on this page. Match the
  // label by its visible text instead of relying on one exact tag shape.
  const labels = [...html.matchAll(/<(span|div)\b[^>]*class=["'][^"']*(?:slds-form-element__label|syllabus-field__label)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi)];
  for (const match of labels) {
    if (textOnly(match[2]) !== label) continue;
    const tail = html.slice((match.index || 0) + match[0].length, (match.index || 0) + match[0].length + 2400);
    const value = tail.match(/<div\b[^>]*class=["'][^"']*slds-form-element__static[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    // The page renders the same value twice (print and screen variants).
    // Prefer the print node so a room such as "H347セミナールーム" is not
    // returned as "H347セミナールーム H347セミナールーム".
    const printValue = value?.[1].match(/<span\b[^>]*class=["'][^"']*syllabus-field__print-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const parsed = textOnly(printValue?.[1] || value?.[1] || "");
    if (parsed) return parsed;
  }

  // Fallback for table/dl-like variants and future markup changes. Block
  // boundaries are retained so a neighboring field can never be mistaken
  // for the requested value.
  const visibleLines = decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|p|li|section|article|tr|td|th|dt|dd|span)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const lineIndex = visibleLines.findIndex((line) => line === label);
  return lineIndex >= 0 ? (visibleLines[lineIndex + 1] || "") : "";
}

function parseSyllabus(html: string, fallbackCode: string) {
  const firstTable = html.match(/<table\b[\s\S]*?<\/table>/i)?.[0] || "";
  const rows = [...firstTable.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => textOnly(cell[1])),
  );
  const values = rows.find((row) => row.length >= 6 && /^\d+[:：]/.test(row[0] || ""));
  if (!values) return null;
  const course = values[0].match(/^([^:：]+)[:：]\s*(.+)$/);
  const schedule = values[3]?.match(/([月火水木金土日])(?:曜)?\s*([1-7])/);
  const dayMap: Record<string, number> = { 月: 0, 火: 1, 水: 2, 木: 3, 金: 4, 土: 5, 日: 6 };
  const allRows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => textOnly(cell[1])),
  );
  const writtenExam = allRows.find((row) => /^定期試験\s*[（(]\s*筆記\s*[）)]/.test(row[0] || ""));
  // The percentage column contains a bare number (for example "80"), not
  // necessarily a percent sign. Requiring "%" made valid written exams look
  // absent, so accept the first numeric assessment cell only.
  const percentage = writtenExam?.slice(1).find((cell) => /^\s*\d+(?:\.\d+)?\s*%?\s*$/.test(cell));
  const writtenExamPercent = percentage ? Number.parseFloat(percentage.replace(/[^0-9.]/g, "")) : 0;
  return {
    courseCode: course?.[1]?.trim() || fallbackCode,
    name: course?.[2]?.trim() || "",
    teacher: values[5] || "",
    day: schedule ? dayMap[schedule[1]] : null,
    period: schedule ? Number(schedule[2]) : null,
    room: extractLabelValue(html, "授業施設"),
    campus: extractLabelValue(html, "キャンパス"),
    term: values[2] || "",
    writtenExamPercent: Number.isFinite(writtenExamPercent) ? writtenExamPercent : 0,
  };
}

async function readSyllabus(url: string, code: string) {
  const response = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": "Googlebot" },
    next: { revalidate: 86400 },
  });
  return response.ok ? parseSyllabus(await response.text(), code) : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").trim();
  const year = (searchParams.get("year") || "2026").trim();

  if (!/^[0-9A-Za-z-]+$/.test(code) || !/^20\d{2}$/.test(year)) {
    return Response.json({ error: "授業コードまたは年度が正しくありません。" }, { status: 400 });
  }

  const recordName = `${year}${code}`;
  const verifiedUrl = VERIFIED_COURSE_URLS[`${year}:${code}`];
  const indexedUrl = year === "2026" ? (syllabus2026 as Record<string, string>)[recordName] : undefined;
  const exactCourseUrl = new RegExp(
    `<loc>(https://syllabus\\.ritsumei\\.ac\\.jp/syllabus/s/r-syllabus/[^<]+/${escapeRegExp(recordName)}\\?language=ja)</loc>`,
    "i",
  );

  try {
    if (verifiedUrl) {
      return Response.json({ found: true, url: verifiedUrl, recordName, details: await readSyllabus(verifiedUrl, code) });
    }
    if (indexedUrl) {
      return Response.json({ found: true, url: indexedUrl, recordName, details: await readSyllabus(indexedUrl, code) });
    }
    const weeklyResponse = await fetch(WEEKLY_SITEMAP, {
      headers: { Accept: "application/xml" },
      next: { revalidate: 1800 },
    });
    const weeklyXml = weeklyResponse.ok ? await weeklyResponse.text() : "";
    const match = weeklyXml.match(exactCourseUrl);
    if (match) return Response.json({ found: true, url: match[1], recordName, details: await readSyllabus(match[1], code) });

    return Response.json({ found: false, recordName });
  } catch {
    return Response.json({ error: "公式シラバスへ接続できませんでした。" }, { status: 502 });
  }
}
