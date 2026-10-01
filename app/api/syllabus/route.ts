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
  const pattern = new RegExp(
    `<span[^>]*class="[^"]*slds-form-element__label[^"]*"[^>]*>\\s*${escapeRegExp(label)}\\s*</span>[\\s\\S]{0,900}?<div[^>]*class="[^"]*slds-form-element__static[^"]*"[^>]*>([\\s\\S]*?)</div>`,
    "i",
  );
  return textOnly(html.match(pattern)?.[1] || "");
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
  const writtenExam = allRows.find((row) => /^定期試験[（(]筆記[）)]/.test(row[0] || ""));
  const writtenExamPercent = writtenExam ? Number.parseFloat((writtenExam[1] || "").replace(/[^0-9.]/g, "")) : 0;
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
