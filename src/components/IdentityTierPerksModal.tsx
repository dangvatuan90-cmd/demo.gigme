import React from 'react';
import {
  X,
  Award,
  ShieldCheck,
  Check,
  Sparkles,
  TrendingUp,
  Zap,
  Lock,
  ArrowRight,
  GraduationCap,
  SmartphoneNfc,
  Camera,
  Mail,
} from 'lucide-react';
import { useGigMe } from '../context/GigMeContext';
import { USER_TIERS, formatVnd } from '../types';

interface IdentityTierPerksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStep?: (step: 'CCCD' | 'FACE' | 'STUDENT' | 'EDU') => void;
}

export const IdentityTierPerksModal: React.FC<IdentityTierPerksModalProps> = ({
  isOpen,
  onClose,
  onNavigateToStep,
}) => {
  const { currentUser, language } = useGigMe();

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const hasCccd = Boolean(currentUser.isNfcVerified || currentUser.isKycApproved);
  const hasFace = Boolean(currentUser.isFaceLivenessPassed);
  const hasStudent = Boolean(currentUser.isStudentVerified);
  const hasEdu = Boolean(currentUser.isEduVerified);

  const completedCount = [hasCccd, hasFace, hasStudent, hasEdu].filter(Boolean).length;

  const tiers = [
    {
      level: 1,
      titleVi: 'Cấp 1: Newbie (Tài khoản mới)',
      titleEn: 'Level 1: Newbie (Basic)',
      depositLimit: 500_000,
      fee: '10%',
      skills: 1,
      perksVi: ['Giao dịch nhỏ dưới 500k', 'Nhận đơn cơ bản', 'Tối đa 1 thẻ kỹ năng'],
      perksEn: ['Small escrow under 500k', 'Basic gig matching', 'Max 1 skill tag'],
      badge: 'Newbie',
      badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
      active: completedCount === 0,
    },
    {
      level: 2,
      titleVi: 'Cấp 2: Sinh Viên Campus',
      titleEn: 'Level 2: Campus Student',
      requirementVi: 'Xác thực Cổng Trường SSO hoặc Quét Thẻ SV / Email .edu',
      requirementEn: 'Verified via Campus SSO or Student Card / Edu Email',
      depositLimit: 10_000_000,
      fee: '8% (-20% phí)',
      skills: 2,
      perksVi: [
        'Hạn mức 10.000.000đ',
        'Giảm phí Escrow từ 10% xuống 8%',
        'Mở khóa việc làm nội bộ khuôn viên trường',
        'Cấp Tích Xanh Sinh Viên Chính Quy',
      ],
      perksEn: [
        '10M VND escrow limit',
        'Reduced escrow fee (8%)',
        'Unlock campus exclusive gigs',
        'Verified Student Blue Badge',
      ],
      badge: 'Sinh Viên',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
      active: completedCount >= 1 && completedCount < 3,
    },
    {
      level: 3,
      titleVi: 'Cấp 2+: CCCD Chip & Sinh Trắc AI',
      titleEn: 'Level 2+: CCCD Chip & AI Biometrics',
      requirementVi: 'Xác thực CCCD NFC C06 + Quét Face Liveness',
      requirementEn: 'Verified via NFC CCCD + Face Liveness AI',
      depositLimit: 30_000_000,
      fee: '8%',
      skills: 3,
      perksVi: [
        'Hạn mức lên tới 30.000.000đ',
        'Bảo chứng pháp lý chống bùng kèo / quỵt tiền',
        'Mở khóa 3 thẻ kỹ năng nhận việc',
        'Nhận các kèo Freelance giá trị cao',
      ],
      perksEn: [
        '30M VND escrow limit',
        'Legal anti-fraud escrow guarantee',
        'Unlocked 3 skill tags',
        'Apply for high-payout freelance jobs',
      ],
      badge: 'CCCD Chip',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      active: completedCount === 3,
    },
    {
      level: 4,
      titleVi: 'Cấp 3: Elite VIP Toàn Diện',
      titleEn: 'Level 3: Elite VIP All-in-One',
      requirementVi: 'Hoàn thành trọn vẹn 4/4 bước định danh',
      requirementEn: 'Completed all 4/4 verification pillars',
      depositLimit: 100_000_000,
      fee: '7% (Phí thấp nhất)',
      skills: 5,
      perksVi: [
        'Hạn mức tối đa 100.000.000đ',
        'Phí hoa hồng Escrow chỉ 7% (ưu đãi trọn đời)',
        'Mở khóa tối đa 5 thẻ kỹ năng',
        'Ưu tiên hiển thị Top 1 khi ứng tuyển việc làm',
        'Huy hiệu Elite VIP danh giá trên bản đồ',
      ],
      perksEn: [
        'Max 100M VND escrow limit',
        'Lowest 7% escrow commission fee',
        'Unlocked max 5 skill tags',
        'Top 1 priority application listing',
        'Prestigious Elite VIP badge on map',
      ],
      badge: 'VIP Pro',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      active: completedCount === 4,
    },
  ];

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
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[94vw] sm:w-full max-w-xl pointer-events-none select-none"
        role="dialog"
        aria-modal="true"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto select-auto w-full max-h-[85vh] rounded-3xl bg-[#0B1524] border border-[#C5E5EC]/30 text-white shadow-2xl relative overflow-hidden flex flex-col animate-modal-in"
        >
          {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#C5E5EC]/15 flex items-center justify-between bg-gradient-to-r from-[#102038] via-[#0E1B2E] to-[#102038]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-black shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center space-x-2">
                <span>{language === 'vi' ? 'Bảng Quyền Lợi & Hạn Mức Cấp Độ' : 'Tier Benefits & Escrow Limits'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30">
                  {completedCount}/4 {language === 'vi' ? 'Đã đạt' : 'Reached'}
                </span>
              </h3>
              <p className="text-[11px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Định danh càng cao, hạn mức ví càng lớn và phí hoa hồng càng giảm'
                  : 'Higher verification unlocks greater limits and lowest fees'}
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

        {/* Scroll Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Current Status Highlight */}
          <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/25 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#C5E5EC]/70 uppercase font-mono block">
                {language === 'vi' ? 'Cấp độ hiện tại của bạn' : 'Your current status'}
              </span>
              <div className="text-sm font-black text-white mt-0.5 flex items-center space-x-2">
                <span>
                  {completedCount === 4
                    ? (language === 'vi' ? 'Cấp 3: Elite VIP Toàn Diện' : 'Level 3: Elite VIP')
                    : completedCount === 3
                    ? (language === 'vi' ? 'Cấp 2+: CCCD Chip & Sinh Trắc' : 'Level 2+: CCCD Chip & Biometrics')
                    : completedCount >= 1
                    ? (language === 'vi' ? 'Cấp 2: Sinh Viên Campus' : 'Level 2: Campus Student')
                    : (language === 'vi' ? 'Cấp 1: Newbie' : 'Level 1: Newbie')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {completedCount * 25}%
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Hạn mức giao dịch' : 'Limit'}</span>
              <span className="text-sm font-mono font-black text-amber-300">
                {completedCount === 4
                  ? formatVnd(100_000_000)
                  : completedCount === 3
                  ? formatVnd(30_000_000)
                  : completedCount >= 1
                  ? formatVnd(10_000_000)
                  : formatVnd(500_000)}
              </span>
            </div>
          </div>

          {/* Tiers List */}
          <div className="space-y-3">
            {tiers.map((t) => (
              <div
                key={t.level}
                className={`p-4 rounded-2xl border transition relative overflow-hidden ${
                  t.active
                    ? 'bg-[#132A4B] border-cyan-400 shadow-lg ring-1 ring-cyan-400/30'
                    : 'bg-[#12233B]/80 border-[#C5E5EC]/15 opacity-85 hover:opacity-100'
                }`}
              >
                {t.active && (
                  <div className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-[9px] uppercase tracking-wider">
                    {language === 'vi' ? 'Đang kích hoạt' : 'Current Level'}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#C5E5EC]/15">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-white">
                      {language === 'vi' ? t.titleVi : t.titleEn}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${t.badgeColor}`}>
                      {t.badge}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-[#C5E5EC]/60 block">{language === 'vi' ? 'Hạn mức:' : 'Limit:'}</span>
                      <span className="font-bold text-amber-300">{formatVnd(t.depositLimit)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#C5E5EC]/60 block">{language === 'vi' ? 'Phí Escrow:' : 'Fee:'}</span>
                      <span className="font-bold text-emerald-400">{t.fee}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#C5E5EC]/60 block">{language === 'vi' ? 'Kỹ năng:' : 'Skills:'}</span>
                      <span className="font-bold text-cyan-300">{t.skills} thẻ</span>
                    </div>
                  </div>
                </div>

                {/* Perks items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2.5">
                  {(language === 'vi' ? t.perksVi : t.perksEn).map((perk, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-[11px] text-slate-200">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions if incomplete */}
          {completedCount < 4 && onNavigateToStep && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#182C48] to-[#12233B] border border-cyan-500/30 space-y-2">
              <span className="text-xs font-black text-cyan-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>{language === 'vi' ? 'Lối tắt nâng cấp cấp độ ngay:' : 'Quick upgrade shortcuts:'}</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {!hasCccd && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToStep('CCCD');
                    }}
                    className="p-2 rounded-xl bg-[#0E1B2E] hover:bg-[#182F4E] border border-[#C5E5EC]/30 text-center text-[10px] font-bold text-[#C5E5EC] hover:text-white transition cursor-pointer"
                  >
                    <SmartphoneNfc className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                    <span>Quét CCCD Chip</span>
                  </button>
                )}
                {!hasFace && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToStep('FACE');
                    }}
                    className="p-2 rounded-xl bg-[#0E1B2E] hover:bg-[#182F4E] border border-[#C5E5EC]/30 text-center text-[10px] font-bold text-[#C5E5EC] hover:text-white transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                    <span>Face Liveness AI</span>
                  </button>
                )}
                {!hasStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToStep('STUDENT');
                    }}
                    className="p-2 rounded-xl bg-[#0E1B2E] hover:bg-[#182F4E] border border-[#C5E5EC]/30 text-center text-[10px] font-bold text-[#C5E5EC] hover:text-white transition cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 mx-auto mb-1 text-purple-400" />
                    <span>Cổng SSO / Thẻ SV</span>
                  </button>
                )}
                {!hasEdu && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToStep('EDU');
                    }}
                    className="p-2 rounded-xl bg-[#0E1B2E] hover:bg-[#182F4E] border border-[#C5E5EC]/30 text-center text-[10px] font-bold text-[#C5E5EC] hover:text-white transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 mx-auto mb-1 text-sky-400" />
                    <span>Email .edu.vn</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#C5E5EC]/15 bg-[#09111D] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] text-white font-black text-xs transition cursor-pointer hover:brightness-110 shadow-md"
          >
            {language === 'vi' ? 'Đã Hiểu' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
