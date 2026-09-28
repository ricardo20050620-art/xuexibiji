import { getAll, getById, put, remove, replaceAll, STORES } from "./db.js";
import {
  CATEGORIES, CATEGORY_META, DEFAULT_FOLDERS, uid, today, dateKey, formatDate,
  escapeHtml, plainText, markdownToHtml, safeRichHtml, formatBytes, downloadBlob,
  codeLanguage, highlightCode, currentSetting, setSetting,
} from "./utils.js";

const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  code: '<path d="m8 17-5-5 5-5M16 7l5 5-5 5M14 4l-4 16"/>',
  folders: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9L16 21h-3l-.3-2.1a8 8 0 0 1-1.6-.9l-1.8.7-1.4-2.4 1.5-1.1a7 7 0 0 1 0-1.9l-1.5-1.1 1.4-2.4 1.8.7a8 8 0 0 1 1.6-.9L13 7h3l.2 2.1a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 2.2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  pin: '<path d="m16 3 5 5-4 1-4 4-1 5-3-3-6 6 5-6-3-3 5-1 4-4z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
  edit: '<path d="m16 4 4 4L8 20l-5 1 1-5z"/><path d="m14 6 4 4"/>',
};
const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.note}</svg>`;
const app = document.querySelector("#app");
const pageNode = document.querySelector("#page");
const sidebarNode = document.querySelector("#sidebar");
const topbarNode = document.querySelector("#topbar");
const modalRoot = document.querySelector("#modal-root");
const toastRoot = document.querySelector("#toast-root");
const uploadInput = document.querySelector("#upload-input");
const pageTitles = { home: "首页", checkins: "每日打卡", notes: "每日笔记", files: "代码文件", categories: "学习分类", timeline: "学习记录", favorites: "收藏与置顶", search: "全局搜索", settings: "设置", category: "学习分类" };
const navGroups = [
  [{ id: "home", label: "首页", icon: "home" }, { id: "checkins", label: "每日打卡", icon: "calendar" }, { id: "notes", label: "每日笔记", icon: "note", badge: "notes" }, { id: "files", label: "代码文件", icon: "code", badge: "files" }],
  [{ id: "categories", label: "学习分类", icon: "folders" }, { id: "timeline", label: "学习记录", icon: "history" }, { id: "favorites", label: "收藏 / 置顶", icon: "star" }],
];

const state = {
  notes: [], files: [], folders: [], checkins: [],
  route: "home", category: null, noteId: null, fileId: null, month: new Date(),
  selectedDay: today(), query: "", filterCategory: "", folderFilter: "", editorMode: "split", fileView: "list", fileSort: "updated",
  sidebarOpen: false, autoSaveTimer: null, editorDirty: false, savedSelection: null, pendingColorFormat: "",
  previewCode: new Map(),
};

function toast(message, kind = "success") {
  const element = document.createElement("div");
  element.className = `toast toast-${kind}`;
  element.innerHTML = `${icon(kind === "error" ? "close" : "check")}<span>${escapeHtml(message)}</span>`;
  toastRoot.append(element);
  setTimeout(() => element.remove(), 3100);
}

function dateTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  const now = new Date();
  if (dateKey(date) === dateKey(now)) return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getNote(id) { return state.notes.find((note) => note.id === id); }
function getFile(id) { return state.files.find((file) => file.id === id); }
function noteDate(note) { return note.date || (note.updatedAt || "").slice(0, 10); }
function notesForDay(day) { return state.notes.filter((note) => noteDate(note) === day); }
function filesForDay(day) { return state.files.filter((file) => (file.updatedAt || "").slice(0, 10) === day); }
function categoryPill(category) {
  if (!category) return '<span class="category-pill neutral">未分类</span>';
  const meta = CATEGORY_META[category] ?? { color: "neutral", icon: "•" };
  return `<span class="category-pill ${meta.color}"><span>${escapeHtml(meta.icon)}</span>${escapeHtml(category)}</span>`;
}
function emptyState(title, detail, action = "", actionLabel = "") {
  return `<div class="empty-state"><div class="empty-orbit">${icon("note")}</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p>${action ? `<button class="button button-primary" data-action="${action}">${icon("plus")}${escapeHtml(actionLabel)}</button>` : ""}</div>`;
}
function render() {
  document.documentElement.dataset.theme = resolveTheme(currentSetting("zhixu-theme", "system"));
  renderSidebar();
  renderTopbar();
  renderPage();
}
function resolveTheme(theme) {
  return theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
}
function renderSidebar() {
  const counts = { notes: state.notes.length, files: state.files.length };
  sidebarNode.className = `sidebar ${state.sidebarOpen ? "sidebar-open" : ""}`;
  sidebarNode.innerHTML = `
    <a href="#" class="brand" data-route="home"><span class="brand-mark">知</span><span class="brand-copy"><strong>知序</strong><small>个人学习知识库</small></span><span class="brand-status"></span></a>
    <div class="sidebar-scroll">
      <div class="nav-caption">工作空间</div>
      ${navGroups.map((group) => `<nav class="nav-group">${group.map((item) => `<button class="nav-item ${state.route === item.id ? "active" : ""}" data-route="${item.id}">${icon(item.icon)}<span>${item.label}</span>${item.badge ? `<span class="nav-count">${counts[item.badge]}</span>` : ""}</button>`).join("")}</nav>`).join("")}
      <div class="nav-caption category-caption">我的分类 <button data-action="new-note" title="快速新建笔记">${icon("plus")}</button></div>
      <nav class="nav-group">${CATEGORIES.map((category) => `<button class="nav-item nav-category ${state.route === "category" && state.category === category ? "active" : ""}" data-category="${escapeHtml(category)}"><span class="category-dot ${CATEGORY_META[category].color}"></span><span>${escapeHtml(category)}</span><span class="nav-count">${state.notes.filter((note) => note.category === category).length}</span></button>`).join("")}</nav>
      <div class="sidebar-tip"><span class="tip-spark">✳</span><div><strong>一点一滴，皆为积累</strong><p>每一次记录，都让知识更有迹可循。</p></div></div>
    </div>
    <div class="sidebar-footer"><button class="footer-control" data-route="settings">${icon("settings")}<span>设置与备份</span><kbd>⌘ ,</kbd></button><div class="profile-row"><span class="profile-avatar">知</span><span class="profile-info"><strong>我的知识库</strong><small>仅保存在此设备</small></span><span class="local-indicator" title="本地存储"></span></div></div>`;
}
function renderTopbar() {
  const title = state.route === "category" ? state.category : pageTitles[state.route] ?? "首页";
  topbarNode.innerHTML = `<button class="icon-button mobile-menu" data-action="toggle-sidebar" aria-label="打开菜单">${icon("menu")}</button><div class="breadcrumbs"><span>知序</span>${icon("chevron")}<strong>${escapeHtml(title)}</strong></div><div class="topbar-actions"><button class="search-trigger" data-action="search-focus">${icon("search")}<span>搜索笔记、代码...</span><kbd>⌘ K</kbd></button><button class="icon-button theme-toggle" data-action="cycle-theme" title="切换主题">${icon(resolveTheme(currentSetting("zhixu-theme", "system")) === "dark" ? "moon" : "sun")}</button><button class="avatar-small" title="设置" data-route="settings">知</button></div>`;
}
function renderPage() {
  const views = {
    home: renderHome, checkins: renderCheckins, notes: renderNotes, files: renderFiles,
    categories: renderCategories, category: renderCategory, timeline: renderTimeline,
    favorites: renderFavorites, search: renderSearch, settings: renderSettings,
  };
  pageNode.innerHTML = (views[state.route] ?? renderHome)();
  if (state.route === "notes" && state.noteId) enhanceCodeBlocks(document.querySelector("#note-preview"));
}
function enhanceCodeBlocks(container) {
  if (!container) return;
  state.previewCode.clear();
  container.querySelectorAll("pre").forEach((pre) => {
    if (pre.closest(".note-codeblock")) return;
    const code = pre.querySelector("code") || pre;
    const source = code.textContent || "";
    const language = code.className.match(/language-([\w+-]+)/)?.[1] || "text";
    const id = uid();
    state.previewCode.set(id, source);
    const wrapper = document.createElement("div");
    wrapper.className = "note-codeblock";
    const header = document.createElement("div");
    header.className = "note-codeblock-header";
    header.innerHTML = `<span><i></i>${escapeHtml(language.toUpperCase())}</span><button data-action="copy-note-code" data-id="${id}">▢ 复制</button>`;
    const row = document.createElement("div");
    row.className = "note-codeblock-row";
    const numbers = document.createElement("span");
    numbers.className = "note-codeblock-numbers";
    numbers.textContent = Array.from({ length: Math.max(1, source.split("\n").length) }, (_, index) => index + 1).join("\n");
    const codePanel = document.createElement("pre");
    codePanel.className = "note-codeblock-content";
    const highlighted = document.createElement("code");
    highlighted.innerHTML = highlightCode(source, language);
    codePanel.append(highlighted);
    row.append(numbers, codePanel);
    wrapper.append(header, row);
    pre.replaceWith(wrapper);
  });
}

function noteCard(note, compact = false) {
  const plain = plainText(note.content || "");
  const tags = (note.tags || []).slice(0, 3).map((tag) => `<span class="tag-chip"># ${escapeHtml(tag)}</span>`).join("");
  return `<article class="note-card ${compact ? "note-card-compact" : ""}" data-action="open-note" data-id="${note.id}">
    <div class="note-card-top">${categoryPill(note.category)}<span class="card-tools">${note.pinned ? `<span class="pin-mini">${icon("pin")}</span>` : ""}<button class="mini-icon ${note.favorite ? "is-favorite" : ""}" data-action="toggle-note-favorite" data-id="${note.id}" title="${note.favorite ? "取消收藏" : "收藏"}">${icon("star")}</button></span></div>
    <h3>${escapeHtml(note.title || "无标题笔记")}</h3><p class="note-excerpt">${escapeHtml(plain.slice(0, 120) || "记录此刻的新发现…")}</p>
    ${tags ? `<div class="tag-list">${tags}</div>` : ""}
    <div class="card-footer"><span>${formatDate(noteDate(note))}</span><span class="card-updated">${dateTime(note.updatedAt)}</span></div></article>`;
}
function fileRow(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "txt";
  return `<div class="file-row" data-action="open-file" data-id="${file.id}"><span class="file-type-icon file-${escapeHtml(extension)}">${escapeHtml(extension.slice(0, 3))}</span><span class="file-name-column"><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.folderName || "根目录")} · ${formatDate((file.updatedAt || "").slice(0, 10))}</small></span>${categoryPill(file.category)}<span class="file-size">${formatBytes(file.size || new Blob([file.content || ""]).size)}</span><button class="mini-icon ${file.favorite ? "is-favorite" : ""}" data-action="toggle-file-favorite" data-id="${file.id}" title="收藏">${icon("star")}</button><button class="mini-icon" data-action="rename-file" data-id="${file.id}" title="重命名 / 移动">${icon("edit")}</button><button class="mini-icon" data-action="download-file" data-id="${file.id}" title="下载">${icon("download")}</button></div>`;
}
function fileGridCard(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "txt";
  return `<article class="file-grid-card" data-action="open-file" data-id="${file.id}"><div class="file-grid-head"><span class="file-type-icon file-${escapeHtml(extension)}">${escapeHtml(extension.slice(0, 3))}</span><span class="file-grid-actions"><button class="mini-icon ${file.favorite ? "is-favorite" : ""}" data-action="toggle-file-favorite" data-id="${file.id}" title="收藏">${icon("star")}</button><button class="mini-icon" data-action="download-file" data-id="${file.id}" title="下载">${icon("download")}</button></span></div><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.folderName || "根目录")} · ${formatBytes(file.size || new Blob([file.content || ""]).size)}</small><div class="file-grid-footer">${categoryPill(file.category)}<span>${dateTime(file.updatedAt)}</span></div></article>`;
}
function renderHome() {
  const now = new Date();
  const key = today();
  const checkin = state.checkins.find((entry) => entry.id === key);
  const dayNotes = notesForDay(key);
  const dayFiles = filesForDay(key);
  const studied = new Set(state.checkins.map((entry) => entry.id));
  const categoriesToday = [...new Set([...dayNotes.map((note) => note.category), ...dayFiles.map((file) => file.category)].filter(Boolean))];
  const recentNotes = [...state.notes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 3);
  const recentFiles = [...state.files].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 4);
  const recentActivity = [...state.notes].sort((a, b) => noteDate(b).localeCompare(noteDate(a))).slice(0, 5);
  const weekday = now.toLocaleDateString("zh-CN", { weekday: "long" });
  return `<div class="page-inner dashboard">
    <section class="welcome-row"><div><div class="eyebrow"><span class="live-dot"></span>你的知识，一直在生长</div><h1>早上好，<span>继续保持好奇。</span></h1><p class="welcome-sub">${now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })} · ${weekday}</p></div><button class="button button-primary" data-action="new-note">${icon("plus")}记录新发现</button></section>
    <section class="dashboard-grid">
      <article class="checkin-hero panel"><div class="checkin-orb orb-one"></div><div class="checkin-orb orb-two"></div><div class="checkin-hero-content"><div class="hero-date-label">${icon("calendar")} TODAY'S JOURNAL</div><div class="checkin-hero-main"><div><h2>${checkin ? "今天的学习，已被好好记录。" : "今天，也为自己留一点时间。"}</h2><p>${escapeHtml(checkin?.note || (checkin ? "每一次学习，都是向前的一小步。" : "哪怕只是 10 分钟，也值得记下。"))}</p></div>${checkin ? `<div class="done-seal">${icon("check")}<span>已打卡</span></div>` : `<button class="button button-light" data-action="checkin">${icon("check")}今日打卡</button>`}</div><div class="hero-stats"><div><strong>${dayNotes.length.toString().padStart(2, "0")}</strong><span>今日笔记</span></div><i></i><div><strong>${dayFiles.length.toString().padStart(2, "0")}</strong><span>今日代码</span></div><i></i><div class="hero-categories">${categoriesToday.length ? categoriesToday.slice(0, 3).map(categoryPill).join("") : '<span class="hero-no-category">还没有新的分类</span>'}</div></div></div><div class="hero-decoration">知</div></article>
      <article class="panel streak-panel"><div class="section-heading"><div><span class="section-overline">KEEP SHOWING UP</span><h2>学习的节奏</h2></div><span class="streak-icon">✳</span></div><div class="streak-total"><strong>${calculateStreak(studied)}</strong><span>天<span>连续学习</span></span></div><div class="week-strip">${weekDates().map((entry) => `<div class="week-day ${studied.has(entry.date) ? "week-done" : ""} ${entry.date === key ? "week-today" : ""}"><span>${entry.label}</span><i>${studied.has(entry.date) ? icon("check") : entry.day}</i></div>`).join("")}</div><div class="month-foot"><span>${now.getMonth() + 1} 月已学习</span><strong>${[...studied].filter((day) => day.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)).length} <small>天</small></strong><button class="text-link" data-route="checkins">查看月历 ${icon("chevron")}</button></div></article>
    </section>
    <section class="quick-actions"><button class="quick-action quick-note" data-action="new-note"><span class="quick-icon">${icon("note")}</span><span><strong>新建笔记</strong><small>捕捉新学到的知识</small></span>${icon("chevron")}</button><button class="quick-action quick-code" data-action="new-file"><span class="quick-icon">${icon("code")}</span><span><strong>新建代码文件</strong><small>保存你的练习代码</small></span>${icon("chevron")}</button><button class="quick-action quick-folder" data-action="new-folder"><span class="quick-icon">${icon("folders")}</span><span><strong>整理学习资料</strong><small>新建一个分类文件夹</small></span>${icon("chevron")}</button></section>
    <section class="content-columns"><div class="content-main"><div class="section-heading section-heading-spaced"><div><span class="section-overline">YOUR RECENT THOUGHTS</span><h2>最近的笔记 <span class="heading-count">${state.notes.length}</span></h2></div><button class="text-link" data-route="notes">全部笔记 ${icon("chevron")}</button></div>${recentNotes.length ? `<div class="note-grid">${recentNotes.map((note) => noteCard(note)).join("")}</div>` : emptyState("还没有学习笔记", "记录今天学到的第一个知识吧。", "new-note", "新建笔记")}<div class="section-heading section-heading-spaced code-heading"><div><span class="section-overline">YOUR CODE SNIPPETS</span><h2>最近的代码 <span class="heading-count">${state.files.length}</span></h2></div><button class="text-link" data-route="files">代码文件夹 ${icon("chevron")}</button></div><div class="recent-code-list">${recentFiles.length ? recentFiles.map(fileRow).join("") : emptyState("代码文件还在等你", "把练习代码保存在自己的知识库里。", "new-file", "新建代码")}</div></div>
      <aside class="content-aside"><div class="section-heading section-heading-spaced"><div><span class="section-overline">LEARNING TRAIL</span><h2>学习足迹</h2></div><button class="mini-icon" data-route="timeline" title="查看时间线">${icon("history")}</button></div>${recentActivity.length ? `<div class="activity-timeline">${recentActivity.map((note) => `<button class="activity-entry" data-action="open-note" data-id="${note.id}"><span class="activity-dot ${CATEGORY_META[note.category]?.color || ""}"></span><span><small>${formatDate(noteDate(note))} · ${escapeHtml(note.category || "未分类")}</small><strong>${escapeHtml(note.title || "无标题笔记")}</strong></span></button>`).join("")}</div>` : emptyState("旅程刚刚开始", "写下第一条笔记，留下学习的足迹。")}<div class="category-overview"><div class="section-heading"><h3>学习分类</h3><button class="text-link" data-route="categories">查看全部</button></div>${CATEGORIES.map((category) => `<button class="category-overview-row" data-category="${escapeHtml(category)}"><span class="category-dot ${CATEGORY_META[category].color}"></span><span>${escapeHtml(category)}</span><span class="overview-line"></span><small>${state.notes.filter((note) => note.category === category).length} 条笔记</small></button>`).join("")}</div></aside></section></div>`;
}
function calculateStreak(studied) {
  let cursor = new Date();
  if (!studied.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (studied.has(dateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}
function weekDates() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  return ["一", "二", "三", "四", "五", "六", "日"].map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label, day: date.getDate(), date: dateKey(date) };
  });
}

function renderNotes() {
  if (state.noteId) return renderNoteEditor(state.noteId);
  const notes = filteredNotes();
  return `<div class="page-inner"><div class="page-heading"><div><span class="section-overline">A SPACE FOR YOUR THOUGHTS</span><h1>每日笔记</h1><p>记录那些值得留下的灵感与知识。</p></div><button class="button button-primary" data-action="new-note">${icon("plus")}新建笔记</button></div><div class="list-toolbar"><label class="inline-search">${icon("search")}<input id="note-search" placeholder="搜索笔记标题或内容..." value="${escapeHtml(state.query)}"></label><select id="category-filter" class="select-control"><option value="">全部分类</option>${CATEGORIES.map((category) => `<option ${state.filterCategory === category ? "selected" : ""}>${category}</option>`).join("")}</select><span class="result-count">共 ${notes.length} 篇</span></div>${notes.length ? `<div class="note-grid note-grid-library">${notes.map((note) => noteCard(note)).join("")}</div>` : emptyState(state.query ? "没有找到匹配的笔记" : "还没有学习笔记", "试试调整搜索关键词，或开始记录新的学习内容。", "new-note", "新建笔记")}</div>`;
}
function filteredNotes() {
  const query = state.query.trim().toLocaleLowerCase();
  return [...state.notes].filter((note) => (!state.filterCategory || note.category === state.filterCategory)
    && (!query || [note.title, plainText(note.content), ...(note.tags || []), note.category, note.date].join(" ").toLocaleLowerCase().includes(query)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
function renderNoteEditor(id) {
  const note = getNote(id);
  if (!note) { state.noteId = null; return renderNotes(); }
  const rich = note.format !== "markdown";
  return `<div class="page-inner note-editor-page"><div class="editor-breadcrumb"><button class="text-link" data-action="back-notes">← 返回笔记</button><span>${icon("chevron")}</span><span>${escapeHtml(note.title || "无标题笔记")}</span><span class="save-indicator ${state.editorDirty ? "saving" : ""}" id="save-indicator">${state.editorDirty ? "正在保存…" : `${icon("check")} 已保存`}</span><span class="editor-actions"><button class="mini-icon ${note.pinned ? "is-favorite" : ""}" data-action="toggle-note-pin" data-id="${note.id}" title="置顶">${icon("pin")}</button><button class="mini-icon ${note.favorite ? "is-favorite" : ""}" data-action="toggle-note-favorite" data-id="${note.id}" title="收藏">${icon("star")}</button><button class="mini-icon danger-icon" data-action="delete-note" data-id="${note.id}" title="删除">${icon("trash")}</button></span></div>
    <div class="note-editor-heading"><input id="note-title" class="note-title-input" placeholder="给这篇笔记起个标题…" value="${escapeHtml(note.title || "")}"><div class="note-meta-controls"><label class="meta-control"><span>日期</span><input id="note-date" type="date" value="${escapeHtml(note.date || today())}"></label><label class="meta-control category-control"><span>分类</span><select id="note-category"><option value="">未分类</option>${CATEGORIES.map((category) => `<option value="${category}" ${note.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label><label class="meta-control tag-control"><span>标签</span><input id="note-tags" placeholder="输入标签后按回车" value="${escapeHtml((note.tags || []).join(", "))}"></label><label class="meta-control linked-file-control"><span>关联代码</span><select id="note-linked-file"><option value="">选择代码文件</option>${state.files.map((file) => `<option value="${file.id}" ${(note.linkedFileIds || []).includes(file.id) ? "selected" : ""}>${escapeHtml(file.name)}</option>`).join("")}</select></label></div></div>
    <div class="editor-workspace"><div class="editor-toolbar"><div class="toolbar-mode"><button class="${rich ? "selected" : ""}" data-action="note-format" data-format="rich">富文本</button><button class="${!rich ? "selected" : ""}" data-action="note-format" data-format="markdown">Markdown</button></div><div class="toolbar-mode view-mode"><button class="${state.editorMode === "edit" ? "selected" : ""}" data-action="editor-mode" data-mode="edit">编辑</button><button class="${state.editorMode === "split" ? "selected" : ""}" data-action="editor-mode" data-mode="split">分屏</button><button class="${state.editorMode === "preview" ? "selected" : ""}" data-action="editor-mode" data-mode="preview">预览</button></div>${rich ? `<div class="format-tools"><select data-format="heading" title="标题"><option value="">正文</option><option value="h1">标题 1</option><option value="h2">标题 2</option><option value="h3">标题 3</option></select><button data-format="bold" title="粗体"><b>B</b></button><button data-format="italic" title="斜体"><i>I</i></button><button data-format="underline" title="下划线"><u>U</u></button><button data-format="strikeThrough" title="删除线"><s>S</s></button><button data-format="insertUnorderedList" title="无序列表">☷</button><button data-format="formatBlock" data-value="blockquote" title="引用">❞</button><button data-format="insertHorizontalRule" title="分割线">―</button><button data-format="createLink" title="插入链接">↗</button><button data-format="foreColor" data-value="#e45c68" title="文字颜色" class="color-format">A<span></span></button><button data-format="hiliteColor" data-value="#fff0b3" title="文字高亮" class="highlight-format">▧</button><button data-format="insertCode" title="代码块">&lt;/&gt;</button><button data-action="insert-image" title="插入图片">${icon("upload")}</button></div>` : `<div class="markdown-tools"><button data-action="markdown-insert" data-value="# ">H</button><button data-action="markdown-insert" data-value="**粗体**"><b>B</b></button><button data-action="markdown-insert" data-value="- ">☷ 列表</button><button data-action="markdown-insert" data-value="> ">❞ 引用</button><button data-action="markdown-insert" data-value="\\n---\\n">&mdash; 分割线</button><button data-action="markdown-insert" data-value="\\n\`\`\`python\\n\\n\`\`\`">&lt;/&gt; 代码</button><span class="markdown-tip">Markdown 支持标题、列表、引用与代码块</span></div>`}<button class="editor-save-button" data-action="save-note">${icon("check")}保存</button></div>
    <div class="editor-panels ${state.editorMode === "edit" ? "mode-edit" : state.editorMode === "preview" ? "mode-preview" : ""}"><div class="editor-pane edit-pane"><div class="pane-label"><span><i class="pane-live-dot"></i>${rich ? "富文本编辑" : "Markdown 编辑"}</span><span>自动保存已开启</span></div>${rich ? `<div id="note-content" class="rich-editor" contenteditable="true" spellcheck="false" data-placeholder="从这里开始，写下你的学习笔记…">${safeRichHtml(note.content || "")}</div>` : `<textarea id="note-content" class="markdown-editor" spellcheck="false" placeholder="# 从这里开始，写下你的学习笔记…">${escapeHtml(note.content || "")}</textarea>`}<div class="pane-bottom"><span>✧ 知识在记录中生长</span><span id="word-count">${plainText(note.content || "").length} 字</span></div></div><div class="pane-divider"></div><div class="editor-pane preview-pane"><div class="pane-label"><span>✧ 实时预览</span><span>阅读模式</span></div><div class="markdown-preview" id="note-preview">${rich ? safeRichHtml(note.content || "<p>预览将在这里呈现…</p>") : markdownToHtml(note.content || "预览将在这里呈现…")}</div></div></div></div>
    <div class="editor-below"><span>✿ <b>小提示</b>　使用颜色标记重点，让每一次复习都更轻松。</span><button class="text-link" data-action="insert-attachment">${icon("upload")} 插入附件</button><input id="note-image-input" type="file" accept="image/*" multiple hidden><input id="note-attachment-input" type="file" multiple hidden></div></div>`;
}

function renderCheckins() {
  const year = state.month.getFullYear();
  const month = state.month.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstWeekday }, () => '<span class="calendar-empty"></span>');
  for (let day = 1; day <= dayCount; day += 1) {
    const date = dateKey(new Date(year, month, day));
    const checked = state.checkins.some((entry) => entry.id === date);
    const isToday = date === today();
    const selected = date === state.selectedDay;
    cells.push(`<button class="calendar-day ${checked ? "has-checkin" : ""} ${isToday ? "is-today" : ""} ${selected ? "is-selected" : ""}" data-action="select-day" data-date="${date}"><span>${day}</span>${checked ? `<i>${icon("check")}</i>` : ""}</button>`);
  }
  const selectedEntry = state.checkins.find((entry) => entry.id === state.selectedDay);
  const notes = notesForDay(state.selectedDay);
  const files = filesForDay(state.selectedDay);
  const categories = [...new Set([...notes.map((note) => note.category), ...files.map((file) => file.category)].filter(Boolean))];
  const selectedDate = new Date(`${state.selectedDay}T00:00:00`);
  const monthlyDays = state.checkins.filter((entry) => entry.id.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length;
  const studied = new Set(state.checkins.map((entry) => entry.id));
  return `<div class="page-inner"><div class="page-heading"><div><span class="section-overline">A GENTLE RECORD OF LEARNING</span><h1>每日打卡</h1><p>不安排计划，只为每一天留下学习的痕迹。</p></div><button class="button button-primary" data-action="checkin">${icon("check")}${selectedEntry ? "今日已记录" : state.selectedDay === today() ? "今天打卡" : "补签这一天"}</button></div>
    <div class="checkin-layout"><section class="calendar-panel panel"><div class="calendar-header"><button class="icon-button" data-action="month-prev" aria-label="上个月">‹</button><div><h2>${year} 年 ${month + 1} 月</h2><button class="calendar-today-link" data-action="month-today">回到今天</button></div><button class="icon-button" data-action="month-next" aria-label="下个月">›</button></div><div class="calendar-weekdays">${["一", "二", "三", "四", "五", "六", "日"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div><div class="calendar-legend"><span><i class="legend-dot"></i>学习打卡</span><span><i class="legend-today"></i>今天</span><span>标记 ✦ 表示补签</span></div></section>
    <aside class="day-detail panel"><div class="day-detail-date"><span>${selectedDate.toLocaleDateString("zh-CN", { weekday: "long" })}</span><h2>${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日</h2><small>${selectedDate.getFullYear()}</small></div><div class="day-check-status ${selectedEntry ? "checked" : ""}">${selectedEntry ? `${icon("check")}<span>${selectedEntry.makeup ? "已补签" : "已经好好学习了一天"}</span>${selectedEntry.makeup ? '<i class="makeup-label">补签</i>' : ""}` : `${icon("calendar")}<span>${state.selectedDay === today() ? "今日还未打卡" : "这一天还没有打卡"}</span>`}</div>${selectedEntry?.note ? `<blockquote class="checkin-note">${escapeHtml(selectedEntry.note)}</blockquote>` : ""}<div class="day-detail-section"><strong>学习分类</strong><div class="day-category-list">${categories.length ? categories.map(categoryPill).join("") : '<span class="muted-text">暂未关联分类</span>'}</div></div><div class="day-detail-section"><strong>当日笔记 <span>${notes.length}</span></strong>${notes.length ? notes.map((note) => `<button class="detail-link" data-action="open-note" data-id="${note.id}">${icon("note")}<span>${escapeHtml(note.title || "无标题笔记")}</span>${icon("chevron")}</button>`).join("") : '<p class="muted-text small-empty">这一天没有笔记</p>'}</div><div class="day-detail-section"><strong>当日代码 <span>${files.length}</span></strong>${files.length ? files.map((file) => `<button class="detail-link" data-action="open-file" data-id="${file.id}">${icon("code")}<span>${escapeHtml(file.name)}</span>${icon("chevron")}</button>`).join("") : '<p class="muted-text small-empty">这一天没有代码</p>'}</div>${!selectedEntry ? `<button class="button button-outline button-block" data-action="checkin">${icon("check")}${state.selectedDay === today() ? "记录今天的学习" : "补签这一天"}</button>` : `<button class="text-link remove-checkin" data-action="remove-checkin" data-date="${state.selectedDay}">取消这天的打卡</button>`}</aside></div><div class="checkin-summary"><div class="summary-card panel"><span class="summary-symbol">✳</span><span><strong>${calculateStreak(studied)} 天</strong><small>连续学习</small></span><span class="summary-right">持续向前，不必着急</span></div><div class="summary-card panel"><span class="summary-symbol summary-symbol-green">◷</span><span><strong>${monthlyDays} 天</strong><small>${month + 1} 月的学习</small></span><span class="summary-right">每一步都算数</span></div></div></div>`;
}
function renderFiles() {
  if (state.fileId) return renderCodeEditor(state.fileId);
  const query = state.query.toLowerCase().trim();
  const files = [...state.files].filter((file) => (!state.folderFilter || file.folderId === state.folderFilter) && (!query || `${file.name} ${file.content} ${file.category} ${file.folderName} ${(file.tags || []).join(" ")}`.toLowerCase().includes(query))
    && (!state.filterCategory || file.category === state.filterCategory))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (state.fileSort === "name" ? a.name.localeCompare(b.name) : state.fileSort === "size" ? (b.size || 0) - (a.size || 0) : (b.updatedAt || "").localeCompare(a.updatedAt || "")));
  const folders = state.folders.filter((folder) => !folder.parentId);
  return `<div class="page-inner"><div class="page-heading"><div><span class="section-overline">YOUR PERSONAL CODE LIBRARY</span><h1>代码文件</h1><p>把练习、想法和小项目，妥善收进自己的代码空间。</p></div><div class="heading-actions"><button class="button button-quiet" data-action="upload-code">${icon("upload")}上传文件</button><button class="button button-primary" data-action="new-file">${icon("plus")}新建代码</button></div></div>
    <div class="file-manager panel">        <div class="file-manager-toolbar"><div class="file-toolbar-left"><button class="file-path" data-action="clear-folder-filter">学习资料 ${icon("chevron")} <span>${escapeHtml(state.folderFilter ? state.folders.find((folder) => folder.id === state.folderFilter)?.name || "全部文件" : "全部文件")}</span></button><span class="result-count">${files.length} 个文件</span></div><div class="file-toolbar-actions"><label class="inline-search file-search">${icon("search")}<input id="file-search" placeholder="搜索文件..." value="${escapeHtml(state.query)}"></label><select id="file-category-filter" class="select-control"><option value="">全部分类</option>${CATEGORIES.map((category) => `<option ${state.filterCategory === category ? "selected" : ""}>${category}</option>`).join("")}</select><select id="file-sort" class="select-control" aria-label="文件排序"><option value="updated" ${state.fileSort === "updated" ? "selected" : ""}>最近修改</option><option value="name" ${state.fileSort === "name" ? "selected" : ""}>按名称</option><option value="size" ${state.fileSort === "size" ? "selected" : ""}>按大小</option></select><button class="file-view-toggle" data-action="toggle-file-view" title="切换列表/网格">${state.fileView === "list" ? "▦ 网格" : "☰ 列表"}</button><button class="icon-button" data-action="new-folder" title="新建文件夹">${icon("folders")}</button></div></div>
    <div class="folder-strip">${state.folders.map((folder) => `<div class="folder-card ${folder.parentId ? "folder-nested" : ""}" role="button" tabindex="0" data-action="browse-folder" data-id="${folder.id}">${icon("folders")}<span><strong>${escapeHtml(folder.parentId ? `${folder.category} / ${folder.name}` : folder.name)}</strong><small>${state.files.filter((file) => file.folderId === folder.id).length} 个文件</small></span><button class="folder-menu" data-action="folder-menu" data-id="${folder.id}" aria-label="文件夹操作">···</button></div>`).join("")}<button class="folder-card folder-add" data-action="new-folder">${icon("plus")}<span><strong>新建文件夹</strong><small>整理你的代码</small></span></button></div>
    ${state.fileView === "list" ? `<div class="file-list-header"><span>名称</span><span>分类</span><span>文件大小</span><span>操作</span></div><div class="file-list-body">${files.length ? files.map(fileRow).join("") : emptyState("代码文件还在等你", "新建或上传一个文件，开始整理自己的代码。", "new-file", "新建代码")}</div>` : `<div class="file-grid">${files.length ? files.map(fileGridCard).join("") : emptyState("代码文件还在等你", "新建或上传一个文件，开始整理自己的代码。", "new-file", "新建代码")}</div>`}<div class="file-manager-footer"><span>所有文件仅保存在当前设备的浏览器中</span><button class="text-link" data-action="export-backup">${icon("download")}备份文件</button></div></div>
    <input id="code-upload-input" type="file" hidden multiple accept=".py,.c,.h,.sh,.sql,.md,.txt,.json,.js,.cpp,.html,.css"></div>`;
}
function renderCodeEditor(id) {
  const file = getFile(id);
  if (!file) { state.fileId = null; return renderFiles(); }
  const lang = codeLanguage(file.name);
  return `<div class="page-inner code-editor-page"><div class="editor-breadcrumb"><button class="text-link" data-action="back-files">← 返回代码文件</button><span>${icon("chevron")}</span><span class="code-file-title">${escapeHtml(file.name)}</span><span class="save-indicator" id="code-save-indicator">${icon("check")} 已保存</span><span class="editor-actions"><button class="mini-icon ${file.favorite ? "is-favorite" : ""}" data-action="toggle-file-favorite" data-id="${file.id}" title="收藏">${icon("star")}</button><button class="mini-icon ${file.pinned ? "is-favorite" : ""}" data-action="toggle-file-pin" data-id="${file.id}" title="置顶">${icon("pin")}</button><button class="mini-icon" data-action="download-file" data-id="${file.id}" title="下载">${icon("download")}</button><button class="mini-icon danger-icon" data-action="delete-file" data-id="${file.id}" title="删除">${icon("trash")}</button></span></div><div class="code-editor-meta"><div><input id="code-filename" value="${escapeHtml(file.name)}"><span class="code-language">${lang}</span></div><div><label>分类 <select id="code-category"><option value="">未分类</option>${CATEGORIES.map((category) => `<option value="${category}" ${file.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label><label>文件夹 <select id="code-folder"><option value="">根目录</option>${state.folders.map((folder) => `<option value="${folder.id}" ${file.folderId === folder.id ? "selected" : ""}>${escapeHtml(folder.category ? `${folder.category} / ` : "")}${escapeHtml(folder.name)}</option>`).join("")}</select></label></div></div><div class="code-toolbar"><span class="code-language-dot">${lang}</span><span class="code-toolbar-separator"></span><button data-action="copy-code" title="复制代码">▢ 复制</button><button data-action="find-code">⌕ 查找</button><button data-action="replace-code">⇄ 替换</button><label class="code-font-control">字号 <select id="code-font-size"><option>13</option><option>14</option><option>15</option><option>16</option><option>18</option></select></label><label class="code-wrap-control"><input id="code-wrap" type="checkbox" checked> 自动换行</label><span class="toolbar-spacer"></span><button class="button button-code-save" data-action="save-code">${icon("check")}保存代码 <kbd>Ctrl S</kbd></button></div><div class="code-edit-area"><pre class="code-line-numbers" id="code-line-numbers"></pre><textarea class="code-textarea code-wrap" id="code-content" spellcheck="false" autocapitalize="off" autocomplete="off">${escapeHtml(file.content || "")}</textarea><pre class="code-highlight-layer" id="code-highlight" aria-hidden="true"><code></code></pre></div><div class="code-statusbar"><span>${icon("code")}${lang.toUpperCase()}</span><span>UTF-8</span><span>LF</span><span>行 <b id="code-cursor">1</b></span><span class="toolbar-spacer"></span><span>学习笔记 ${relatedNotes(file).length}</span><span>✧ 由知序守护</span></div><div class="related-notes-block"><strong>相关学习笔记</strong>${relatedNotes(file).length ? relatedNotes(file).map((note) => `<button class="detail-link" data-action="open-note" data-id="${note.id}">${icon("note")}<span>${escapeHtml(note.title || "无标题笔记")}</span>${icon("chevron")}</button>`).join("") : '<span class="muted-text">还没有关联笔记，可在每日笔记中选择此文件。</span>'}</div></div>`;
}
function relatedNotes(file) {
  return state.notes.filter((note) => (note.linkedFileIds || []).includes(file.id));
}

function renderCategories() {
  return `<div class="page-inner"><div class="page-heading"><div><span class="section-overline">YOUR KNOWLEDGE, ORGANIZED</span><h1>学习分类</h1><p>六个专属空间，收纳计算机学习的每一个方向。</p></div></div><div class="category-page-grid">${CATEGORIES.map((category, index) => { const meta = CATEGORY_META[category]; const notes = state.notes.filter((note) => note.category === category); const files = state.files.filter((file) => file.category === category); const last = notes.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0]; return `<button class="category-page-card panel cat-card-${meta.color}" data-category="${category}"><div class="category-card-top"><span class="category-monogram">${meta.icon}</span><span>${icon("chevron")}</span></div><span class="category-index">SPACE 0${index + 1}</span><h2>${category}</h2><p>${last ? `最近 · ${escapeHtml(last.title || "无标题笔记")}` : "为这个方向留下第一条学习记录"}</p><div class="category-card-footer"><span>${icon("note")} ${notes.length} 篇笔记</span><span>${icon("code")} ${files.length} 个代码文件</span></div></button>`; }).join("")}</div></div>`;
}
function renderCategory() {
  const category = state.category;
  const notes = state.notes.filter((note) => note.category === category).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const files = state.files.filter((file) => file.category === category).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const folders = state.folders.filter((folder) => folder.category === category);
  const tags = [...new Set(notes.flatMap((note) => note.tags || []))];
  return `<div class="page-inner"><div class="category-hero cat-hero-${CATEGORY_META[category]?.color || "green"}"><div class="category-hero-icon">${CATEGORY_META[category]?.icon || "✧"}</div><div><span class="section-overline">YOUR LEARNING SPACE</span><h1>${escapeHtml(category)}</h1><p>一点一滴地整理，慢慢构建属于自己的知识体系。</p></div><button class="button button-primary" data-action="new-note" data-category="${escapeHtml(category)}">${icon("plus")}记录新笔记</button></div><div class="category-stats"><div><span>笔记</span><strong>${notes.length}</strong></div><div><span>代码</span><strong>${files.length}</strong></div><div><span>文件夹</span><strong>${folders.length}</strong></div><div><span>标签</span><strong>${tags.length}</strong></div></div><div class="category-detail-grid"><section><div class="section-heading section-heading-spaced"><div><span class="section-overline">RECENT NOTES</span><h2>最近笔记</h2></div><button class="text-link" data-route="notes">查看全部</button></div>${notes.length ? `<div class="note-grid">${notes.slice(0, 4).map((note) => noteCard(note, true)).join("")}</div>` : emptyState(`${category}还没有笔记`, "在这个分类下记录你的第一条知识。", "new-note", "新建笔记")}</section><section><div class="section-heading section-heading-spaced"><div><span class="section-overline">CODE COLLECTION</span><h2>代码文件</h2></div><button class="text-link" data-route="files">查看全部</button></div><div class="recent-code-list">${files.length ? files.slice(0, 5).map(fileRow).join("") : emptyState("还没有代码文件", "保存一些代码练习，随时回来复习。", "new-file", "新建代码")}</div><div class="category-tags"><h3>常用标签</h3>${tags.length ? `<div class="tag-list">${tags.map((tag) => `<button class="tag-chip tag-button" data-action="search-tag" data-tag="${escapeHtml(tag)}"># ${escapeHtml(tag)}</button>`).join("")}</div>` : '<span class="muted-text">添加笔记标签后会在这里显示</span>'}</div></section></div></div>`;
}

function renderTimeline() {
  const monthFilter = state.monthFilter || "";
  const entries = new Map();
  for (const note of state.notes) {
    const day = noteDate(note);
    if (!day || (monthFilter && !day.startsWith(monthFilter))) continue;
    if (!entries.has(day)) entries.set(day, { notes: [], files: [], checkin: null });
    entries.get(day).notes.push(note);
  }
  for (const file of state.files) {
    const day = (file.updatedAt || "").slice(0, 10);
    if (!day || (monthFilter && !day.startsWith(monthFilter))) continue;
    if (!entries.has(day)) entries.set(day, { notes: [], files: [], checkin: null });
    entries.get(day).files.push(file);
  }
  for (const checkin of state.checkins) {
    if (monthFilter && !checkin.id.startsWith(monthFilter)) continue;
    if (!entries.has(checkin.id)) entries.set(checkin.id, { notes: [], files: [], checkin: null });
    entries.get(checkin.id).checkin = checkin;
  }
  const sorted = [...entries.entries()].sort(([a], [b]) => b.localeCompare(a));
  return `<div class="page-inner"><div class="page-heading"><div><span class="section-overline">A TIMELINE OF WHAT YOU'VE LEARNED</span><h1>学习记录</h1><p>回看每一个学习过的日子，不知不觉已走了很远。</p></div><button class="button button-quiet" data-route="checkins">${icon("calendar")}月历视图</button></div><div class="timeline-filter"><label>按月份查看 <input id="timeline-month" type="month" value="${escapeHtml(monthFilter)}"></label><span class="result-count">${sorted.length} 个学习日</span></div>${sorted.length ? `<div class="learning-timeline">${sorted.map(([day, entry]) => `<article class="timeline-day"><div class="timeline-date"><span>${new Date(`${day}T00:00:00`).toLocaleDateString("zh-CN", { month: "short" })}</span><strong>${Number(day.slice(-2))}</strong><small>${new Date(`${day}T00:00:00`).toLocaleDateString("zh-CN", { weekday: "long" })}</small></div><div class="timeline-track"><i></i></div><div class="timeline-body"><div class="timeline-heading">${formatDate(day)}${entry.checkin ? `<span class="timeline-checkin">${icon("check")}${entry.checkin.makeup ? "补签" : "已打卡"}</span>` : ""}</div>${entry.checkin?.note ? `<p class="timeline-note">${escapeHtml(entry.checkin.note)}</p>` : ""}<div class="timeline-items">${entry.notes.map((note) => `<button class="timeline-item" data-action="open-note" data-id="${note.id}">${icon("note")}<span>${escapeHtml(note.title || "无标题笔记")}</span>${categoryPill(note.category)}</button>`).join("")}${entry.files.map((file) => `<button class="timeline-item" data-action="open-file" data-id="${file.id}">${icon("code")}<span>${escapeHtml(file.name)}</span>${categoryPill(file.category)}</button>`).join("")}</div></div></article>`).join("")}</div>` : emptyState("学习记录正在等待第一笔", "写下一篇笔记、保存一个代码文件，或完成今日打卡。", "new-note", "新建笔记")}</div>`;
}
function renderFavorites() {
  const notes = state.notes.filter((note) => note.favorite || note.pinned);
  const files = state.files.filter((file) => file.favorite || file.pinned);
  return `<div class="page-inner"><div class="page-heading"><div><span class="section-overline">KEEP CLOSE WHAT MATTERS</span><h1>收藏与置顶</h1><p>把重要的知识放在容易找到的地方。</p></div></div><div class="section-heading section-heading-spaced"><div><span class="section-overline">YOUR NOTES</span><h2>收藏的笔记 <span class="heading-count">${notes.length}</span></h2></div></div>${notes.length ? `<div class="note-grid note-grid-library">${notes.map((note) => noteCard(note)).join("")}</div>` : emptyState("还没有收藏的笔记", "在重要笔记上点亮星标，它们就会出现在这里。")}<div class="section-heading section-heading-spaced code-heading"><div><span class="section-overline">YOUR CODE</span><h2>收藏的代码 <span class="heading-count">${files.length}</span></h2></div></div><div class="recent-code-list">${files.length ? files.map(fileRow).join("") : emptyState("还没有收藏的代码", "收藏常用代码，稍后快速回来查看。")}</div></div>`;
}
function renderSearch() {
  const query = state.query.trim().toLowerCase();
  const notes = state.notes.filter((note) => [note.title, plainText(note.content), ...(note.tags || []), note.category, note.date].join(" ").toLowerCase().includes(query));
  const files = state.files.filter((file) => `${file.name} ${file.content} ${file.category} ${file.folderName} ${(file.tags || []).join(" ")}`.toLowerCase().includes(query));
  const folders = state.folders.filter((folder) => `${folder.name} ${folder.category}`.toLowerCase().includes(query));
  return `<div class="page-inner search-page"><div class="search-hero"><span class="section-overline">EVERYTHING YOU'VE LEARNED, FINDABLE</span><h1>你的知识，<span>一搜即得。</span></h1><label class="global-search-input">${icon("search")}<input id="global-query" placeholder="搜索笔记、代码、标签或学习分类..." value="${escapeHtml(state.query)}" autofocus><kbd>↵</kbd></label><div class="search-filters"><label>分类 <select id="search-category-filter"><option value="">全部分类</option>${CATEGORIES.map((category) => `<option ${state.filterCategory === category ? "selected" : ""}>${category}</option>`).join("")}</select></label><label>日期 <input id="search-date-filter" type="date"></label><span class="search-shortcut-hint">按 Ctrl + K 随时搜索</span></div></div>${query ? `<div class="search-results-summary">找到与「<strong>${escapeHtml(state.query)}</strong>」相关的 <b>${notes.length + files.length + folders.length}</b> 项内容</div>${notes.filter((note) => !state.filterCategory || note.category === state.filterCategory).length ? `<section class="search-result-group"><div class="section-heading"><h2>学习笔记 <span class="heading-count">${notes.filter((note) => !state.filterCategory || note.category === state.filterCategory).length}</span></h2></div><div class="note-grid">${notes.filter((note) => !state.filterCategory || note.category === state.filterCategory).slice(0, 6).map((note) => noteCard(note, true)).join("")}</div></section>` : ""}${files.filter((file) => !state.filterCategory || file.category === state.filterCategory).length ? `<section class="search-result-group"><div class="section-heading"><h2>代码文件 <span class="heading-count">${files.filter((file) => !state.filterCategory || file.category === state.filterCategory).length}</span></h2></div><div class="recent-code-list">${files.filter((file) => !state.filterCategory || file.category === state.filterCategory).map(fileRow).join("")}</div></section>` : ""}${folders.length ? `<section class="search-result-group"><div class="section-heading"><h2>文件夹 <span class="heading-count">${folders.length}</span></h2></div><div class="folder-strip">${folders.map((folder) => `<button class="folder-card" data-action="browse-folder" data-id="${folder.id}">${icon("folders")}<span><strong>${escapeHtml(folder.name)}</strong><small>${escapeHtml(folder.category || "学习资料")}</small></span></button>`).join("")}</div></section>` : ""}${!notes.length && !files.length && !folders.length ? emptyState("没有找到匹配的内容", "试试其他关键词，或移除部分筛选条件。") : ""}` : `<div class="search-empty-guide"><span class="search-guide-icon">${icon("search")}</span><h2>在你的知识里自由探索</h2><p>搜索笔记正文、代码片段、文件夹名称和标签。</p><div class="search-suggestions">${[...new Set(state.notes.flatMap((note) => note.tags || []))].slice(0, 5).map((tag) => `<button class="tag-chip tag-button" data-action="search-tag" data-tag="${escapeHtml(tag)}"># ${escapeHtml(tag)}</button>`).join("")}</div></div>`}</div>`;
}
function renderSettings() {
  const theme = currentSetting("zhixu-theme", "system");
  const themeLabel = { light: "浅色模式", dark: "深色模式", system: "跟随系统" }[theme];
  const storageUsed = state.notes.reduce((sum, note) => sum + new Blob([JSON.stringify(note)]).size, 0) + state.files.reduce((sum, file) => sum + new Blob([file.content || ""]).size, 0);
  return `<div class="page-inner"><div class="page-heading"><div><span class="section-overline">YOUR SPACE, YOUR WAY</span><h1>设置与备份</h1><p>管理偏好设置，并为你的学习资料留一份备份。</p></div></div><div class="settings-layout"><section class="settings-main"><article class="settings-card panel"><div class="settings-card-icon">${icon("sun")}</div><div class="settings-card-body"><h2>外观主题</h2><p>选择适合自己的阅读方式。</p><div class="theme-options">${[["light", "☼", "浅色"], ["dark", "◐", "深色"], ["system", "◌", "跟随系统"]].map(([value, symbol, label]) => `<button class="theme-option ${theme === value ? "selected" : ""}" data-action="set-theme" data-theme="${value}"><span>${symbol}</span><strong>${label}</strong>${theme === value ? icon("check") : ""}</button>`).join("")}</div></div></article>
    <article class="settings-card panel"><div class="settings-card-icon backup-icon">${icon("download")}</div><div class="settings-card-body"><h2>数据备份</h2><p>所有资料都存放在你的浏览器本地数据库，不会上传到云端。</p><div class="backup-actions"><button class="button button-primary" data-action="export-zip">${icon("download")}导出 ZIP 完整备份</button><button class="button button-quiet" data-action="export-backup">JSON 备份</button><button class="button button-quiet" data-action="import-backup">${icon("upload")}从备份恢复</button><input id="backup-file-input" type="file" accept=".json,.zip,application/json,application/zip" hidden></div><small class="backup-caveat">ZIP 包含可直接阅读的 Markdown、代码文件与可恢复的完整数据 JSON（含图片、附件及学习记录）。</small></div></article>
    <article class="settings-card panel"><div class="settings-card-icon export-icon">${icon("note")}</div><div class="settings-card-body"><h2>导出你的资料</h2><p>按需导出 Markdown 笔记或全部代码文件。</p><div class="backup-actions"><button class="button button-quiet" data-action="export-markdown">${icon("note")}导出 Markdown 笔记</button><button class="button button-quiet" data-action="export-code">${icon("code")}导出代码文件</button></div></div></article>
    <article class="settings-card panel"><div class="settings-card-icon storage-icon">${icon("folders")}</div><div class="settings-card-body"><h2>本地资料概览</h2><p>这些内容储存在此设备的浏览器中，清除浏览器网站数据时请先导出备份。</p><div class="storage-stats"><div><strong>${state.notes.length}</strong><span>篇笔记</span></div><div><strong>${state.files.length}</strong><span>个代码文件</span></div><div><strong>${state.checkins.length}</strong><span>次学习记录</span></div><div><strong>${formatBytes(storageUsed)}</strong><span>估算占用</span></div></div><div class="storage-note"><i></i>你的数据仅在此设备上可见，不会上传到任何服务器。</div></div></article></section><aside class="settings-aside"><div class="backup-reminder panel"><span class="reminder-flower">✳</span><h3>把时间留给学习，<br>把备份交给安心。</h3><p>定期导出一份备份，换设备时也能轻松带走自己的知识。</p><button class="text-link" data-action="export-backup">现在备份 ${icon("chevron")}</button></div><div class="settings-about"><span>知序 · 个人学习知识库</span><p>一个安静的小空间，为好奇心留档。</p></div></aside></div></div>`;
}

function showModal(title, body, submitLabel = "保存", danger = false) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${escapeHtml(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭">${icon("close")}</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="button button-quiet" data-action="close-modal">取消</button><button class="button ${danger ? "button-danger" : "button-primary"}" data-action="modal-submit">${escapeHtml(submitLabel)}</button></div></section></div>`;
  modalRoot.dataset.mode = title;
}
function closeModal() { modalRoot.innerHTML = ""; modalRoot.dataset.mode = ""; }
function field(label, input, help = "") {
  return `<label class="form-field"><span>${label}</span>${input}${help ? `<small>${help}</small>` : ""}</label>`;
}
function categorySelect(selected = "") {
  return `<select id="modal-category"><option value="">未分类</option>${CATEGORIES.map((category) => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`).join("")}</select>`;
}
function newNote(category = "") {
  const note = { id: uid(), title: "", date: today(), category, tags: [], content: "", format: "rich", linkedFileIds: [], favorite: false, pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  state.notes.unshift(note);
  state.noteId = note.id;
  state.editorMode = "split";
  put("notes", note).then(() => { state.editorDirty = false; render(); setTimeout(() => document.querySelector("#note-title")?.focus(), 20); }).catch((error) => { state.notes = state.notes.filter((entry) => entry.id !== note.id); state.noteId = null; toast(error.message, "error"); render(); });
}
function newFile(category = "", folderId = "") {
  const file = { id: uid(), name: "untitled.py", category, folderId, folderName: state.folders.find((folder) => folder.id === folderId)?.name || "", content: "", size: 0, tags: [], favorite: false, pinned: false, linkedNoteIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  state.files.unshift(file);
  state.fileId = file.id;
  put("files", file).then(() => render()).catch((error) => { state.files = state.files.filter((entry) => entry.id !== file.id); state.fileId = null; toast(error.message, "error"); render(); });
}
function newFolder(category = "") {
  showModal("新建文件夹", `${field("文件夹名称", '<input id="modal-name" placeholder="例如：数据结构练习" maxlength="80" required>')}${field("所属分类（可选）", categorySelect(category))}${field("上级文件夹（可选）", `<select id="modal-parent"><option value="">顶层文件夹</option>${state.folders.map((folder) => `<option value="${folder.id}">${escapeHtml(folder.category ? `${folder.category} / ` : "")}${escapeHtml(folder.name)}</option>`).join("")}</select>`)}`);
  modalRoot.dataset.task = "create-folder";
}
function startCheckin(day = state.selectedDay) {
  if (day > today()) { toast("未来日期不能打卡", "error"); return; }
  const existing = state.checkins.find((entry) => entry.id === day);
  const backfill = day !== today();
  showModal(backfill ? "补签学习记录" : "记录今天的学习", `${backfill ? '<div class="makeup-warning">✳　正在为过去的日期补签，这条记录会清楚标注为「补签」。</div>' : ""}${field("记录日期", `<input id="modal-checkin-date" type="date" value="${escapeHtml(day)}" max="${today()}">`)}${field("今天学了什么？（可选）", '<textarea id="modal-checkin-note" rows="3" maxlength="300" placeholder="例如：学习了 Python 的字符串和列表。"></textarea>', "一句简短记录，就能帮未来的自己想起这一天。")}`, existing ? "更新记录" : backfill ? "确认补签" : "完成打卡");
  document.querySelector("#modal-checkin-note").value = existing?.note || "";
  modalRoot.dataset.task = "save-checkin";
  modalRoot.dataset.date = day;
}
function updateNoteFromEditor(showSaved = false) {
  const note = getNote(state.noteId);
  if (!note) return;
  const contentNode = document.querySelector("#note-content");
  if (contentNode) {
    note.content = note.format === "markdown" ? contentNode.value : safeRichHtml(contentNode.innerHTML);
    note[note.format === "markdown" ? "markdownContent" : "richContent"] = note.content;
  }
  note.title = document.querySelector("#note-title")?.value || "";
  note.date = document.querySelector("#note-date")?.value || today();
  note.category = document.querySelector("#note-category")?.value || "";
  note.tags = (document.querySelector("#note-tags")?.value || "").split(/[,，]/).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
  const linkedId = document.querySelector("#note-linked-file")?.value || "";
  note.linkedFileIds = linkedId ? [linkedId, ...(note.linkedFileIds || []).filter((id) => id !== linkedId)] : (note.linkedFileIds || []);
  note.updatedAt = new Date().toISOString();
  const preview = document.querySelector("#note-preview");
  if (preview && contentNode) preview.innerHTML = note.format === "markdown" ? markdownToHtml(note.content) : note.content || "<p>预览将在这里呈现…</p>";
  if (preview) enhanceCodeBlocks(preview);
  const wordCount = document.querySelector("#word-count");
  if (wordCount) wordCount.textContent = `${plainText(note.content).length} 字`;
  state.editorDirty = true;
  const indicator = document.querySelector("#save-indicator");
  if (indicator) { indicator.className = "save-indicator saving"; indicator.textContent = "正在保存…"; }
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(() => saveNote(showSaved), 550);
}
async function saveNote(showSaved = false) {
  const note = getNote(state.noteId);
  if (!note) return;
  try {
    await put("notes", note);
    state.editorDirty = false;
    const indicator = document.querySelector("#save-indicator");
    if (indicator) { indicator.className = "save-indicator"; indicator.innerHTML = `${icon("check")} 已保存`; }
    renderSidebar();
    if (showSaved) toast("笔记已保存");
  } catch (error) {
    const indicator = document.querySelector("#save-indicator");
    if (indicator) { indicator.className = "save-indicator save-error"; indicator.textContent = "保存失败，请重试"; }
    toast(error.message, "error");
  }
}
async function saveCode(showToast = true) {
  const file = getFile(state.fileId);
  if (!file) return;
  const textarea = document.querySelector("#code-content");
  const nameInput = document.querySelector("#code-filename");
  if (textarea) file.content = textarea.value;
  if (nameInput) file.name = nameInput.value.trim() || "untitled.txt";
  file.category = document.querySelector("#code-category")?.value || "";
  file.folderId = document.querySelector("#code-folder")?.value || "";
  file.folderName = state.folders.find((folder) => folder.id === file.folderId)?.name || "";
  file.size = new Blob([file.content]).size;
  file.updatedAt = new Date().toISOString();
  try {
    await put("files", file);
    const indicator = document.querySelector("#code-save-indicator");
    if (indicator) { indicator.innerHTML = `${icon("check")} 已保存`; indicator.classList.remove("save-error"); }
    if (showToast) toast("代码文件已保存");
  } catch (error) {
    const indicator = document.querySelector("#code-save-indicator");
    if (indicator) { indicator.textContent = "保存失败"; indicator.classList.add("save-error"); }
    toast(error.message, "error");
  }
}
function updateCodePresentation() {
  const editor = document.querySelector("#code-content");
  if (!editor) return;
  const file = getFile(state.fileId);
  const language = codeLanguage(document.querySelector("#code-filename")?.value || file?.name);
  const numberNode = document.querySelector("#code-line-numbers");
  const highlightNode = document.querySelector("#code-highlight code");
  if (numberNode) numberNode.innerHTML = Array.from({ length: Math.max(1, editor.value.split("\n").length) }, (_, index) => `${index + 1}`).join("\n");
  if (highlightNode) highlightNode.innerHTML = highlightCode(editor.value, language) + "\n";
  const lineNumber = editor.value.slice(0, editor.selectionStart).split("\n").length;
  const cursor = document.querySelector("#code-cursor");
  if (cursor) cursor.textContent = lineNumber;
  const indicator = document.querySelector("#code-save-indicator");
  if (indicator) { indicator.classList.add("saving"); indicator.textContent = "有未保存的更改"; }
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(() => saveCode(false), 900);
}
function confirmDelete(kind, id) {
  const item = kind === "note" ? getNote(id) : getFile(id);
  if (!item) return;
  const name = item.title || item.name || "无标题";
  showModal(`删除${kind === "note" ? "笔记" : "代码文件"}`, `<p class="confirm-copy">确定删除「<strong>${escapeHtml(name)}</strong>」吗？删除后无法恢复。</p>`, "确认删除", true);
  modalRoot.dataset.task = `delete-${kind}`;
  modalRoot.dataset.id = id;
}
function showFileRename(id) {
  const file = getFile(id);
  if (!file) return;
  showModal("文件夹操作", `${field("重命名", `<input id="modal-name" value="${escapeHtml(file.name)}" maxlength="180" required>`)}${field("移动到文件夹", `<select id="modal-move"><option value="">根目录</option>${state.folders.map((folder) => `<option value="${folder.id}" ${file.folderId === folder.id ? "selected" : ""}>${escapeHtml(folder.category ? `${folder.category} / ` : "")}${escapeHtml(folder.name)}</option>`).join("")}</select>`)}`);
  modalRoot.dataset.task = "rename-file";
  modalRoot.dataset.id = id;
}
function showFolderActions(id) {
  const folder = state.folders.find((entry) => entry.id === id);
  if (!folder) return;
  showModal("整理文件夹", `${field("文件夹名称", `<input id="modal-name" value="${escapeHtml(folder.name)}" maxlength="80" required>`)}${field("所属分类", categorySelect(folder.category || ""))}<p class="form-hint">删除文件夹不会删除其中的代码文件，文件会移回根目录。</p>`);
  modalRoot.dataset.task = "edit-folder";
  modalRoot.dataset.id = id;
  const footer = modalRoot.querySelector(".modal-footer");
  footer.insertAdjacentHTML("afterbegin", '<button class="button button-danger" data-action="delete-folder">删除文件夹</button>');
}

async function submitModal() {
  const task = modalRoot.dataset.task;
  try {
    if (task === "create-folder") {
      const name = document.querySelector("#modal-name").value.trim();
      if (!name) { toast("请填写文件夹名称", "error"); return; }
      const parentId = document.querySelector("#modal-parent").value || null;
      const parent = state.folders.find((folder) => folder.id === parentId);
      const category = document.querySelector("#modal-category").value || parent?.category || "";
      const folder = { id: uid(), name, category, parentId, createdAt: new Date().toISOString() };
      await put("folders", folder); state.folders.push(folder); closeModal(); toast("文件夹已创建"); render();
    } else if (task === "save-checkin") {
      const date = document.querySelector("#modal-checkin-date").value;
      if (!date || date > today()) { toast("请选择今天或过去的日期", "error"); return; }
      const checkin = { id: date, note: document.querySelector("#modal-checkin-note").value.trim(), makeup: date !== today(), updatedAt: new Date().toISOString(), linkedNoteIds: notesForDay(date).map((note) => note.id) };
      await put("checkins", checkin);
      state.checkins = state.checkins.filter((entry) => entry.id !== date); state.checkins.push(checkin);
      state.selectedDay = date; closeModal(); toast(checkin.makeup ? "补签成功，已明确标记为补签" : "✓ 今日打卡成功"); render();
    } else if (task === "delete-note" || task === "delete-file") {
      const kind = task.slice(7);
      await remove(kind === "note" ? "notes" : "files", modalRoot.dataset.id);
      if (kind === "note") { state.notes = state.notes.filter((item) => item.id !== modalRoot.dataset.id); state.noteId = null; }
      else {
        const deletedId = modalRoot.dataset.id;
        state.files = state.files.filter((item) => item.id !== deletedId);
        for (const note of state.notes.filter((item) => (item.linkedFileIds || []).includes(deletedId))) {
          note.linkedFileIds = note.linkedFileIds.filter((id) => id !== deletedId);
          await put("notes", note);
        }
        state.fileId = null;
      }
      closeModal(); toast(kind === "note" ? "笔记已删除" : "代码文件已删除"); render();
    } else if (task === "rename-file") {
      const file = getFile(modalRoot.dataset.id);
      if (!file) return;
      const name = document.querySelector("#modal-name").value.trim();
      if (!name) { toast("文件名不能为空", "error"); return; }
      file.name = name; file.folderId = document.querySelector("#modal-move").value || "";
      file.folderName = state.folders.find((folder) => folder.id === file.folderId)?.name || "";
      file.updatedAt = new Date().toISOString(); await put("files", file);
      closeModal(); toast("文件名和位置已更新"); render();
    } else if (task === "edit-folder") {
      const folder = state.folders.find((item) => item.id === modalRoot.dataset.id);
      if (!folder) return;
      const oldName = folder.name; folder.name = document.querySelector("#modal-name").value.trim() || folder.name; folder.category = document.querySelector("#modal-category").value;
      await put("folders", folder);
      for (const file of state.files.filter((item) => item.folderId === folder.id)) {
        if (file.folderName === oldName) file.folderName = folder.name;
        if (folder.category) file.category = folder.category;
        await put("files", file);
      }
      closeModal(); toast("文件夹已更新"); render();
    }
  } catch (error) { toast(error.message || "操作失败，请重试", "error"); }
}
async function deleteFolder(id) {
  const folder = state.folders.find((item) => item.id === id);
  if (!folder) return;
  try {
    await remove("folders", id);
    state.folders = state.folders.filter((item) => item.id !== id);
    for (const child of state.folders.filter((item) => item.parentId === id)) {
      child.parentId = folder.parentId || null;
      await put("folders", child);
    }
    for (const file of state.files.filter((item) => item.folderId === id)) { file.folderId = ""; file.folderName = ""; await put("files", file); }
    closeModal(); toast("文件夹已删除，内部文件已移至根目录"); render();
  } catch (error) { toast(error.message, "error"); }
}

async function doCheckin(day = today()) {
  const existing = state.checkins.find((entry) => entry.id === day);
  if (existing) { startCheckin(day); return; }
  startCheckin(day);
}
async function toggleRecord(kind, id, property) {
  const collection = kind === "note" ? state.notes : state.files;
  const store = kind === "note" ? "notes" : "files";
  const record = collection.find((entry) => entry.id === id);
  if (!record) return;
  record[property] = !record[property];
  try { await put(store, record); render(); toast(property === "favorite" ? (record.favorite ? "已加入收藏" : "已取消收藏") : (record.pinned ? "已置顶" : "已取消置顶")); }
  catch (error) { record[property] = !record[property]; toast(error.message, "error"); }
}

function insertTextAtCursor(text) {
  const target = document.querySelector("#note-content");
  if (!target) return;
  if (target.tagName === "TEXTAREA") {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    target.setRangeText(text, start, end, "end");
    target.focus();
  } else {
    target.focus();
    document.execCommand("insertText", false, text);
  }
  updateNoteFromEditor();
}
function insertImageFiles(files) {
  const note = getNote(state.noteId);
  if (!note) return;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const reader = new FileReader();
    reader.onload = () => {
      if (note.format === "markdown") insertTextAtCursor(`\n![${file.name}](${reader.result})\n`);
      else {
        const image = `<img src="${reader.result}" alt="${escapeHtml(file.name)}" style="max-width:100%;height:auto">`;
        document.querySelector("#note-content")?.focus();
        document.execCommand("insertHTML", false, image);
        updateNoteFromEditor();
      }
      toast(`图片「${file.name}」已插入`);
    };
    reader.onerror = () => toast(`无法读取图片「${file.name}」`, "error");
    reader.readAsDataURL(file);
  }
}
function insertAttachments(files) {
  const note = getNote(state.noteId);
  if (!note) return;
  note.attachments = note.attachments || [];
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = () => {
      const attachment = { id: uid(), name: file.name, type: file.type, size: file.size, dataUrl: reader.result };
      note.attachments.push(attachment);
      if (note.format === "markdown") insertTextAtCursor(`\n[附件：${file.name}](${reader.result})\n`);
      else {
        document.querySelector("#note-content")?.focus();
        document.execCommand("insertHTML", false, `<p class="attachment-link" data-attachment-id="${attachment.id}">📎 <a href="${reader.result}" download="${escapeHtml(file.name)}">${escapeHtml(file.name)}</a> <button type="button" data-action="download-attachment" data-id="${attachment.id}">下载</button></p>`);
        updateNoteFromEditor();
      }
    };
    reader.onerror = () => toast(`无法读取附件「${file.name}」`, "error");
    reader.readAsDataURL(file);
  }
  toast(`${files.length} 个附件已添加`);
}
async function uploadCodeFiles(fileList) {
  for (const blob of fileList) {
    try {
      const content = await blob.text();
      const file = { id: uid(), name: blob.name, category: "", folderId: "", folderName: "", content, size: blob.size, tags: [], favorite: false, pinned: false, linkedNoteIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await put("files", file);
      state.files.unshift(file);
    } catch (error) { toast(`上传「${blob.name}」失败：${error.message}`, "error"); }
  }
  toast(`成功添加 ${fileList.length} 个代码文件`);
  render();
}

async function exportBackup() {
  try {
    const data = { format: "zhixu-backup", version: 1, exportedAt: new Date().toISOString() };
    for (const store of STORES) data[store] = await getAll(store);
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `知序-学习知识库备份-${today()}.json`);
    toast("完整备份已导出");
  } catch (error) { toast(`导出失败：${error.message}`, "error"); }
}
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
async function makeZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const bytes = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
    const checksum = crc32(bytes);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true); view.setUint16(10, dosTime, true); view.setUint16(12, dosDate, true);
    view.setUint32(14, checksum, true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true);
    view.setUint16(26, name.length, true); view.setUint16(28, 0, true); header.set(name, 30);
    localParts.push(header, bytes);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true); centralView.setUint16(4, 20, true); centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true); centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true); centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, checksum, true); centralView.setUint32(20, bytes.length, true); centralView.setUint32(24, bytes.length, true);
    centralView.setUint16(28, name.length, true); centralView.setUint16(30, 0, true); centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true); centralView.setUint16(36, 0, true); centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true); central.set(name, 46);
    centralParts.push(central);
    offset += header.length + bytes.length;
  }
  const centralBytes = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralBytes, true); endView.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}
async function extractBackupFromZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOffset = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) { endOffset = index; break; }
  }
  if (endOffset < 0) throw new Error("无法读取 ZIP 备份目录");
  const count = view.getUint16(endOffset + 10, true);
  let cursor = view.getUint32(endOffset + 16, true);
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("ZIP 文件目录已损坏");
    const method = view.getUint16(cursor + 10, true);
    const checksum = view.getUint32(cursor + 16, true);
    const size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name.endsWith("backup.json") || name === "backup.json") {
      if (method !== 0) throw new Error("该 ZIP 使用了不支持的压缩方式；请使用知序导出的 ZIP 备份");
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const payload = bytes.slice(start, start + size);
      if (crc32(payload) !== checksum) throw new Error("ZIP 备份校验失败，文件可能已损坏");
      return new TextDecoder().decode(payload);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("ZIP 中未找到 backup.json");
}
async function exportZipBackup() {
  try {
    const data = { format: "zhixu-backup", version: 1, exportedAt: new Date().toISOString() };
    for (const store of STORES) data[store] = await getAll(store);
    const entries = [{ name: "知序/backup.json", data: JSON.stringify(data, null, 2) }];
    for (const file of state.files) {
      const category = file.category || "未分类";
      const folder = file.folderName ? `${file.folderName}/` : "";
      entries.push({ name: `知序/代码/${category}/${folder}${file.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")}`, data: file.content || "" });
    }
    if (state.notes.length) {
      const markdown = state.notes.map((note) => `# ${note.title || "无标题笔记"}\n\n- 日期：${note.date || "未设置"}\n- 分类：${note.category || "未分类"}\n- 标签：${(note.tags || []).map((tag) => `#${tag}`).join(" ")}\n\n${note.format === "markdown" ? note.content : plainText(note.content)}\n`).join("\n---\n\n");
      entries.push({ name: "知序/笔记.md", data: markdown });
    }
    downloadBlob(await makeZip(entries), `知序-完整备份-${today()}.zip`);
    toast("完整 ZIP 备份已导出");
  } catch (error) { toast(`导出 ZIP 失败：${error.message}`, "error"); }
}
async function importBackup(file) {
  try {
    if (file.size > 500 * 1024 * 1024) throw new Error("备份文件超过 500 MB");
    const raw = file.name.toLowerCase().endsWith(".zip") ? await extractBackupFromZip(file) : await file.text();
    const data = JSON.parse(raw);
    if (!data || data.format !== "zhixu-backup" || !Number.isInteger(data.version) || data.version > 1) throw new Error("文件不是可识别的知序备份");
    for (const store of STORES) {
      if (!Array.isArray(data[store])) throw new Error(`备份缺少有效的 ${store} 数据`);
      if (data[store].some((entry) => !entry || typeof entry.id !== "string")) throw new Error(`${store} 中包含无效记录`);
    }
    if (!confirm("导入将替换此设备中的现有笔记、代码、文件夹和打卡记录，确定继续吗？")) return;
    await replaceAll(data);
    for (const store of STORES) state[store] = await getAll(store);
    state.noteId = null; state.fileId = null; closeModal(); toast("备份已恢复"); render();
  } catch (error) { toast(`导入失败：${error.message}`, "error"); }
}
function exportMarkdown() {
  if (!state.notes.length) { toast("目前没有可导出的笔记", "error"); return; }
  const text = state.notes.map((note) => `# ${note.title || "无标题笔记"}\n\n- 日期：${note.date || "未设置"}\n- 分类：${note.category || "未分类"}\n- 标签：${(note.tags || []).map((tag) => `#${tag}`).join(" ")}\n\n${note.format === "markdown" ? note.content : plainText(note.content)}\n`).join("\n---\n\n");
  downloadBlob(new Blob([text], { type: "text/markdown;charset=utf-8" }), `知序-学习笔记-${today()}.md`);
  toast("Markdown 笔记已导出");
}
function exportCode() {
  if (!state.files.length) { toast("目前没有可导出的代码文件", "error"); return; }
  for (const file of state.files) downloadBlob(new Blob([file.content || ""], { type: "text/plain;charset=utf-8" }), file.name);
  toast(`已导出 ${state.files.length} 个代码文件`);
}

function navigate(route) {
  if (state.noteId && route !== "notes") {
    if (state.editorDirty) {
      clearTimeout(state.autoSaveTimer);
      updateNoteFromEditor();
      clearTimeout(state.autoSaveTimer);
      saveNote();
    }
    state.noteId = null;
  }
  if (state.fileId && route !== "files") {
    clearTimeout(state.autoSaveTimer);
    if (document.querySelector("#code-content")) saveCode(false);
    state.fileId = null;
  }
  state.route = route;
  state.sidebarOpen = false;
  state.query = "";
  state.filterCategory = "";
  state.folderFilter = "";
  render();
}

function handleAction(action, element, originalEvent) {
  const id = element.dataset.id;
  switch (action) {
    case "toggle-sidebar": state.sidebarOpen = !state.sidebarOpen; renderSidebar(); break;
    case "new-note": {
      const category = element.dataset.category || (state.route === "category" ? state.category : "");
      navigate("notes"); newNote(category); break;
    }
    case "open-note":
      if (state.noteId && state.editorDirty) { clearTimeout(state.autoSaveTimer); updateNoteFromEditor(); clearTimeout(state.autoSaveTimer); saveNote(); }
      state.route = "notes"; state.noteId = id; state.editorDirty = false; state.editorMode = "split"; render(); break;
    case "back-notes":
      clearTimeout(state.autoSaveTimer); if (state.editorDirty) { updateNoteFromEditor(); clearTimeout(state.autoSaveTimer); saveNote(); }
      state.noteId = null; state.route = "notes"; render(); break;
    case "save-note": clearTimeout(state.autoSaveTimer); updateNoteFromEditor(); clearTimeout(state.autoSaveTimer); saveNote(true); break;
    case "delete-note": confirmDelete("note", id); break;
    case "toggle-note-favorite": toggleRecord("note", id, "favorite"); break;
    case "toggle-note-pin": toggleRecord("note", id, "pinned"); break;
    case "new-file":
      navigate("files"); newFile(element.dataset.category || (state.route === "category" ? state.category : ""), state.folderFilter || ""); break;
    case "open-file":
      if (state.fileId && document.querySelector("#code-content")) { clearTimeout(state.autoSaveTimer); saveCode(false); }
      state.route = "files"; state.fileId = id; state.folderFilter = ""; render(); break;
    case "back-files": clearTimeout(state.autoSaveTimer); if (document.querySelector("#code-content")) saveCode(false); state.fileId = null; state.route = "files"; render(); break;
    case "save-code": clearTimeout(state.autoSaveTimer); saveCode(true); break;
    case "delete-file": confirmDelete("file", id); break;
    case "toggle-file-favorite": toggleRecord("file", id, "favorite"); break;
    case "toggle-file-pin": toggleRecord("file", id, "pinned"); break;
    case "rename-file": showFileRename(id); break;
    case "download-file": {
      const file = getFile(id);
      if (file) downloadBlob(new Blob([file.content || ""], { type: "text/plain;charset=utf-8" }), file.name);
      break;
    }
    case "copy-code": navigator.clipboard.writeText(document.querySelector("#code-content")?.value || "").then(() => toast("代码已复制")).catch((error) => toast(`复制失败：${error.message}`, "error")); break;
    case "copy-note-code": {
      const source = state.previewCode.get(id);
      if (source === undefined) { toast("代码块已更新，请重新点击复制", "error"); break; }
      navigator.clipboard.writeText(source).then(() => toast("代码块已复制")).catch((error) => toast(`复制失败：${error.message}`, "error"));
      break;
    }
    case "find-code": {
      const term = prompt("查找代码内容：");
      if (term) {
        const editor = document.querySelector("#code-content");
        const index = editor.value.toLowerCase().indexOf(term.toLowerCase(), editor.selectionEnd);
        if (index >= 0) { editor.focus(); editor.setSelectionRange(index, index + term.length); }
        else toast("没有找到匹配内容", "error");
      }
      break;
    }
    case "replace-code": {
      const term = prompt("要查找的内容：");
      if (term) {
        const replacement = prompt("替换为：", "") ?? "";
        const editor = document.querySelector("#code-content");
        if (editor.value.includes(term)) { editor.value = editor.value.split(term).join(replacement); updateCodePresentation(); toast("替换完成"); }
        else toast("没有找到匹配内容", "error");
      }
      break;
    }
    case "upload-code": document.querySelector("#code-upload-input")?.click(); break;
    case "new-folder": newFolder(state.route === "category" ? state.category : ""); break;
    case "browse-folder": state.folderFilter = id; state.route = "files"; state.query = ""; render(); break;
    case "folder-menu": showFolderActions(id); break;
    case "delete-folder": deleteFolder(modalRoot.dataset.id); break;
    case "clear-folder-filter": state.folderFilter = ""; render(); break;
    case "toggle-file-view": state.fileView = state.fileView === "list" ? "grid" : "list"; render(); break;
    case "checkin": doCheckin(state.selectedDay || today()); break;
    case "remove-checkin": {
      const day = element.dataset.date;
      const record = state.checkins.find((entry) => entry.id === day);
      if (record && confirm(`确定取消 ${formatDate(day)} 的打卡记录吗？`)) {
        remove("checkins", day).then(() => { state.checkins = state.checkins.filter((entry) => entry.id !== day); render(); toast("打卡记录已移除"); }).catch((error) => toast(error.message, "error"));
      }
      break;
    }
    case "select-day": state.selectedDay = element.dataset.date; render(); break;
    case "month-prev": state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); render(); break;
    case "month-next": state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); render(); break;
    case "month-today": state.month = new Date(); state.selectedDay = today(); render(); break;
    case "editor-mode": {
      clearTimeout(state.autoSaveTimer); updateNoteFromEditor(); clearTimeout(state.autoSaveTimer); saveNote();
      state.editorMode = element.dataset.mode; render(); break;
    }
    case "note-format": {
      const note = getNote(state.noteId);
      if (!note || note.format === element.dataset.format) break;
      clearTimeout(state.autoSaveTimer); updateNoteFromEditor(); clearTimeout(state.autoSaveTimer);
      if (note.format === "rich") {
        note.richContent = note.content;
        note.content = note.markdownContent ?? plainText(note.content).split("\n").map((line) => line ? line : "").join("\n");
      } else {
        note.markdownContent = note.content;
        note.content = note.richContent ?? markdownToHtml(note.content);
      }
      note.format = element.dataset.format;
      put("notes", note).then(() => { state.editorDirty = false; render(); }).catch((error) => toast(error.message, "error"));
      break;
    }
    case "insert-image": document.querySelector("#note-image-input")?.click(); break;
    case "insert-attachment": document.querySelector("#note-attachment-input")?.click(); break;
    case "markdown-insert": insertTextAtCursor(element.dataset.value || ""); break;
    case "apply-color": {
      const editor = document.querySelector("#note-content[contenteditable=true]");
      if (editor && state.savedSelection?.startContainer?.isConnected) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(state.savedSelection);
        document.execCommand(state.pendingColorFormat, false, element.dataset.color);
        updateNoteFromEditor();
      }
      document.querySelector(".color-palette")?.remove();
      state.savedSelection = null;
      break;
    }
    case "download-attachment": {
      const attachment = getNote(state.noteId)?.attachments?.find((item) => item.id === id);
      if (attachment?.dataUrl) { const anchor = document.createElement("a"); anchor.href = attachment.dataUrl; anchor.download = attachment.name; anchor.click(); }
      break;
    }
    case "search-focus": navigate("search"); setTimeout(() => document.querySelector("#global-query")?.focus(), 10); break;
    case "search-tag": state.query = element.dataset.tag || ""; state.filterCategory = ""; navigate("search"); state.query = element.dataset.tag || ""; render(); break;
    case "cycle-theme": {
      const current = currentSetting("zhixu-theme", "system");
      const next = { system: "dark", dark: "light", light: "system" }[current];
      setSetting("zhixu-theme", next); render(); toast(`已切换为${{ system: "跟随系统", dark: "深色模式", light: "浅色模式" }[next]}`); break;
    }
    case "set-theme": setSetting("zhixu-theme", element.dataset.theme); render(); toast(`已切换为${{ system: "跟随系统", dark: "深色模式", light: "浅色模式" }[element.dataset.theme]}`); break;
    case "export-backup": exportBackup(); break;
    case "export-zip": exportZipBackup(); break;
    case "import-backup": document.querySelector("#backup-file-input")?.click(); break;
    case "export-markdown": exportMarkdown(); break;
    case "export-code": exportCode(); break;
    case "close-modal":
      if (element.classList.contains("modal-backdrop") && originalEvent.target !== element) break;
      closeModal(); break;
    case "modal-submit": submitModal(); break;
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-route], [data-category]");
  if (!target) return;
  if (target.dataset.route) { event.preventDefault(); navigate(target.dataset.route); return; }
  if (target.dataset.category) {
    state.category = target.dataset.category; navigate("category"); return;
  }
  event.preventDefault();
  handleAction(target.dataset.action, target, event);
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.id === "note-content" || target.id === "note-title" || target.id === "note-date" || target.id === "note-category" || target.id === "note-tags" || target.id === "note-linked-file") { updateNoteFromEditor(); return; }
  if (target.id === "code-content") { updateCodePresentation(); return; }
  if (target.id === "note-search" || target.id === "file-search" || target.id === "global-query") {
    state.query = target.value;
    const id = target.id;
    const selection = target.selectionStart;
    renderPage();
    const next = document.getElementById(id);
    next?.focus();
    next?.setSelectionRange(selection, selection);
  }
});
document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.id === "category-filter" || target.id === "file-category-filter" || target.id === "search-category-filter") { state.filterCategory = target.value; renderPage(); }
  else if (target.id === "timeline-month") { state.monthFilter = target.value; renderPage(); }
  else if (target.id === "file-sort") { state.fileSort = target.value; renderPage(); }
  else if (target.id === "search-date-filter" && target.value) { state.query = target.value; renderPage(); }
  else if (target.id === "note-image-input" && target.files?.length) insertImageFiles(target.files);
  else if (target.id === "note-attachment-input" && target.files?.length) insertAttachments(target.files);
  else if (target.id === "code-upload-input" && target.files?.length) uploadCodeFiles([...target.files]);
  else if (target.id === "backup-file-input" && target.files?.[0]) importBackup(target.files[0]);
  else if (target.id === "code-font-size") document.querySelector("#code-content").style.fontSize = `${target.value}px`;
  else if (target.id === "code-wrap") document.querySelector("#code-content").classList.toggle("no-wrap", !target.checked);
});
document.addEventListener("click", (event) => {
  const format = event.target.closest("[data-format]");
  if (!format || !document.querySelector("#note-content[contenteditable=true]")) {
    const image = event.target.closest("#note-content img");
    if (!image) return;
    const width = prompt("设置图片宽度（25%、50%、75%、100%，默认适应页面）：", image.style.width || "100%");
    if (width === null) return;
    if (width === "" || /^(25|50|75|100)%$/.test(width)) {
      if (width) image.style.width = width;
      else image.style.removeProperty("width");
      image.style.maxWidth = "100%";
      updateNoteFromEditor();
    } else toast("请输入 25%、50%、75%、100% 或留空", "error");
    return;
  }
  event.preventDefault();
  const command = format.dataset.format;
  const value = format.dataset.value || "";
  if (command === "insertCode") document.execCommand("insertHTML", false, "<pre><code>your code here</code></pre>");
  else if (command === "createLink") {
    const url = prompt("输入链接地址（http:// 或 https://）");
    if (url && /^https?:\/\//i.test(url)) document.execCommand(command, false, url);
    else if (url) toast("链接必须以 http:// 或 https:// 开头", "error");
  } else if (command === "formatBlock") document.execCommand(command, false, value);
  else if (command === "foreColor" || command === "hiliteColor") {
    const selection = window.getSelection();
    state.savedSelection = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    state.pendingColorFormat = command;
    document.querySelector(".color-palette")?.remove();
    const palette = document.createElement("div");
    palette.className = "color-palette";
    palette.innerHTML = `<span>${command === "foreColor" ? "文字颜色" : "文字高亮"}</span>${["#20252d", "#e45c68", "#ee9c55", "#d6ae40", "#4ca77c", "#4f85db", "#8764d7", "#d77ca6"].map((color) => `<button data-action="apply-color" data-color="${color}" style="--swatch:${color}" title="${color}"></button>`).join("")}`;
    format.parentElement.append(palette);
    return;
  } else document.execCommand(command, false, value || undefined);
  updateNoteFromEditor();
});
document.addEventListener("change", (event) => {
  if (event.target.matches('[data-format="heading"]')) {
    document.querySelector("#note-content")?.focus();
    document.execCommand("formatBlock", false, event.target.value || "p");
    updateNoteFromEditor();
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('.folder-card[role="button"]')) {
    event.preventDefault();
    handleAction("browse-folder", event.target, event);
    return;
  }
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (state.noteId && state.editorDirty) { clearTimeout(state.autoSaveTimer); updateNoteFromEditor(); clearTimeout(state.autoSaveTimer); saveNote(); }
    state.noteId = null; state.fileId = null; state.route = "search"; state.query = ""; render(); document.querySelector("#global-query")?.focus();
  } else if (modifier && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (state.noteId) { clearTimeout(state.autoSaveTimer); updateNoteFromEditor(); clearTimeout(state.autoSaveTimer); saveNote(true); }
    else if (state.fileId) { clearTimeout(state.autoSaveTimer); saveCode(true); }
  } else if (modifier && event.key.toLowerCase() === "n" && !event.shiftKey) {
    event.preventDefault(); navigate("notes"); newNote();
  } else if (modifier && event.shiftKey && event.key.toLowerCase() === "n") {
    event.preventDefault(); navigate("files"); newFile();
  } else if (event.key === "Escape" && modalRoot.innerHTML) closeModal();
  else if (event.key === "Tab" && event.target.id === "code-content") {
    event.preventDefault();
    const editor = event.target;
    editor.setRangeText("  ", editor.selectionStart, editor.selectionEnd, "end");
    updateCodePresentation();
  } else if (event.key === "Enter" && event.target.id === "code-content") {
    event.preventDefault();
    const editor = event.target;
    const lineStart = editor.value.lastIndexOf("\n", editor.selectionStart - 1) + 1;
    const indent = editor.value.slice(lineStart, editor.selectionStart).match(/^\s*/)?.[0] || "";
    const previous = editor.value.slice(lineStart, editor.selectionStart).trimEnd();
    const extraIndent = /[:{[(]$/.test(previous) ? "  " : "";
    editor.setRangeText(`\n${indent}${extraIndent}`, editor.selectionStart, editor.selectionEnd, "end");
    updateCodePresentation();
  }
});
document.addEventListener("scroll", () => {
  const editor = document.querySelector("#code-content");
  if (!editor) return;
  const numbers = document.querySelector("#code-line-numbers");
  const highlight = document.querySelector("#code-highlight");
  if (numbers) numbers.scrollTop = editor.scrollTop;
  if (highlight) { highlight.scrollTop = editor.scrollTop; highlight.scrollLeft = editor.scrollLeft; }
}, true);
document.addEventListener("DOMContentLoaded", () => {});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (currentSetting("zhixu-theme", "system") === "system") render();
});

async function initialize() {
  try {
    for (const store of STORES) state[store] = await getAll(store);
    if (state.folders.length === 0) {
      for (const folder of DEFAULT_FOLDERS) await put("folders", folder);
      state.folders = await getAll("folders");
    }
    render();
  } catch (error) {
    document.querySelector("#page").innerHTML = `<div class="database-error"><h1>本地资料库暂时无法打开</h1><p>${escapeHtml(error.message)}</p><p>请使用 localhost 或 HTTPS 地址访问，并确认浏览器允许本地存储。</p></div>`;
    console.error("知识库初始化失败", error);
  }
}
initialize();
