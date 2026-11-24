/**
 * CẤU HÌNH WEBSITE & DANH SÁCH ALBUM
 * - Có thể chỉnh trực tiếp trên web bằng nút "Quản trị" rồi tải lại tệp data.js này (hoặc đồng bộ thẳng lên GitHub).
 * - Tài khoản mặc định: admin / 123456 (hãy đổi mật khẩu trong mục Quản trị -> Xuất bản & Cài đặt).
 * - Ảnh trên Google Drive cần bật quyền "Bất kỳ ai có đường liên kết -> Người xem".
 */
window.GALLERY_CONFIG = {
  "brandName": "STUDIO GALLERY",
  "footerText": "© 2026 Studio Gallery • Lưu giữ khoảnh khắc",
  "admin": {
    "username": "admin",
    "passwordHash": "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
  },
  "albums": [
    {
      "id": "minh-anh-quoc-bao",
      "title": "Minh Anh & Quốc Bảo",
      "category": "Phóng sự cưới",
      "description": "Những khoảnh khắc tự nhiên và trọn vẹn cảm xúc trong ngày chung đôi.",
      "updatedAt": "24/11/2026",
      "cover": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
      "photos": [
        {
          "url": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
          "caption": "Khoảnh khắc đón dâu buổi sáng"
        },
        {
          "url": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
          "caption": "Không gian tiệc tối giản"
        },
        {
          "url": "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
          "caption": "Nụ cười trong lễ gia tiên"
        },
        {
          "url": "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80",
          "caption": "Ánh nắng chiều nhẹ nhàng"
        }
      ]
    },
    {
      "id": "chan-dung-thu-ha-noi",
      "title": "Chân dung Thu Hà Nội",
      "category": "Chân dung",
      "description": "Bộ ảnh dạo phố với ánh sáng tự nhiên và bảng màu trầm ấm.",
      "updatedAt": "18/11/2026",
      "cover": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1600&q=80",
      "photos": [
        {
          "url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
          "caption": "Ánh sáng bên khung cửa"
        },
        {
          "url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
          "caption": "Chiều muộn phố cổ"
        },
        {
          "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
          "caption": "Góc máy cận tự nhiên"
        }
      ]
    },
    {
      "id": "su-kien-gala-2026",
      "title": "Gala Dinner 2026",
      "category": "Sự kiện",
      "description": "Toàn cảnh sự kiện thường niên và khoảnh khắc kết nối trên sân khấu.",
      "updatedAt": "10/11/2026",
      "cover": "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80",
      "photos": [
        {
          "url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
          "caption": "Khai mạc chương trình"
        },
        {
          "url": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80",
          "caption": "Phiên chia sẻ trên sân khấu"
        }
      ]
    }
  ]
};
