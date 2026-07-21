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
const COLORS = ["blue", "lime", "violet", "orange", "pink"];

const INITIAL: Course[] = [
  { id: 1, day: 0, period: 1, name: "英語コミュニケーション", room: "3号館 301", teacher: "田中先生", color: "violet" },
  { id: 2, day: 0, period: 2, name: "データ構造", room: "情報棟 202", teacher: "佐藤先生", color: "blue" },
  { id: 3, day: 0, period: 4, name: "経済学入門", room: "1号館 105", teacher: "鈴木先生", color: "lime" },
  { id: 4, day: 1, period: 1, name: "線形代数", room: "2号館 204", teacher: "高橋先生", color: "orange" },
  { id: 5, day: 1, period: 3, name: "プログラミング演習", room: "情報棟 401", teacher: "伊藤先生", color: "pink" },
  { id: 6, day: 2, period: 2, name: "統計学", room: "2号館 202", teacher: "山本先生", color: "lime" },
  { id: 7, day: 2, period: 4, name: "心理学", room: "1号館 201", teacher: "渡辺先生", color: "violet" },
  { id: 8, day: 3, period: 1, name: "キャリアデザイン", room: "講堂 B", teacher: "中村先生", color: "blue" },
  { id: 9, day: 3, period: 3, name: "情報倫理", room: "情報棟 303", teacher: "小林先生", color: "orange" },
  { id: 10, day: 4, period: 2, name: "ゼミナール", room: "研究棟 12", teacher: "加藤先生", color: "pink" },
];

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

  useEffect(() => {
    const savedSemesters = localStorage.getItem("campus-flow-semesters");
    const savedCurrent = localStorage.getItem("campus-flow-current-semester");
    if (savedSemesters) {
      setSemesters(JSON.parse(savedSemesters));
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
    setEditing(course || { id: 0, day, period, name: "", room: "", teacher: "", color: COLORS[courses.length % COLORS.length], courseCode: "", syllabusUrl: "" });
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

  function searchSyllabus(form: HTMLFormElement) {
    const data = new FormData(form);
    const code = String(data.get("courseCode") || "").trim();
    if (!code) {
      setNotice("先に授業コードを入力してください");
      setTimeout(() => setNotice(""), 2200);
      return;
    }
    const query = `site:syllabus.ritsumei.ac.jp/syllabus/s/r-syllabus "${code}"`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
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
          <div className="semester-switcher" role="tablist" aria-label="セメスター切り替え">
            <div className="semester-tabs">{semesters.map((semester) => <button key={semester.id} role="tab" aria-selected={semester.id === currentSemesterId} onClick={() => setCurrentSemesterId(semester.id)}><b>{semester.year}</b><span>{semester.term.replace("セメスター", "")}</span><small>{semester.courses.length}科目</small></button>)}</div>
            <button className="add-semester" onClick={() => setSemesterModal(true)}>＋ 新しいセメスター</button>
          </div>
          <div className="section-head">
            <div><p className="eyebrow">MY SCHEDULE</p><h2>{currentSemester?.year}年度 {currentSemester?.term}の時間割</h2></div>
            <button className="view-button" onClick={() => setSemesterModal(true)}>セメスター追加 <span>＋</span></button>
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
          <div className="form-grid"><label>教室<input name="room" defaultValue={editing.room} placeholder="情報棟 202" /></label><label>担当教員<input name="teacher" defaultValue={editing.teacher} placeholder="佐藤先生" /></label></div>
          <label>授業コード<input name="courseCode" defaultValue={editing.courseCode} placeholder="例：ABC12345" /></label>
          <div className="syllabus-field">
            <span>シラバスURL</span>
            <div className="syllabus-tools"><input type="url" name="syllabusUrl" defaultValue={editing.syllabusUrl} placeholder="https://…" /><button type="button" onClick={(event) => searchSyllabus(event.currentTarget.form!)}>公式シラバスを特定 ↗</button></div>
            <small>授業コードだけで、立命館大学公式サイトの個別シラバス候補を絞り込みます。</small>
            <a href="https://syllabus.ritsumei.ac.jp/syllabus/s/" target="_blank" rel="noopener noreferrer">公式の検索画面を開く ↗</a>
            {editing.syllabusUrl && <a href={editing.syllabusUrl} target="_blank" rel="noopener noreferrer">登録済みのシラバスを開く ↗</a>}
          </div>
          <fieldset><legend>カラー</legend><div className="color-options">{COLORS.map((color) => <label key={color} className={color}><input type="radio" name="color" value={color} defaultChecked={editing.color === color} /><span /></label>)}</div></fieldset>
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
