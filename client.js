window.__ModuleLoader__.load({
  id: "dsh-turn-changes",
  factory(require) {
    const { createElement: h, useEffect, useMemo, useRef, useState } = require("react");
    const { DiffBlock, HoverCard } = require("@deepseek-ai/dsh-client-ui-primitives");
    const slot = "conversation.chat.turnTail";
    const key = "turnChanges";
    const remoteTools = new Set(["rw_edit", "rw_write_file", "rw_append"]);
    const green = "var(--dsw-alias-state-success-primary, #238636)";
    const red = "var(--dsw-alias-state-error-primary, #cf222e)";
    const styles = `
      .dsh-turn-changes {
        --tc-border: var(--dsw-alias-border-l2, #d0d7de);
        --tc-muted: var(--dsw-alias-label-secondary, #57606a);
        --tc-hover: var(--dsw-alias-interactive-bg-hover, #f6f8fa);
        border: 1px solid var(--tc-border);
        border-radius: 12px;
        margin-block: 12px 4px;
        min-width: 0;
        font-family: inherit;
        font-size: 13px;
        line-height: 1.45;
      }
      .dsh-turn-changes__header { display: flex; align-items: center; padding: 4px; gap: 6px; }
      .dsh-turn-changes__button {
        display: flex; align-items: center; gap: 10px; min-width: 0;
        border: 0; border-radius: 7px; padding: 7px 9px;
        background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer;
      }
      .dsh-turn-changes__button:hover,
      .dsh-turn-changes__file[aria-expanded="true"] { background: var(--tc-hover); }
      .dsh-turn-changes__button:focus-visible {
        outline: 2px solid var(--dsw-alias-state-business-primary, #0969da); outline-offset: -2px;
      }
      .dsh-turn-changes__toggle { flex: 1; flex-wrap: wrap; gap: 6px 10px; font-weight: 600; font-size: 14px; }
      .dsh-turn-changes__chevron {
        flex: none; width: 6px; height: 6px; margin-inline: 3px;
        border-right: 1.5px solid; border-bottom: 1.5px solid; transform: rotate(-45deg);
      }
      .dsh-turn-changes__toggle[aria-expanded="true"] .dsh-turn-changes__chevron { transform: rotate(45deg); }
      .dsh-turn-changes__review {
        flex: none; font-weight: 600; white-space: nowrap; padding-inline: 11px;
        border: 1px solid var(--tc-border);
      }
      .dsh-turn-changes__files { border-top: 1px solid var(--tc-border); padding: 4px; }
      .dsh-turn-changes__entry + .dsh-turn-changes__entry { border-top: 1px solid var(--tc-border); }
      .dsh-turn-changes__file { width: 100%; padding-block: 8px; }
      .dsh-turn-changes__path { display: flex; flex: 1; min-width: 0; align-items: baseline; }
      .dsh-turn-changes__name,
      .dsh-turn-changes__directory { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsh-turn-changes__name { flex: 0 0 auto; max-width: 65%; font-size: 14px; font-weight: 600; }
      .dsh-turn-changes__name:only-child { max-width: 100%; }
      .dsh-turn-changes__directory { min-width: 0; color: var(--tc-muted); font-size: 13px; direction: rtl; text-align: left; }
      .dsh-turn-changes__source { flex: none; font-size: 11px; color: var(--tc-muted); }
      .dsh-turn-changes__stats {
        display: inline-flex; flex: none; gap: 7px; font-size: 12px;
        font-family: var(--ds-font-family-code, Consolas, monospace); font-variant-numeric: tabular-nums;
      }
      .dsh-turn-changes__diff {
        margin: 4px 4px 8px; overflow: auto; max-height: 420px;
        border: 1px solid var(--tc-border); border-radius: 8px;
        --dsw-font-markdown-code-block-small: 13px/1.55 Consolas, monospace;
        font-size: 13px; line-height: 1.55;
      }
      .dsh-turn-changes__note { padding: 6px 10px; color: var(--tc-muted); font-size: 12px; }
      .dsh-turn-changes__preview {
        max-width: 100%; min-width: 0;
        --tc-muted: var(--dsw-alias-label-secondary, #57606a);
        --tc-border: var(--dsw-alias-border-l2, #d0d7de);
      }
      .dsh-turn-changes__preview-header { display: flex; align-items: center; gap: 12px; padding: 8px 10px; }
      .dsh-turn-changes__preview .dsh-turn-changes__diff { max-height: min(320px, 45vh); }
    `;
    const diffLabels = {
      codeLabel: "文件差异", wrapLabel: "自动换行", unwrapLabel: "取消自动换行",
      copy: "复制", copied: "已复制", collapse: "收起", collapseAria: "收起差异",
      expand: count => "展开其余 " + count + " 行",
      expandAria: count => "展开其余 " + count + " 行差异",
    };

    function validDiff(diff) {
      return typeof diff?.path === "string" && typeof diff.newText === "string"
        && (diff.oldText === null || typeof diff.oldText === "string");
    }

    function addDiff(files, diff, remote) {
      const id = (remote ? "remote:" : "local:") + diff.path;
      const previous = files.get(id);
      let hunks = [...(previous?.hunks ?? []), diff];
      const last = previous?.hunks.at(-1);
      if (remote && last && !last.snippet && !diff.snippet && last.newText === diff.oldText) {
        hunks = [...previous.hunks.slice(0, -1), { ...diff, oldText: last.oldText }];
      }
      files.set(id, { id, path: diff.path, remote, hunks });
    }

    function remoteEditFromArguments(call, message) {
      if (!remoteTools.has(call.name)) return null;
      try {
        const args = typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
        const path = args.path ?? args.file_path;
        const response = message.content?.find(block => block.type === "text")?.text;
        if (typeof path !== "string" || typeof response !== "string") return null;
        if (call.name === "rw_append" && typeof args.content === "string" && /^appended to /.test(response)) {
          return { path, oldText: "", newText: args.content, snippet: "追加内容" };
        }
        if (call.name === "rw_write_file" && typeof args.content === "string" && /^wrote \d+ bytes to /.test(response)) {
          return { path, oldText: null, newText: args.content, snippet: "写入内容 · 原内容未记录" };
        }
        const oldText = args.old ?? args.old_string;
        const newText = args.new ?? args.new_string;
        const count = Number(response?.match(/: replaced (\d+) occurrence\(s\)$/)?.[1]);
        if (!validDiff({ path, oldText, newText }) || !oldText || !Number.isSafeInteger(count) || count < 1) return null;
        return { path, oldText, newText, snippet: "替换片段 · " + count + " 处" };
      } catch {
        return null;
      }
    }

    const definition = {
      kind: key,
      match(event) {
        const { type, data } = event;
        if (type === "turn/start") return { id: String(data.turn), role: "start" };
        if (type === "tool/call" || type === "workspace/changes"
          || (type === "tool/result" && event.surfaceOp === "append")) {
          return { id: String(data.turn), role: "update" };
        }
        return null;
      },
      start(_context, { event }) {
        return { turn: event.data.turn, calls: new Map(), files: new Map(), summarySeq: null };
      },
      update({ state }, { event }) {
        const { type, data } = event;
        if (type === "workspace/changes") return { ...state, summarySeq: event.seq };
        if (type === "tool/call") {
          return { ...state, calls: new Map(state.calls).set(String(data.callId), data) };
        }
        const call = state.calls.get(String(data.message?.source?.callId));
        if (!call || data.message?.isError) return state;
        const recorded = Array.isArray(data.meta?.diffs) ? data.meta.diffs.filter(validDiff) : [];
        const snippet = recorded.length ? null : remoteEditFromArguments(call, data.message);
        if (!recorded.length && !snippet) return state;
        const files = new Map(state.files);
        for (const diff of snippet ? [snippet] : recorded) {
          addDiff(files, diff, remoteTools.has(call.name));
        }
        return { ...state, files };
      },
      buildLocationData({ state }, scope, previous) {
        if (scope !== "turn" || !state) return null;
        if (previous?.turn === state.turn && previous.value.files === state.files
          && previous.value.summarySeq === state.summarySeq) return previous;
        const { files, summarySeq } = state;
        return { kind: "turn", turn: state.turn, key, value: { files, summarySeq } };
      },
    };

    function lines(text) {
      if (!text) return [];
      const result = text.replace(/\r\n/g, "\n").split("\n");
      if (result.at(-1) === "") result.pop();
      return result;
    }

    function counts(hunks) {
      let added = 0;
      let deleted = 0;
      for (const hunk of hunks) {
        if (hunk.snippet) return null;
        const before = lines(hunk.oldText);
        const after = lines(hunk.newText);
        while (before.length && after.length && before.at(-1) === after.at(-1)) {
          before.pop();
          after.pop();
        }
        let start = 0;
        while (start < before.length && start < after.length && before[start] === after[start]) start++;
        const width = after.length - start;
        if ((before.length - start) * width > 4_000_000) return null;
        const lengths = new Uint32Array(width + 1);
        for (let i = start; i < before.length; i++) {
          let diagonal = 0;
          for (let j = 1; j <= width; j++) {
            const above = lengths[j];
            lengths[j] = before[i] === after[start + j - 1] ? diagonal + 1 : Math.max(lengths[j - 1], above);
            diagonal = above;
          }
        }
        added += width - lengths[width];
        deleted += before.length - start - lengths[width];
      }
      return { added, deleted };
    }

    async function readChange(route, sessionId, seq, signal, index) {
      const params = new URLSearchParams({ sessionId, seq: String(seq) });
      if (index !== undefined) params.set("index", String(index));
      const response = await fetch("api/changes." + route + "?" + params, { signal });
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }

    function useSummary(sessionId, seq) {
      const [result, setResult] = useState(null);
      useEffect(() => {
        if (seq === null) return;
        const controller = new AbortController();
        readChange("summary", sessionId, seq, controller.signal).then(
          summary => { if (!controller.signal.aborted) setResult({ sessionId, seq, summary }); },
          () => { if (!controller.signal.aborted) setResult({ sessionId, seq, failed: true }); },
        );
        return () => controller.abort();
      }, [sessionId, seq]);
      return result?.sessionId === sessionId && result.seq === seq ? result : null;
    }

    function LocalDiff({ sessionId, seq, index }) {
      const [result, setResult] = useState(null);
      useEffect(() => {
        const controller = new AbortController();
        readChange("diff", sessionId, seq, controller.signal, index).then(
          diff => { if (!controller.signal.aborted) setResult(diff); },
          () => { if (!controller.signal.aborted) setResult({ kind: "unavailable" }); },
        );
        return () => controller.abort();
      }, [sessionId, seq, index]);
      const messages = {
        binary: "二进制文件", oversized: "文件过大，无法显示差异",
        unavailable: "此轮工作区快照已不可用",
      };
      if (!result) return h("div", { role: "status", style: { padding: 10 } }, "正在读取差异…");
      if (result.kind !== "text") return h("div", { style: { padding: 10 } }, messages[result.kind] ?? "差异不可用");
      if (result.hunks.length === 0) return h("div", { style: { padding: 10 } }, "无文本行差异");
      return h("div", { style: { fontFamily: "var(--ds-font-family-code, Consolas, monospace)" } },
        result.hunks.map((hunk, number) => {
          let oldLine = hunk.oldStart;
          let newLine = hunk.newStart;
          return h("div", { key: number },
            h("div", { style: { padding: "4px 10px", opacity: 0.7 } },
              "@@ -" + hunk.oldStart + "," + hunk.oldLines + " +" + hunk.newStart + "," + hunk.newLines + " @@"),
            h("div", { style: { minWidth: "max-content" } }, hunk.lines.map((line, index) => {
              const prefix = line[0];
              const color = prefix === "+" ? green : prefix === "-" ? red : undefined;
              const left = prefix === "+" ? "" : oldLine++;
              const right = prefix === "-" ? "" : newLine++;
              return h("div", {
                key: index,
                style: { display: "grid", gridTemplateColumns: "4ch 4ch 1fr", gap: 8, padding: "1px 10px", whiteSpace: "pre",
                  color, background: color ? "color-mix(in srgb, " + color + " 12%, transparent)" : undefined },
              }, h("span", { style: { opacity: 0.65 } }, left), h("span", { style: { opacity: 0.65 } }, right), line);
            })));
        }));
    }

    function Stat({ values }) {
      if (!values) return null;
      return h("span", { className: "dsh-turn-changes__stats" },
        h("span", { style: { color: green } }, "+" + values.added),
        h("span", { style: { color: red } }, "−" + values.deleted));
    }

    function pathKey(path) {
      const normalized = path.replace(/\\/g, "/");
      return /^[a-z]:\//i.test(normalized) ? normalized.toLowerCase() : normalized;
    }

    function FilePath({ path }) {
      const separator = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
      return h("span", { className: "dsh-turn-changes__path", dir: "ltr" },
        separator >= 0 ? h("span", { className: "dsh-turn-changes__directory" },
          h("bdi", { dir: "ltr" }, path.slice(0, separator + 1))) : null,
        h("span", { className: "dsh-turn-changes__name", dir: "auto" }, path.slice(separator + 1)));
    }

    function FileDiff({ file, sessionId, seq, preview }) {
      return h("div", { className: "dsh-turn-changes__diff" }, file.index === undefined
        ? file.hunks.map((hunk, index) => h("div", { key: index },
          hunk.snippet ? h("div", { className: "dsh-turn-changes__note" }, hunk.snippet) : null,
          h(DiffBlock, { diffs: [hunk], maxLines: preview ? 14 : 2000, labels: diffLabels })))
        : h(LocalDiff, { key: seq + ":" + file.index, sessionId, seq, index: file.index }));
    }

    function TurnPanel({ turn, sessionId, useSessions }) {
      const cwd = useSessions?.(state => state.byId[sessionId]?.cwd);
      const data = turn.data.get(key);
      const seq = data?.summarySeq ?? null;
      const result = useSummary(sessionId, seq);
      const files = useMemo(() => {
        const summary = result?.summary;
        const recorded = [...(data?.files.values() ?? [])];
        const native = (summary?.files ?? []).map((file, index) => ({
          id: "local:" + file.path, path: file.path, label: file.display,
          index, stats: file.binary || file.oversized ? null : file,
        }));
        const represented = new Set(native.flatMap(file => [file.path, file.label, cwd && cwd + "/" + file.path])
          .filter(Boolean).map(pathKey));
        const fallback = recorded.filter(file => file.remote || !represented.has(pathKey(file.path)))
          .map(file => ({ ...file, hunks: file.hunks.filter(diff => diff.oldText !== diff.newText) }))
          .filter(file => file.hunks.length > 0)
          .map(file => ({ ...file, stats: counts(file.hunks) }));
        return [...native, ...fallback];
      }, [data, result, cwd]);
      const [expanded, setExpanded] = useState(false);
      const [selected, setSelected] = useState(null);
      const cardRef = useRef(null);
      if (files.length === 0 && !result?.failed) return null;
      const active = files.find(file => file.id === selected);
      const total = files.every(file => file.stats) ? files.reduce((sum, { stats }) => ({
        added: sum.added + stats.added, deleted: sum.deleted + stats.deleted,
      }), { added: 0, deleted: 0 }) : null;
      return h("section", { ref: cardRef, className: "dsh-turn-changes", "aria-label": "本轮文件改动" },
        h("div", { className: "dsh-turn-changes__header" },
          h("button", { type: "button", className: "dsh-turn-changes__button dsh-turn-changes__toggle",
            "aria-expanded": expanded, onClick: () => setExpanded(!expanded) },
            h("span", { className: "dsh-turn-changes__chevron", "aria-hidden": true }),
            h("span", null, files.length ? files.length + " 个文件已更改" : "本轮文件改动"),
            files.length ? h(Stat, { values: total }) : null),
          files.length ? h("button", {
            type: "button", className: "dsh-turn-changes__button dsh-turn-changes__review",
            onClick: () => { setExpanded(true); setSelected(active?.id ?? files[0].id); },
          }, "审阅") : null),
        expanded ? h("div", { className: "dsh-turn-changes__files" },
          result?.failed ? h("div", { className: "dsh-turn-changes__note" }, "工作区快照已不可用。已保存的工具差异仍可查看。") : null,
          files.map(file => {
            const isSelected = selected === file.id;
            const path = file.label ?? file.path;
            const button = h("button", {
              type: "button", className: "dsh-turn-changes__button dsh-turn-changes__file",
              "aria-label": path, "aria-expanded": isSelected,
              onClick: () => setSelected(isSelected ? null : file.id),
            }, h(FilePath, { path: file.path }),
            file.remote ? h("span", { className: "dsh-turn-changes__source" }, "远程") : null,
            h(Stat, { values: file.stats }));
            const diffProps = { file, sessionId, seq };
            return h("div", { key: file.id, className: "dsh-turn-changes__entry" },
              isSelected ? button : h(HoverCard, {
                variant: "preview",
                widthAnchorRef: cardRef,
                openDelayMs: 400,
                anchor: button,
                content: h("div", { className: "dsh-turn-changes__preview" },
                  h("div", { className: "dsh-turn-changes__preview-header", title: path },
                    h(FilePath, { path }), h(Stat, { values: file.stats })),
                  h(FileDiff, { ...diffProps, preview: true })),
              }),
              isSelected ? h(FileDiff, diffProps) : null);
          })) : null);
    }

    return {
      name: "dsh-turn-changes",
      inject: ["slots", "uiConversation"],
      apply(ctx) {
        if (typeof document !== "undefined") {
          ctx.effect(() => {
            const style = document.createElement("style");
            style.dataset.plugin = "dsh-turn-changes";
            style.textContent = styles;
            document.head.appendChild(style);
            return () => style.remove();
          });
        }
        ctx.uiConversation.events.register(definition);
        ctx.slots.inject(slot, () => ctx.slots.register({ name: slot, id: "dsh-turn-changes" }, TurnPanel));
      },
    };
  },
});
