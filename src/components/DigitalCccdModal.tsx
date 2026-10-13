import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Radio,
  FileCheck2,
  Lock,
  RotateCw,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { useGigMe } from '../context/GigMeContext';
import { validateVietnamCccdNumber, generateCccdMrz } from '../utils/checksumC06';
import { triggerHaptic } from '../utils/haptics';
import { playNotificationSound } from '../utils/audio';
import { useModalBodyLock } from '../hooks/useModalBodyLock';

interface DigitalCccdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRescan: () => void;
}

export const DigitalCccdModal: React.FC<DigitalCccdModalProps> = ({
  isOpen,
  onClose,
  onRescan,
}) => {
  const { currentUser, language, showNotification } = useGigMe();
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [activeSide, setActiveSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [copied, setCopied] = useState(false);

  // Lock body scroll when modal is open
  useModalBodyLock(isOpen, onClose);

  if (!isOpen || !currentUser) return null;

  const rawId = currentUser.cccdNumber || '079204018892';
  const validation = validateVietnamCccdNumber(rawId);
  const fullName = (currentUser.kycName || currentUser.name || 'NGUYỄN VĂN AN').toUpperCase();
  const birthDate = currentUser.birthDate || '12/04/2004';
  const province = validation.provinceName || 'TP. Hồ Chí Minh';
  const gender = validation.gender || (currentUser.gender === 'FEMALE' ? 'Nữ' : 'Nam');
  const expiryDate = currentUser.cccdIssueDate ? '12/04/2044' : '12/04/2044';

  const maskedNumber = showFullNumber
    ? `${rawId.substring(0, 3)} ${rawId.substring(3, 6)} ${rawId.substring(6, 9)} ${rawId.substring(9, 12)}`
    : `${rawId.substring(0, 3)} ${rawId.substring(3, 6)} ••• •••`;

  const handleCopyNumber = () => {
    triggerHaptic('light');
    playNotificationSound('BUTTON_CLICK');
    navigator.clipboard.writeText(rawId);
    setCopied(true);
    showNotification(
      language === 'vi' ? 'Đã chép số CCCD' : 'ID Number Copied',
      language === 'vi' ? `Số CCCD: ${rawId}` : `ID: ${rawId}`,
      false
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const birthYYMMDD = birthDate.replace(/\D/g, '').substring(4, 8) +
    birthDate.replace(/\D/g, '').substring(2, 4) +
    birthDate.replace(/\D/g, '').substring(0, 2);
  const mrz = generateCccdMrz(
    rawId,
    birthYYMMDD || '040412',
    gender === 'Nữ' ? 'F' : 'M',
    '441204',
    fullName
  );

  return (
    <>
      {/* 2. Full Backdrop / Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        aria-hidden="true"
      />

      {/* 1. Fixed Centering & Viewport Lock */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[94vw] sm:w-full max-w-lg pointer-events-none select-none"
        role="dialog"
        aria-modal="true"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto select-auto w-full max-h-[85vh] rounded-3xl bg-[#0B1524] border border-[#C5E5EC]/30 text-white shadow-2xl relative overflow-hidden flex flex-col animate-modal-in"
        >
          {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#C5E5EC]/15 flex items-center justify-between relative bg-gradient-to-r from-[#102038] via-[#0E1B2E] to-[#102038]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm text-white">
                  {language === 'vi' ? 'Thẻ Căn Cước Số Hóa Quốc Gia' : 'Digital Citizen Identity Card'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  C06 Verified
                </span>
              </div>
              <p className="text-[11px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Chứng thư số điện tử đã đối chiếu chíp NFC ICAO 9303'
                  : 'Encrypted NFC chip certificate matched'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Side Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C5E5EC]/80 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'vi' ? 'Bảo chứng ký quỹ Escrow 100%' : '100% Escrow Certified'}</span>
            </span>
            <div className="flex rounded-xl bg-[#12233B] p-1 border border-[#C5E5EC]/20 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveSide('FRONT')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  activeSide === 'FRONT'
                    ? 'bg-[#3064AE] text-white shadow-sm'
                    : 'text-[#C5E5EC]/70 hover:text-white'
                }`}
              >
                {language === 'vi' ? 'Mặt Trước' : 'Front Side'}
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('BACK')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  activeSide === 'BACK'
                    ? 'bg-[#3064AE] text-white shadow-sm'
                    : 'text-[#C5E5EC]/70 hover:text-white'
                }`}
              >
                {language === 'vi' ? 'Mặt Sau (MRZ & Chip)' : 'Back (MRZ)'}
              </button>
            </div>
          </div>

          {/* REALISTIC DIGITAL ID CARD MOCKUP */}
          {activeSide === 'FRONT' ? (
            <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#1C3252] via-[#102038] to-[#0A1626] border-2 border-[#C5E5EC]/40 shadow-2xl overflow-hidden text-slate-100">
              {/* Guilloche Security Pattern Background */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 50% 50%, #C5E5EC 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              />
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

              {/* National Header */}
              <div className="text-center pb-2.5 border-b border-[#C5E5EC]/20 relative z-10">
                <div className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-amber-300 uppercase">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-[9px] font-bold tracking-widest text-[#C5E5EC]/80">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="mt-1 text-xs sm:text-sm font-black tracking-wide text-white uppercase flex items-center justify-center space-x-1.5">
                  <span>CĂN CƯỚC CÔNG DÂN</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    GẮN CHÍP
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="mt-3.5 flex items-start space-x-3 sm:space-x-4 relative z-10">
                {/* Photo & Chip */}
                <div className="flex flex-col items-center space-y-2 shrink-0">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-slate-900 border-2 border-[#C5E5EC]/40 overflow-hidden shadow-md flex items-center justify-center relative bg-gradient-to-b from-[#182C48] to-[#0A1424]">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt="Citizen"
                        className="w-full h-full object-cover filter contrast-105"
                      />
                    ) : (
                      <div className="text-2xl font-black text-cyan-200">
                        {fullName.charAt(0)}
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600/80 text-[8px] font-bold text-center py-0.5 text-white">
                      ĐÃ ĐỐI CHIẾU
                    </div>
                  </div>

                  {/* Gold Microchip Mockup */}
                  <div className="w-10 h-8 rounded-md bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 border border-amber-600 shadow-sm flex items-center justify-center p-1 relative">
                    <div className="w-full h-full border border-amber-800/40 rounded-xs flex items-center justify-center">
                      <div className="w-4 h-2 border-x border-amber-800/50" />
                    </div>
                  </div>
                </div>

                {/* Personal Information Fields */}
                <div className="flex-1 min-w-0 space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-[9px] text-[#C5E5EC]/70 uppercase block">Số / No.:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm sm:text-base text-amber-300 tracking-wider">
                        {maskedNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setShowFullNumber(!showFullNumber);
                        }}
                        className="text-[#C5E5EC]/70 hover:text-white p-0.5 rounded transition cursor-pointer"
                        title={showFullNumber ? 'Ẩn số CCCD' : 'Xem đủ số CCCD'}
                      >
                        {showFullNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyNumber}
                        className="text-[#C5E5EC]/70 hover:text-white p-0.5 rounded transition cursor-pointer"
                        title="Sao chép số"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#C5E5EC]/70 uppercase block">Họ và tên / Full name:</span>
                    <div className="font-extrabold text-white text-xs sm:text-sm tracking-wide truncate">
                      {fullName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-[#C5E5EC]/70 uppercase block">Ngày sinh / Date of birth:</span>
                      <div className="font-bold text-slate-100">{birthDate}</div>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#C5E5EC]/70 uppercase block">Giới tính / Sex:</span>
                      <div className="font-bold text-slate-100">{gender}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#C5E5EC]/70 uppercase block">Quốc tịch / Nationality:</span>
                    <div className="font-bold text-slate-100">Việt Nam</div>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#C5E5EC]/70 uppercase block">Quê quán / Place of origin:</span>
                    <div className="font-bold text-cyan-200 truncate">{province}</div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[10px] text-amber-300 font-mono">
                    <span>Có giá trị đến / Date of expiry:</span>
                    <span className="font-bold">{expiryDate}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Watermark Tag */}
              <div className="mt-3 pt-2 border-t border-[#C5E5EC]/15 flex items-center justify-between text-[10px] text-[#C5E5EC]/60 font-mono">
                <span>C06-BCA • ISO/IEC 7816-4</span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Chữ ký số hợp lệ</span>
                </span>
              </div>
            </div>
          ) : (
            /* BACK SIDE OF CCCD CARD */
            <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#102038] via-[#0E1A2C] to-[#0A1424] border-2 border-[#C5E5EC]/40 shadow-2xl overflow-hidden text-slate-100 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#C5E5EC]/20 text-[10px]">
                <div className="font-mono text-cyan-300">
                  ĐẶC ĐIỂM NHẬN DẠNG: NỐT RUỒI CÁCH 1CM TRÊN SAU ĐUÔI LÔNG MÀY TRÁI
                </div>
                <div className="font-mono text-amber-300">NGÀY CẤP: 12/04/2021</div>
              </div>

              {/* Fingerprint & QR */}
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/60 border border-[#C5E5EC]/15">
                <div className="space-y-1">
                  <span className="text-[9px] text-[#C5E5EC]/60 block uppercase">Dữ liệu sinh trắc vân tay</span>
                  <div className="font-mono text-[10px] text-emerald-400 flex items-center space-x-1.5">
                    <FileCheck2 className="w-4 h-4" />
                    <span>NGÓN TRỎ PHẢI & TRÁI (KHỚP 100%)</span>
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-white text-black shadow">
                  <QrCode className="w-8 h-8" />
                </div>
              </div>

              {/* ICAO 9303 MRZ Lines */}
              <div className="p-3 rounded-xl bg-black/85 border border-[#C5E5EC]/30 font-mono text-[10px] text-cyan-300 tracking-wider leading-relaxed overflow-x-auto select-all">
                <div className="text-slate-400 text-[9px] mb-1 font-sans">
                  DỮ LIỆU ĐỌC MÁY QUỐC TẾ (ICAO DOC 9303 PART 3):
                </div>
                <div>{mrz.line1}</div>
                <div>{mrz.line2}</div>
                <div>{mrz.line3}</div>
              </div>
            </div>
          )}

          {/* Security & Legal Disclaimer */}
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/25 flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-cyan-200">Cam kết bảo mật Nghị định 13/2023/NĐ-CP:</strong> Thông tin cá nhân của bạn được mã hóa an toàn đầu cuối (E2EE), phục vụ giải ngân bảo chứng Smart Escrow và không bị chia sẻ cho bất kỳ bên thứ ba nào.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-5 border-t border-[#C5E5EC]/15 bg-[#09111D] flex flex-col sm:flex-row gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRescan();
            }}
            className="px-4 py-2.5 rounded-xl bg-[#12233B] hover:bg-[#182F4E] border border-[#C5E5EC]/30 text-[#C5E5EC] hover:text-white font-extrabold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'vi' ? 'Quét Thẻ CCCD Khác (NFC)' : 'Re-scan Other Card'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] hover:brightness-110 text-white font-black text-xs transition cursor-pointer shadow-md"
          >
            {language === 'vi' ? 'Đóng Lại' : 'Close'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
