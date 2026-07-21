const SYLLABUS_ORIGIN = "https://syllabus.ritsumei.ac.jp";
const SITEMAP_NUMBERS = [44, 45, 46, 47, 48];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").trim();
  const year = (searchParams.get("year") || "2026").trim();

  if (!/^[0-9A-Za-z-]+$/.test(code) || !/^20\d{2}$/.test(year)) {
    return Response.json({ error: "授業コードまたは年度が正しくありません。" }, { status: 400 });
  }

  const recordName = `${year}${code}`;
  const exactCourseUrl = new RegExp(
    `<loc>(https://syllabus\\.ritsumei\\.ac\\.jp/syllabus/s/r-syllabus/[^<]+/${escapeRegExp(recordName)}\\?language=ja)</loc>`,
    "i",
  );

  try {
    const maps = await Promise.all(
      SITEMAP_NUMBERS.map(async (number) => {
        const response = await fetch(
          `${SYLLABUS_ORIGIN}/syllabus/s/sitemap-r_syllabus__c-${number}.xml`,
          { headers: { Accept: "application/xml" }, next: { revalidate: 3600 } },
        );
        return response.ok ? response.text() : "";
      }),
    );

    for (const xml of maps) {
      const match = xml.match(exactCourseUrl);
      if (match) return Response.json({ found: true, url: match[1], recordName });
    }

    return Response.json({ found: false, recordName });
  } catch {
    return Response.json({ error: "公式シラバスへ接続できませんでした。" }, { status: 502 });
  }
}
