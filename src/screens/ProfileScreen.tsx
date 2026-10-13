import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  SmartphoneNfc,
  Award,
  Lock,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Star,
  CheckCircle2,
  Plus,
  X,
  Flame,
  Smartphone,
  Phone,
  Building2,
  AlertTriangle,
  TrendingUp,
  Check,
  Camera,
  Wrench,
  Copy,
  Cloud,
  Mail,
  Edit3,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  MessageSquare,
  Briefcase,
  Megaphone,
} from 'lucide-react';
import { useGigMe } from '../context/GigMeContext';
import { useTranslation } from '../context/LanguageContext';
import { USER_TIERS, formatVnd, PhonePrivacyMode, maskPhoneNumber } from '../types';
import { playNotificationSound } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';
import { BusinessUpgradeDialog } from '../components/AdvancedDialogs';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { StudentEloModal } from '../components/StudentEloModal';
import { VerifiedIdentityBadge } from '../components/VerifiedIdentityBadge';
import { EduEmailVerificationModal } from '../components/EduEmailVerificationModal';
import { FriendBackupRestoreModal } from '../components/FriendBackupRestoreModal';
import { StudentReviewsModal } from '../components/StudentReviewsModal';
import { DigitalCccdModal } from '../components/DigitalCccdModal';
import { IdentityTierPerksModal } from '../components/IdentityTierPerksModal';

interface ProfileScreenProps {
  onOpenNfcDialog: () => void;
  onOpenFaceDialog?: () => void;
  onOpenSsoDialog: () => void;
  onOpenGeminiVision?: () => void;
  onOpenAdminDashboard: () => void;
  onOpenSettings?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenNfcDialog,
  onOpenFaceDialog,
  onOpenSsoDialog,
  onOpenGeminiVision,
  onOpenAdminDashboard,
  onOpenSettings,
}) => {
  const {
    currentUser,
    logout,
    roleMode,
    toggleRole,
    isDarkMode,
    isMaintenanceActive,
    maintenanceConfig,
    showNotification,
    updateUserProfile,
    userTransactions,
    checkBannedWords,
  } = useGigMe();
  const { language, t } = useTranslation();

  // 1. SKILLS STATE (Ban đầu mảng rỗng nếu chưa add kỹ năng nào)
  const [skills, setSkills] = useState<string[]>(currentUser?.skills || []);
  const [newSkill, setNewSkill] = useState('');

  // 1-Tap Copy 9-digit Student ID state
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (id: string) => {
    triggerHaptic('light');
    playNotificationSound('BUTTON_CLICK');
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    showNotification(
      language === 'vi' ? 'Đã sao chép ID! 📋' : 'ID Copied! 📋',
      language === 'vi' ? `Đã sao chép ID sinh viên: ${id}` : `Copied 9-digit ID: ${id}`,
      false
    );
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Sync with currentUser
  useEffect(() => {
    if (currentUser?.skills) {
      setSkills(currentUser.skills);
    }
  }, [currentUser?.skills]);

  // Modals state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showEloModal, setShowEloModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPhonePrivacyModal, setShowPhonePrivacyModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showDigitalCccdModal, setShowDigitalCccdModal] = useState(false);
  const [showTierPerksModal, setShowTierPerksModal] = useState(false);

  // Edit profile name split state: Họ và tên đệm / Tên
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhonePrivacy, setEditPhonePrivacy] = useState<PhonePrivacyMode>('ESCROW_ONLY');
  const [editSchool, setEditSchool] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editBio, setEditBio] = useState('');

  if (!currentUser) return null;

  // Check PIN existence
  const hasExistingPin = Boolean(currentUser.securityPin && currentUser.securityPin.trim().length === 6);

  // Check deposit & KYC for skills limit
  const hasDeposited = Boolean(
    currentUser.hasDeposited ||
    (userTransactions && userTransactions.some((t) => t.type.includes('DEPOSIT') && t.isSuccess)) ||
    (currentUser.walletBalance > 0 && (currentUser.depositCount ?? 0) > 0) ||
    currentUser.totalSpent > 0
  );
  const hasKycCccd = Boolean(
    currentUser.isKycApproved ||
    currentUser.isNfcVerified ||
    currentUser.isKycVerified ||
    (currentUser.cccdNumber && currentUser.cccdNumber.trim().length >= 9) ||
    currentUser.tier === 'CCCD_VERIFIED' ||
    currentUser.tier === 'VERIFIED'
  );

  let maxSkills = 1;
  let skillTierLabel = language === 'vi' ? 'Tài khoản mới (Tối đa 1 kỹ năng)' : 'New Account (Max 1 skill)';
  if (hasDeposited) {
    maxSkills = 5;
    skillTierLabel = language === 'vi' ? 'Tài khoản đã nạp tiền (Mở khóa 5 kỹ năng)' : 'Funded Account (Unlocked 5 skills)';
  } else if (hasKycCccd) {
    maxSkills = 3;
    skillTierLabel = language === 'vi' ? 'Tài khoản xác thực CCCD (Mở khóa 3 kỹ năng)' : 'ID Verified Account (Unlocked 3 skills)';
  }

  // Open Edit Profile modal with split name
  const handleOpenEditModal = () => {
    triggerHaptic('light');
    const lastName = currentUser.lastName || (currentUser.name ? currentUser.name.split(' ').slice(0, -1).join(' ') : '');
    const firstName = currentUser.firstName || (currentUser.name ? currentUser.name.split(' ').slice(-1).join(' ') : '');
    setEditLastName(lastName);
    setEditFirstName(firstName);
    setEditPhone(currentUser.phone || '');
    setEditPhonePrivacy(currentUser.phonePrivacy || 'ESCROW_ONLY');
    setEditSchool(currentUser.studentSchool || '');
    setEditFaculty(currentUser.studentFaculty || '');
    setEditBio(currentUser.bio || '');
    setShowEditProfileModal(true);
  };

  // Quick Change Phone Privacy from Settings / Profile Card
  const handleQuickChangePhonePrivacy = (mode: PhonePrivacyMode) => {
    triggerHaptic('success');
    updateUserProfile({ phonePrivacy: mode });
    showNotification(
      language === 'vi' ? 'Đã đổi quyền riêng tư SĐT! 🛡️' : 'Phone Privacy Updated! 🛡️',
      mode === 'ESCROW_ONLY'
        ? (language === 'vi' ? 'Chỉ đối tác giao dịch Escrow / đã nhận việc mới xem được SĐT.' : 'Only Escrow partners can see your phone number.')
        : mode === 'PRIVATE'
        ? (language === 'vi' ? 'Số điện thoại của bạn hiện được ẩn hoàn toàn với bên ngoài.' : 'Your phone number is completely hidden.')
        : (language === 'vi' ? 'Số điện thoại của bạn đang hiển thị công khai.' : 'Your phone number is publicly visible.'),
      true
    );
    setShowPhonePrivacyModal(false);
  };

  // Save Edit Profile with combined <= 30 chars rule
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const lastName = editLastName.trim();
    const firstName = editFirstName.trim();
    const combinedName = `${lastName} ${firstName}`.trim();

    if (!lastName) {
      triggerHaptic('error');
      showNotification(
        language === 'vi' ? 'Lỗi' : 'Error',
        language === 'vi' ? 'Vui lòng nhập họ và tên đệm (VD: Nguyễn Văn).' : 'Please enter your last and middle name (e.g. Smith).'
      );
      return;
    }
    if (!firstName) {
      triggerHaptic('error');
      showNotification(
        language === 'vi' ? 'Lỗi' : 'Error',
        language === 'vi' ? 'Vui lòng nhập tên (VD: An).' : 'Please enter your first name (e.g. John).'
      );
      return;
    }
    if (combinedName.length > 30) {
      triggerHaptic('error');
      showNotification(
        language === 'vi' ? 'Lỗi' : 'Error',
        language === 'vi'
          ? `Họ tên đệm và tên ghi gộp lại không được quá 30 ký tự (hiện tại: ${combinedName.length} ký tự).`
          : `Combined full name cannot exceed 30 characters (currently: ${combinedName.length} characters).`
      );
      return;
    }

    // Quét kiểm duyệt từ cấm trong họ tên
    const nameCheck = checkBannedWords(combinedName);
    if (nameCheck.isBlocked) {
      triggerHaptic('error');
      showNotification(
        language === 'vi' ? '🚫 Họ tên chứa từ cấm' : '🚫 Prohibited Name',
        language === 'vi'
          ? `Họ và tên không được chứa từ cấm vi phạm ("${nameCheck.matchedWord}")!`
          : `Full name cannot contain prohibited word ("${nameCheck.matchedWord}")!`
      );
      return;
    }

    // Quét kiểm duyệt từ cấm trong tiểu sử (Bio)
    if (editBio.trim()) {
      const bioCheck = checkBannedWords(editBio.trim());
      if (bioCheck.isBlocked) {
        triggerHaptic('error');
        showNotification(
          language === 'vi' ? '🚫 Tiểu sử chứa từ cấm' : '🚫 Prohibited Bio',
          language === 'vi'
            ? `Phần tự giới thiệu không được chứa từ cấm vi phạm ("${bioCheck.matchedWord}")!`
            : `Bio cannot contain prohibited word ("${bioCheck.matchedWord}")!`
        );
        return;
      }
    }

    if (editPhone.trim()) {
      const p = editPhone.trim();
      if (p.length > 10 || !/^0\d{9}$/.test(p)) {
        triggerHaptic('error');
        showNotification(
          language === 'vi' ? 'Lỗi số điện thoại' : 'Phone error',
          language === 'vi'
            ? 'Số điện thoại phải gồm đúng 10 chữ số (bắt đầu bằng số 0, VD: 0909123456)!'
            : 'Phone number must be exactly 10 digits starting with 0!'
        );
        return;
      }
    }

    triggerHaptic('success');
    const campusBadge = editSchool.trim()
      ? `${editSchool.trim()}${editFaculty.trim() ? ` • ${editFaculty.trim()}` : ''}`
      : '';
    updateUserProfile({
      name: combinedName,
      lastName,
      firstName,
      phone: editPhone.trim(),
      phonePrivacy: editPhonePrivacy,
      studentSchool: editSchool.trim(),
      studentFaculty: editFaculty.trim(),
      campusBadge,
      bio: editBio.trim(),
    });
    showNotification(
      language === 'vi' ? 'Cập nhật thành công! ✨' : 'Updated Successfully! ✨',
      language === 'vi' ? 'Hồ sơ cá nhân của bạn đã được lưu.' : 'Your profile has been saved.'
    );
    setShowEditProfileModal(false);
  };

  // Handle Add Skill (max 30 chars, tiered limit)
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (!trimmed) return;

    if (skills.includes(trimmed)) {
      showNotification(
        language === 'vi' ? 'Thông báo' : 'Notice',
        language === 'vi' ? 'Kỹ năng này đã có trong hồ sơ của bạn.' : 'This skill is already in your profile.'
      );
      return;
    }

    // Quét kiểm duyệt từ cấm trong thẻ kỹ năng / tag
    const skillCheck = checkBannedWords(trimmed);
    if (skillCheck.isBlocked) {
      triggerHaptic('error');
      showNotification(
        language === 'vi' ? '🚫 Thẻ kỹ năng chứa từ cấm' : '🚫 Prohibited Skill Tag',
        language === 'vi'
          ? `Thẻ kỹ năng / tag không được chứa từ ngữ vi phạm ("${skillCheck.matchedWord}")!`
          : `Skill tag cannot contain prohibited word ("${skillCheck.matchedWord}")!`
      );
      return;
    }

    if (trimmed.length > 30) {
      triggerHaptic('error');
      showNotification(
        language === 'vi' ? 'Vượt quá độ dài' : 'Length Exceeded',
        language === 'vi' ? 'Mỗi thẻ kỹ năng không được quá 30 ký tự!' : 'Each skill tag cannot exceed 30 characters!'
      );
      return;
    }

    if (skills.length >= maxSkills) {
      triggerHaptic('error');
      let reason = language === 'vi'
        ? 'Tài khoản mới chỉ add tối đa 1 kỹ năng. Hãy xác thực CCCD để mở khóa 3 kỹ năng hoặc thực hiện nạp tiền để mở khóa tối đa 5 kỹ năng!'
        : 'New accounts can add max 1 skill. Verify ID to unlock 3 skills or deposit funds to unlock 5 skills!';
      if (maxSkills === 3) {
        reason = language === 'vi'
          ? 'Tài khoản xác thực CCCD add tối đa 3 kỹ năng. Hãy nạp tiền vào ví để mở khóa tối đa 5 kỹ năng!'
          : 'ID-verified accounts can add max 3 skills. Deposit funds to unlock up to 5 skills!';
      } else if (maxSkills === 5) {
        reason = language === 'vi'
          ? 'Bạn đã đạt giới hạn tối đa 5 kỹ năng cho tài khoản của mình.'
          : 'You have reached the maximum limit of 5 skills for your account.';
      }
      showNotification(language === 'vi' ? 'Giới hạn thẻ kỹ năng' : 'Skill Tag Limit', reason);
      return;
    }

    triggerHaptic('success');
    const updated = [...skills, trimmed];
    setSkills(updated);
    setNewSkill('');
    updateUserProfile({ skills: updated });
    showNotification(
      language === 'vi' ? 'Đã thêm kỹ năng ✨' : 'Skill Added ✨',
      language === 'vi' ? `Đã lưu thẻ "${trimmed}" vào hồ sơ.` : `Saved skill "${trimmed}" to profile.`
    );
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    triggerHaptic('light');
    const updated = skills.filter((s) => s !== skillToRemove);
    setSkills(updated);
    updateUserProfile({ skills: updated });
  };

  const currentTierConfig = USER_TIERS[currentUser.tier];
  const isSuperAdmin =
    currentUser.role === 'ADMIN' ||
    currentUser.id === '000000000' ||
    currentUser.email === 'admin@admin.vn' ||
    currentUser.phone === '0909120918' ||
    currentUser.id === 'admin_root';

  const trustScore = currentUser.trustScore ?? 0;
  const getTrustRating = (score: number) => {
    if (score >= 800)
      return {
        label: language === 'vi' ? 'Hạng AAA - Xuất Sắc' : 'Tier AAA - Excellent',
        badge: 'bg-[#E0FAEB]/20 text-[#E0FAEB] border border-[#E0FAEB]/30',
      };
    if (score >= 740)
      return {
        label: language === 'vi' ? 'Hạng AA - Rất Tốt' : 'Tier AA - Very Good',
        badge: 'bg-[#C5E5EC]/20 text-[#C5E5EC] border border-[#C5E5EC]/30',
      };
    if (score >= 670)
      return {
        label: language === 'vi' ? 'Hạng A - Uy Tín' : 'Tier A - Reputable',
        badge: 'bg-[#3064AE]/30 text-[#C5E5EC] border border-[#C5E5EC]/30',
      };
    if (score >= 300)
      return {
        label: language === 'vi' ? 'Hạng B - Đang Cải Thiện' : 'Tier B - Improving',
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      };
    return {
      label: language === 'vi' ? 'Chưa Tích Lũy Điểm' : 'No Score Accumulated',
      badge: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
    };
  };
  const trustInfo = getTrustRating(trustScore);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 text-white space-y-4 sm:space-y-6 text-xs">
      {/* Maintenance Mode Notice */}
      {isMaintenanceActive && (
        <div className="rounded-2xl bg-[#0E1B2E] border border-amber-500/40 p-4 shadow-lg flex items-start space-x-3">
          <Wrench className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1 flex-1">
            <div className="font-extrabold text-amber-300 text-xs flex items-center space-x-2">
              <span>{language === 'vi' ? 'HỆ THỐNG ĐANG BẢO TRÌ NÂNG CẤP' : 'SYSTEM UNDER UPGRADE MAINTENANCE'}</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono">
                {language === 'vi' ? 'Chế độ xem hồ sơ được phép' : 'Profile view allowed'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {language === 'vi'
                ? 'Bạn đang xem thông tin cá nhân của mình. Các tính năng nạp rút tiền và giao dịch tạm thời khóa đến '
                : 'You are viewing your personal profile. Deposits, withdrawals, and transactions are locked until '}
              <span className="text-white font-bold">
                {new Date(maintenanceConfig.endTime).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}
              </span>.
            </p>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-tri-gradient" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#C5E5EC]/60 group-hover:border-[#E0FAEB] shadow-lg shadow-[#3064AE]/30 transition-transform active:scale-95 bg-[#09111D] flex items-center justify-center relative cursor-pointer"
                title={language === 'vi' ? 'Bấm để thay đổi ảnh đại diện' : 'Click to change avatar'}
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#3064AE] to-[#417AC6] flex items-center justify-center font-black text-2xl text-white">
                    {(currentUser.name || 'G').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white drop-shadow" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#3064AE] text-white hover:bg-[#255294] shadow-md transition border-2 border-[#0E1B2E] cursor-pointer"
                title={language === 'vi' ? 'Thay đổi ảnh đại diện' : 'Change avatar'}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-sm sm:text-base font-extrabold text-white truncate">{currentUser.name}</h2>
                {(currentUser.isNfcVerified || currentUser.isStudentVerified || currentUser.isEduVerified) && (
                  <VerifiedIdentityBadge
                    isCccdVerified={!!currentUser.isNfcVerified}
                    isStudentVerified={!!(currentUser.isStudentVerified || currentUser.isEduVerified)}
                    school={currentUser.studentSchool}
                    faculty={currentUser.studentFaculty}
                    size="sm"
                    showText={true}
                    interactive={true}
                    onBadgeClick={onOpenNfcDialog}
                  />
                )}
              </div>

              {/* Name Details Split display */}
              <div className="text-[11px] text-[#C5E5EC]/80 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{t('lastNameLabel')}: <strong className="text-white">{currentUser.lastName || (currentUser.name ? currentUser.name.split(' ').slice(0, -1).join(' ') : '') || '—'}</strong></span>
                <span>{t('firstNameLabel')}: <strong className="text-[#E0FAEB]">{currentUser.firstName || (currentUser.name ? currentUser.name.split(' ').pop() : '') || '—'}</strong></span>
              </div>

              <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-[#C5E5EC]/70 flex-wrap gap-y-1">
                <button
                  type="button"
                  onClick={() => handleCopyId(currentUser.id)}
                  className="font-mono bg-[#12233B] hover:bg-[#182F4E] active:scale-95 px-2.5 py-0.5 rounded-lg border border-[#C5E5EC]/30 hover:border-cyan-400 text-[#E0FAEB] flex items-center space-x-1.5 transition cursor-pointer group shadow-xs"
                  title={language === 'vi' ? 'Chạm để sao chép ID 9 số sinh viên' : 'Click to copy 9-digit Student ID'}
                >
                  <span>ID: {currentUser.id}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400 animate-scale-in" />
                  ) : (
                    <Copy className="w-3 h-3 text-[#C5E5EC]/60 group-hover:text-cyan-300 transition" />
                  )}
                  {copiedId && (
                    <span className="text-[9px] text-emerald-300 font-bold ml-0.5">
                      {language === 'vi' ? 'Đã chép!' : 'Copied!'}
                    </span>
                  )}
                </button>
                <span>•</span>
                <span className="truncate">
                  {currentUser.studentSchool
                    ? `${currentUser.studentSchool}${currentUser.studentFaculty ? ` • ${currentUser.studentFaculty}` : ''}`
                    : (language === 'vi' ? 'Chưa cập nhật trường' : 'School not updated')}
                </span>
              </div>

              {/* Contact Phone & Privacy Badge */}
              <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-[#C5E5EC]/70 flex-wrap gap-y-1">
                <span className="flex items-center space-x-1 font-mono text-white">
                  <Phone className="w-3.5 h-3.5 text-[#E0FAEB]" />
                  <span>{currentUser.phone || (language === 'vi' ? 'Chưa thêm SĐT' : 'No phone')}</span>
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowPhonePrivacyModal(true);
                  }}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer hover:brightness-110 active:scale-95 ${
                    currentUser.phonePrivacy === 'PRIVATE'
                      ? 'bg-slate-800/80 text-slate-300 border-slate-600'
                      : currentUser.phonePrivacy === 'PUBLIC'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                      : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                  }`}
                  title={language === 'vi' ? 'Nhấp để đổi quyền riêng tư số điện thoại' : 'Click to change phone privacy'}
                >
                  <span>
                    {currentUser.phonePrivacy === 'PRIVATE'
                      ? '🔒 ' + (language === 'vi' ? 'Ẩn SĐT với người ngoài' : 'Hidden publicly')
                      : currentUser.phonePrivacy === 'PUBLIC'
                      ? '🌐 ' + (language === 'vi' ? 'SĐT Công khai' : 'Public phone')
                      : '🛡️ ' + (language === 'vi' ? 'Chỉ hiện khi Escrow' : 'Escrow only')}
                  </span>
                </button>
              </div>

              {currentUser.bio && (
                <p className="text-[11px] text-slate-300 italic mt-1 line-clamp-2">
                  &ldquo;{currentUser.bio}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="px-3 py-1.5 rounded-xl bg-[#12233B] hover:bg-[#182F4E] border border-[#C5E5EC]/30 text-[#C5E5EC] hover:text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('editProfileBtn')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEloModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs shadow-md transition flex items-center space-x-1 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-black" />
              <span>{currentUser.eloRating ?? 0} ELO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Mode Switcher Card (Chuyển đổi Vai Trò Kép Sinh Viên) */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#C5E5EC]/15">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-md transition ${
              roleMode === 'FREELANCER'
                ? 'bg-gradient-to-tr from-[#3064AE] to-[#417AC6] text-white border border-[#C5E5EC]/30'
                : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border border-purple-400/30'
            }`}>
              {roleMode === 'FREELANCER' ? <Briefcase className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm text-white">
                  {roleMode === 'FREELANCER'
                    ? (language === 'vi' ? 'Chế Độ: Sinh Viên Nhận Việc' : 'Mode: Student Freelancer')
                    : (language === 'vi' ? 'Chế Độ: Người Đăng Tuyển' : 'Mode: Gig Client')}
                </h3>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  roleMode === 'FREELANCER'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                }`}>
                  {roleMode === 'FREELANCER' ? 'Freelancer' : 'Client'}
                </span>
              </div>
              <p className="text-[11px] text-[#C5E5EC]/70">
                {roleMode === 'FREELANCER'
                  ? (language === 'vi'
                      ? 'Đang bật nhận đơn kèo, tích lũy điểm ELO & thù lao học đường'
                      : 'Actively receiving campus gigs, accumulating ELO & earnings')
                  : (language === 'vi'
                      ? 'Đang bật tạo tin việc, tuyển bạn học trợ giúp & quản lý Smart Escrow'
                      : 'Creating gigs, hiring peers & managing Smart Escrow')}
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              playNotificationSound('BUTTON_CLICK');
              toggleRole();
              showNotification(
                language === 'vi' ? 'Đã đổi chế độ vai trò! 🔄' : 'Role Mode Toggled! 🔄',
                roleMode === 'FREELANCER'
                  ? (language === 'vi' ? 'Bạn đang ở chế độ Người Đăng Tuyển (Client).' : 'Switched to Client Mode.')
                  : (language === 'vi' ? 'Bạn đang ở chế độ Sinh Viên Nhận Việc (Freelancer).' : 'Switched to Freelancer Mode.'),
                true
              );
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#12233B] hover:bg-[#182F4E] border border-[#C5E5EC]/30 hover:border-cyan-400 text-white font-extrabold text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-95 group"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#E0FAEB] group-hover:rotate-180 transition-transform duration-500" />
            <span>
              {roleMode === 'FREELANCER'
                ? (language === 'vi' ? 'Chuyển sang Đăng việc →' : 'Switch to Client →')
                : (language === 'vi' ? 'Chuyển sang Nhận việc →' : 'Switch to Freelancer →')}
            </span>
          </button>
        </div>

        {/* Dynamic Stats by Role */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          {roleMode === 'FREELANCER' ? (
            <>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Việc đã hoàn tất' : 'Completed Gigs'}</span>
                <span className="text-sm font-black text-[#E0FAEB] font-mono mt-0.5 block">{currentUser.completedGigs || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Tỷ lệ đúng giờ' : 'On-Time Rate'}</span>
                <span className="text-sm font-black text-cyan-300 font-mono mt-0.5 block">{currentUser.onTimeRate || 100}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Chuỗi 5 sao liên tiếp' : 'Win Streak'}</span>
                <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">🔥 {currentUser.winStreak || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Thẻ kỹ năng' : 'Skills'}</span>
                <span className="text-sm font-black text-white font-mono mt-0.5 block">{skills.length}/{maxSkills}</span>
              </div>
            </>
          ) : (
            <>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Tin việc đã đăng' : 'Posted Gigs'}</span>
                <span className="text-sm font-black text-purple-300 font-mono mt-0.5 block">{currentUser.postedGigsCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Đã chi trả Escrow' : 'Escrow Spent'}</span>
                <span className="text-sm font-black text-[#E0FAEB] font-mono mt-0.5 block">{formatVnd(currentUser.totalSpent || 0)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Số dư khả dụng' : 'Available Balance'}</span>
                <span className="text-sm font-black text-cyan-300 font-mono mt-0.5 block">{formatVnd(currentUser.walletBalance || 0)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/10 text-center">
                <span className="text-[10px] text-[#C5E5EC]/70 block">{language === 'vi' ? 'Ký quỹ đang khóa' : 'Locked Escrow'}</span>
                <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">{formatVnd(currentUser.escrowLockedBalance || 0)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trust Score & Verification Card */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#E0FAEB]" />
            <h3 className="font-black text-sm text-white">{t('trustScoreTitle')}</h3>
          </div>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold ${trustInfo.badge}`}>
            {trustInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 text-center">
            <div className="text-lg font-black text-white">{trustScore}/100</div>
            <div className="text-[10px] text-[#C5E5EC]/70 mt-0.5">{t('trustScore')}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              playNotificationSound('BUTTON_CLICK');
              setShowReviewsModal(true);
            }}
            className="p-3 rounded-2xl bg-[#12233B] hover:bg-[#182F4E] border border-[#C5E5EC]/15 hover:border-amber-400/40 text-center transition cursor-pointer group active:scale-95 shadow-xs"
            title={language === 'vi' ? 'Nhấp để xem chi tiết nhận xét & đánh giá' : 'Click to view reviews & feedback'}
          >
            <div className="text-lg font-black text-amber-400 group-hover:scale-105 transition-transform">
              {currentUser.rating > 0 ? `${currentUser.rating.toFixed(1)} ★` : '5.0 ★'}
            </div>
            <div className="text-[10px] text-[#C5E5EC]/70 group-hover:text-amber-300 mt-0.5 flex items-center justify-center space-x-0.5 transition">
              <span>{currentUser.reviewCount || 0} {t('reviewsCount')}</span>
              <span className="text-[9px]">→</span>
            </div>
          </button>
          <div className="p-3 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 text-center">
            <div className="text-lg font-black text-[#E0FAEB]">{currentUser.completedGigs || 0}</div>
            <div className="text-[10px] text-[#C5E5EC]/70 mt-0.5">{t('completedGigsCount')}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 text-center">
            <div className="text-lg font-black text-cyan-400">{currentUser.onTimeRate || 100}%</div>
            <div className="text-[10px] text-[#C5E5EC]/70 mt-0.5">{t('onTimeRate')}</div>
          </div>
        </div>
      </div>

      {/* Identification & KYC Cards - TRUNG TÂM ĐỊNH DANH & XÁC THỰC SINH VIÊN */}
      {(() => {
        const hasCccdVerified = Boolean(
          currentUser.isNfcVerified ||
          currentUser.isKycApproved ||
          (currentUser.cccdNumber && currentUser.cccdNumber.trim().length >= 9) ||
          currentUser.tier === 'CCCD_VERIFIED'
        );
        const hasFaceVerified = Boolean(currentUser.isFaceLivenessPassed);
        const hasStudentVerified = Boolean(currentUser.isStudentVerified);
        const hasEduVerified = Boolean(currentUser.isEduVerified);

        const kycSteps = [
          { key: 'CCCD', completed: hasCccdVerified },
          { key: 'FACE', completed: hasFaceVerified },
          { key: 'STUDENT', completed: hasStudentVerified },
          { key: 'EDU', completed: hasEduVerified },
        ];
        const completedKycCount = kycSteps.filter((s) => s.completed).length;
        const kycProgressPercent = Math.round((completedKycCount / 4) * 100);

        const getKycTierBadge = () => {
          if (completedKycCount === 4) {
            return {
              label: language === 'vi' ? 'Cấp 3: Elite VIP Toàn Diện' : 'Level 3: Elite VIP',
              color: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
            };
          }
          if (completedKycCount === 3) {
            return {
              label: language === 'vi' ? 'Cấp 2+: CCCD & Sinh Trắc' : 'Level 2+: CCCD & Face',
              color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
            };
          }
          if (completedKycCount >= 1) {
            return {
              label: language === 'vi' ? 'Cấp 2: Sinh Viên Campus' : 'Level 2: Campus Student',
              color: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
            };
          }
          return {
            label: language === 'vi' ? 'Cấp 1: Newbie Cơ Bản' : 'Level 1: Newbie',
            color: 'bg-slate-700/60 text-slate-300 border-slate-600',
          };
        };
        const currentKycTier = getKycTierBadge();

        return (
          <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
            {/* Top Hub Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#E0FAEB]" />
                  <h3 className="text-sm font-extrabold text-white">
                    {language === 'vi' ? 'Trung Tâm Định Danh & Xác Thực Sinh Viên' : 'Student Identity & Verification Hub'}
                  </h3>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${currentKycTier.color}`}>
                    {currentKycTier.label}
                  </span>
                </div>
                <p className="text-[11px] text-[#C5E5EC]/70 mt-1">
                  {language === 'vi'
                    ? 'Bảo chứng an toàn Smart Escrow • Phòng chống lừa đảo • Mở khóa hạn mức tối đa'
                    : 'Smart Escrow legal guarantee • Anti-fraud • Unlock max wallet limits'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowTierPerksModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#12233B] hover:bg-[#182F4E] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white font-extrabold text-xs transition flex items-center justify-center space-x-1.5 self-start sm:self-auto cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>{language === 'vi' ? 'Bảng Quyền Lợi & Hạn Mức ↗' : 'View Tier Limits & Perks ↗'}</span>
              </button>
            </div>

            {/* Visual Progress Bar & Tier Perks Bar */}
            <div className="p-3.5 rounded-2xl bg-[#12233B]/90 border border-[#C5E5EC]/15 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2 font-bold text-white">
                  <span>{language === 'vi' ? 'Tiến trình định danh:' : 'Verification Progress:'}</span>
                  <span className="font-mono text-cyan-300 font-black">{completedKycCount}/4 {language === 'vi' ? 'bước' : 'steps'}</span>
                  <span className="text-[#E0FAEB] font-black">({kycProgressPercent}%)</span>
                </div>
                <div className="text-[10px] font-mono text-amber-300 flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {language === 'vi' ? 'Hạn mức:' : 'Limit:'}{' '}
                    <strong>
                      {completedKycCount === 4
                        ? '100 Triệu'
                        : completedKycCount === 3
                        ? '30 Triệu'
                        : completedKycCount >= 1
                        ? '10 Triệu'
                        : '500k'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-[#09111D] rounded-full h-2.5 overflow-hidden p-0.5 border border-[#C5E5EC]/20 relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3064AE] via-cyan-400 to-[#E0FAEB] transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.max(kycProgressPercent, 5)}%` }}
                />
              </div>

              {/* 4 Mini Milestone Indicators */}
              <div className="grid grid-cols-4 gap-1 pt-0.5 text-center text-[10px] font-bold">
                <div className={hasCccdVerified ? 'text-emerald-300' : 'text-slate-400'}>
                  1. CCCD Chip {hasCccdVerified ? '✓' : ''}
                </div>
                <div className={hasFaceVerified ? 'text-emerald-300' : 'text-slate-400'}>
                  2. Face AI {hasFaceVerified ? '✓' : ''}
                </div>
                <div className={hasStudentVerified ? 'text-emerald-300' : 'text-slate-400'}>
                  3. Thẻ SV / SSO {hasStudentVerified ? '✓' : ''}
                </div>
                <div className={hasEduVerified ? 'text-sky-300' : 'text-slate-400'}>
                  4. Email .edu {hasEduVerified ? '✓' : ''}
                </div>
              </div>
            </div>

            {/* 4 CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Card 1: CCCD NFC (Bộ Công An C06) */}
              <div className="p-4 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/20 flex flex-col justify-between hover:border-cyan-400/40 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white text-xs flex items-center space-x-1.5">
                      <SmartphoneNfc className="w-4 h-4 text-cyan-300" />
                      <span>{t('nfcCccdTitle')}</span>
                    </span>
                    {hasCccdVerified ? (
                      <span className="text-emerald-300 font-bold text-[10px] flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> {t('verifiedStatus')}
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px]">
                        {t('unverifiedStatus')}
                      </span>
                    )}
                  </div>

                  {hasCccdVerified ? (
                    <div className="p-2.5 rounded-xl bg-[#0B1524] border border-emerald-500/25 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#C5E5EC]/70 text-[10px]">Số CCCD đối chiếu:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {currentUser.cccdNumber
                            ? `${currentUser.cccdNumber.slice(0, 3)} ${currentUser.cccdNumber.slice(3, 6)} ••• •••`
                            : '079 204 ••• •••'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-300">
                        <span className="text-[#C5E5EC]/70">Chuẩn số hóa:</span>
                        <span className="text-emerald-300 font-mono">C06-BCA • ICAO 9303</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#C5E5EC]/70 text-[11px] leading-relaxed">
                      Quét vi mạch chíp NFC mặt sau thẻ CCCD để bảo chứng pháp lý, chống bùng tiền & nâng hạn mức lên 30.000.000đ.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  {hasCccdVerified ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setShowDigitalCccdModal(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] text-white font-extrabold text-xs transition hover:brightness-110 shadow-sm cursor-pointer"
                      >
                        {language === 'vi' ? 'Xem Thẻ CCCD Số Hóa' : 'View Digital ID'}
                      </button>
                      <button
                        type="button"
                        onClick={onOpenNfcDialog}
                        className="px-3 py-2 rounded-xl bg-[#182F4E] hover:bg-[#203D66] border border-[#C5E5EC]/30 text-[#C5E5EC] hover:text-white font-bold text-xs transition cursor-pointer"
                        title={language === 'vi' ? 'Quét lại thẻ CCCD khác' : 'Re-scan NFC'}
                      >
                        {language === 'vi' ? 'Quét Lại' : 'Re-scan'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenNfcDialog}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs transition hover:brightness-110 shadow-md cursor-pointer"
                    >
                      {language === 'vi' ? 'Quét CCCD NFC (13.56 MHz) →' : 'Scan NFC CCCD →'}
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Sinh Trắc Học Face Liveness AI */}
              <div className="p-4 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/20 flex flex-col justify-between hover:border-cyan-400/40 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white text-xs flex items-center space-x-1.5">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'vi' ? 'Sinh Trắc Học AI (Face Liveness)' : 'AI Face Liveness'}</span>
                    </span>
                    {hasFaceVerified ? (
                      <span className="text-emerald-300 font-bold text-[10px] flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> {language === 'vi' ? 'Đạt Chuẩn AI' : 'Verified'}
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px]">
                        {language === 'vi' ? 'Chưa Xác Minh' : 'Unverified'}
                      </span>
                    )}
                  </div>

                  {hasFaceVerified ? (
                    <div className="p-2.5 rounded-xl bg-[#0B1524] border border-emerald-500/25 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#C5E5EC]/70 text-[10px]">Sinh trắc khuôn mặt:</span>
                        <span className="font-bold text-emerald-300">Đạt Chuẩn 3D Liveness</span>
                      </div>
                      <div className="text-[10px] text-slate-300">
                        Đã đối chiếu cử động mắt, nụ cười và góc nghiêng chống giả mạo deepfake.
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#C5E5EC]/70 text-[11px] leading-relaxed">
                      AI phân tích chuyển động đồng tử và vi biểu cảm 3D để xác nhận bạn là người thật, chống tài khoản ảo và botnet.
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenFaceDialog) onOpenFaceDialog();
                      else showNotification('Lỗi', 'Không tìm thấy hộp thoại Face Liveness.');
                    }}
                    className={`w-full py-2 rounded-xl font-extrabold text-xs transition cursor-pointer ${
                      hasFaceVerified
                        ? 'bg-[#182F4E] hover:bg-[#203D66] border border-[#C5E5EC]/30 text-[#C5E5EC] hover:text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110 shadow-md'
                    }`}
                  >
                    {hasFaceVerified
                      ? (language === 'vi' ? 'Quét Lại Khuôn Mặt AI' : 'Re-verify Face Liveness')
                      : (language === 'vi' ? 'Xác Minh Khuôn Mặt AI →' : 'Start AI Face Liveness →')}
                  </button>
                </div>
              </div>

              {/* Card 3: Định Danh Sinh Viên Campus (SSO hoặc Quét Thẻ SV Gemini Vision) */}
              <div className="p-4 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/20 flex flex-col justify-between hover:border-cyan-400/40 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white text-xs flex items-center space-x-1.5">
                      <GraduationCap className="w-4 h-4 text-purple-400" />
                      <span>{language === 'vi' ? 'Định Danh Sinh Viên (Campus ID)' : 'Campus Student ID'}</span>
                    </span>
                    {hasStudentVerified ? (
                      <span className="text-emerald-300 font-bold text-[10px] flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> {language === 'vi' ? 'Sinh Viên Chính Quy' : 'Verified'}
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px]">
                        {t('unverifiedStatus')}
                      </span>
                    )}
                  </div>

                  {hasStudentVerified ? (
                    <div className="p-2.5 rounded-xl bg-[#0B1524] border border-purple-500/25 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#C5E5EC]/70 text-[10px]">Trường ĐH:</span>
                        <span className="font-bold text-white truncate max-w-[170px]">
                          {currentUser.studentSchool || 'ĐH Bách Khoa TP.HCM'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#C5E5EC]/70">MSSV / Khoa:</span>
                        <span className="font-mono text-purple-300">
                          {currentUser.studentId || '2110945'} • {currentUser.studentFaculty || 'CNTT'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#C5E5EC]/70 text-[11px] leading-relaxed">
                      Xác thực qua Cổng trường SSO hoặc Chụp thẻ sinh viên qua Gemini Vision AI để giảm phí Escrow xuống 8% và mở khóa kèo campus.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={onOpenSsoDialog}
                    className="flex-1 py-2 rounded-xl bg-[#182F4E] hover:bg-[#203D66] border border-[#C5E5EC]/30 text-[#C5E5EC] hover:text-white font-extrabold text-xs transition cursor-pointer"
                  >
                    {language === 'vi' ? 'Cổng Trường SSO' : 'Campus SSO'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenGeminiVision) onOpenGeminiVision();
                      else onOpenSsoDialog();
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-xs transition shadow-sm cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{language === 'vi' ? 'Quét Thẻ SV (AI)' : 'AI Card OCR'}</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Email Học Đường (.edu.vn) */}
              <div className="p-4 rounded-2xl bg-[#12233B] border border-sky-400/25 flex flex-col justify-between hover:border-sky-400/50 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white text-xs flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-sky-400" />
                      <span>{t('eduEmailTitle')}</span>
                    </span>
                    {hasEduVerified ? (
                      <span className="text-sky-300 font-bold text-[10px] flex items-center px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-sky-400" /> {t('verifiedStatus')}
                      </span>
                    ) : (
                      <span className="text-sky-300 font-bold px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-[9px]">
                        {language === 'vi' ? 'Nhận Tích Xanh' : 'Get Badge'}
                      </span>
                    )}
                  </div>

                  {hasEduVerified ? (
                    <div className="p-2.5 rounded-xl bg-[#0B1524] border border-sky-500/25 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#C5E5EC]/70 text-[10px]">Email xác thực:</span>
                        <span className="font-mono font-bold text-sky-300 truncate max-w-[170px]">
                          {currentUser.eduEmail || currentUser.studentEmail || 'sv@hcmut.edu.vn'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300">
                        Đã kích hoạt Tích Xanh Sinh Viên Chính Quy & bảo vệ tài khoản ví.
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#C5E5EC]/70 text-[11px] leading-relaxed">
                      {t('eduEmailDesc')}
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowEduModal(true)}
                    className="w-full py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 hover:text-white font-extrabold text-xs transition cursor-pointer"
                  >
                    {hasEduVerified
                      ? (language === 'vi' ? 'Xem Thông Tin Email .edu' : 'View .edu Email')
                      : (language === 'vi' ? 'Xác Thực Email .edu →' : 'Verify .edu Email →')}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Security Notice Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#0B1524] via-[#0E1E34] to-[#0B1524] border border-[#C5E5EC]/15 flex items-start space-x-2.5">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#C5E5EC]/80 leading-relaxed">
                <strong className="text-white">Bảo mật tuyệt đối (E2EE):</strong> Thông tin CCCD và thẻ sinh viên được mã hóa tuân thủ Nghị định 13/2023/NĐ-CP & Luật An ninh mạng. GigMe chỉ lưu trữ chữ ký băm (Hash) bảo chứng cho hợp đồng thông minh Smart Escrow, không chia sẻ cho bên thứ ba.
              </p>
            </div>
          </div>
        );
      })()}

      {/* 3. THẺ KỸ NĂNG & LĨNH VỰC NHẬN VIỆC */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-1.5">
            <Award className="w-4 h-4 text-[#C5E5EC]" />
            <span>{t('skillsSectionTitle')}</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#12233B] border border-[#C5E5EC]/25 text-[#E0FAEB] font-bold">
            {skills.length} / {maxSkills} {language === 'vi' ? 'kỹ năng' : 'skills'}
          </span>
        </div>

        <p className="text-[#C5E5EC]/70 text-[11px] leading-relaxed">
          {t('skillsSectionDesc')}
        </p>

        {/* Current Skills list */}
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/20 text-[#E0FAEB] text-xs font-bold"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-[#C5E5EC]/60 hover:text-rose-400 cursor-pointer transition"
                  title={language === 'vi' ? 'Xóa kỹ năng' : 'Remove skill'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#12233B]/50 border border-[#C5E5EC]/15 text-center text-[11px] text-[#C5E5EC]/60 italic">
            {language === 'vi'
              ? 'Chưa có thẻ kỹ năng nào. Hãy thêm kỹ năng để bắt đầu nhận việc phù hợp!'
              : 'No skill tags added yet. Add your skills to start matching gigs!'}
          </div>
        )}

        {/* Add Skill form */}
        <form onSubmit={handleAddSkill} className="space-y-1 pt-1">
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={30}
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              disabled={skills.length >= maxSkills}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white text-xs placeholder:text-[#C5E5EC]/40 focus:outline-none focus:border-[#3064AE] disabled:opacity-50"
              placeholder={
                skills.length >= maxSkills
                  ? language === 'vi'
                    ? `Đã đạt tối đa ${maxSkills} kỹ năng`
                    : `Reached max ${maxSkills} skills`
                  : language === 'vi'
                  ? 'Thêm kỹ năng mới (VD: Thiết kế Canva, Lập trình C++...)'
                  : 'Add new skill (e.g. Canva Design, Python...)'
              }
            />
            <button
              type="submit"
              disabled={skills.length >= maxSkills || !newSkill.trim() || checkBannedWords(newSkill).isBlocked}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] text-white font-extrabold text-xs transition border border-[#C5E5EC]/30 flex items-center space-x-1 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Thêm' : 'Add'}</span>
            </button>
          </div>
          {checkBannedWords(newSkill).isBlocked && (
            <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1 pt-0.5 animate-fadeIn">
              <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
              <span>
                {language === 'vi'
                  ? `Phát hiện từ cấm ("${checkBannedWords(newSkill).matchedWord}"). Bạn không thể thêm thẻ này!`
                  : `Prohibited word detected ("${checkBannedWords(newSkill).matchedWord}"). Tag cannot be added!`}
              </span>
            </p>
          )}
          <div className="flex justify-between items-center text-[10px] text-[#C5E5EC]/60 px-1">
            <span>{language === 'vi' ? 'Tối đa 30 ký tự mỗi kỹ năng' : 'Max 30 characters per skill'}</span>
            <span>{newSkill.trim().length}/30</span>
          </div>
        </form>
      </div>

      {/* 4. CÀI ĐẶT & QUẢN TRỊ TÀI KHOẢN (Bảo Mật & Tiện Ích Đã Chuyển Sang Tab Cài Đặt) */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 sm:p-6 shadow-xl space-y-2.5">
        <h3 className="text-sm font-extrabold text-white mb-1">
          {language === 'vi' ? 'Hệ Thống & Quản Trị' : 'System & Administration'}
        </h3>

        {/* Nút Chuyển Nhanh Tới Màn Hình Cài Đặt (Nơi chứa toàn bộ Bảo Mật & Tiện Ích) */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#12233B] via-[#162B48] to-[#12233B] hover:border-[#00E5FF]/40 border border-[#C5E5EC]/20 flex items-center justify-between transition text-left cursor-pointer active:scale-98 shadow-sm group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#3064AE]/30 border border-[#C5E5EC]/30 flex items-center justify-center text-[#E0FAEB] group-hover:scale-105 transition">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-xs flex items-center space-x-2">
                  <span>{language === 'vi' ? 'Bảo Mật & Tiện Ích Ứng Dụng' : 'Security & App Preferences'}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold">
                    {language === 'vi' ? 'Tab Cài Đặt' : 'Settings'}
                  </span>
                </h4>
                <p className="text-[10px] text-[#C5E5EC]/70">
                  {language === 'vi'
                    ? 'Mã PIN 6 số, Sinh trắc học vân tay, Quyền riêng tư SĐT, Sao lưu Cloud & Âm thanh'
                    : '6-digit PIN, Biometrics, Phone Privacy, Cloud Backup & Sounds'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60 group-hover:text-white group-hover:translate-x-0.5 transition" />
          </button>
        )}

        {/* MASTER ADMIN PANEL ENTRY (CHỈ DÀNH CHO ROOT ADMIN 000000000) */}
        {isSuperAdmin && (
          <button
            id="admin-dashboard-link-btn"
            type="button"
            onClick={onOpenAdminDashboard}
            className="w-full p-3.5 rounded-2xl bg-red-950/40 hover:bg-red-950/60 border border-red-500/40 flex items-center justify-between transition text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="font-extrabold text-red-300 text-xs">{t('adminPanel')}</h4>
                <p className="text-[10px] text-red-400/80">
                  {language === 'vi'
                    ? 'Quản lý người dùng toàn sàn, quỹ Escrow, phân xử tranh chấp'
                    : 'Manage platform users, Escrow vaults, and disputes'}
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white font-bold">Admin</span>
          </button>
        )}

        {/* LOGOUT */}
        <button
          type="button"
          onClick={logout}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-red-950/30 border border-[#C5E5EC]/15 hover:border-red-500/40 flex items-center justify-between transition text-left text-red-400 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <LogOut className="w-5 h-5" />
            <span className="font-extrabold text-xs">{t('logoutDevice')}</span>
          </div>
        </button>
      </div>



      {/* EDIT PROFILE MODAL (HỌ VÀ TÊN ĐỆM / TÊN TÁCH BIỆT - GỘP KHÔNG QUÁ 30 KÝ TỰ) */}
      {showEditProfileModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditProfileModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-[#0E1B2E] border border-cyan-500/30 p-5 sm:p-6 text-white shadow-2xl my-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#C5E5EC]/20">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {language === 'vi' ? 'Chỉnh Sửa Hồ Sơ Cá Nhân' : 'Edit Personal Profile'}
                  </h3>
                  <p className="text-[10px] text-[#C5E5EC]/70">
                    {language === 'vi'
                      ? 'Cập nhật thông tin hiển thị với cộng đồng sinh viên'
                      : 'Update information visible to the campus community'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="p-1 rounded-xl text-[#C5E5EC]/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              {/* Split Name Fields: Họ và tên đệm + Tên */}
              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[#C5E5EC]/90 mb-1 font-bold">
                      {language === 'vi' ? 'Họ và tên đệm' : 'Last and Middle Name'}{' '}
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={25}
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/30 text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                      placeholder={language === 'vi' ? 'Ví dụ: Nguyễn Văn' : 'e.g. Smith'}
                    />
                  </div>
                  <div>
                    <label className="block text-[#C5E5EC]/90 mb-1 font-bold">
                      {language === 'vi' ? 'Tên' : 'First Name'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/30 text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                      placeholder={language === 'vi' ? 'Ví dụ: An' : 'e.g. John'}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#C5E5EC]/70 px-1 pt-0.5">
                  <span>
                    {language === 'vi'
                      ? 'Ví dụ: Họ và tên đệm: Nguyễn Văn / Tên: An. Gộp lại không quá 30 ký tự.'
                      : 'e.g. Combined full name cannot exceed 30 characters.'}
                  </span>
                  <span
                    className={`font-mono ${
                      (editLastName.trim() + ' ' + editFirstName.trim()).trim().length > 30
                        ? 'text-rose-400 font-bold'
                        : ''
                    }`}
                  >
                    {(editLastName.trim() + ' ' + editFirstName.trim()).trim().length}/30
                  </span>
                </div>
                {checkBannedWords(editLastName + ' ' + editFirstName).isBlocked && (
                  <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1 pt-1 animate-fadeIn">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      {language === 'vi'
                        ? `Phát hiện từ cấm ("${checkBannedWords(editLastName + ' ' + editFirstName).matchedWord}"). Vui lòng đổi tên hợp lệ!`
                        : `Prohibited word in name ("${checkBannedWords(editLastName + ' ' + editFirstName).matchedWord}").`}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[#C5E5EC]/80 mb-1 font-bold">
                  {language === 'vi' ? 'Số điện thoại liên hệ' : 'Contact Phone'}
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/30 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  placeholder={language === 'vi' ? 'Ví dụ: 0909120918 (10 số)' : 'e.g. 0909120918 (10 digits)'}
                />

                {/* Phone Privacy Radio Selector */}
                <div className="mt-2 p-2.5 rounded-2xl bg-[#0E1B2E] border border-[#C5E5EC]/15 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#C5E5EC]">
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'vi' ? 'Quyền riêng tư hiển thị số điện thoại:' : 'Phone privacy:'}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {[
                      {
                        key: 'ESCROW_ONLY',
                        icon: '🛡️',
                        title: language === 'vi' ? 'Chỉ khi Escrow' : 'Escrow Only',
                        desc: language === 'vi' ? 'Hiện khi đã nhận việc / cọc đồ' : 'Visible upon contract/deposit',
                        rec: true,
                      },
                      {
                        key: 'PRIVATE',
                        icon: '🔒',
                        title: language === 'vi' ? 'Ẩn hoàn toàn' : 'Hidden',
                        desc: language === 'vi' ? 'Chỉ chat nội bộ GigMe' : 'In-app chat only',
                      },
                      {
                        key: 'PUBLIC',
                        icon: '🌐',
                        title: language === 'vi' ? 'Công khai' : 'Public',
                        desc: language === 'vi' ? 'Hiện số trên hồ sơ' : 'Always visible',
                      },
                    ].map((p) => {
                      const isSel = editPhonePrivacy === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            setEditPhonePrivacy(p.key as PhonePrivacyMode);
                          }}
                          className={`p-2 rounded-xl border text-left transition cursor-pointer relative ${
                            isSel
                              ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-xs ring-1 ring-cyan-400/40'
                              : 'bg-[#12233B] border-[#C5E5EC]/15 text-[#C5E5EC]/70 hover:text-white'
                          }`}
                        >
                          {p.rec && (
                            <span className="absolute top-1 right-1 text-[8px] font-bold px-1 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                              {language === 'vi' ? 'Khuyên dùng' : 'Best'}
                            </span>
                          )}
                          <div className="text-xs">{p.icon}</div>
                          <div className="font-extrabold text-[10px] mt-0.5">{p.title}</div>
                          <div className="text-[9px] text-[#C5E5EC]/60 leading-tight mt-0.5">{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#C5E5EC]/80 mb-1 font-bold flex items-center justify-between">
                  <span>{language === 'vi' ? 'Trường Đại Học / Cao Đẳng / Ký Túc Xá' : 'University / College / Dormitory'}</span>
                  <span className="text-[10px] text-cyan-400 font-normal">
                    {language === 'vi' ? 'Chọn nhanh hoặc tự nhập' : 'Quick select or custom'}
                  </span>
                </label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/30 text-white text-xs focus:outline-none focus:border-cyan-400 font-semibold"
                  placeholder={
                    language === 'vi'
                      ? 'Ví dụ: ĐH Bách Khoa, ĐH Kinh Tế, ĐH Quốc Gia...'
                      : 'e.g. University of Technology, Dorm B...'
                  }
                />
                {/* University quick chips */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['ĐH Bách Khoa', 'ĐH Kinh Tế', 'ĐH Quốc Gia', 'ĐH Sư Phạm Kỹ Thuật', 'ĐH Ngoại Thương', 'ĐH CNTT', 'ĐH Y Dược'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setEditSchool(u)}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition cursor-pointer ${
                        editSchool === u
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-[#182C48] border-[#C5E5EC]/20 text-[#C5E5EC]/70 hover:text-white'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#C5E5EC]/80 mb-1 font-bold flex items-center justify-between">
                  <span>{language === 'vi' ? 'Khoa / Viện / Chuyên Ngành Đào Tạo' : 'Faculty / Department'}</span>
                  <span className="text-[10px] text-[#E0FAEB] font-normal">
                    {language === 'vi' ? 'Gắn huy hiệu uy tín' : 'Verified badge'}
                  </span>
                </label>
                <input
                  type="text"
                  value={editFaculty}
                  onChange={(e) => setEditFaculty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/30 text-white text-xs focus:outline-none focus:border-cyan-400 font-semibold"
                  placeholder={
                    language === 'vi'
                      ? 'Ví dụ: Khoa CNTT, Quản Trị Kinh Doanh, Khoa Cơ Khí...'
                      : 'e.g. Computer Science, Business Administration...'
                  }
                />
                {/* Faculty quick chips */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['Khoa CNTT', 'Quản Trị Kinh Doanh', 'Khoa Cơ Khí', 'Khoa Ngoại Ngữ', 'Khoa Điện - Điện Tử', 'Khoa Y Dược'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setEditFaculty(f)}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition cursor-pointer ${
                        editFaculty === f
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-[#182C48] border-[#C5E5EC]/20 text-[#C5E5EC]/70 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Campus Badge Preview */}
              {editSchool.trim() && (
                <div className="p-2.5 rounded-2xl bg-[#0A1628] border border-cyan-500/30 flex items-center justify-between">
                  <span className="text-[10px] text-[#C5E5EC]/80 font-bold">
                    {language === 'vi' ? 'Xem trước Huy Hiệu Học Đường:' : 'Campus Badge Preview:'}
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-[#E0FAEB] border border-cyan-400/40 text-[10px] font-bold">
                    <GraduationCap className="w-3 h-3 text-cyan-300" />
                    <span>{editSchool.trim()}{editFaculty.trim() ? ` • ${editFaculty.trim()}` : ''} ✓</span>
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[#C5E5EC]/80 mb-1 font-bold">
                  {language === 'vi' ? 'Giới thiệu bản thân (Bio / Slogan)' : 'Bio / Short Introduction'}
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/30 text-white text-xs focus:outline-none focus:border-cyan-400"
                  placeholder={
                    language === 'vi'
                      ? 'Ví dụ: Sinh viên năm 3 chăm chỉ, chuyên gia sư Toán & hỗ trợ cài máy tính, giao hàng KTX siêu nhanh!'
                      : 'e.g. 3rd-year hardworking student, math tutor, laptop maintenance & fast dorm deliveries!'
                  }
                />
                {editBio.trim() && checkBannedWords(editBio).isBlocked && (
                  <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1 pt-1 animate-fadeIn">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      {language === 'vi'
                        ? `Phần giới thiệu chứa từ cấm ("${checkBannedWords(editBio).matchedWord}"). Vui lòng chỉnh sửa!`
                        : `Bio contains prohibited word ("${checkBannedWords(editBio).matchedWord}").`}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#C5E5EC] font-bold text-xs transition cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={
                    checkBannedWords(editLastName + ' ' + editFirstName).isBlocked ||
                    (editBio.trim() ? checkBannedWords(editBio).isBlocked : false)
                  }
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-cyan-900/40 transition cursor-pointer"
                >
                  {language === 'vi' ? 'Lưu Thay Đổi' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHONE PRIVACY GUARD STANDALONE MODAL */}
      {showPhonePrivacyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPhonePrivacyModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/30 p-5 sm:p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#C5E5EC]/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-[#E0FAEB]">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>
                  {language === 'vi' ? 'Quyền Riêng Tư Số Điện Thoại' : 'Phone Number Privacy Guard'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPhonePrivacyModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white p-1 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#C5E5EC]/80 leading-relaxed">
              {language === 'vi'
                ? 'Bảo vệ thông tin cá nhân của bạn khỏi các cuộc gọi làm phiền, chào mời tiếp thị hoặc quấy rối ngoài giờ. Bạn có toàn quyền quyết định ai được xem số điện thoại của mình:'
                : 'Protect your phone number from spam or after-hours calls. You have full control over who can view your contact number:'}
            </p>

            <div className="space-y-2.5">
              {[
                {
                  key: 'ESCROW_ONLY',
                  icon: '🛡️',
                  title: language === 'vi' ? 'Chỉ khi giao dịch Escrow' : 'Escrow Partners Only',
                  badge: language === 'vi' ? 'Khuyên dùng bảo vệ sinh viên' : 'Recommended',
                  badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
                  desc: language === 'vi'
                    ? 'Người thuê hoặc người mua chỉ xem được SĐT khi bạn và họ đã cọc giữ đồ hoặc đã nhận việc qua Smart Escrow.'
                    : 'Your phone is hidden from public view and only revealed to users with an active Escrow contract or reservation.',
                  preview: currentUser.phone ? `${currentUser.phone.slice(0, 4)} ••• ${currentUser.phone.slice(-3)}` : '0909 ••• 918',
                },
                {
                  key: 'PRIVATE',
                  icon: '🔒',
                  title: language === 'vi' ? 'Ẩn hoàn toàn (Bảo mật tối đa)' : 'Completely Private',
                  badge: language === 'vi' ? 'Bảo mật 100%' : '100% Private',
                  badgeColor: 'bg-slate-700/60 text-slate-300 border-slate-600',
                  desc: language === 'vi'
                    ? 'Luôn che số điện thoại với tất cả mọi người. Mọi trao đổi bắt buộc qua hệ thống Chat bảo mật của GigMe.'
                    : 'Your phone number is always hidden. All communications must go through GigMe encrypted in-app chat.',
                  preview: currentUser.phone ? `${currentUser.phone.slice(0, 4)} ••• •••` : '0909 ••• •••',
                },
                {
                  key: 'PUBLIC',
                  icon: '🌐',
                  title: language === 'vi' ? 'Hiển thị công khai' : 'Public Display',
                  badge: language === 'vi' ? 'Công khai' : 'Public',
                  badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
                  desc: language === 'vi'
                    ? 'Bất kỳ sinh viên nào vào xem hồ sơ hoặc tìm kiếm bạn đều có thể thấy và gọi trực tiếp.'
                    : 'Anyone on campus can view your full phone number on your profile.',
                  preview: currentUser.phone || '0909120918',
                },
              ].map((opt) => {
                const isSelected = (currentUser.phonePrivacy || 'ESCROW_ONLY') === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => handleQuickChangePhonePrivacy(opt.key as PhonePrivacyMode)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#18345E] border-cyan-400 ring-1 ring-cyan-400/50'
                        : 'bg-[#12233B] border-[#C5E5EC]/15 hover:bg-[#162B48]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{opt.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-white flex items-center space-x-2">
                            <span>{opt.title}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${opt.badgeColor}`}>
                              {opt.badge}
                            </span>
                          </h4>
                          <span className="text-[10px] font-mono text-[#E0FAEB]">
                            {language === 'vi' ? 'Hiển thị:' : 'Preview:'} <strong>{opt.preview}</strong>
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500 text-black'
                            : 'border-[#C5E5EC]/30 bg-[#0E1B2E]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#C5E5EC]/70 mt-1.5 leading-relaxed pl-7">
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPhonePrivacyModal(false)}
                className="px-4 py-2 rounded-xl bg-[#12233B] hover:bg-[#162B48] text-white font-bold text-xs transition cursor-pointer"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTHER DIALOGS */}
      <BusinessUpgradeDialog isOpen={showBusinessModal} onClose={() => setShowBusinessModal(false)} />
      <AvatarPickerModal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)} />
      <StudentEloModal isOpen={showEloModal} onClose={() => setShowEloModal(false)} />
      <EduEmailVerificationModal isOpen={showEduModal} onClose={() => setShowEduModal(false)} />
      <FriendBackupRestoreModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
      <StudentReviewsModal isOpen={showReviewsModal} onClose={() => setShowReviewsModal(false)} user={currentUser} />
      <DigitalCccdModal
        isOpen={showDigitalCccdModal}
        onClose={() => setShowDigitalCccdModal(false)}
        onRescan={() => {
          setShowDigitalCccdModal(false);
          onOpenNfcDialog();
        }}
      />
      <IdentityTierPerksModal
        isOpen={showTierPerksModal}
        onClose={() => setShowTierPerksModal(false)}
        onNavigateToStep={(step) => {
          if (step === 'CCCD') onOpenNfcDialog();
          else if (step === 'FACE' && onOpenFaceDialog) onOpenFaceDialog();
          else if (step === 'STUDENT') {
            if (onOpenGeminiVision) onOpenGeminiVision();
            else onOpenSsoDialog();
          } else if (step === 'EDU') setShowEduModal(true);
        }}
      />
    </div>
  );
};
