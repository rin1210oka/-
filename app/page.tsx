"use client";

import { FormEvent, SetStateAction, useEffect, useMemo, useRef, useState } from "react";

type Course = {
  id: number;
  day: number;
  period: number;
  name: string;
  room: string;
  teacher: string;
  color: string;
  courseCode?: string;
  syllabusUrl?: string;
};

type Semester = {
  id: string;
  year: number;
  term: "春セメスター" | "秋セメスター";
  courses: Course[];
};

const DAYS = ["月", "火", "水", "木", "金"];
const PERIODS = [
  ["1", "09:00", "10:35"],
  ["2", "10:45", "12:20"],
  ["3", "13:10", "14:45"],
  ["4", "14:55", "16:30"],
  ["5", "16:40", "18:15"],
  ["6", "18:25", "20:00"],
  ["7", "20:10", "21:45"],
];
const COLORS = ["light-gray", "blue", "sky", "indigo", "violet", "lavender", "pink", "red", "orange", "peach", "yellow", "lime", "mint", "teal", "brown", "slate"];
const COLOR_LABELS: Record<string, string> = {
  "light-gray": "ライトグレー", blue: "ブルー", sky: "スカイ", indigo: "インディゴ",
  violet: "バイオレット", lavender: "ラベンダー", pink: "ピンク", red: "レッド",
  orange: "オレンジ", peach: "ピーチ", yellow: "イエロー", lime: "ライム",
  mint: "ミント", teal: "ティール", brown: "ブラウン", slate: "スレート",
};

const INITIAL: Course[] = [];

const INITIAL_SEMESTERS: Semester[] = [
  { id: "2026-spring", year: 2026, term: "春セメスター", courses: INITIAL },
  { id: "2026-fall", year: 2026, term: "秋セメスター", courses: [] },
];

export default function Home() {
  const hydrated = useRef(false);
  const [semesters, setSemesters] = useState<Semester[]>(INITIAL_SEMESTERS);
  const [currentSemesterId, setCurrentSemesterId] = useState("2026-spring");
  const [selectedDay, setSelectedDay] = useState(0);
  const [modal, setModal] = useState(false);
  const [semesterModal, setSemesterModal] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [notice, setNotice] = useState("");
  const [syllabusLoading, setSyllabusLoading] = useState(false);

  useEffect(() => {
    const savedSemesters = localStorage.getItem("campus-flow-semesters");
    const savedCurrent = localStorage.getItem("campus-flow-current-semester");
    if (savedSemesters) {
      const parsed = JSON.parse(savedSemesters) as Semester[];
      // Earlier versions shipped ten sample classes with IDs 1–10. Remove only
      // those built-in records while preserving anything the user added.
      setSemesters(parsed.map((semester) => ({
        ...semester,
        courses: semester.courses.filter((course) => course.id > 10),
      })));
      if (savedCurrent) setCurrentSemesterId(savedCurrent);
    } else {
      const oldCourses = localStorage.getItem("campus-flow-courses");
      if (oldCourses) setSemesters(INITIAL_SEMESTERS.map((semester) => semester.id === "2026-spring" ? { ...semester, courses: JSON.parse(oldCourses) } : semester));
    }
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem("campus-flow-semesters", JSON.stringify(semesters));
    localStorage.setItem("campus-flow-current-semester", currentSemesterId);
  }, [semesters, currentSemesterId]);

  const currentSemester = semesters.find((semester) => semester.id === currentSemesterId) || semesters[0];
  const courses = currentSemester?.courses || [];

  function setCourses(action: SetStateAction<Course[]>) {
    setSemesters((old) => old.map((semester) => {
      if (semester.id !== currentSemesterId) return semester;
      const nextCourses = typeof action === "function" ? action(semester.courses) : action;
      return { ...semester, courses: nextCourses };
    }));
  }

  const todayCourses = useMemo(
    () => courses.filter((c) => c.day === selectedDay).sort((a, b) => a.period - b.period),
    [courses, selectedDay]
  );
  const next = todayCourses[1] || todayCourses[0];

  function openCourse(course?: Course, day = selectedDay, period = 1) {
    setEditing(course || { id: 0, day, period, name: "", room: "", teacher: "", color: "light-gray", courseCode: "", syllabusUrl: "" });
    setModal(true);
  }

  function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    const course: Course = {
      ...editing,
      id: editing.id || Date.now(),
      name: String(data.get("name")),
      room: String(data.get("room")),
      teacher: String(data.get("teacher")),
      courseCode: String(data.get("courseCode") || "").trim(),
      syllabusUrl: String(data.get("syllabusUrl") || "").trim(),
      day: Number(data.get("day")),
      period: Number(data.get("period")),
      color: String(data.get("color")),
    };
    setCourses((old) => editing.id ? old.map((c) => c.id === editing.id ? course : c) : [...old, course]);
    setModal(false);
    setNotice(editing.id ? "授業を更新しました" : "授業を追加しました");
    setTimeout(() => setNotice(""), 2200);
  }

  function removeCourse() {
    if (!editing?.id) return;
    setCourses((old) => old.filter((c) => c.id !== editing.id));
    setModal(false);
    setNotice("授業を削除しました");
    setTimeout(() => setNotice(""), 2200);
  }

  function clearCurrentSemester() {
    if (!currentSemester || courses.length === 0) return;
    const confirmed = window.confirm(
      `${currentSemester.year}年度 ${currentSemester.term}の授業${courses.length}件をすべて削除します。\nこの操作は取り消せません。`,
    );
    if (!confirmed) return;
    setCourses([]);
    setNotice(`${currentSemester.year}年度 ${currentSemester.term}の授業をすべて削除しました`);
    setTimeout(() => setNotice(""), 3200);
  }

  async function searchSyllabus(form: HTMLFormElement) {
    const data = new FormData(form);
    const code = String(data.get("courseCode") || "").trim();
    if (!code) {
      setNotice("先に授業コードを入力してください");
      setTimeout(() => setNotice(""), 2200);
      return;
    }
    const officialSearch = "https://syllabus.ritsumei.ac.jp/syllabus/s/?language=ja";
    setSyllabusLoading(true);
    setNotice(`授業コード「${code}」のシラバスを読み取っています…`);
    try {
      const response = await fetch(`/api/syllabus?code=${encodeURIComponent(code)}&year=${currentSemester.year}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.found && result.url) {
        const urlInput = form.elements.namedItem("syllabusUrl") as HTMLInputElement | null;
        if (urlInput) urlInput.value = result.url;
        const details = result.details as Partial<Course> | null;
        if (details) {
          const fields: Array<keyof Pick<Course, "name" | "room" | "teacher" | "courseCode">> = ["name", "room", "teacher", "courseCode"];
          for (const field of fields) {
            const input = form.elements.namedItem(field) as HTMLInputElement | null;
            const value = details[field];
            if (input && typeof value === "string" && value) input.value = value;
          }
          const day = form.elements.namedItem("day") as HTMLSelectElement | null;
          const period = form.elements.namedItem("period") as HTMLSelectElement | null;
          if (day && typeof details.day === "number" && details.day <= 4) day.value = String(details.day);
          if (period && typeof details.period === "number") period.value = String(details.period);
        }
        setEditing((old) => old ? { ...old, ...details, syllabusUrl: result.url } : old);
        setNotice(details ? "シラバスから授業情報を自動入力しました" : "シラバスを登録しました。残りの項目は手入力してください");
      } else {
        window.open(officialSearch, "_blank", "noopener,noreferrer");
        setNotice("詳細ページを特定できなかったため、公式検索画面を開きました");
      }
    } catch {
      window.open(officialSearch, "_blank", "noopener,noreferrer");
      setNotice("シラバスを読み取れなかったため、公式検索画面を開きました");
    } finally {
      setSyllabusLoading(false);
      setTimeout(() => setNotice(""), 4200);
    }
  }

  function saveSemester(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const year = Number(data.get("year"));
    const term = String(data.get("term")) as Semester["term"];
    const id = `${year}-${term === "春セメスター" ? "spring" : "fall"}`;
    const existing = semesters.find((semester) => semester.id === id);
    if (!existing) setSemesters((old) => [...old, { id, year, term, courses: [] }].sort((a, b) => b.year - a.year || a.term.localeCompare(b.term, "ja")));
    setCurrentSemesterId(id);
    setSemesterModal(false);
    setNotice(existing ? `${year}年度 ${term}に切り替えました` : `${year}年度 ${term}を追加しました`);
    setTimeout(() => setNotice(""), 2200);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Campus Flow ホーム"><span className="brand-mark">CF</span><span>Campus <b>Flow</b></span></a>
        <div className="term"><span className="term-dot" />{currentSemester?.year} {currentSemester?.term}</div>
        <button className="avatar" aria-label="プロフィール">RN</button>
      </header>

      <div className="content" id="top">
        <section className="welcome">
          <div><p className="eyebrow">MONDAY · APR 15</p><h1>おはよう、<br /><span>今日もいい一日に。</span></h1></div>
          <div className="day-count"><b>{todayCourses.length}</b><span>今日の授業</span></div>
        </section>

        <section className="next-card" aria-label="次の授業">
          <div className="next-copy">
            <div className="next-label"><span>●</span> NEXT CLASS</div>
            <p className="next-time">{next ? `${PERIODS[next.period - 1][1]} – ${PERIODS[next.period - 1][2]}` : "今日は授業なし"}</p>
            <h2>{next?.name || "自由な一日"}</h2>
            {next && <p className="next-meta">⌖ {next.room}<span>·</span>{next.teacher}</p>}
          </div>
          <button className="arrow-button" onClick={() => next && openCourse(next)} aria-label="次の授業を編集">↗</button>
          <div className="lime-orbit" />
        </section>

        <section className="schedule-section" id="schedule">
          <div className="semester-switcher">
            <label className="semester-select-wrap"><span>表示するセメスター</span><select value={currentSemesterId} onChange={(event) => setCurrentSemesterId(event.target.value)} aria-label="表示するセメスター">
              {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.year}年度 {semester.term}（{semester.courses.length}科目）</option>)}
            </select></label>
            <button className="add-semester" onClick={() => setSemesterModal(true)}>＋ 新しいセメスター</button>
          </div>
          <div className="section-head">
            <div><p className="eyebrow">MY SCHEDULE</p><h2>{currentSemester?.year}年度 {currentSemester?.term}の時間割</h2></div>
            <div className="section-actions">
              <button className="view-button semester-clear" onClick={clearCurrentSemester} disabled={courses.length === 0}>この学期を一括削除</button>
              <button className="view-button semester-add" onClick={() => setSemesterModal(true)}>セメスター追加 <span>＋</span></button>
            </div>
          </div>

          <div className="mobile-days" role="tablist" aria-label="曜日">
            {DAYS.map((day, i) => <button key={day} role="tab" aria-selected={selectedDay === i} onClick={() => setSelectedDay(i)}><span>{day}</span><small>{15 + i}</small></button>)}
          </div>

          <div className="timetable desktop-table">
            <div className="corner">時限</div>
            {DAYS.map((d, i) => <button className={selectedDay === i ? "day-heading active" : "day-heading"} key={d} onClick={() => setSelectedDay(i)}><b>{d}</b><small>{15 + i}</small></button>)}
            {PERIODS.map(([p, start, end]) => <div className="table-row" key={p}>
              <div className="period"><b>{p}</b><small>{start}</small><small>– {end}</small></div>
              {DAYS.map((_, day) => {
                const course = courses.find((c) => c.day === day && c.period === Number(p));
                return course ? <button key={day} className={`course ${course.color}`} onClick={() => openCourse(course)}><b>{course.name}</b><span>{course.courseCode || course.room}</span>{course.syllabusUrl && <em>↗ シラバス</em>}</button> : <button key={day} className="empty-course" onClick={() => openCourse(undefined, day, Number(p))} aria-label={`${DAYS[day]}曜${p}限に授業を追加`}>＋</button>;
              })}
            </div>)}
          </div>

          <div className="mobile-list">
            {PERIODS.map(([p, start, end]) => {
              const course = courses.find((c) => c.day === selectedDay && c.period === Number(p));
              return <div className="mobile-period" key={p}><div className="period"><b>{p}</b><small>{start}</small><small>– {end}</small></div>{course ? <button className={`mobile-course ${course.color}`} onClick={() => openCourse(course)}><span className="color-bar" /><span><b>{course.name}</b><small>{course.courseCode ? `${course.courseCode} · ` : ""}{course.room} · {course.teacher}</small>{course.syllabusUrl && <em>↗ シラバス登録済み</em>}</span><i>›</i></button> : <button className="mobile-empty" onClick={() => openCourse(undefined, selectedDay, Number(p))}>＋ 授業を追加</button>}</div>;
            })}
          </div>
        </section>
      </div>

      <button className="fab" onClick={() => openCourse()} aria-label="授業を追加"><span>＋</span><b>授業を追加</b></button>
      <nav className="bottom-nav" aria-label="メインナビゲーション"><a className="active" href="#top"><span>⌂</span>ホーム</a><a href="#schedule"><span>▦</span>時間割</a><button onClick={() => openCourse()}><span>＋</span></button><a href="#schedule"><span>✓</span>課題</a><a href="#top"><span>☰</span>その他</a></nav>

      {modal && editing && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">COURSE DETAILS</p><h2 id="modal-title">{editing.id ? "授業を編集" : "新しい授業"}</h2></div><button onClick={() => setModal(false)} aria-label="閉じる">×</button></div>
        <form onSubmit={saveCourse}>
          <label>授業名<input name="name" defaultValue={editing.name} placeholder="例：データ構造" required /></label>
          <div className="form-grid"><label>曜日<select name="day" defaultValue={editing.day}>{DAYS.map((d, i) => <option key={d} value={i}>{d}曜日</option>)}</select></label><label>時限<select name="period" defaultValue={editing.period}>{PERIODS.map(([p, start, end]) => <option key={p} value={p}>{p}限 · {start}–{end}</option>)}</select></label></div>
          <div className="form-grid"><label>授業施設<input name="room" defaultValue={editing.room} placeholder="例：OIC" /></label><label>担当教員<input name="teacher" defaultValue={editing.teacher} placeholder="例：加藤 正輝" /></label></div>
          <label>授業コード<input name="courseCode" defaultValue={editing.courseCode} placeholder="例：ABC12345" /></label>
          <div className="syllabus-field">
            <span>シラバスURL</span>
            <div className="syllabus-tools"><input type="url" name="syllabusUrl" defaultValue={editing.syllabusUrl} placeholder="https://…" /><button type="button" disabled={syllabusLoading} onClick={(event) => searchSyllabus(event.currentTarget.form!)}>{syllabusLoading ? "読み取り中…" : "シラバスから自動入力"}</button></div>
            <small>授業コードから公式シラバスを読み取り、授業名・曜日・時限・施設・担当教員を自動入力します。</small>
            <a href="https://syllabus.ritsumei.ac.jp/syllabus/s/" target="_blank" rel="noopener noreferrer">公式の検索画面を開く ↗</a>
            {editing.syllabusUrl && <a href={editing.syllabusUrl} target="_blank" rel="noopener noreferrer">登録済みのシラバスを開く ↗</a>}
          </div>
          <fieldset><legend>カラー</legend><div className="color-options">{COLORS.map((color) => <label key={color} className={color} title={COLOR_LABELS[color]}><input type="radio" name="color" value={color} defaultChecked={editing.color === color} aria-label={COLOR_LABELS[color]} /><span /></label>)}</div></fieldset>
          <div className="form-actions">{editing.id ? <button type="button" className="delete" onClick={removeCourse}>削除</button> : <span />}<button className="save" type="submit">{editing.id ? "変更を保存" : "授業を追加"}</button></div>
        </form>
      </section></div>}
      {semesterModal && <div className="modal-backdrop" onMouseDown={() => setSemesterModal(false)}><section className="modal semester-modal" role="dialog" aria-modal="true" aria-labelledby="semester-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">NEW SEMESTER</p><h2 id="semester-title">セメスターを追加</h2></div><button onClick={() => setSemesterModal(false)} aria-label="閉じる">×</button></div>
        <form onSubmit={saveSemester}>
          <label>年度<input name="year" type="number" min="2020" max="2100" defaultValue="2026" required /></label>
          <label>セメスター<select name="term" defaultValue="春セメスター"><option>春セメスター</option><option>秋セメスター</option></select></label>
          <p className="semester-note">追加した時間割は端末に保存され、いつでも切り替えて見返せます。</p>
          <div className="form-actions semester-actions"><span /><button className="save" type="submit">追加して切り替える</button></div>
        </form>
      </section></div>}
      {notice && <div className="toast" role="status">✓ {notice}</div>}
    </main>
  );
}
