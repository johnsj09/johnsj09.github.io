// Edit mode — change the site's text right on the page, then save it straight back into the HTML file.
//
// How to use (on your own computer only; it never runs on the live site):
//   1. Open the page with ?edit at the end, e.g. index.html?edit  or  rooms/lab.html?edit  (Chrome or Edge).
//   2. Text you can change has a dotted outline. Click and type. Shift+Enter makes a line break.
//   3. In a list, the small "+ line" / "remove" buttons copy or delete that line.
//   4. Alt+click a button or link to use it normally (open a menu, a pop-up, etc.).
//   5. Save (or Ctrl/Cmd+S). The first time, pick this page's .html file; after that it saves straight to it.
//
// Text that the page's scripts write (the role animation, the clock, the orrery's room details, the periodic table…)
// lives inside the code, not in the HTML, so it isn't outlined here.

const els = window.__ed, txt = window.__edT;
if (els){
  const idx = new Map(els.map((e, i) => [e, i]));
  const file = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
  const SKIP = 'script,style,noscript,svg,canvas,textarea,select,option,title,template,iframe,input,[data-ftime],[data-fyear],[data-navtime],.clock,#cal,.sr-only';
  const direct = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('');

  /* ---------- look ---------- */
  const css = document.createElement('style');
  css.textContent = `
  [data-ed]{outline:1.5px dashed rgba(139,108,224,.6)!important;outline-offset:3px;border-radius:2px;cursor:text!important;pointer-events:auto!important;user-select:text!important;-webkit-user-select:text!important}
  [data-ed]:hover{outline-color:#8b6ce0!important}
  [data-ed]:focus{outline:2px solid #8b6ce0!important;background:rgba(139,108,224,.08)}
  [data-ed].ed-dirty{outline-color:#e0904b!important}
  .ed-bar{position:fixed;left:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:8px;padding:8px 8px 8px 14px;border-radius:999px;background:#1d1830;color:#fff;font:500 13px/1.2 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3)}
  .ed-bar button,.ed-tool button{all:unset;cursor:pointer;padding:7px 12px;border-radius:999px;font:500 12px system-ui,sans-serif}
  .ed-bar .ed-save{background:#8b6ce0;color:#fff}.ed-bar .ed-save[disabled]{opacity:.45;cursor:default}
  .ed-bar .ed-x{background:rgba(255,255,255,.12);color:#fff}
  .ed-msg{max-width:340px;color:#d9d0f5;font-weight:400}
  .ed-tool{position:absolute;z-index:2147483000;display:none;gap:4px;padding:3px;border-radius:999px;background:#1d1830;box-shadow:0 4px 14px rgba(0,0,0,.25)}
  .ed-tool button{color:#fff;padding:4px 10px}.ed-tool button:hover{background:rgba(255,255,255,.15)}`;
  document.head.appendChild(css);

  /* ---------- which text can be edited ---------- */
  // any element whose own text is written in the file (and the scripts haven't changed it); its whole content becomes editable
  function mark(){
    els.forEach((e, i) => {
      if (!e.isConnected || !/\S/.test(txt[i]) || e.closest(SKIP)) return;
      if (direct(e) !== txt[i]) return;                       // a script writes this text
      if (e.parentElement?.closest('[data-ed]')) return;      // already inside an editable block
      e.setAttribute('data-ed', ''); e.contentEditable = 'true'; e.spellcheck = true;
    });
  }
  setTimeout(mark, 1500);

  /* ---------- tracking changes ---------- */
  const dirty = new Set(), ops = [], origin = new Map(), extra = new Map();
  let src = null, srcList = null, lastWritten = null;
  const touch = r => { if (!r) return; dirty.add(r); r.classList.add('ed-dirty'); ui(); };
  document.addEventListener('input', e => touch(e.target.closest?.('[data-ed]')), true);

  // typing must not trigger the site's own shortcuts; Enter is a line break only with Shift
  const keys = e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); e.stopImmediatePropagation(); if (e.type === 'keydown') save(); return; }
    if (!e.target.isContentEditable) return;
    if (e.type === 'keydown' && e.key === 'Enter'){ e.preventDefault(); if (e.shiftKey) document.execCommand('insertLineBreak'); }
    e.stopImmediatePropagation();
  };
  ['keydown', 'keyup', 'keypress'].forEach(t => addEventListener(t, keys, true));
  // paste as plain text, so no outside formatting gets in
  addEventListener('paste', e => { if (!e.target.isContentEditable) return; e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s*\n\s*/g, ' ')); }, true);
  // clicking editable text places the cursor instead of following a link or pressing a button (Alt+click to use it)
  ['click', 'pointerdown', 'mousedown'].forEach(t => addEventListener(t, e => {
    if (e.altKey || !e.target.closest?.('[data-ed]')) return;
    if (t === 'click') e.preventDefault();
    e.stopPropagation();
  }, true));

  /* ---------- copying / removing list lines ---------- */
  const tool = document.createElement('div'); tool.className = 'ed-tool';
  tool.innerHTML = '<button data-a="dup">+ line</button><button data-a="del">remove</button>';
  document.body.appendChild(tool);
  let toolLi = null;
  const known = e => idx.has(e) || origin.has(e);
  addEventListener('focusin', e => {
    if (!e.target.isContentEditable) return;
    const li = e.target.closest('li'); toolLi = li && known(li) ? li : null;
    if (!toolLi){ tool.style.display = 'none'; return; }
    const r = toolLi.getBoundingClientRect();
    Object.assign(tool.style, { display: 'flex', left: (r.right + scrollX - 150) + 'px', top: (r.top + scrollY - 30) + 'px' });
  });
  tool.addEventListener('mousedown', e => e.preventDefault());
  tool.addEventListener('click', e => {
    const a = e.target.dataset.a; if (!a || !toolLi) return;
    if (a === 'dup'){
      const c = toolLi.cloneNode(true);
      const from = [toolLi, ...toolLi.querySelectorAll('*')], to = [c, ...c.querySelectorAll('*')];
      to.forEach((n, k) => origin.set(n, from[k]));
      toolLi.after(c); ops.push({ t: 'dup', orig: toolLi, clone: c });
      c.querySelectorAll('[data-ed]').forEach(touch); if (c.matches('[data-ed]')) touch(c);
      const first = c.matches('[data-ed]') ? c : c.querySelector('[data-ed]');
      if (first){ first.focus(); getSelection().selectAllChildren(first); }
    } else {
      ops.push({ t: 'del', el: toolLi }); toolLi.remove(); tool.style.display = 'none'; ui();
    }
  });

  /* ---------- the bar ---------- */
  const bar = document.createElement('div'); bar.className = 'ed-bar';
  bar.innerHTML = '<span>Edit mode</span><span class="ed-msg"></span><button class="ed-save" disabled>Save</button><button class="ed-x">Exit</button>';
  document.body.appendChild(bar);
  const msg = bar.querySelector('.ed-msg'), btn = bar.querySelector('.ed-save');
  const pending = () => dirty.size + ops.length;
  function ui(text){
    const n = pending();
    msg.textContent = text ?? (n ? `${n} unsaved change${n > 1 ? 's' : ''}` : 'Click any outlined text');
    btn.disabled = !n;
  }
  ui();
  btn.onclick = () => save();
  bar.querySelector('.ed-x').onclick = () => { if (!pending() || confirm('Leave without saving your changes?')){ removeEventListener('beforeunload', guard); location.search = ''; } };
  const guard = e => { if (pending()){ e.preventDefault(); e.returnValue = ''; } };
  addEventListener('beforeunload', guard);

  /* ---------- where an element lives in the file ---------- */
  const pathTo = (n, top) => { const p = []; while (n !== top){ p.unshift([...n.parentElement.children].indexOf(n)); n = n.parentElement; } return p; };
  const follow = (top, p) => p.reduce((n, k) => n && n.children[k], top);
  function srcOf(e){
    if (idx.has(e)) return srcList[idx.get(e)];
    return extra.get(e) || null;
  }

  /* ---------- the file ---------- */
  const DB = 'jtj-edit';
  const idb = (mode, fn) => new Promise((res, rej) => {
    const o = indexedDB.open(DB, 1);
    o.onupgradeneeded = () => o.result.createObjectStore('h');
    o.onsuccess = () => { try { const t = o.result.transaction('h', mode); const r = fn(t.objectStore('h')); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); } catch (err){ rej(err); } };
    o.onerror = () => rej(o.error);
  });
  async function handle(){
    if (!window.showOpenFilePicker) return null;
    let h = await idb('readonly', s => s.get(location.pathname)).catch(() => null);
    if (h && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') h = null;
    if (!h){
      ui(`Pick this page's file: ${file}`);
      [h] = await showOpenFilePicker({ types: [{ description: 'Web page', accept: { 'text/html': ['.html'] } }] });
      if (h.name !== file && !confirm(`You picked "${h.name}", but this page is "${file}". Save into it anyway?`)) throw new Error('cancelled');
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('No permission to save');
      await idb('readwrite', s => s.put(h, location.pathname)).catch(() => {});
    }
    return h;
  }
  const pickText = () => new Promise((res, rej) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.html';
    i.onchange = () => i.files[0] ? i.files[0].text().then(res) : rej(new Error('cancelled')); i.click();
  });

  // the edited block, cleaned: anything the page's scripts added is dropped, original attributes are restored
  function clean(live){
    const c = live.cloneNode(true);
    const L = [...live.querySelectorAll('*')], C = [...c.querySelectorAll('*')];
    C.forEach((n, k) => {
      const s = srcOf(L[k]);
      if (n.tagName === 'BR') { [...n.attributes].forEach(a => n.removeAttribute(a.name)); return; }
      if (!s || s.tagName !== n.tagName){ n.replaceWith(...n.childNodes); return; }
      [...n.attributes].forEach(a => n.removeAttribute(a.name));
      [...s.attributes].forEach(a => n.setAttribute(a.name, a.value));
      // live values (the clock, the year) go back to what the file had
      if (s.matches('[data-ftime],[data-fyear],[data-navtime]')) n.innerHTML = s.innerHTML;
    });
    return c.innerHTML;
  }

  let saving = false;
  async function save(){
    if (saving || !pending()) return;
    saving = true; ui('Saving…');
    try {
      const h = await handle();
      const text = h ? await (await h.getFile()).text() : await pickText();
      if (!src){
        const doc = new DOMParser().parseFromString(text, 'text/html'), list = [...doc.body.querySelectorAll('*')];
        // the file must be the one this page was loaded from, unchanged since
        const bad = els.findIndex((e, i) => !list[i] || list[i].tagName !== e.tagName);
        const moved = [...dirty].some(r => idx.has(r) && direct(list[idx.get(r)]) !== txt[idx.get(r)]);
        if (bad >= 0 || moved) throw new Error(`That file doesn't match this page. Pick ${file} from the folder you opened (and reload if you edited it by hand).`);
        src = doc; srcList = list;
      } else if (lastWritten !== null && h && text !== lastWritten){
        throw new Error('The file was changed outside edit mode. Reload the page (keep ?edit) and try again.');
      }
      for (const op of ops){
        if (op.t === 'dup'){
          const so = srcOf(op.orig); if (!so) continue;
          const sc = so.cloneNode(true); so.after(sc);
          extra.set(op.clone, sc);
          op.clone.querySelectorAll('*').forEach(n => {
            const o = origin.get(n), oS = o && srcOf(o);
            if (oS && so.contains(oS)) extra.set(n, follow(sc, pathTo(oS, so)));
          });
        } else srcOf(op.el)?.remove();
      }
      for (const r of dirty){
        if (!r.isConnected) continue;
        const s = srcOf(r); if (!s) continue;
        s.innerHTML = clean(r);
      }
      // keep the end of the file stable so repeated saves don't add blank lines
      const B = src.body; while (B.lastChild?.nodeType === 3 && !B.lastChild.data.trim()) B.lastChild.remove(); B.append('\n');
      const out = '<!DOCTYPE html>\n' + src.documentElement.outerHTML + '\n';
      if (h){ const w = await h.createWritable(); await w.write(out); await w.close(); lastWritten = out; }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'text/html' })); a.download = file; a.click(); }
      dirty.forEach(r => r.classList.remove('ed-dirty')); dirty.clear(); ops.length = 0;
      ui(h ? `Saved to ${h.name}` : `Downloaded ${file}: replace the old file with it`);
    } catch (err){
      ui(err.name === 'AbortError' || err.message === 'cancelled' ? 'Not saved' : err.message);
    } finally { saving = false; }
  }
}
