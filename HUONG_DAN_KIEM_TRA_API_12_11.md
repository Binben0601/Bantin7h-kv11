# BẢN TIN HẢI QUAN 07H — Khắc phục lỗi Apps Script không kết nối trên iPhone (12/11/2026)

## Nguyên nhân đã xác minh

- Trên iPhone, trang `kiem-tra-dong-bo` báo `CHƯA KẾT NỐI`, `da_cau_hinh:true`, `ngay_trong_API:[]`.
- Bên Google Drive, `feed.json` đã có 4 ngày (09–12/11/2026) và đủ 29 tin, vì vậy việc quét PDF **đã hoạt động**.
- Lỗi nằm ở đường đọc Web App từ trình duyệt, chưa chứng minh Google Apps Script công khai/không công khai.

## Sửa đổi chính

1. `_worker.js` nằm ngay gốc ZIP: Cloudflare Pages trực tiếp đọc Apps Script ở phía máy chủ, phục vụ dữ liệu qua `/api/hq07h?mode=index` cùng tên miền.
2. `assets/auto-feed.js`: trên iPhone dùng `fetch()` cùng nguồn tới `/api/hq07h`, thay cho tải JavaScript chéo miền từ Google.
3. Đóng gói sẵn **12/11/2026 (7 tin)** làm dự phòng, bao gồm PDF và trang đọc; giữ tất cả bản 09-11.
4. Giữ nguyên giao diện banner xanh, menu, chọn ngày, danh mục, nút PDF và footer.

## Triển khai

A. Cloudflare Dashboard > Workers & Pages > bantin7h-kv11 > Create deployment > Production. Tải nguyên ZIP, không lấy một vài file riêng.
B. Mở `https://bantin7h-kv11.pages.dev/api/hq07h?mode=index` trong Safari/Chrome; nếu hoạt động, trang hiển thị JSON với `ok:true`, `issues` có ngày hôm nay.
C. Mở `/kiem-tra-dong-bo/`, nhấn **Kiểm tra kết nối lại**. Chỉ khi hiển thị `THÀNH CÔNG` mới kết luận tự động hoạt động.

Nếu API có lỗi `APPS_SCRIPT_NOT_PUBLIC_OR_LOGIN_REQUIRED`, cần vào Apps Script > Deploy > Manage deployments > Edit, xác nhận `Execute as: Me`, `Who has access: Anyone` (không phải `Anyone with Google account`), chọn **New version**, rồi **Deploy**. Không chạy `setup` lại chỉ để sửa quyền Web App.

Nếu /api/hq07h trả 404 hay HTML của Cloudflare thay vì JSON: `_worker.js` chưa được đưa vào bản triển khai Production. Cloudflare Docs xác nhận Drag and Drop hỗ trợ `_worker.js` advanced mode. 

**Lưu ý:** Gói 12/11 là dự phòng. Nếu API vẫn chưa công khai, website có thể hiển thị 12/11 nhưng **các ngày tiếp theo không tự động xuất hiện**. Chỉ xác nhận khi `/kiem-tra-dong-bo/` báo THÀNH CÔNG và liệt kê ngày mới nhất trong API.
