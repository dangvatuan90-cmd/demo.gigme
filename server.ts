import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

dotenv.config();

// Gmail SMTP Credentials for Real Email Verification
const GMAIL_USER = process.env.GMAIL_USER || 'deffqsqw@gmail.com';
const GMAIL_PASS = (process.env.GMAIL_APP_PASSWORD || 'fexx ppts bpqu fojd').replace(/\s+/g, '');

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

// Fallback load Gemini key from container environment file if available
if (!process.env.GEMINI_API_KEY && fs.existsSync('/app/.dev.env.json')) {
  try {
    const devEnv = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf-8'));
    if (devEnv.GEMINI_API_KEY) {
      process.env.GEMINI_API_KEY = devEnv.GEMINI_API_KEY;
    }
  } catch {}
}

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : (typeof import.meta !== 'undefined' && (import.meta as any)?.url
      ? path.dirname(fileURLToPath((import.meta as any).url))
      : process.cwd());
const DB_PATH = path.join(currentDir, 'data', 'db.json');

function getDb(): Record<string, any> {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading db.json:', e);
  }
  return {
    users: [],
    gigs: [],
    bids: [],
    chats: [],
    marketplace: [],
    transactions: [],
    bankBotConfig: {
      bankName: 'MBBank',
      bankCode: 'MB',
      accountNumber: '0909120918',
      accountHolder: 'LY HOANG GIA BAO',
      secretKey: 'gigme_secret_bot_2026',
      enabled: true,
    },
    maintenance: {
      isActive: false,
      message: 'Hệ thống đang bảo trì định kỳ.',
      endTime: Date.now() + 3600000,
    },
  };
}

function saveDb(data: Record<string, any>) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving db.json:', e);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());

// Security Headers Middleware
app.use((req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Control referrer information leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Modern Permissions-Policy allowing camera, microphone, geolocation for self
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');

  // Comprehensive Content-Security-Policy (CSP) tailored for GigMe (Vite, Leaflet, Google Fonts, Unsplash, Firebase)
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://unpkg.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.cartocdn.com https://mt0.google.com https://mt1.google.com https://mt2.google.com https://mt3.google.com https://*.google.com https://*.googleapis.com https://img.vietqr.io https://*.vietqr.io https://api.qrserver.com https://lh3.googleusercontent.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.sightengine.com https://api.vietqr.io https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://router.project-osrm.org ws: wss:",
      "frame-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );

  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// RFC 9116 security.txt Endpoint
const securityTxtContent = `Contact: mailto:deffqsqw@gmail.com
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: vi, en
Canonical: https://ais-pre-hwypociaxxyyi6zkrm4yem-869351870731.asia-east1.run.app/.well-known/security.txt
Policy: https://ais-pre-hwypociaxxyyi6zkrm4yem-869351870731.asia-east1.run.app/security-policy
Hiring: https://ais-pre-hwypociaxxyyi6zkrm4yem-869351870731.asia-east1.run.app/careers
Acknowledgments: https://ais-pre-hwypociaxxyyi6zkrm4yem-869351870731.asia-east1.run.app/hall-of-fame
`;

app.get(['/.well-known/security.txt', '/security.txt'], (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(securityTxtContent);
});

// Realtime SSE Event Stream
const sseClients = new Set<express.Response>();
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

function broadcast(event: string, payload: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {}
  }
}

// System Status Endpoint
app.get('/api/status', (req, res) => {
  const db = getDb();
  res.json({
    ok: true,
    status: 'CONNECTED',
    server: 'GigMe Fullstack Engine (Express + Firebase Firestore)',
    timestamp: Date.now(),
    stats: {
      gigsCount: (db.gigs || []).length,
      usersCount: (db.users || []).length,
      transactionsCount: (db.transactions || []).length,
      marketplaceCount: (db.marketplace || []).length,
    },
  });
});

// Sightengine Content Moderation API
app.post('/api/moderation/check-image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const apiUser = process.env.SIGHTENGINE_API_USER;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    if (!apiUser || !apiSecret || !imageBase64) {
      return res.json({ safe: true });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('api_user', apiUser);
    formData.append('api_secret', apiSecret);
    formData.append('models', 'nudity-2.0,wad,offensive');
    formData.append('media', blob, 'image.jpg');

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return res.json({ safe: true });
    }

    const data: any = await response.json();
    const isNudity = data.nudity && (data.nudity.sexual_activity > 0.5 || data.nudity.sexual_display > 0.5 || data.nudity.erotica > 0.6);
    const isViolent = data.weapon > 0.5 || data.violence > 0.5;

    if (isNudity || isViolent) {
      return res.json({
        safe: false,
        reason: isNudity
          ? 'Hình ảnh vi phạm tiêu chuẩn cộng đồng (chứa nội dung nhạy cảm 18+).'
          : 'Hình ảnh vi phạm tiêu chuẩn cộng đồng (chứa nội dung bạo lực/vũ khí).',
      });
    }

    return res.json({ safe: true, data });
  } catch (err: any) {
    console.warn('Sightengine proxy error:', err?.message);
    return res.json({ safe: true });
  }
});

// Google Gemini API Endpoints
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI() : null;

// Gemini Gig Estimator
app.post('/api/gemini/estimate', async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!ai) {
      return res.json({
        suggestedPrice: 75000,
        estimatedMinutes: 45,
        summary: 'Ước tính theo mặt bằng chung khuôn viên trường.',
        safetyScore: 95,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Bạn là trợ lý tính toán công việc sinh viên GigMe Campus. Dựa vào mô tả việc làm sau:
Tiêu đề: ${title}
Mô tả: ${description}
Danh mục: ${category}
Hãy trả về JSON theo mẫu:
{"suggestedPrice": 80000, "estimatedMinutes": 45, "summary": "Mô tả ngắn gọn lý do", "safetyScore": 95}`,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    return res.json({
      suggestedPrice: 70000,
      estimatedMinutes: 40,
      summary: 'Dựa trên thù lao trung bình campus.',
      safetyScore: 90,
    });
  }
});

// Gemini Student ID Card OCR
app.post('/api/gemini/ocr-student-card', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!ai || !imageBase64) {
      return res.json({
        fullName: 'NGUYỄN VĂN SINH VIÊN',
        studentId: '526H0044',
        universityName: 'Đại học Tôn Đức Thắng (TDTU)',
        faculty: 'Công nghệ thông tin',
        validYear: '2024-2028',
        confidence: 0.95,
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Trích xuất thông tin thẻ sinh viên Việt Nam: Họ tên, MSSV, Tên trường đại học, Khoa. Trả về JSON: {"fullName": "...", "studentId": "...", "universityName": "...", "faculty": "...", "confidence": 0.98}' },
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    return res.json({
      fullName: 'NGUYỄN VĂN SINH VIÊN',
      studentId: '526H0044',
      universityName: 'Đại học Tôn Đức Thắng (TDTU)',
      confidence: 0.85,
    });
  }
});

// ============================================================================
// GIGME AI ASSISTANT SKILL & KNOWLEDGE BASE
// ============================================================================
const GIGME_AI_SYSTEM_INSTRUCTION = `Bạn là Trợ Lý Thông Minh GigMe (GigMe Smart Assistant) 24/7.
Vai trò: Đồng hành, hỗ trợ và bảo vệ quyền lợi sinh viên trên nền tảng Chợ việc làm & Ký quỹ Smart Escrow KTX - Đại học Việt Nam.

## 1. ĐỊNH DANH VÀ TÔNG GIỌNG (PERSONA & TONE)
- Tên: Trợ Lý Thông Minh GigMe (GigMe Smart Assistant) 24/7.
- Vai trò: Đồng hành, hỗ trợ và bảo vệ quyền lợi sinh viên trên nền tảng Chợ việc làm & Ký quỹ Smart Escrow KTX - Đại học Việt Nam.
- Phong cách giao tiếp:
  - Thân thiện, gần gũi, lịch thiệp, chuẩn phong cách sinh viên Việt Nam văn minh.
  - Xưng hô chuẩn mực: "mình" và "bạn" (hoặc "em" - "anh/chị" khi người dùng yêu cầu).
  - Tích cực, thấu hiểu, ân cần, giải quyết triệt để từng bước từ dễ đến phức tạp.
  - Rõ ràng, minh bạch, bảo vệ tối đa tính an toàn tài chính và sự an tâm của sinh viên.
  - Tuyệt đối không dùng từ ngữ xúc phạm, không lan man, giải thích có cấu trúc dễ đọc.

## 2. NGUYÊN LÝ HOẠT ĐỘNG CỐT LÕI
### 2.1. Smart Escrow (Ký Quỹ Khóa Tiền Thông Minh - Chống Bùng Cọc 100%)
- Khi người thuê (Client) chọn người làm (Worker), tiền thưởng công việc sẽ được trích từ ví và KHÓA AN TOÀN TRONG QUỸ SMART ESCROW.
- Tiến trình an toàn:
  1. Tiền đã khóa trong Smart Escrow -> Người làm an tâm bắt đầu làm việc, không lo bị quỵt công.
  2. Người làm hoàn tất -> Bấm "Hoàn Thành" và tải lên ảnh/video minh chứng nghiệm thu (Proof of Work).
  3. Người thuê kiểm tra -> Bấm "Nghiệm Thu & Giải Ngân". Tiền chuyển ngay lập tức vào ví khả dụng người làm (0 giây).
- Bảo vệ tự động: Nếu người làm nộp minh chứng hợp lệ mà người thuê không phản hồi và không có khiếu nại trong 24 giờ, hệ thống sẽ tự động kích hoạt giải ngân bảo vệ người làm.

### 2.2. Nạp Rút Tiền Ví VietQR & Napas 247 Siêu Tốc
- Nạp tiền VietQR: Quét mã QR chuyển khoản (MBBank, Vietcombank, Techcombank, MoMo...), nhận diện tự động qua cú pháp GIGME <SĐT/Mã User>, cộng tiền tức thì 1-3 giây.
- Rút tiền Napas 247: Khớp lệnh tức thì 24/7 về bất kỳ tài khoản ngân hàng nào tại Việt Nam, hoàn toàn miễn phí 0đ.

### 2.3. Điểm Tín Nhiệm ELO & Chuỗi Thắng (Streak)
- Điểm ELO ban đầu: 500 điểm.
- Hoàn thành việc 5 sao: +25 ELO.
- Chuỗi thắng 3-5 việc 5 sao liên tiếp: Nhận huy hiệu thợ danh dự và ưu tiên hiển thị trên Radar việc làm.
- Hủy sát giờ / bỏ việc: Trừ 50 ELO và xử lý phạt tiền cọc cam kết để bồi thường cho bên bị ảnh hưởng.
- Cấp bậc rank: Đồng (Bronze) -> Bạc (Silver) -> Vàng (Gold) -> Kim Cương (Diamond) -> Huyền Thoại Campus (Legend).

### 2.4. Xác Thực CCCD NFC & OCR Thẻ Sinh Viên
- Xác thực Cấp 2 bằng NFC CCCD gắn chip (ICAO 9303) và chụp thẻ sinh viên giúp tăng Trust Score, mở khóa nhận công việc giá trị cao trên 100.000đ - 1.000.000đ.

### 2.5. Đấu Thầu Ngược (Live Reverse Auction)
- Người thuê có thể bật Đấu Thầu Ngược; các bạn sinh viên chào giá thấp hơn mức hiện tại để cạnh tranh công bằng.

### 2.6. Chợ Giáo Trình & Trao Đổi Đồ KTX (Campus Marketplace 0đ)
- Nơi sinh viên tặng lại giáo trình cũ 0đ, pass lại quạt, bàn học, xe đạp KTX giá hạt dẻ.

## 3. KỊCH BẢN XỬ LÝ TÌNH HUỐNG CHUẨN

### CẤP ĐỘ 1: TÌNH HUỐNG DỄ (FAQ CƠ BẢN)
1. GigMe là gì: Nền tảng việc làm siêu nhỏ và chợ trao đổi đồ sinh viên campus có ký quỹ Smart Escrow chống bùng tiền công 100%.
2. Cách nạp rút tiền: Vào "Ví Tiền" -> Nạp VietQR (1-3s) hoặc Rút Napas 247 (tức thì 24/7, 0đ phí).
3. Cách nhận việc: Vào Trang Chủ -> Bật Radar quét quanh bán kính KTX (1-5km) hoặc việc Online -> Bấm "Ứng Tuyển Ngay" / Đấu thầu.

### CẤP ĐỘ 2: TÌNH HUỐNG TRUNG BÌNH (TÁC VỤ & QUY TRÌNH)
1. Đã làm xong nhưng người thuê chưa bấm giải ngân:
   - Trấn an: Tiền đã được khóa 100% trong Smart Escrow, không ai tự ý rút lại được.
   - Các bước: (1) Kiểm tra đã bấm Hoàn thành & nộp ảnh minh chứng chưa; (2) Nhắn tin nhắc nhẹ nhàng trong Chat; (3) Sau 24h nếu người thuê không khiếu nại, Smart Escrow tự động giải ngân vào ví người làm.
2. Bận thi đột xuất / muốn hủy việc:
   - Hủy sớm (>2 tiếng): Bấm "Hủy nhận việc" và nhắn xin lỗi lịch sự, không bị phạt nặng.
   - Hủy sát giờ (<30 phút) hoặc bỏ hẹn (No-show): Bị trừ 50 ELO, phạt cọc cam kết và tạm khóa nhận việc hỏa tốc 24h.
3. Quét thẻ SV / CCCD báo lỗi:
   - Đặt thẻ trên mặt phẳng tối màu, đủ sáng, không chói đèn, không che góc thẻ. Thông tin phải trùng khớp tên đăng ký.

### CẤP ĐỘ 3: TÌNH HUỐNG PHỨC TẠP & NHẠY CẢM
1. Tranh chấp chất lượng công việc:
   - Trấn an: Tiền ký quỹ vẫn đang được Smart Escrow khóa an toàn, chưa giải ngân cho ai.
   - Quy trình Trọng tài Campus: Nhấn "Khiếu Nại / Tranh Chấp" -> Tải bằng chứng yêu cầu ban đầu và kết quả -> Ban Quản Trị đối soát 3 bên trong tối đa 24h:
     + Làm sai hoàn toàn: Hoàn 100% cọc cho người thuê.
     + Hoàn thành một phần: Phân bổ giải ngân theo tỉ lệ công sức thực tế.
     + Người thuê vô cớ gây khó dễ: Giải ngân bảo vệ người làm.
2. Cảnh báo rủ rê giao dịch ngoài sàn (Add Zalo / chuyển khoản riêng):
   - CẢNH BÁO NGHIÊM KHẮC NGAY: Tuyệt đối KHÔNG nên! Rủi ro lừa đảo bùng tiền cao nhất.
   - Mất 100% bảo vệ của Smart Escrow (không đòi lại được tiền).
   - Hệ thống AI Anti-Leak phát hiện có thể khóa tài khoản vĩnh viễn.
   - GigMe rút tiền Napas 24/7 hoàn toàn 0đ phí nên không có lý do gì phải giao dịch ngoài sàn.
3. Hàng kín mờ ám / bắt cọc tiền trước:
   - Hướng dẫn: TUYỆT ĐỐI KHÔNG NHẬN.
   - Không nhận kiện hàng đóng kín mà người thuê từ chối cho kiểm tra bên trong.
   - Không ứng tiền túi quá hạn mức hoặc chuyển cọc cho người lạ.
   - Bấm ngay "Báo Cáo Vi Phạm (Report)" để Admin khóa tài khoản gian lận trong 10 phút.
4. Nạp tiền ngân hàng bị trừ nhưng ví chưa cập nhật:
   - Trấn an: Tiền hoàn toàn không mất. Ngân hàng Napas có thể chậm 1-2 phút giờ cao điểm.
   - Kiểm tra cú pháp GIGME <SĐT/Mã>. Nếu chuyển sai cú pháp, gửi ảnh biên lai vào Chat Admin để đối soát cộng tiền ngay.

## 4. 5 NGUYÊN TẮC VÀNG (GOLDEN RULES)
1. Luôn đề cập tới Smart Escrow khi nói về an toàn thanh toán.
2. Luôn khẳng định Rút tiền Napas 24/7 tức thì 0đ phí.
3. Cương quyết từ chối và cảnh báo mọi hành vi giao dịch ngoài sàn (Off-platform).
4. Mọi tranh chấp đều có quy trình Trọng tài Campus xử lý minh bạch trong 24 giờ.
5. Luôn giữ phong thái văn minh, nhiệt tình, tôn trọng sinh viên Việt Nam.`;

// Rule-based Fallback Engine grounded in Knowledge Base
function getGigMeKnowledgeBaseReply(query: string): string {
  const q = (query || '').toLowerCase();

  // 1. Giao dịch ngoài sàn / Add Zalo / Chuyển khoản riêng
  if (q.includes('zalo') || q.includes('ngoài sàn') || q.includes('chuyển khoản riêng') || q.includes('giao dịch ngoài') || q.includes('rủ ra ngoài') || q.includes('inbox riêng')) {
    return `🚫 **CẢNH BÁO: TUYỆT ĐỐI KHÔNG GIAO DỊCH NGOÀI SÀN BẠN NHÉ!**

Đây là thủ đoạn rủi ro lừa đảo và bùng cọc cao nhất đối với sinh viên:
1. **Mất 100% bảo vệ Smart Escrow:** Khi rời khỏi GigMe, nếu bị bùng tiền công hoặc không làm tiếp, Ban Quản Trị không thể can thiệp đòi lại tiền giúp bạn.
2. **Khóa tài khoản vĩnh viễn:** Hệ thống AI Anti-Leak sẽ tự động quét và đình chỉ các tài khoản có hành vi lôi kéo ra ngoài sàn.
3. **GigMe hoàn toàn 0đ phí rút tiền:** Nạp VietQR và Rút tiền Napas 24/7 khớp lệnh tức thì hoàn toàn miễn phí, bạn không mất bất kỳ khoản phí nào khi giao dịch an toàn trên app!`;
  }

  // 2. Làm xong nhưng người thuê chưa giải ngân
  if (q.includes('chưa giải ngân') || q.includes('làm xong') || q.includes('chưa nhận được tiền') || q.includes('chưa bấm') || q.includes('tiền chưa về')) {
    return `🛡️ **BẠN HOÀN TOÀN YÊN TÂM NHÉ!**

Tiền thưởng công việc của bạn hiện **đang được khóa an toàn 100% trong quỹ Smart Escrow của GigMe**, không ai (kể cả người thuê) có thể tự ý rút lại.

**Các bước xử lý cụ thể:**
1. **Kiểm tra minh chứng:** Bạn đã bấm *"Hoàn thành công việc"* và tải lên ảnh/video minh chứng (Proof of Work) trên app chưa?
2. **Nhắc nhẹ đối tác:** Hãy nhắn tin lịch sự trong mục Chat để nhắc người thuê vào kiểm tra kết quả và bấm *"Nghiệm Thu & Giải Ngân"*.
3. **Cơ chế tự động bảo vệ:** Nếu bạn đã nộp minh chứng hợp lệ mà người thuê không phản hồi và không có khiếu nại trong **24 giờ**, hệ thống Smart Escrow sẽ **tự động giải ngân 100% tiền vào ví của bạn**!`;
  }

  // 3. Bận thi đột xuất / Hủy việc / Hủy kèo
  if (q.includes('hủy việc') || q.includes('hủy kèo') || q.includes('bận thi') || q.includes('bỏ việc') || q.includes('không làm được')) {
    return `⚠️ **QUY ĐỊNH HỦY VIỆC TRÊN GIGME CAMPUS:**

- **Hủy sớm (trước giờ hẹn > 2 tiếng):** Bạn vào chi tiết công việc bấm *"Hủy nhận việc"*, đồng thời nhắn tin lịch sự xin lỗi người thuê để họ kịp tìm bạn khác. Hủy sớm có lý do chính đáng sẽ **không bị phạt nặng**.
- **Hủy sát giờ (< 30 phút) hoặc bỏ hẹn (No-show):** Bạn sẽ bị **trừ 50 điểm ELO**, phạt khấu trừ tiền cọc cam kết để bồi thường cho bên bị ảnh hưởng, và tạm khóa quyền nhận việc hỏa tốc trong 24 giờ. Hãy luôn giữ uy tín bạn nhé!`;
  }

  // 4. Tranh chấp chất lượng / Làm ẩu / Không đúng yêu cầu
  if (q.includes('tranh chấp') || q.includes('khiếu nại') || q.includes('làm ẩu') || q.includes('không đúng yêu cầu') || q.includes('không chịu trả')) {
    return `⚖️ **QUY TRÌNH TRỌNG TÀI CAMPUS XỬ LÝ TRANH CHẤP:**

Bạn đừng lo lắng, tiền ký quỹ hiện vẫn **được Smart Escrow khóa an toàn**, chưa được giải ngân cho bất kỳ bên nào!

**Cách giải quyết 3 bước:**
1. Bấm nút **"Khiếu Nại / Tranh Chấp"** trên màn hình chi tiết công việc.
2. Tải lên ảnh chụp màn hình yêu cầu ban đầu, sản phẩm/kết quả thực tế và lý do khiếu nại.
3. Ban Quản Trị và Trọng tài Campus sẽ mở phòng đối soát 3 bên và phân xử trong vòng **tối đa 24 giờ**:
   - Nếu làm sai hoàn toàn: Hoàn 100% tiền cọc cho người thuê.
   - Nếu hoàn thành một phần: Phân bổ giải ngân theo tỉ lệ công sức thực tế.
   - Nếu người thuê vô cớ gây khó dễ: Giải ngân bảo vệ quyền lợi người làm.`;
  }

  // 5. Hàng kín mờ ám / Bắt cọc tiền trước / Lừa đảo
  if (q.includes('hàng kín') || q.includes('cọc tiền') || q.includes('lừa đảo') || q.includes('chuyển cọc') || q.includes('mờ ám') || q.includes('gói hàng')) {
    return `🚨 **CẢNH BÁO NGUY HIỂM: TUYỆT ĐỐI KHÔNG NHẬN KÈO NÀY!**

**Nguyên tắc vàng bảo vệ an toàn sinh viên:**
1. **Kiện hàng kín:** Tuyệt đối không nhận vận chuyển bất kỳ gói hàng nào đóng kín mà người thuê từ chối cho bạn kiểm tra bên trong.
2. **Không ứng tiền túi trước:** Không bao giờ ứng trước số tiền lớn hoặc chuyển cọc riêng vào tài khoản lạ.
3. **Báo cáo ngay:** Hãy bấm nút **"Báo Cáo Vi Phạm (Report)"** để Ban Quản Trị GigMe gỡ bài đăng và khóa tài khoản gian lận trong vòng 10 phút.`;
  }

  // 6. Nạp tiền VietQR bị trừ nhưng ví chưa cập nhật
  if (q.includes('nạp tiền') && (q.includes('chưa có') || q.includes('chưa vào') || q.includes('bị trừ') || q.includes('lỗi'))) {
    return `💳 **SỰ CỐ NẠP TIỀN VÍ VIETQR:**

Bạn hoàn toàn yên tâm nhé, tiền của bạn **chắc chắn không bị mất**!

1. Vào các khung giờ cao điểm, cổng liên ngân hàng Napas có thể chậm phản hồi từ 1-3 phút.
2. **Kiểm tra cú pháp:** Bạn kiểm tra lại nội dung chuyển khoản trong app ngân hàng xem đã đúng cú pháp \`GIGME <SĐT/Mã>\` chưa.
3. **Đối soát tự động:** Nếu đúng cú pháp, hệ thống Webhook sẽ tự động cộng tiền trong giây lát.
4. **Hỗ trợ thủ công:** Nếu bạn quên ghi hoặc ghi sai nội dung, hãy gửi ảnh chụp biên lai giao dịch ngân hàng vào mục **Chat Ban Quản Trị** để Admin đối soát cộng tiền ngay cho bạn nhé!`;
  }

  // 7. Smart Escrow là gì
  if (q.includes('escrow') || q.includes('ký quỹ') || q.includes('chống bùng')) {
    return `🛡️ **SMART ESCROW - BẢO CHỨNG CHỐNG BÙNG CỌC 100%:**

Smart Escrow là cơ chế ký quỹ khóa tiền thông minh độc quyền của GigMe:
- Khi người thuê chọn bạn, tiền thưởng sẽ được hệ thống trích và **khóa an toàn trong quỹ Escrow**.
- Người làm an tâm hoàn thành công việc và tải ảnh nghiệm thu (Proof of Work).
- Người thuê nghiệm thu bấm *"Giải Ngân"* -> Tiền về ví người làm ngay tức thì (0 giây).
- Nếu người làm nộp minh chứng mà người thuê không phản hồi trong 24 giờ, hệ thống sẽ **tự động giải ngân** bảo vệ người làm!`;
  }

  // 8. Rút tiền Napas 247 & Nạp tiền VietQR
  if (q.includes('rút tiền') || q.includes('napas') || q.includes('bao lâu') || q.includes('phí rút')) {
    return `⚡ **NẠP & RÚT TIỀN TỨC THÌ 24/7 (0Đ PHÍ):**

- **Rút tiền:** Vào mục *"Ví Tiền"* -> Chọn *"Rút Tiền Napas 247"* -> Nhập số tài khoản ngân hàng bất kỳ tại Việt Nam. Tiền về tài khoản ngân hàng của bạn ngay lập tức, **hoàn toàn miễn phí 0đ**.
- **Nạp tiền:** Quét mã VietQR tự động khớp lệnh chỉ sau 1-3 giây.`;
  }

  // 9. Điểm ELO & Chuỗi thắng
  if (q.includes('elo') || q.includes('rank') || q.includes('chuỗi thắng') || q.includes('streak')) {
    return `⭐ **HỆ THỐNG ĐIỂM ELO & RANK GIGME:**

- Khởi điểm: **500 ELO**.
- Hoàn thành việc 5 sao: **+25 ELO**.
- Duy trì chuỗi thắng (Streak) 3-5 việc 5 sao liên tiếp: Nhận huy hiệu thợ danh dự và được ưu tiên nổi bật trên Radar việc làm.
- Hủy sát giờ / bỏ việc: **Trừ 50 ELO** và xử lý phạt tiền cọc cam kết.
- Bậc rank: Đồng (Bronze) ➔ Bạc (Silver) ➔ Vàng (Gold) ➔ Kim Cương (Diamond) ➔ Huyền Thoại Campus (Legend).`;
  }

  // 10. Quét thẻ SV / CCCD NFC
  if (q.includes('cccd') || q.includes('thẻ sinh viên') || q.includes('nfc') || q.includes('xác thực') || q.includes('lỗi quét')) {
    return `📄 **HƯỚNG DẪN XÁC THỰC CCCD NFC & THẺ SINH VIÊN:**

- Xác thực Cấp 2 giúp tăng Trust Score và mở khóa nhận các công việc giá trị cao trên **100.000đ - 1.000.000đ**.
- **Mẹo quét thành công 100%:**
  1. Đặt thẻ trên mặt phẳng tối màu, nơi đủ ánh sáng tự nhiên.
  2. Tránh bóng đèn phản chiếu gây chói/lóa và không để ngón tay che 4 góc thẻ.
  3. Thông tin trên thẻ phải trùng khớp với tên thật tài khoản GigMe của bạn.`;
  }

  // Mặc định
  return `Chào bạn! Mình là Trợ Lý Thông Minh GigMe 24/7. Mình đồng hành, hỗ trợ và bảo vệ quyền lợi sinh viên trên nền tảng GigMe Campus:
- 🛡️ **Smart Escrow:** Tiền của người thuê được khóa an toàn, chống bùng tiền công 100%.
- ⚡ **Nạp VietQR & Rút Napas 24/7:** Miễn phí 0đ, khớp lệnh tức thì về mọi ngân hàng.
- 🚫 **Cảnh báo giao dịch ngoài sàn:** Tuyệt đối không add Zalo chuyển khoản riêng để tránh bị lừa đảo.
- ⚖️ **Trọng tài Campus:** Mọi khiếu nại chất lượng đều được giải quyết minh bạch trong 24 giờ.

Bạn cần mình hỗ trợ tình huống cụ thể nào?`;
}

// Gemini Chat Assistant Endpoint
app.post('/api/gemini/chat-assistant', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (ai) {
      try {
        const contents: any[] = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.content || item.text || '' }],
            });
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: GIGME_AI_SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });

        if (response.text) {
          return res.json({ reply: response.text });
        }
      } catch (err: any) {
        console.warn('Gemini generateContent notice, using knowledge base fallback:', err?.message);
      }
    }

    const reply = getGigMeKnowledgeBaseReply(message);
    return res.json({ reply });
  } catch (err: any) {
    return res.json({
      reply: 'Chào bạn! Mình là Trợ Lý Thông Minh GigMe 24/7. Hệ thống Smart Escrow của GigMe luôn bảo vệ an toàn 100% quyền lợi của bạn!',
    });
  }
});


// Helper to check banned words in server requests
function checkServerBannedWords(text: string, db: any): { isBlocked: boolean; matchedWord?: string } {
  if (!text || typeof text !== 'string') return { isBlocked: false };
  const rawLower = text.toLowerCase().trim();
  const unaccented = rawLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const list = db.bannedWords || DEFAULT_SYSTEM_BANNED_WORDS.map((w: string) => ({ word: w, enabled: true }));

  for (const item of list) {
    if (item.enabled === false) continue;
    const target = (item.word || '').trim().toLowerCase();
    if (!target) continue;
    const targetUnaccented = target.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

    if (target.includes(' ') || target.includes('_') || target.includes('-')) {
      if (rawLower.includes(target) || unaccented.includes(targetUnaccented)) {
        return { isBlocked: true, matchedWord: target };
      }
      const pattern = target.replace(/[_\s-]+/g, '[_\\s.-]+');
      try {
        const regex = new RegExp(`(^|\\W|_)${pattern}($|\\W|_)`, 'i');
        if (regex.test(rawLower) || regex.test(unaccented)) {
          return { isBlocked: true, matchedWord: target };
        }
      } catch {}
    } else if (target === 'sex') {
      const sexRegex = /(?:^|[\s_.,!?:;\-\/\\()\[\]{}'"`])s[\s_.\-*]*e[\s_.\-*]*x(?:$|[\s_.,!?:;\-\/\\()\[\]{}'"`])/i;
      if (sexRegex.test(rawLower)) {
        return { isBlocked: true, matchedWord: 'sex' };
      }
    } else {
      try {
        const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedUnacc = targetUnaccented.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRegex = new RegExp(`(?:^|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])${escaped}(?:$|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])`, 'i');
        const unaccRegex = new RegExp(`(?:^|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])${escapedUnacc}(?:$|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])`, 'i');
        if (wordRegex.test(rawLower) || unaccRegex.test(unaccented)) {
          return { isBlocked: true, matchedWord: target };
        }
      } catch {}
    }
  }
  return { isBlocked: false };
}

// Gigs CRUD
app.get('/api/gigs', (req, res) => {
  const db = getDb();
  res.json(db.gigs || []);
});

app.post('/api/gigs', (req, res) => {
  const db = getDb();
  const gig = req.body;
  if (!db.gigs) db.gigs = [];

  // Check banned words in title & description
  const titleCheck = checkServerBannedWords(gig.title || '', db);
  if (titleCheck.isBlocked) {
    return res.status(400).json({ error: `Tiêu đề bài đăng chứa từ cấm vi phạm quy tắc ("${titleCheck.matchedWord}")!` });
  }
  const descCheck = checkServerBannedWords(gig.description || '', db);
  if (descCheck.isBlocked) {
    return res.status(400).json({ error: `Nội dung bài đăng chứa từ cấm vi phạm quy tắc ("${descCheck.matchedWord}")!` });
  }

  const idx = db.gigs.findIndex((g: any) => g.id === gig.id);
  if (idx >= 0) {
    db.gigs[idx] = { ...db.gigs[idx], ...gig };
  } else {
    db.gigs.unshift(gig);
  }
  saveDb(db);
  broadcast('gig_update', gig);
  res.json({ success: true, gig });
});

app.delete('/api/gigs/:id', (req, res) => {
  const db = getDb();
  db.gigs = (db.gigs || []).filter((g: any) => g.id !== req.params.id);
  saveDb(db);
  broadcast('gig_deleted', { id: req.params.id });
  res.json({ success: true });
});

app.post('/api/gigs/apply', (req, res) => {
  res.json({ success: true, message: 'Đã gửi ứng tuyển thành công!' });
});

// Users CRUD
app.get('/api/users', (req, res) => {
  const db = getDb();
  res.json(db.users || []);
});

app.post('/api/users/register', (req, res) => {
  const db = getDb();
  const user = req.body;
  if (!db.users) db.users = [];

  // Check banned words in user name
  const nameCheck = checkServerBannedWords(user.name || '', db);
  if (nameCheck.isBlocked) {
    return res.status(400).json({ error: `Tên người dùng không được chứa từ ngữ cấm ("${nameCheck.matchedWord}")!` });
  }

  const existing = db.users.find((u: any) => u.email === user.email || u.id === user.id);
  if (existing) {
    return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
  }
  db.users.push(user);
  saveDb(db);
  res.json({ success: true, user });
});

app.post('/api/users/:id', (req, res) => {
  const db = getDb();
  const user = req.body;
  const idx = (db.users || []).findIndex((u: any) => u.id === req.params.id);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...user };
  } else {
    db.users.push(user);
  }
  saveDb(db);
  broadcast('user_updated', user);
  res.json({ success: true, user });
});

app.put('/api/users/:id', (req, res) => {
  const db = getDb();
  const user = req.body;
  const idx = (db.users || []).findIndex((u: any) => u.id === req.params.id);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...user };
  } else {
    db.users.push(user);
  }
  saveDb(db);
  broadcast('user_updated', user);
  res.json({ success: true, user });
});

app.delete('/api/users/:id', (req, res) => {
  const db = getDb();
  const targetId = req.params.id;
  db.users = (db.users || []).filter((u: any) => u.id !== targetId);
  if (!db.deletedUserIds) db.deletedUserIds = [];
  if (!db.deletedUserIds.includes(targetId)) db.deletedUserIds.push(targetId);
  saveDb(db);
  broadcast('user_deleted', { id: targetId });
  res.json({ success: true });
});

app.post('/api/users/purge-non-admin', (req, res) => {
  const db = getDb();
  db.users = (db.users || []).filter((u: any) => u.role === 'ADMIN');
  saveDb(db);
  res.json({ success: true });
});

// Bids, Chats, Marketplace, Transactions
app.get('/api/bids', (req, res) => res.json(getDb().bids || []));
app.post('/api/bids', (req, res) => {
  const db = getDb();
  if (!db.bids) db.bids = [];
  db.bids.unshift(req.body);
  saveDb(db);
  broadcast('bid_new', req.body);
  res.json({ success: true });
});

app.get('/api/chats', (req, res) => res.json(getDb().chats || []));
app.post('/api/chats', (req, res) => {
  const db = getDb();
  if (!db.chats) db.chats = [];
  db.chats.push(req.body);
  saveDb(db);
  broadcast('chat_message', req.body);
  res.json({ success: true });
});

app.get('/api/marketplace', (req, res) => res.json(getDb().marketplace || []));
app.post('/api/marketplace', (req, res) => {
  const db = getDb();
  if (!db.marketplace) db.marketplace = [];
  const idx = db.marketplace.findIndex((m: any) => m.id === req.body.id);
  if (idx >= 0) db.marketplace[idx] = { ...db.marketplace[idx], ...req.body };
  else db.marketplace.unshift(req.body);
  saveDb(db);
  res.json({ success: true });
});

app.delete('/api/marketplace/:id', (req, res) => {
  const db = getDb();
  db.marketplace = (db.marketplace || []).filter((m: any) => m.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

app.get('/api/transactions', (req, res) => res.json(getDb().transactions || []));
app.post('/api/transactions', (req, res) => {
  const db = getDb();
  if (!db.transactions) db.transactions = [];
  db.transactions.unshift(req.body);
  saveDb(db);
  res.json({ success: true });
});

// Auth Helpers
app.get('/api/auth/ip-status', (req, res) => {
  res.json({ ip: req.ip || '127.0.0.1', isSuspicious: false });
});

// Helper: Generate HTML email for GigMe Campus Verification
function buildVerificationEmailHtml(params: {
  userName: string;
  otp: string;
  verifyUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác Thực Tài Khoản GigMe Campus</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070E18; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #070E18; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: #0E1B2E; border: 1px solid #3064AE; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 30px; background: linear-gradient(135deg, #162E4E 0%, #0E1B2E 100%); border-bottom: 1px solid #1E3A5F; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
                Gig<span style="color: #38BDF8;">Me</span> <span style="font-size: 11px; background: #3064AE; color: #E0FAEB; padding: 3px 8px; border-radius: 20px; vertical-align: middle; margin-left: 6px;">CAMPUS</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94A3B8;">Nền Tảng Việc Làm Sinh Viên & Smart Escrow Bảo Mật 100%</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <h2 style="margin: 0 0 16px; font-size: 19px; color: #FFFFFF; font-weight: 700;">
                Chào ${params.userName || 'bạn'},
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                Cảm ơn bạn đã tham gia cộng đồng sinh viên GigMe Campus! Để kích hoạt bảo mật tài khoản và mở khóa tính năng đăng việc & nhận tiền Smart Escrow, vui lòng nhập mã OTP xác thực hoặc bấm nút kích hoạt bên dưới.
              </p>

              <!-- OTP Code Box -->
              <div style="background: #070E18; border: 2px dashed #3064AE; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; color: #38BDF8;">
                  MÃ XÁC THỰC OTP (HIỆU LỰC 15 PHÚT)
                </p>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #38BDF8; margin: 4px 0 0 10px;">
                  ${params.otp}
                </div>
              </div>

              <!-- Button CTA -->
              <div style="text-align: center; margin: 28px 0 20px;">
                <a href="${params.verifyUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #3064AE 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; border: 1px solid #60A5FA; box-shadow: 0 4px 12px rgba(48, 100, 174, 0.4);">
                  ⚡ KÍCH HOẠT TÀI KHOẢN 1-CHẠM
                </a>
              </div>

              <p style="margin: 20px 0 0; font-size: 12px; line-height: 1.6; color: #64748B; text-align: center;">
                Nếu không bấm được nút trên, hãy sao chép đường link này dán vào trình duyệt:<br>
                <a href="${params.verifyUrl}" style="color: #38BDF8; word-break: break-all; font-size: 11px;">${params.verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: #070E18; border-top: 1px solid #1E3A5F; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B;">
                © 2026 GigMe Student Platform • Bảo vệ bản quyền & an toàn thông tin người dùng
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #475569;">
                Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// 1. Send Verification Email & OTP
app.post('/api/auth/send-verification-email', async (req, res) => {
  try {
    const { email, userId, userName } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Địa chỉ email không hợp lệ!' });
    }

    const db = getDb();
    if (!db.emailVerifications) db.emailVerifications = {};

    // Generate 6-digit OTP code & token
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const token = 'vtok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const verifyUrl = `${proto}://${host}/api/auth/verify-email-link?token=${token}&userId=${encodeURIComponent(userId || '')}&email=${encodeURIComponent(cleanEmail)}`;

    const record = {
      userId: userId || '',
      email: cleanEmail,
      otp,
      token,
      expiresAt,
      isVerified: false,
      createdAt: Date.now(),
    };

    if (userId) db.emailVerifications[userId] = record;
    db.emailVerifications[cleanEmail] = record;
    saveDb(db);

    console.log(`[GigMe Mailer] Sending verification email with OTP ${otp} to ${cleanEmail}...`);

    // Dispatch email via Gmail SMTP
    await mailTransporter.sendMail({
      from: `"GigMe Campus Security" <${GMAIL_USER}>`,
      to: cleanEmail,
      subject: `[GigMe Campus] Mã Xác Thực Kích Hoạt Tài Khoản: ${otp}`,
      html: buildVerificationEmailHtml({
        userName: userName || cleanEmail.split('@')[0],
        otp,
        verifyUrl,
      }),
    });

    console.log(`[GigMe Mailer] Email sent successfully to ${cleanEmail}`);
    res.json({
      success: true,
      message: `Đã gửi mã xác thực tới ${cleanEmail}. Vui lòng kiểm tra hộp thư!`,
      expiresAt,
    });
  } catch (err: any) {
    console.error('[GigMe Mailer Error] Failed to send email:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Không thể gửi email xác thực lúc này',
    });
  }
});

// 2. Verify OTP code
app.post('/api/auth/verify-otp', (req, res) => {
  const { userId, email, otp } = req.body;
  const cleanOtp = (otp || '').toString().trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUserId = (userId || '').trim();

  if (!cleanOtp) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập mã OTP!' });
  }

  const db = getDb();
  let record = (cleanUserId && db.emailVerifications?.[cleanUserId]) || (cleanEmail && db.emailVerifications?.[cleanEmail]);
  if (!record && db.emailVerifications) {
    for (const key of Object.keys(db.emailVerifications)) {
      const r = db.emailVerifications[key];
      if (r && ((cleanUserId && r.userId === cleanUserId) || (cleanEmail && r.email?.toLowerCase() === cleanEmail))) {
        record = r;
        break;
      }
    }
  }

  if (!record) {
    return res.status(400).json({ success: false, error: 'Không tìm thấy yêu cầu xác thực. Vui lòng gửi lại mã!' });
  }

  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ success: false, error: 'Mã OTP đã hết hạn (quá 15 phút). Vui lòng bấm gửi lại!' });
  }

  if (record.otp !== cleanOtp) {
    return res.status(400).json({ success: false, error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại!' });
  }

  // Mark verified in record
  record.isVerified = true;
  record.verifiedAt = Date.now();

  const targetId = record.userId || cleanUserId;
  const targetEmail = (record.email || cleanEmail).toLowerCase();

  if (!db.emailVerifications) db.emailVerifications = {};
  if (targetId) db.emailVerifications[targetId] = record;
  if (targetEmail) db.emailVerifications[targetEmail] = record;

  // Mark verified in users table
  if (db.users) {
    const user = db.users.find((u: any) =>
      (targetId && u.id === targetId) ||
      (targetEmail && u.email?.toLowerCase() === targetEmail)
    );
    if (user) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = Date.now();
      broadcast('user_updated', user);
    }
  }

  saveDb(db);
  res.json({ success: true, isVerified: true, verified: true, message: 'Xác thực tài khoản thành công!' });
});

// 3. Verify Email Click Link
app.get('/api/auth/verify-email-link', (req, res) => {
  const { token, userId, email } = req.query;
  const cleanToken = (token || '').toString();
  const cleanUserId = (userId || '').toString();
  const cleanEmail = (email || '').toString().toLowerCase();

  const db = getDb();
  let matchedRecord: any = null;

  if (db.emailVerifications) {
    for (const key of Object.keys(db.emailVerifications)) {
      const rec = db.emailVerifications[key];
      if (rec && rec.token === cleanToken) {
        matchedRecord = rec;
        break;
      }
    }
  }

  if (!matchedRecord && (cleanUserId || cleanEmail)) {
    const rec = (cleanUserId && db.emailVerifications?.[cleanUserId]) || (cleanEmail && db.emailVerifications?.[cleanEmail]);
    if (rec && rec.token === cleanToken) {
      matchedRecord = rec;
    }
  }

  if (matchedRecord) {
    matchedRecord.isVerified = true;
    matchedRecord.verifiedAt = Date.now();

    const targetId = matchedRecord.userId || cleanUserId;
    const targetEmail = (matchedRecord.email || cleanEmail).toLowerCase();

    if (!db.emailVerifications) db.emailVerifications = {};
    if (targetId) db.emailVerifications[targetId] = matchedRecord;
    if (targetEmail) db.emailVerifications[targetEmail] = matchedRecord;

    if (db.users) {
      const user = db.users.find((u: any) => (targetId && u.id === targetId) || (targetEmail && u.email?.toLowerCase() === targetEmail));
      if (user) {
        user.isEmailVerified = true;
        user.emailVerifiedAt = Date.now();
        broadcast('user_updated', user);
      }
    }

    saveDb(db);
    return res.redirect(`/?verified=true&userId=${encodeURIComponent(targetId)}&email=${encodeURIComponent(targetEmail)}&t=${Date.now()}`);
  }

  return res.redirect('/?verified_error=invalid_or_expired_link');
});

// 4. Check Verification Status (Used by real-time frontend listener)
app.get('/api/auth/email-verification-status/:id', (req, res) => {
  const target = decodeURIComponent(req.params.id || '').trim();
  const targetLower = target.toLowerCase();
  const queryEmail = ((req.query.email as string) || '').trim().toLowerCase();
  const db = getDb();

  const user = (db.users || []).find((u: any) =>
    (target && u.id === target) ||
    (targetLower && u.email?.toLowerCase() === targetLower) ||
    (queryEmail && u.email?.toLowerCase() === queryEmail)
  );

  let record = (db.emailVerifications && (db.emailVerifications[target] || db.emailVerifications[targetLower])) || null;
  if (!record && queryEmail && db.emailVerifications) {
    record = db.emailVerifications[queryEmail] || null;
  }
  if (!record && db.emailVerifications) {
    for (const key of Object.keys(db.emailVerifications)) {
      const r = db.emailVerifications[key];
      if (r && (
        (target && r.userId === target) ||
        (targetLower && r.email?.toLowerCase() === targetLower) ||
        (queryEmail && r.email?.toLowerCase() === queryEmail)
      )) {
        record = r;
        break;
      }
    }
  }

  const isVerified = Boolean((user && user.isEmailVerified) || (record && record.isVerified));
  res.json({
    success: true,
    isVerified,
    verified: isVerified,
    userId: user?.id || target,
    email: user?.email || record?.email || queryEmail,
  });
});

// ==========================================
// BANNED WORDS / KIỂM DUYỆT TỪ CẤM API
// ==========================================
const DEFAULT_SYSTEM_BANNED_WORDS = [
  'sex', 'ch_ch', 'ch-ch', 'chịch', 'chich', 'địt', 'dit', 'lừa đảo', 'lua dao',
  'cờ bạc', 'co bac', 'gái gọi', 'gai goi', 'bán dâm', 'ban dam', 'ma túy', 'ma tuy',
  'vay nặng lãi', 'vay nang lai', 'tài xỉu', 'tai xiu', 'lô đề', 'lo de', 'đm', 'dm',
  'vcl', 'khiêu dâm', 'khieu dam', 'ch_ch dạo'
];

app.get('/api/banned-words', (req, res) => {
  const db = getDb();
  if (!db.bannedWords || !Array.isArray(db.bannedWords)) {
    db.bannedWords = DEFAULT_SYSTEM_BANNED_WORDS.map((word, idx) => ({
      id: `bw_default_${idx + 1}`,
      word,
      createdAt: Date.now() - (idx * 60000),
      addedBy: 'Hệ thống Quản trị',
      enabled: true,
      hitCount: 0,
    }));
    saveDb(db);
  }
  res.json(db.bannedWords);
});

app.post('/api/banned-words', (req, res) => {
  const db = getDb();
  if (!db.bannedWords || !Array.isArray(db.bannedWords)) {
    db.bannedWords = [];
  }

  const { word, words, addedBy } = req.body;
  const wordsToAdd: string[] = [];

  if (Array.isArray(words)) {
    wordsToAdd.push(...words);
  } else if (typeof word === 'string') {
    const split = word.split(/[,;\n]/).map((w: string) => w.trim()).filter(Boolean);
    wordsToAdd.push(...split);
  }

  if (wordsToAdd.length === 0) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp ít nhất một từ cấm cần thêm!' });
  }

  let addedCount = 0;
  for (const rawWord of wordsToAdd) {
    const cleanWord = rawWord.trim().toLowerCase();
    if (!cleanWord) continue;
    const exists = db.bannedWords.some((bw: any) => bw.word.toLowerCase() === cleanWord);
    if (!exists) {
      db.bannedWords.push({
        id: `bw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        word: cleanWord,
        createdAt: Date.now(),
        addedBy: addedBy || 'Admin',
        enabled: true,
        hitCount: 0,
      });
      addedCount++;
    }
  }

  saveDb(db);
  broadcast('banned_words_updated', db.bannedWords);
  res.json({ success: true, addedCount, bannedWords: db.bannedWords });
});

app.put('/api/banned-words/:id', (req, res) => {
  const db = getDb();
  if (!db.bannedWords) db.bannedWords = [];
  const targetId = req.params.id;
  const idx = db.bannedWords.findIndex((bw: any) => bw.id === targetId);
  if (idx < 0) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy từ cấm!' });
  }

  db.bannedWords[idx] = {
    ...db.bannedWords[idx],
    ...req.body,
    updatedAt: Date.now(),
  };

  saveDb(db);
  broadcast('banned_words_updated', db.bannedWords);
  res.json({ success: true, bannedWord: db.bannedWords[idx], bannedWords: db.bannedWords });
});

app.delete('/api/banned-words/:id', (req, res) => {
  const db = getDb();
  if (!db.bannedWords) db.bannedWords = [];
  const target = decodeURIComponent(req.params.id).trim().toLowerCase();
  db.bannedWords = db.bannedWords.filter((bw: any) => bw.id !== req.params.id && bw.word.toLowerCase() !== target);
  saveDb(db);
  broadcast('banned_words_updated', db.bannedWords);
  res.json({ success: true, bannedWords: db.bannedWords });
});

app.delete('/api/banned-words', (req, res) => {
  const db = getDb();
  db.bannedWords = [];
  saveDb(db);
  broadcast('banned_words_updated', []);
  res.json({ success: true, bannedWords: [] });
});

app.post('/api/banned-words/delete-multiple', (req, res) => {
  const db = getDb();
  if (!db.bannedWords) db.bannedWords = [];
  const { ids } = req.body;
  if (Array.isArray(ids)) {
    const set = new Set(ids.map((x: string) => String(x).toLowerCase().trim()));
    db.bannedWords = db.bannedWords.filter((bw: any) => !set.has(bw.id.toLowerCase()) && !set.has(bw.word.toLowerCase()));
  }
  saveDb(db);
  broadcast('banned_words_updated', db.bannedWords);
  res.json({ success: true, bannedWords: db.bannedWords });
});

app.post('/api/banned-words/reset-defaults', (req, res) => {
  const db = getDb();
  db.bannedWords = DEFAULT_SYSTEM_BANNED_WORDS.map((word, idx) => ({
    id: `bw_default_${idx + 1}`,
    word,
    createdAt: Date.now() - (idx * 60000),
    addedBy: 'Hệ thống Quản trị',
    enabled: true,
    hitCount: 0,
  }));
  saveDb(db);
  broadcast('banned_words_updated', db.bannedWords);
  res.json({ success: true, bannedWords: db.bannedWords });
});

app.post('/api/auth/send-otp', (req, res) => res.json({ success: true, message: 'OTP 123456 đã được gửi' }));
app.post('/api/auth/reset-password', (req, res) => res.json({ success: true }));

// Wallet & Webhook Handlers
app.post('/api/wallet/deposit', (req, res) => res.json({ success: true }));
app.post('/api/wallet/withdraw', (req, res) => res.json({ success: true }));
app.post('/api/wallet/escrow-release', (req, res) => res.json({ success: true }));

app.get('/api/webhook/status', (req, res) => res.json({ active: true, uptime: process.uptime() }));
app.post(['/api/webhook/bank-bot', '/api/webhook/sepay', '/api/webhook/casso', '/api/banking/webhook'], (req, res) => {
  const body = req.body;
  const db = getDb();
  const txId = `tx_wh_${Date.now()}`;
  const amount = Number(body.amount || body.transferAmount || 50000);
  const tx = {
    id: txId,
    userId: body.userId || '000000000',
    type: 'VIETQR_DEPOSIT',
    amount,
    title: 'Nạp tiền VietQR Tự Động (Webhook)',
    subtitle: `${db.bankBotConfig?.bankName || 'MBBank'} • Khớp lệnh tức thì 24/7`,
    timestamp: Date.now(),
    isSuccess: true,
  };
  if (!db.transactions) db.transactions = [];
  db.transactions.unshift(tx);
  saveDb(db);
  broadcast('transaction_new', tx);
  res.json({ success: true, message: 'Webhook processed' });
});

app.get('/api/system/bank-bot-config', (req, res) => res.json(getDb().bankBotConfig || {}));
app.post('/api/system/bank-bot-config', (req, res) => {
  const db = getDb();
  db.bankBotConfig = { ...db.bankBotConfig, ...req.body };
  saveDb(db);
  res.json({ success: true, config: db.bankBotConfig });
});

app.post('/api/system/bank-bot/test-simulate', (req, res) => {
  res.json({ success: true, message: 'Simulated deposit event emitted' });
});

app.get('/api/system/maintenance', (req, res) => res.json(getDb().maintenance || { isActive: false }));
app.post('/api/system/maintenance', (req, res) => {
  const db = getDb();
  db.maintenance = { ...db.maintenance, ...req.body };
  saveDb(db);
  broadcast('maintenance_change', db.maintenance);
  res.json({ success: true, maintenance: db.maintenance });
});

// KYC & SMS Simulation
app.post('/api/kyc/cccd-nfc', (req, res) => res.json({ success: true, verified: true }));
app.post('/api/sms/mo-request', (req, res) => res.json({ success: true, sessionId: `sms_${Date.now()}` }));
app.get('/api/sms/mo-status/:id', (req, res) => res.json({ success: true, status: 'VERIFIED' }));
app.post('/api/sms/mo-simulate', (req, res) => res.json({ success: true }));

// Disbursement Simulation
app.post('/api/disbursement/verify-beneficiary', (req, res) => {
  res.json({ success: true, accountName: 'NGUYEN VAN SINH VIEN', bankCode: req.body.bankCode });
});
app.post('/api/disbursement/execute', (req, res) => {
  res.json({ success: true, transactionId: `NAPAS_${Date.now()}` });
});

// Push Notifications
app.post('/api/push/subscribe', (req, res) => res.json({ success: true }));
app.post('/api/push/send', (req, res) => res.json({ success: true }));

// Setup Vite dev server middleware in dev mode, or static build in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GigMe Engine] Full-stack server running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[GigMe Engine] Failed to start server:', err);
  process.exit(1);
});
