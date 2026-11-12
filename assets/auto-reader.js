(function(){'use strict';
const host=document.getElementById('hq07h-auto-reader');
if(!host)return;
const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>/^(\d{4})-(\d{2})-(\d{2})$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
const d=new URLSearchParams(location.search).get('ngay')||'';
const fail=text=>{host.innerHTML=`<div class="reader-cover"><h1>Không thể mở bản tin</h1><p>${e(text)}</p><a class="btn btn-blue" href="/kho-ban-tin/">Mở kho tra cứu →</a></div>`;};
if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){fail('Chưa chọn ngày bản tin hợp lệ.');return;}
document.title=`Bản tin Hải quan 07H – ${fmt(d)} | Hải quan khu vực XI`;
window.HQ07H_GET_ISSUE(d).then(x=>{
  if(!x || !x.pdf)throw new Error('Không có dữ liệu PDF cho ngày này');
  const articles=Array.isArray(x.articles)?x.articles:[];
  const title=`Bản tin Hải quan 07H – ${fmt(d)}`;
  const pdfUrl=/^https:\/\//i.test(x.pdf.url||'')?x.pdf.url:'#';
  host.innerHTML=`
    <div class="reader-cover">
      <div class="breadcrumbs"><a href="/">Trang chủ</a><span>›</span><a href="/kho-ban-tin/">Kho bản tin</a><span>›</span><span>${e(fmt(d))}</span></div>
      <div class="kicker">BẢN TIN NGÀY ${e(fmt(d))}</div>
      <h1>${e(title)}</h1>
      <div class="reader-meta"><span>${articles.length} mục tin</span><span>Múi giờ Việt Nam</span></div>
      <div class="reader-brief">Bản tin được đồng bộ từ tệp PDF đã đưa vào thư mục Google Drive. Nội dung tổng hợp phục vụ tham khảo, không thay thế nguồn gốc và văn bản chính thức.</div>
      <div class="reader-actions"><a class="btn btn-blue" id="hq07h-dynamic-pdf" target="_blank" rel="noopener" href="${e(pdfUrl)}">Xem bản PDF ↗</a></div>
    </div>
    <div class="reader-body">
      <div id="hq07h-auto-articles">${articles.length?'':`<div class="notice">Chưa trích xuất được nội dung chi tiết của bản PDF này. Bạn vẫn có thể xem đầy đủ tệp PDF ở trên.</div>`}</div>
      <div id="hq07h-auto-notes"></div>
    </div>`;
  document.getElementById('hq07h-dynamic-pdf').addEventListener('click',event=>{
    if(x.pdf && x.pdf.fileId && window.HQ07H_OPEN_PDF){event.preventDefault();window.HQ07H_OPEN_PDF(x.pdf.fileId,pdfUrl);}
  });
  const articleHost=document.getElementById('hq07h-auto-articles');
  articleHost.innerHTML=articles.map((a,i)=>{
    const id=/^\d{1,2}$/.test(String(a.id))?String(a.id).padStart(2,'0'):String(i+1).padStart(2,'0');
    const sourceUrl=/^https:\/\//i.test(a.source_url||'')?a.source_url:'';
    return `<section class="article-section" id="tin-${id}">
      <div class="eyebrow"><span class="number">${e(id)}</span>${e(a.eyebrow||'TIN HẢI QUAN')}</div>
      <h2>${e(a.title)}</h2><p>${e(a.summary)}</p>
      <div class="article-source"><span>Nguồn: <b>${e(a.source||'Nguồn trong bản PDF')}</b>${a.source_date?' · Đăng ngày '+e(fmt(a.source_date)):''}</span>${sourceUrl?`<a href="${e(sourceUrl)}" target="_blank" rel="noopener noreferrer">Đọc bài gốc ↗</a>`:''}</div>
    </section>`;
  }).join('');
  const notes=Array.isArray(x.notes)?x.notes:[];
  if(notes.length)document.getElementById('hq07h-auto-notes').innerHTML=`<div class="reading-note" id="theo-doi"><h2>II. Vấn đề cần theo dõi</h2><ol>${notes.map(n=>`<li>${e(n.replace(/^\d+[.)]\s*/,''))}</li>`).join('')}</ol><p>Nhận định chỉ nhằm tham khảo, không phải chỉ đạo chính thức.</p></div>`;
  const toc=document.getElementById('hq07h-auto-toc');
  if(toc)toc.innerHTML=articles.map((a,i)=>`<a href="#tin-${String(i+1).padStart(2,'0')}"><span>${String(i+1).padStart(2,'0')}.</span> ${e(a.title)}</a>`).join('');
  if(location.hash&&/^#tin-\d{2}$/.test(location.hash)){
    requestAnimationFrame(()=>document.querySelector(location.hash)?.scrollIntoView());
  }
}).catch(err=>{fail('Website chưa nhận được bản tin này. Kiểm tra kết nối đồng bộ hoặc thử lại sau.');console.warn('HQ07H reader:',err.message);});
})();
