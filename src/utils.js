export const CATEGORIES = ["Python", "C语言", "Linux", "MySQL", "Git", "计算机基础"];

export const CATEGORY_META = {
  Python: { color: "violet", icon: "py" },
  C语言: { color: "blue", icon: "c" },
  Linux: { color: "orange", icon: "ln" },
  MySQL: { color: "cyan", icon: "db" },
  Git: { color: "red", icon: "git" },
  计算机基础: { color: "green", icon: "cpu" },
};

const FOLDER_LAYOUT = {
  Python: ["基础语法", "练习", "项目"],
  C语言: ["基础语法", "练习", "项目"],
  Linux: ["常用命令", "Shell", "环境配置"],
  MySQL: ["SQL", "数据库", "练习"],
  Git: ["常用命令", "GitHub", "操作记录"],
  计算机基础: ["计算机组成", "操作系统", "计算机网络", "数据结构", "算法", "编程基础"],
};
export const DEFAULT_FOLDERS = (() => {
  const createdAt = new Date().toISOString();
  const roots = CATEGORIES.map((category) => ({ id: crypto.randomUUID(), category, name: category, parentId: null, createdAt }));
  return [...roots, ...CATEGORIES.flatMap((category) => FOLDER_LAYOUT[category].map((name) => ({
    id: crypto.randomUUID(), category, name, parentId: roots.find((root) => root.category === category).id, createdAt,
  })))];
})();

export const uid = () => crypto.randomUUID();
export const today = () => dateKey(new Date());
export const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const formatDate = (value) => {
  if (!value) return "未设置日期";
  const date = new Date(`${value}T00:00:00`);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};
export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

export function plainText(html = "") {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent ?? "";
}

export function markdownToHtml(markdown = "") {
  const blocks = [];
  let codeLanguage = "";
  let codeLines = [];
  const inline = (text) => escapeHtml(text)
    .replace(/!\[([^\]]*)\]\((data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,[^)\s]+)\)/gi, '<img src="$2" alt="$1">')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  for (const line of markdown.split(/\r?\n/)) {
    const fence = line.match(/^```([\w+-]*)/);
    if (fence) {
      if (codeLanguage) {
        blocks.push(`<pre><code class="language-${escapeHtml(codeLanguage)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLanguage = "";
        codeLines = [];
      } else codeLanguage = fence[1] || "text";
      continue;
    }
    if (codeLanguage) { codeLines.push(line); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)/);
    const quote = line.match(/^>\s?(.*)/);
    const bullet = line.match(/^[-*]\s+(.+)/);
    const ordered = line.match(/^\d+\.\s+(.+)/);
    if (heading) blocks.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    else if (quote) blocks.push(`<blockquote>${inline(quote[1])}</blockquote>`);
    else if (bullet) blocks.push(`<p>• ${inline(bullet[1])}</p>`);
    else if (ordered) blocks.push(`<p>${inline(ordered[1])}</p>`);
    else if (/^---+$/.test(line)) blocks.push("<hr>");
    else blocks.push(`<p>${inline(line) || "<br>"}</p>`);
  }
  if (codeLanguage) blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  return blocks.join("");
}

export function safeRichHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script,style,iframe,object,embed,form").forEach((element) => element.remove());
  template.content.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith("on") || (["href", "src"].includes(attribute.name) && /^\s*javascript:/i.test(attribute.value))) {
        element.removeAttribute(attribute.name);
      }
      if (attribute.name === "style") {
        const safeRules = attribute.value.split(";").map((rule) => rule.trim()).filter((rule) => {
          const [property, value] = rule.split(":").map((part) => part?.trim());
          if (!value || !["color", "background-color", "text-align", "width", "max-width", "height"].includes(property)) return false;
          return !/(url|expression|javascript|position|behavior)/i.test(value) && /^[#(),.%\w\s-]+$/.test(value);
        });
        if (safeRules.length) element.setAttribute("style", safeRules.join("; "));
        else element.removeAttribute("style");
      }
    }
    if (element.tagName === "IMG" && !/^data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,/i.test(element.getAttribute("src") || "")) element.remove();
    if (element.tagName === "A") {
      const href = element.getAttribute("href") || "";
      const valid = /^(https?:\/\/|mailto:)/i.test(href) || (element.hasAttribute("download") && /^(data:application\/(?:pdf|octet-stream)|data:image\/)/i.test(href));
      if (!valid) element.removeAttribute("href");
    }
    if (element.tagName === "A") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    }
  });
  return template.innerHTML;
}

export function formatBytes(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function codeLanguage(filename = "") {
  const extension = filename.split(".").pop()?.toLowerCase();
  return ({ py: "python", c: "c", h: "c", sh: "shell", bash: "shell", sql: "sql", md: "markdown", json: "json", js: "javascript", txt: "text" })[extension] ?? "text";
}

export function highlightCode(source, language = "text") {
  const safe = escapeHtml(source);
  if (language === "text" || language === "markdown") return safe;
  return safe
    .replace(/(&quot;.*?&quot;|&#39;.*?&#39;|".*?"|'.*?')/g, '<span class="syntax-string">$1</span>')
    .replace(/(\/\/.*|#.*|--.*)$/gm, '<span class="syntax-comment">$1</span>')
    .replace(/\b(def|class|return|if|else|elif|for|while|in|import|from|as|with|try|except|lambda|print|int|char|void|const|static|struct|SELECT|FROM|WHERE|INSERT|INTO|VALUES|CREATE|TABLE|UPDATE|SET|DELETE|JOIN|ON|AND|OR|NOT|NULL|true|false|function|let|const|var|async|await|echo|cd|ls|mkdir)\b/gi, '<span class="syntax-keyword">$1</span>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '<span class="syntax-number">$&</span>');
}

export function currentSetting(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; }
  catch (error) { console.error("读取设置失败", error); return fallback; }
}

export function setSetting(key, value) {
  try { localStorage.setItem(key, value); }
  catch (error) { throw new Error(`保存设置失败：${error.message}`); }
}
