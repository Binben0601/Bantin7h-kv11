(function(){'use strict';
const root=document.documentElement;
const $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
const $=(s,p=document)=>p.querySelector(s);
const categories={'dia-ban':'Địa bàn khu vực XI','chinh-sach':'Chính sách – thủ tục','kiem-soat':'Kiểm soát – chống buôn lậu','thu-ngan-sach':'Thu ngân sách','quoc-te':'Thị trường quốc tế','khac':'Tin khác'};
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase();}
function safeText(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(d){const a=(d||'').split('-');return a.length===3?`${a[2]}/${a[1]}/${a[0]}`:d;}
function fmtMonth(d){const a=(d||'').split('-');return a.length>=2?`Tháng ${Number(a[1])}/${a[0]}`:d;}
function linkFor(issue,item){return (window.HQ07H_ISSUE_URL ? window.HQ07H_ISSUE_URL(issue.date) : `/ban-tin/${encodeURIComponent(issue.date)}/`) + '#tin-' + encodeURIComponent(item.id);}
let toastTimer;
function toast(s){const x=$('#toast');if(!x)return;x.textContent=s;x.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>x.classList.remove('on'),2600);}
let mode='light';try{mode=localStorage.getItem('hq07h-theme')||((matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light');}catch(e){}root.dataset.theme=mode;
function updateThemeIcon(){const t=$('[data-theme-toggle]');if(t){t.textContent=root.dataset.theme==='dark'?'☀':'☾';t.setAttribute('aria-label',root.dataset.theme==='dark'?'Bật chế độ sáng':'Bật chế độ tối');}}
updateThemeIcon();$$('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>{const t=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=t;try{localStorage.setItem('hq07h-theme',t);}catch(e){}updateThemeIcon();}));
const menu=$('.header-menu');$$('[data-menu-toggle]').forEach(b=>b.addEventListener('click',()=>{if(!menu)return;const open=menu.classList.toggle('open');b.setAttribute('aria-expanded',String(open));}));
$$('[data-share]').forEach(b=>b.addEventListener('click',async()=>{const url=new URL(b.getAttribute('data-share-url')||location.href,location.origin).href;const title=document.title;try{if(navigator.share){await navigator.share({title,url});return;}}catch(e){if(e.name==='AbortError')return;}try{await navigator.clipboard.writeText(url);toast('Đã sao chép liên kết để chia sẻ');}catch(e){const el=document.createElement('textarea');el.value=url;document.body.appendChild(el);el.select();try{document.execCommand('copy');toast('Đã sao chép liên kết');}catch(error){toast('Không thể tự sao chép. Hãy dùng thanh địa chỉ.');}el.remove();}}));
const fontSizes={small:0.92,normal:1,large:1.14};
function setSize(v){if(!fontSizes[v])v='normal';root.style.setProperty('--reading-scale',fontSizes[v]);$$('[data-font-size]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.fontSize===v)));try{localStorage.setItem('hq07h-size',v);}catch(e){}}
let savedSize='normal';try{savedSize=localStorage.getItem('hq07h-size')||'normal';}catch(e){}setSize(savedSize);$$('[data-font-size]').forEach(b=>b.addEventListener('click',()=>setSize(b.dataset.fontSize)));

const issueSelect=$('[data-issue-select]');const topicSelect=$('[data-topic-select]');
const indexPromise=window.HQ07H_LOAD_FEED?window.HQ07H_LOAD_FEED():fetch('/data/search-index.json').then(r=>r.json());
function syncHome(data){
  if(!data.issues || !data.issues.length)return;
  const newest=[...data.issues].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const url=window.HQ07H_ISSUE_URL?window.HQ07H_ISSUE_URL(newest.date):'/ban-tin/'+newest.date+'/';
  const newArticles=data.articles.filter(a=>a.issue_date===newest.date).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(newest.date <= (window.HQ07H_BUNDLED_LATEST||'2026-11-11')) return; // không sửa giao diện khi chưa có tin mới
  const grid=$('.stories-grid');
  const link=$('.stories-grid')?.closest('.section')?.querySelector('.section-head a');
  if(link){link.href=url;link.textContent=newArticles.length?'Đọc đủ '+newArticles.length+' tin →':'Xem bản tin →';}
  if(grid){
    if(newArticles.length){
      grid.innerHTML=newArticles.slice(0,3).map((a,i)=>{
        const href=linkFor({date:newest.date},a);
        return `<article class="story ${i===0?'featured':''}"><div class="story-num">TIN ${safeText(a.id)} · ${safeText(a.eyebrow||categories[a.category]||'TIN HẢI QUAN')}</div><h3><a href="${safeText(href)}">${safeText(a.title)}</a></h3><p>${safeText(a.summary)}</p><div class="story-foot"><span>${safeText(a.source||'Nguồn trong bản PDF')}${a.source_date?' · '+safeText(fmt(a.source_date)):''}</span><a href="${safeText(href)}">Đọc tiếp →</a></div></article>`;
      }).join('');
    }else{
      grid.innerHTML=`<article class="story featured"><div class="story-num">BẢN TIN NGÀY ${safeText(fmt(newest.date))}</div><h3><a href="${safeText(url)}">Bản tin Hải quan mới</a></h3><p>Đã tiếp nhận bản PDF mới. Nội dung chưa thể trích xuất đầy đủ để hiển thị từng tin. Mời xem bản PDF.</p><div class="story-foot"><span>Google Drive</span><a href="${safeText(url)}">Xem bản tin →</a></div></article>`;
    }
  }
  const pdfBtn=$('.quick-pdf-button');
  if(pdfBtn&&newest.pdf){
    pdfBtn.href=newest.pdf.url;
    // Giữ nguyên chữ, màu, kích thước và dòng hướng dẫn dưới nút.
    pdfBtn.onclick=e=>{e.preventDefault();window.HQ07H_OPEN_PDF(newest.pdf.fileId,newest.pdf.url);};
  }
  const countLine=$('.bottom-grid-single .panel p:last-child');
  if(countLine){
    const total=(data.articles||[]).length;
    countLine.innerHTML=`Đang lưu <strong>${data.issues.length} bản tin</strong> · <strong>${total} mục tin</strong>, bắt đầu từ ${safeText(fmt(data.issues[data.issues.length-1].date))}.`;
  }
}
function renderLatestData(data){
  if(issueSelect&&Array.isArray(data.issues)){
    const issues=[...data.issues].sort((a,b)=>b.date.localeCompare(a.date));
    const prev=issueSelect.value;
    issueSelect.innerHTML=issues.map((issue,i)=>`<option value="${safeText(issue.date)}" ${i===0?'selected':''}>${safeText(fmt(issue.date))} — ${i===0?'Bản tin mới':('Bản tin số '+safeText(issue.number||''))}</option>`).join('');
    if(prev && issues.length && prev!==issues[0].date && issues.some(i=>i.date===prev) && document.activeElement===issueSelect)issueSelect.value=prev;
  }
  if($('.stories-grid'))syncHome(data);
  if(window.HQ07H_SEARCH_APPLY_FEED)window.HQ07H_SEARCH_APPLY_FEED(data);
}
indexPromise.then(renderLatestData).catch(()=>{});
// Khi iPhone mở lại tab cũ hoặc giữ trang từ hôm trước, tải lại danh mục mới nhất.
let lastAutoCheck=0;
function checkFreshFeed(){
  if(!window.HQ07H_LOAD_FEED || document.hidden)return;
  if(Date.now()-lastAutoCheck<30000)return;
  lastAutoCheck=Date.now();
  window.HQ07H_LOAD_FEED(true).then(renderLatestData).catch(err=>console.warn('HQ07H refresh:',err));
}
window.addEventListener('pageshow',event=>{if(event.persisted)checkFreshFeed();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkFreshFeed();});
window.setInterval(checkFreshFeed,90000);
if(issueSelect){issueSelect.addEventListener('change',()=>{if(!issueSelect.value)return;location.href=window.HQ07H_ISSUE_URL?window.HQ07H_ISSUE_URL(issueSelect.value):`/ban-tin/${encodeURIComponent(issueSelect.value)}/`;});}
if(topicSelect){topicSelect.addEventListener('change',()=>{if(!topicSelect.value)return;location.href=`/kho-ban-tin/?muc=${encodeURIComponent(topicSelect.value)}`;});}

const searchInput=$('#search-query');const results=$('#search-results');
if(searchInput&&results){let data=[];
  const monthSelect=$('#filter-month'), yearSelect=$('#filter-year'),catSelect=$('#filter-category');
  function render(){const q=normalize(searchInput.value.trim());const month=monthSelect.value,year=yearSelect.value,category=catSelect.value;
    const filtered=data.filter(x=>(!q||normalize([x.title,x.summary,x.source,x.eyebrow,x.issue_date,categories[x.category]].join(' ')).includes(q))&&(!month||x.issue_date.slice(0,7)===month)&&(!year||x.issue_date.slice(0,4)===year)&&(!category||x.category===category));
    if(!filtered.length){results.innerHTML='<div class="empty"><strong>Không tìm thấy bản tin phù hợp.</strong>Thử từ khóa khác, hoặc bỏ bớt bộ lọc để tìm lại.</div>';return;}
    results.innerHTML=filtered.map(x=>`<article class="result-card"><div class="result-date"><strong>${safeText(x.issue_date.slice(8))}</strong><small>${safeText(x.issue_date.slice(5,7))}/${safeText(x.issue_date.slice(0,4))}</small></div><div class="result-body"><div class="meta">${safeText(categories[x.category]||x.eyebrow)} · ${safeText(x.source||'Nguồn trong bản PDF')} ${x.source_date?'· '+safeText(fmt(x.source_date)):''}</div><h3><a href="${safeText(linkFor({date:x.issue_date},x))}">${safeText(x.title)}</a></h3><p>${safeText(x.summary)}</p></div><a class="result-action" href="${safeText(linkFor({date:x.issue_date},x))}">Đọc tin →</a></article>`).join('');
  }
  function applySearchFeed(x){
    data=x.articles||[];const issues=x.issues||[];data.sort((a,b)=>b.issue_date.localeCompare(a.issue_date)||String(a.id).localeCompare(String(b.id)));
    const months=[...new Set(issues.map(x=>x.date.slice(0,7)))].sort().reverse();months.forEach(m=>{if(!Array.from(monthSelect.options).some(o=>o.value===m)){const o=document.createElement('option');o.value=m;o.textContent=fmtMonth(m);monthSelect.appendChild(o)}});
    const years=[...new Set(issues.map(x=>x.date.slice(0,4)))].sort().reverse();years.forEach(y=>{if(!Array.from(yearSelect.options).some(o=>o.value===y)){const o=document.createElement('option');o.value=y;o.textContent=y;yearSelect.appendChild(o)}});
    render();
  }
  window.HQ07H_SEARCH_APPLY_FEED=applySearchFeed;
  indexPromise.then(x=>{
    applySearchFeed(x);const params=new URLSearchParams(location.search);
    const months=Array.from(monthSelect.options).map(o=>o.value),years=Array.from(yearSelect.options).map(o=>o.value);
    if(months.includes(params.get('thang')))monthSelect.value=params.get('thang');if(years.includes(params.get('nam')))yearSelect.value=params.get('nam');if(categories[params.get('muc')])catSelect.value=params.get('muc');if(params.get('q'))searchInput.value=params.get('q');render();
  }).catch(()=>{results.innerHTML='<div class="empty"><strong>Không thể tải danh mục tìm kiếm.</strong>Bạn vẫn có thể truy cập các bản tin trực tiếp từ trang chủ.</div>';});
  [searchInput,monthSelect,yearSelect,catSelect].forEach(el=>el.addEventListener(el===searchInput?'input':'change',render));
  $('#clear-filters')?.addEventListener('click',()=>{searchInput.value='';monthSelect.value='';yearSelect.value='';catSelect.value='';history.replaceState(null,'',location.pathname);render();searchInput.focus();});
}
})();
