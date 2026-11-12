/** Bản tin Hải quan 07H: proxy chỉ đọc dữ liệu đã phát hành qua Google Apps Script.
 * Cloudflare Pages advanced mode: _worker.js (hỗ trợ Direct Upload bằng ZIP).
 * Không có khóa API, không có cookie, không đọc các tệp khác trong Google Drive.
 */
const UPSTREAM = "https://script.google.com/macros/s/AKfycbyx_Du4rIL8PkiYxflgkTBDNvpp9kgKy3c-RnWrKtRCQRf5CBcmIO1VTRLVZyt7pRwspg/exec";
const CALLBACK = '__hq07h_jsonp_proxy_1';
const ORIGIN = 'https://bantin7h-kv11.pages.dev';
const ALLOWED = new Set(['index', 'issue', 'pdf']);

function jsonResult(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
function problem(code, detail, status = 502) {
  return jsonResult({ok:false, error:code, detail: detail || null}, status);
}
function parseBody(text) {
  const s = String(text || '').trim();
  if (s.length > 4000000) throw new Error('UPSTREAM_RESPONSE_TOO_LARGE');
  const prefix = CALLBACK + '(';
  if (!s.startsWith(prefix) || !s.endsWith(');')) {
    if (/^\s*<!doctype html|^\s*<html|accounts\.google\.com|Sign in - Google/i.test(s)) {
      throw new Error('APPS_SCRIPT_NOT_PUBLIC_OR_LOGIN_REQUIRED');
    }
    if (/^\s*\{/.test(s)) {
      const err = JSON.parse(s);
      throw new Error(err.error || 'APPS_SCRIPT_CALLBACK_REJECTED');
    }
    throw new Error('APPS_SCRIPT_INVALID_JSONP');
  }
  const data = JSON.parse(s.slice(prefix.length, -2));
  if (!data || typeof data !== 'object') throw new Error('APPS_SCRIPT_INVALID_DATA');
  return data;
}
async function fromGoogle(requestUrl) {
  const mode = requestUrl.searchParams.get('mode') || 'index';
  if (!ALLOWED.has(mode)) return {error:problem('MODE_NOT_ALLOWED', 'Yêu cầu không hợp lệ', 400)};
  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set('callback', CALLBACK);
  upstream.searchParams.set('mode', mode);
  if (mode === 'issue') {
    const date = requestUrl.searchParams.get('date') || '';
    if (!/^20\d{2}-(0[1-9]|1[0-2])-[0-3]\d$/.test(date))
      return {error:problem('INVALID_DATE', 'Ngày bản tin không hợp lệ', 400)};
    upstream.searchParams.set('date', date);
  }
  if (mode === 'pdf') {
    const id = requestUrl.searchParams.get('id') || '';
    if (!/^[A-Za-z0-9_-]{12,}$/.test(id))
      return {error:problem('INVALID_PDF_ID','Mã PDF không hợp lệ',400)};
    upstream.searchParams.set('id', id);
  }
  let response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    response = await fetch(upstream.href, {
      redirect:'follow',
      headers:{Accept:'application/javascript, text/javascript, */*'},
      signal:controller.signal
    });
  } catch (e) {
    return {error:problem('GOOGLE_NETWORK_ERROR', 'Cloudflare không nhận được phản hồi từ Apps Script: ' + String(e.name || 'network'))};
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    return {error:problem('APPS_SCRIPT_HTTP_' + response.status, 'Google trả về HTTP ' + response.status)};
  }
  let raw;
  try {raw = await response.text();}
  catch (_) {return {error:problem('GOOGLE_BODY_READ_ERROR', 'Không đọc được phản hồi từ Google')};}
  let value;
  try {value = parseBody(raw);}
  catch (e) {return {error:problem(e.message, 'Kiểm tra Apps Script > Deploy > Manage deployments > Who has access: Anyone và phiên bản mới nhất')};}
  if (value.ok === false) {
    return {error:problem('APPS_SCRIPT_' + (value.error || 'FAILED'), 'Apps Script chưa trả về dữ liệu hợp lệ')};
  }
  if (mode === 'index' && (!Array.isArray(value.issues) || !Array.isArray(value.articles))) {
    return {error:problem('APPS_SCRIPT_INVALID_INDEX', 'Thiếu danh sách bản tin')};
  }
  return {data:value, mode};
}
export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    if (u.pathname !== '/api/hq07h') return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return problem('METHOD_NOT_ALLOWED', 'Chỉ đọc', 405);
    const mode = u.searchParams.get('mode') || 'index';
    const cacheable = mode === 'index' || mode === 'issue';
    let cacheKey = null;
    if (cacheable) {
      const keyUrl = new URL(ORIGIN + '/api/hq07h');
      keyUrl.searchParams.set('mode', mode);
      if (mode === 'issue') keyUrl.searchParams.set('date', u.searchParams.get('date') || '');
      cacheKey = new Request(keyUrl.toString(), {method:'GET'});
      try {
        const hit = await caches.default.match(cacheKey);
        if (hit) return jsonResult(await hit.json());
      } catch (_) { /* không để lỗi cache làm hỏng trang */ }
    }
    const fetched = await fromGoogle(u);
    if (fetched.error) return fetched.error;
    const data = fetched.data;
    if (cacheKey && ctx && typeof ctx.waitUntil === 'function') {
      const ttl = mode === 'index' ? 30 : 3600;
      const cached = new Response(JSON.stringify(data), {
        headers:{'Cache-Control':'public, max-age=' + ttl,'Content-Type':'application/json; charset=utf-8'}
      });
      ctx.waitUntil(caches.default.put(cacheKey, cached).catch(()=>{}));
    }
    return jsonResult(data);
  }
};
