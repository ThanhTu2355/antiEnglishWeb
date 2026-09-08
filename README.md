# AntiEnglish Web 🌟
> Ứng dụng web học từ vựng tiếng Anh hiện đại, kết hợp Flashcard 3D sinh động, luyện tập Điền nghĩa thông minh và phân loại theo khung tham chiếu Châu Âu (CEFR).

![AntiEnglish Banner](https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80)

---

## ✨ Tính Năng Nổi Bật

1. **Quản lý Thư mục từ vựng & Gộp thư mục (Merge Folders)**:
   - Tạo thư mục theo chủ đề với màu sắc và biểu tượng nhận diện.
   - Tính năng **Gộp thư mục** thông minh: Gom nhiều thư mục thành một, tự động chống trùng lặp từ vựng.
2. **Học Flashcard 3D Trực Quan**:
   - Thẻ lật 3D mượt mà (Space để lật, phím 1 để đánh dấu *Chưa thuộc*, phím 2 để đánh dấu *Đã thuộc*).
   - Phát âm tiếng Anh chuẩn bản ngữ qua Text-to-Speech (Web Speech API).
   - Chế độ lọc chuyên sâu: **Chỉ học từ chưa thuộc** giúp ôn tập tập trung các từ khó nhớ.
3. **Luyện Tập Điền Nghĩa & Trắc Nghiệm Thông Minh**:
   - **✍️ Gõ Điền Nghĩa**: Xem từ tiếng Anh, gõ nghĩa tiếng Việt với thuật toán so khớp tiếng Việt thông minh.
   - **🔤 Gõ Từ Tiếng Anh**: Xem nghĩa tiếng Việt, gõ từ vựng tiếng Anh.
   - **🎯 Trắc Nghiệm Phản Xạ**: Chọn 1 trong 4 đáp án nhanh chóng.
   - Streak chuỗi đúng liên tiếp, gợi ý ký tự đầu tiên và pháo hoa ăn mừng khi hoàn thành.
4. **Hệ Thống Phân Loại Cấp Bậc CEFR (A1 - C2)**:
   - Hỗ trợ đầy đủ 6 cấp bậc: A1 (Cơ bản) -> C2 (Thành thạo).
   - Huy hiệu màu sắc riêng biệt cho từng cấp độ.
   - Bộ lọc từ vựng theo cấp bậc ở mọi màn hình: Thư mục, Flashcard và Bài tập.
5. **Giao Diện Trung Tính (Neutral Theme)**:
   - Bảng màu Slate Charcoal Dimmed nằm giữa sáng và tối, chống mỏi mắt khi học lâu.
   - Bộ chuyển đổi nhanh 3 tông màu: **Trung tính** (mặc định), **Sáng** và **Tối**.
6. **Pop-up Xác Nhận Chuyên Nghiệp (ConfirmModal)**:
   - Hộp thoại cảnh báo trực quan khi xóa thẻ, xóa thư mục hoặc gộp thư mục, thay thế hoàn toàn `window.confirm` mặc định.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js 22 LTS, Express 5.
- **Database**: SQLite tích hợp sẵn (`node:sqlite` - DatabaseSync) chạy độc lập, tự động seed dữ liệu mẫu khi khởi động.
- **Xác thực**: JSON Web Token (JWT) & Bcrypt.

---

## 🚀 Cài Đặt & Chạy Cục Bộ (Local)

### Yêu cầu:
- Node.js >= 22.5.0 (khuyến nghị Node.js 22 LTS)
- npm >= 10.0.0

### Các bước cài đặt:
```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/antiEnglishWeb.git
cd antiEnglishWeb

# 2. Cài đặt dependencies cho cả backend và frontend
npm install
npm --prefix client install

# 3. Chạy môi trường phát triển (chạy song song cả server và client)
npm run dev

# Hoặc khởi chạy độc lập:
# Terminal 1: npm run server  (cổng 5000)
# Terminal 2: npm run client  (cổng 5173)
```

### Tài khoản mẫu trải nghiệm ngay:
- **Tên đăng nhập**: `demo`
- **Mật khẩu**: `123456`
- Hoặc bấm nút **"Đăng nhập nhanh 1-Click (Tài khoản mẫu)"** ở màn hình đăng nhập.

---

## 🌐 Hướng Dẫn Triển Khai Lên Internet Miễn Phí (Deploy to Cloud)

Dự án đã được cấu hình trọn gói (Frontend build tĩnh được backend Express phục vụ trực tiếp qua cổng duy nhất). Bạn có thể triển khai miễn phí trong 5 phút trên **Render.com** hoặc **Railway.app**:

### Cách triển khai trên Render.com:
1. Đăng ký/Đăng nhập tại [https://render.com](https://render.com).
2. Bấm **New +** -> Chọn **Web Service**.
3. Kết nối với GitHub repository của bạn (`antiEnglishWeb`).
4. Điền các thông tin:
   - **Name**: `anti-english-web` (hoặc tên tùy thích)
   - **Language**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Trong mục **Environment Variables**, thêm:
   - `NODE_VERSION`: `22.12.0`
   - `JWT_SECRET`: `tao_mot_chuoi_bi_mat_bat_ky_2026`
6. Bấm **Deploy Web Service** -> Chờ 2 phút là website của bạn sẽ có link truy cập công khai dạng `https://anti-english-web.onrender.com`!

---

## 📄 Bản Quyền
Phát hành theo giấy phép ISC.
