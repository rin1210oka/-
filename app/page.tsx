"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

export default function Home() {
  const [courses, setCourses] = useState<Course[]>(INITIAL);
  const [selectedDay, setSelectedDay] = useState(0);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("campus-flow-courses");
    if (saved) setCourses(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("campus-flow-courses", JSON.stringify(courses));
  }, [courses]);

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
    const name = String(data.get("name") || "").trim();
    const query = ["site:syllabus.ritsumei.ac.jp", code, name].filter(Boolean).join(" ");
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Campus Flow ホーム"><span className="brand-mark">CF</span><span>Campus <b>Flow</b></span></a>
        <div className="term"><span className="term-dot" />2026 前期</div>
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
          <div className="section-head">
            <div><p className="eyebrow">MY SCHEDULE</p><h2>今週の時間割</h2></div>
            <button className="view-button" onClick={() => setNotice("曜日を選んで授業を確認できます")}>週表示 <span>⌄</span></button>
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
            <div className="syllabus-tools"><input type="url" name="syllabusUrl" defaultValue={editing.syllabusUrl} placeholder="https://…" /><button type="button" onClick={(event) => searchSyllabus(event.currentTarget.form!)}>コードから探す ↗</button></div>
            <small>立命館大学のシラバスを授業コード優先で検索します（情報理工学部・1回生向け）。</small>
            {editing.syllabusUrl && <a href={editing.syllabusUrl} target="_blank" rel="noopener noreferrer">登録済みのシラバスを開く ↗</a>}
          </div>
          <fieldset><legend>カラー</legend><div className="color-options">{COLORS.map((color) => <label key={color} className={color}><input type="radio" name="color" value={color} defaultChecked={editing.color === color} /><span /></label>)}</div></fieldset>
          <div className="form-actions">{editing.id ? <button type="button" className="delete" onClick={removeCourse}>削除</button> : <span />}<button className="save" type="submit">{editing.id ? "変更を保存" : "授業を追加"}</button></div>
        </form>
      </section></div>}
      {notice && <div className="toast" role="status">✓ {notice}</div>}
    </main>
  );
}
