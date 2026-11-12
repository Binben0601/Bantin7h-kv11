BẢN TIN HẢI QUAN 07H · GÓI WEBSITE ĐÃ CẤU HÌNH ĐỒNG BỘ TỰ ĐỘNG

Đã gắn Web App Google Apps Script trong assets/auto-config.js.
Giao diện, dữ liệu bản tin có sẵn và PDF không thay đổi.

CÁCH TRIỂN KHAI:
1. Vào Cloudflare → Workers & Pages → bantin7h-kv11.
2. Tạo deployment mới và tải lên ZIP này. index.html nằm ở thư mục gốc ZIP.
3. Mở https://bantin7h-kv11.pages.dev/ và tải lại trang.
4. Mở bộ chọn bản tin ngày; các ngày mới nhất nằm đầu danh sách nếu đồng bộ
   Apps Script đã tạo feed công khai thành công.

CÁCH KIỂM TRA WEB APP:
Mở URL trong assets/auto-config.js và thêm:
?mode=index&callback=__hq07h_jsonp_test
Dữ liệu đúng dạng: __hq07h_jsonp_test({"ok":true,...
(đúng ngày 10/11/2026 có 7 tin, 09/11/2026 có 8 tin).

LƯU Ý:
- Script đọc PDF từ Drive, đẩy dữ liệu công khai theo lịch setup đã tạo.
- Nếu chưa chạy setup hoặc chưa cấp quyền đọc Web App cho Anyone, có thể
  chỉ thấy dữ liệu tĩnh 09/11 và 10/11; cần thử endpoint trước.
- Trình duyệt chỉ làm mới dữ liệu khi mở hoặc tải lại, không chờ đẩy live.
- Không cho PDF nội bộ vào thư mục công bố.
- Không thêm mật khẩu, token hay khóa cá nhân vào ZIP frontend.
