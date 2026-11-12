/* Bộ đọc bản tin tự động; dữ liệu mới chỉ từ Apps Script đã kiểm soát nguồn Drive. */
(function () {
  'use strict';
  const api = (window.HQ07H_FEED_URL || '').trim();
  let feedPromise = null;
  window.HQ07H_AUTO_STATUS = {connected:false, checked_at:null, error:'Chưa kiểm tra'};
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  const bundledDates = new Set(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']);
  const newestBundledDate = '2026-11-12';
  const validApi = /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(api);

  // Đồng bộ qua Cloudflare Pages cùng tên miền. Đã loại bỏ việc nạp script từ Google trên iPhone.
  async function jsonp(params) {
    if (!validApi) throw new Error('URL Apps Script chưa được cấu hình');
    const url = new URL('/api/hq07h', location.origin);
    Object.entries(params || {}).forEach(([k,v]) => url.searchParams.set(k, String(v)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch(url.href, {
        cache:'no-store', credentials:'omit', signal:controller.signal,
        headers: {'Accept':'application/json'}
      });
      let data;
      try { data = await response.json(); }
      catch (_) {throw new Error('PROXY_NOT_ACTIVE: Cloudflare chưa chạy _worker.js');}
      if (!response.ok || !data || data.ok === false) {
        const error = data && (data.error || data.detail);
        throw new Error(error || ('API_HTTP_' + response.status));
      }
      return data;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('API_TIMEOUT');
      throw error;
    } finally { clearTimeout(timer); }
  }

  async function loadFeed() {
    const response = await fetch('/data/search-index.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Không có dữ liệu website nội bộ');
    const local = await response.json();
    local.issues = Array.isArray(local.issues) ? local.issues : [];
    local.articles = Array.isArray(local.articles) ? local.articles : [];
    local.localDates = [...local.issues.map(x=>x.date)];
    if (!validApi) {window.HQ07H_AUTO_STATUS={connected:false,checked_at:new Date().toISOString(),error:'URL Apps Script chưa hợp lệ'};return local;}
    try {
      const remote = await jsonp({mode:'index'});
      if (!Array.isArray(remote.issues) || !Array.isArray(remote.articles)) throw new Error('API trả về dữ liệu không hợp lệ');
      window.HQ07H_AUTO_STATUS={connected:true,checked_at:new Date().toISOString(),remote_updated_at:remote.updated_at,issue_dates:remote.issues.map(i=>i.date),error:null,transport:'cloudflare-proxy'};
      const remoteIssues = remote.issues.filter(x => validDate(x.date));
      const remoteArticles = remote.articles.filter(x => validDate(x.issue_date) && typeof x.title === 'string');
      const localSet = new Set(local.issues.map(x => x.date));
      const addIssues = remoteIssues.filter(x => !localSet.has(x.date));
      const addDates = new Set(addIssues.map(x => x.date));
      const addArticles = remoteArticles.filter(a => addDates.has(a.issue_date));
      // Các ngày đóng gói sẵn được giữ nguyên nội dung và liên kết bài gốc.
      return {
        issues:[...local.issues, ...addIssues].sort((a,b)=>b.date.localeCompare(a.date)),
        articles:[...local.articles, ...addArticles],
        localDates:local.localDates,
        synced_at:remote.updated_at || null,
        remote_ok:true
      };
    } catch (e) {
      window.HQ07H_AUTO_STATUS={connected:false,checked_at:new Date().toISOString(),error:String(e.message),transport:'cloudflare-proxy'};
      console.warn('HQ07H: vẫn sử dụng dữ liệu đóng gói vì kết nối đồng bộ chưa sẵn sàng:',e.message);
      return local;
    }
  }

  window.HQ07H_LOAD_FEED = force => { if (force || !feedPromise) feedPromise = loadFeed(); return feedPromise; };
  window.HQ07H_ISSUE_URL = date => bundledDates.has(date) ? '/ban-tin/' + date + '/' : '/ban-tin/?ngay=' + encodeURIComponent(date);
  window.HQ07H_GET_ISSUE = async date => {
    if (!validDate(date)) throw new Error('Ngày không hợp lệ');
    const feed = await window.HQ07H_LOAD_FEED();
    if (!feed.issues.some(x => x.date === date)) throw new Error('Bản tin không có trong kho');
    return jsonp({mode:'issue', date:date});
  };
  window.HQ07H_OPEN_PDF = (fileId, fallback) => {
    if (!validApi || !/^[a-zA-Z0-9_-]{12,}$/.test(String(fileId || ''))) {
      window.open(fallback,'_blank','noopener'); return;
    }
    // Tạo tab trong cùng sự kiện click để Safari iOS không chặn sau lệnh bất đồng bộ.
    const popup = window.open('about:blank','_blank');
    if (!popup) {window.open(fallback,'_blank','noopener');return;}
    try {popup.document.title = 'Đang mở bản tin PDF';popup.document.body.innerHTML = '<p style="font:16px system-ui;padding:32px">Đang mở bản tin PDF…</p>';} catch (_){}
    jsonp({mode:'pdf', id:fileId}).then(data => {
      if (!data.data || data.mime !== 'application/pdf') throw new Error('Không nhận được tệp PDF');
      const binary = atob(data.data);
      const bytes = new Uint8Array(binary.length);
      for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], {type:'application/pdf'}));
      popup.location.replace(url);
    }).catch(() => {try {popup.location.replace(fallback)} catch(_) {}});
  };
  window.HQ07H_AUTO_CONNECTED = validApi;
  window.HQ07H_BUNDLED_LATEST = newestBundledDate;
})();
