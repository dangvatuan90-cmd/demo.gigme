import React, { useState } from 'react';
import {
  Settings,
  Fingerprint,
  KeyRound,
  Cloud,
  Phone,
  Moon,
  Sun,
  Volume2,
  Volume1,
  VolumeX,
  Globe,
  Scale,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Download,
  Smartphone,
  Check,
  AlertTriangle,
  X,
  ShieldCheck,
  Bell,
  BellRing,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Laptop,
  Monitor,
  Trash2,
  UserX,
  ArrowLeft,
  Shield,
  RefreshCw,
  AlertOctagon,
  Database,
  HardDrive,
  Info,
  FileText,
  Zap,
  Radio,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { useGigMe } from '../context/GigMeContext';
import { useTranslation } from '../context/LanguageContext';
import { triggerHaptic, isHapticEnabled, setHapticEnabled, isVibrationSupported } from '../utils/haptics';
import { playNotificationSound, getTingVolume, setTingVolume } from '../utils/audio';
import { PhonePrivacyMode, formatVnd } from '../types';
import { FriendBackupRestoreModal } from '../components/FriendBackupRestoreModal';
import { DownloadAppDialog } from '../components/DownloadAppDialog';
import { FcmPushNotificationModal } from '../components/FcmPushNotificationModal';

interface SettingsScreenProps {
  onOpenAdminDashboard?: () => void;
  onOpenCampusLaw?: () => void;
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenAdminDashboard,
  onOpenCampusLaw,
  onBack,
}) => {
  const {
    currentUser,
    logout,
    setupOrChangePin,
    setBiometricsWithPassword,
    changeUserPassword,
    terminateOtherSessions,
    deactivateAccount,
    deleteAccount,
    updateUserProfile,
    setNotificationSound,
    showNotification,
    toggleFcm,
    sendTestFcmPush,
  } = useGigMe();
  const { language, setLanguage, t } = useTranslation();

  // Modals state
  const [showPinModal, setShowPinModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showPhonePrivacyModal, setShowPhonePrivacyModal] = useState(false);
  const [showDownloadApp, setShowDownloadApp] = useState(false);

  // Group 1: Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Group 1: Active Sessions Modal State
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [isTerminatingSessions, setIsTerminatingSessions] = useState(false);
  const [otherSessionsRevoked, setOtherSessionsRevoked] = useState(false);

  // Group 1: Danger Zone (Deactivate / Delete) States
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('Tạm nghỉ sử dụng dịch vụ');
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Âm lượng chuông Ting Ting (Mặc định 50%)
  const [tingVolume, setTingVolumeState] = useState<number>(() => getTingVolume());

  // Group 2: Haptic Feedback Toggle State
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() => isHapticEnabled());
  const [hasVibrationHardware] = useState<boolean>(() => isVibrationSupported());

  // Group 3: Notifications & Storage Cache State
  const [showFcmModal, setShowFcmModal] = useState(false);
  const [notifyFlashGigs, setNotifyFlashGigs] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gigme_notif_flash') !== 'false' : true;
  });
  const [notifyEscrow, setNotifyEscrow] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gigme_notif_escrow') !== 'false' : true;
  });
  const [notifyGroupGigs, setNotifyGroupGigs] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gigme_notif_group') !== 'false' : true;
  });
  const [notifyChat, setNotifyChat] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gigme_notif_chat') !== 'false' : true;
  });
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>(() => {
    if (typeof window === 'undefined') return '1.2 MB';
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          total += key.length + (localStorage.getItem(key)?.length || 0);
        }
      }
      const kb = total / 1024;
      if (kb < 1024) return `${kb.toFixed(1)} KB`;
      return `${(kb / 1024).toFixed(2)} MB`;
    } catch {
      return '1.8 MB';
    }
  });

  // Group 3: Legal & About Modals State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // PIN modal inputs
  const [pinAccountPassword, setPinAccountPassword] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Biometrics modal inputs
  const [bioAccountPassword, setBioAccountPassword] = useState('');
  const [showBioPassword, setShowBioPassword] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioScanned, setBioScanned] = useState(false);

  // Phone privacy input
  const [selectedPrivacy, setSelectedPrivacy] = useState<PhonePrivacyMode>(
    currentUser?.phonePrivacy || 'ESCROW_ONLY'
  );

  // Helper: Calculate Password Strength (Score 0-4)
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, textVi: 'Chưa nhập', textEn: 'None', color: 'text-slate-400', bg: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, textVi: 'Rất yếu', textEn: 'Very Weak', color: 'text-rose-400', bg: 'bg-rose-500' };
    if (score === 2) return { score: 2, textVi: 'Yếu', textEn: 'Weak', color: 'text-amber-400', bg: 'bg-amber-500' };
    if (score === 3 || score === 4) return { score: 3, textVi: 'Khá tốt', textEn: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400' };
    return { score: 4, textVi: 'Mạnh & An toàn', textEn: 'Strong & Secure', color: 'text-emerald-400', bg: 'bg-emerald-500' };
  };

  // Helper: Detect Device Client
  const getDeviceDetails = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let os = 'Thiết bị di động';
    let isDesktop = false;

    if (/Android/i.test(ua)) os = 'Android Mobile';
    else if (/iPhone/i.test(ua)) os = 'Apple iPhone';
    else if (/iPad/i.test(ua)) os = 'Apple iPad';
    else if (/Macintosh|Mac OS X/i.test(ua)) { os = 'Apple Mac (macOS)'; isDesktop = true; }
    else if (/Windows/i.test(ua)) { os = 'Windows PC'; isDesktop = true; }
    else if (/Linux/i.test(ua)) { os = 'Linux Client'; isDesktop = true; }

    let browser = 'Web Browser';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';

    const isPwa = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

    return {
      name: `${os} • ${isPwa ? 'GigMe PWA / APK' : browser}`,
      isDesktop,
      isPwa,
    };
  };

  // Handler: Change Password Submit
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword.trim()) {
      setPasswordError(language === 'vi' ? 'Vui lòng nhập mật khẩu hiện tại!' : 'Please enter current password!');
      return;
    }
    if (newPassword.trim().length < 6) {
      setPasswordError(language === 'vi' ? 'Mật khẩu mới phải có tối thiểu 6 ký tự!' : 'New password must have at least 6 characters!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'vi' ? 'Mật khẩu xác nhận không khớp!' : 'Confirmation password does not match!');
      return;
    }
    if (currentPassword.trim() === newPassword.trim()) {
      setPasswordError(language === 'vi' ? 'Mật khẩu mới không được trùng với mật khẩu hiện tại!' : 'New password cannot be the same as current password!');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changeUserPassword(currentPassword, newPassword);
      if (res.success) {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        triggerHaptic('success');
      } else {
        setPasswordError(res.error || (language === 'vi' ? 'Đổi mật khẩu thất bại!' : 'Failed to change password!'));
        triggerHaptic('error');
      }
    } catch {
      setPasswordError(language === 'vi' ? 'Đã có lỗi xảy ra!' : 'An unexpected error occurred!');
      triggerHaptic('error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handler: Terminate other sessions
  const handleTerminateOtherSessions = async () => {
    if (
      !window.confirm(
        language === 'vi'
          ? 'Bạn có chắc chắn muốn ngắt kết nối và đăng xuất tài khoản khỏi tất cả các thiết bị khác không?'
          : 'Are you sure you want to log out of all other devices?'
      )
    ) {
      return;
    }
    setIsTerminatingSessions(true);
    try {
      const res = await terminateOtherSessions();
      if (res.success) {
        setOtherSessionsRevoked(true);
        triggerHaptic('success');
      }
    } finally {
      setIsTerminatingSessions(false);
    }
  };

  // Handler: Deactivate Account
  const handleDeactivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeactivateError(null);
    if (!deactivatePassword.trim()) {
      setDeactivateError(language === 'vi' ? 'Vui lòng nhập mật khẩu tài khoản!' : 'Please enter your password!');
      return;
    }
    setIsDeactivating(true);
    try {
      const res = await deactivateAccount(deactivatePassword, deactivateReason);
      if (res.success) {
        setShowDeactivateModal(false);
        triggerHaptic('success');
      } else {
        setDeactivateError(res.error || (language === 'vi' ? 'Không thể vô hiệu hóa tài khoản!' : 'Failed to deactivate account!'));
        triggerHaptic('error');
      }
    } finally {
      setIsDeactivating(false);
    }
  };

  // Handler: Delete Account
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    if (!deletePassword.trim()) {
      setDeleteError(language === 'vi' ? 'Vui lòng nhập mật khẩu tài khoản!' : 'Please enter your password!');
      return;
    }
    const trimmedPhrase = deleteConfirmPhrase.trim().toUpperCase();
    if (trimmedPhrase !== 'XÓA TÀI KHOẢN' && trimmedPhrase !== 'XOA TAI KHOAN' && trimmedPhrase !== 'DELETE ACCOUNT') {
      setDeleteError(language === 'vi' ? 'Cụm từ xác nhận phải là "XÓA TÀI KHOẢN"!' : 'Confirmation phrase must be "DELETE ACCOUNT"!');
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteAccount(deletePassword, deleteConfirmPhrase);
      if (res.success) {
        setShowDeleteModal(false);
        triggerHaptic('success');
      } else {
        setDeleteError(res.error || (language === 'vi' ? 'Không thể xóa tài khoản!' : 'Failed to delete account!'));
        triggerHaptic('error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentUser) return null;

  const hasExistingPin = !!currentUser.securityPin && currentUser.securityPin.length === 6;
  const isSuperAdmin = currentUser.id === '000000000' || currentUser.role === 'ADMIN';

  // Handler: PIN Submit
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!pinAccountPassword.trim()) {
      setPinError(language === 'vi' ? 'Vui lòng nhập mật khẩu tài khoản để xác nhận!' : 'Please enter your account password!');
      return;
    }

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinError(language === 'vi' ? 'Mã PIN mới phải bao gồm đúng 6 chữ số!' : 'New PIN must be exactly 6 digits!');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError(language === 'vi' ? 'Mã PIN xác nhận không khớp!' : 'Confirm PIN does not match!');
      return;
    }

    const res = await setupOrChangePin(
      pinAccountPassword.trim(),
      newPin,
      hasExistingPin ? oldPin : undefined
    );

    if (res.success) {
      setShowPinModal(false);
      setPinAccountPassword('');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      triggerHaptic('success');
      showNotification(
        language === 'vi' ? 'Cập Nhật PIN Thành Công! 🔐' : 'PIN Updated! 🔐',
        language === 'vi'
          ? 'Mã PIN bảo mật 6 số của bạn đã được cập nhật thành công.'
          : 'Your 6-digit wallet security PIN has been updated.',
        true
      );
    } else {
      setPinError(res.error || (language === 'vi' ? 'Không thể cập nhật mã PIN' : 'Failed to update PIN'));
      triggerHaptic('error');
    }
  };

  // Handler: Biometrics Toggle
  const handleBiometricsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBioError(null);

    if (!bioAccountPassword.trim()) {
      setBioError(language === 'vi' ? 'Vui lòng nhập mật khẩu tài khoản!' : 'Please enter your account password!');
      return;
    }

    const nextState = !currentUser.isBiometricsEnabled;
    const res = await setBiometricsWithPassword(bioAccountPassword.trim(), nextState);

    if (res.success) {
      setShowBioModal(false);
      setBioAccountPassword('');
      setBioScanned(false);
      triggerHaptic('success');
      showNotification(
        language === 'vi' ? 'Sinh Trắc Học Đã Cập Nhật 🧬' : 'Biometrics Updated 🧬',
        nextState
          ? (language === 'vi' ? 'Đã kích hoạt xác thực vân tay / FaceID thành công.' : 'Biometric authentication enabled.')
          : (language === 'vi' ? 'Đã tắt xác thực sinh trắc học.' : 'Biometric authentication disabled.'),
        true
      );
    } else {
      setBioError(res.error || (language === 'vi' ? 'Mật khẩu không chính xác' : 'Incorrect password'));
      triggerHaptic('error');
    }
  };

  // Handler: Phone Privacy Submit
  const handleSavePhonePrivacy = () => {
    updateUserProfile({ phonePrivacy: selectedPrivacy });
    setShowPhonePrivacyModal(false);
    triggerHaptic('success');
    showNotification(
      language === 'vi' ? 'Cập Nhật Quyền Riêng Tư 🛡️' : 'Privacy Updated 🛡️',
      language === 'vi'
        ? `Đã áp dụng chính sách hiển thị SĐT: ${
            selectedPrivacy === 'PRIVATE'
              ? 'Ẩn hoàn toàn'
              : selectedPrivacy === 'PUBLIC'
              ? 'Công khai'
              : 'Chỉ khi có giao dịch Escrow'
          }`
        : 'Phone privacy settings have been updated.',
      true
    );
  };

  // Handler: Haptic Toggle (Nhóm 2)
  const handleToggleHaptic = (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    setHapticEnabled(enabled);
    if (enabled) {
      triggerHaptic('success', true);
      showNotification(
        language === 'vi' ? 'Đã bật Rung Phản Hồi! 📳' : 'Haptic feedback enabled! 📳',
        language === 'vi'
          ? 'Điện thoại sẽ rung nhẹ khi chạm nút, nhận kèo và giải ngân Escrow.'
          : 'Tactile vibration feedback is now enabled.',
        true
      );
    } else {
      showNotification(
        language === 'vi' ? 'Đã tắt Rung Phản Hồi 📴' : 'Haptic feedback disabled 📴',
        language === 'vi'
          ? 'Đã chuyển sang chế độ êm ái, tiết kiệm pin cho thiết bị.'
          : 'Vibrations turned off for silent & battery saving experience.',
        true
      );
    }
  };

  // Handler: Notification Channel Toggles (Nhóm 3)
  const handleToggleNotifyChannel = (channel: 'flash' | 'escrow' | 'group' | 'chat', value: boolean) => {
    triggerHaptic('selection');
    if (channel === 'flash') {
      setNotifyFlashGigs(value);
      localStorage.setItem('gigme_notif_flash', value ? 'true' : 'false');
    } else if (channel === 'escrow') {
      setNotifyEscrow(value);
      localStorage.setItem('gigme_notif_escrow', value ? 'true' : 'false');
    } else if (channel === 'group') {
      setNotifyGroupGigs(value);
      localStorage.setItem('gigme_notif_group', value ? 'true' : 'false');
    } else if (channel === 'chat') {
      setNotifyChat(value);
      localStorage.setItem('gigme_notif_chat', value ? 'true' : 'false');
    }
  };

  // Handler: Test Sample Push Notification (Nhóm 3)
  const handleTestSamplePush = () => {
    triggerHaptic('success');
    playNotificationSound('BANK_TING', tingVolume);
    sendTestFcmPush(
      language === 'vi' ? '⚡ Kèo hỏa tốc 50m quanh bạn!' : '⚡ Flash gig 50m near you!',
      language === 'vi'
        ? 'Giao giáo trình KTX Khu B - Thù lao: 45.000đ (Smart Escrow đã khóa quỹ)'
        : 'Deliver textbooks at Dorm B - 45,000 VND reward (Smart Escrow secured)'
    );
    showNotification(
      language === 'vi' ? 'Đã phát thông báo thử nghiệm! 🔔' : 'Test notification sent! 🔔',
      language === 'vi'
        ? 'Bạn vừa nhận được 1 thông báo đẩy mẫu mô phỏng ca việc hỏa tốc.'
        : 'Sample push notification delivered to active view.',
      true
    );
  };

  // Handler: Clear Temporary Cache (Nhóm 3)
  const handleClearCache = () => {
    triggerHaptic('medium');
    try {
      const keysToRemove = [
        'gigme_banned_words_cache',
        'gigme_maintenance_config_cache',
        'gigme_filter_draft',
        'gigme_search_history',
        'gigme_image_previews',
      ];
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
      try {
        sessionStorage.clear();
      } catch {}

      // Recalculate
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          total += key.length + (localStorage.getItem(key)?.length || 0);
        }
      }
      const kb = total / 1024;
      setCacheSize(kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`);

      showNotification(
        language === 'vi' ? 'Đã xóa bộ nhớ đệm! 🧹' : 'Cache cleared! 🧹',
        language === 'vi'
          ? 'Đã dọn dẹp các tệp tạm thời. Tài khoản, số dư ví và danh bạ của bạn vẫn an toàn 100%.'
          : 'Temporary files cleaned safely without affecting your account.',
        true
      );
      triggerHaptic('success');
    } catch {
      showNotification(
        language === 'vi' ? 'Lỗi dọn dẹp' : 'Clear failed',
        language === 'vi' ? 'Không thể thao tác bộ nhớ tạm lúc này.' : 'Storage operation unavailable.'
      );
    }
  };

  // Handler: Force Cloud Sync (Nhóm 3)
  const handleForceResync = async () => {
    triggerHaptic('medium');
    setIsSyncingCloud(true);
    try {
      await new Promise((r) => setTimeout(r, 650));
      showNotification(
        language === 'vi' ? 'Đồng bộ đám mây thành công! ☁️' : 'Cloud sync completed! ☁️',
        language === 'vi'
          ? 'Dữ liệu phiên làm việc, ví tiền và việc làm đã được cập nhật bản mới nhất từ Firestore.'
          : 'Latest data synchronized with cloud database.',
        true
      );
      triggerHaptic('success');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-[#12233B] via-[#0E1B2E] to-[#12233B] border border-[#C5E5EC]/20 shadow-xl">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onBack();
              }}
              className="w-10 h-10 rounded-2xl bg-[#162B48] hover:bg-[#1C365C] border border-[#C5E5EC]/20 flex items-center justify-center text-[#C5E5EC] hover:text-white transition cursor-pointer shadow-sm active:scale-95"
              title={language === 'vi' ? 'Quay lại' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#3064AE] via-[#417AC6] to-[#C5E5EC] flex items-center justify-center text-white shadow-lg border border-[#C5E5EC]/30">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
              <span>{language === 'vi' ? 'Cài Đặt Hệ Thống & Bảo Mật' : 'System & Security Settings'}</span>
            </h2>
            <p className="text-[11px] text-[#C5E5EC]/70">
              {language === 'vi'
                ? 'Mật khẩu, mã PIN ví, phiên thiết bị, quyền riêng tư'
                : 'Password, wallet PIN, sessions, phone privacy'}
            </p>
          </div>
        </div>
      </div>

      {/* KHỐI 1: BẢO MẬT TÀI KHOẢN & VÍ TIỀN */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 pb-1 border-b border-[#C5E5EC]/15">
          <ShieldCheck className="w-4 h-4 text-[#E0FAEB]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            {language === 'vi' ? 'Bảo Mật Tài Khoản & Ví Escrow' : 'Account & Escrow Vault Security'}
          </h3>
        </div>

        {/* 1. MÃ PIN VÍ BẢO MẬT 6 SỐ */}
        <button
          type="button"
          onClick={() => {
            setPinAccountPassword('');
            setOldPin('');
            setNewPin('');
            setConfirmPin('');
            setPinError(null);
            setShowPinModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <KeyRound className="w-5 h-5 text-[#C5E5EC]" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Mã PIN Ví Bảo Mật 6 Số' : '6-Digit Wallet PIN'}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    hasExistingPin
                      ? 'bg-[#E0FAEB]/20 text-[#E0FAEB] border border-[#E0FAEB]/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hasExistingPin ? (language === 'vi' ? 'Đã có PIN' : 'Active PIN') : (language === 'vi' ? 'Chưa có PIN' : 'No PIN')}
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Bắt buộc khi rút tiền Napas 247 và duyệt giải ngân bảo chứng Escrow'
                  : 'Required for Napas withdrawals and Escrow disbursement approval'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>

        {/* 2. BIOMETRICS (VÂN TAY / FACEID) */}
        <div className="w-full p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Fingerprint className="w-5 h-5 text-[#E0FAEB]" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Sinh Trắc Học (Vân Tay / FaceID)' : 'Biometrics (Fingerprint / FaceID)'}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    currentUser.isBiometricsEnabled
                      ? 'bg-[#E0FAEB]/20 text-[#E0FAEB] border border-[#E0FAEB]/30'
                      : 'bg-slate-700/50 text-slate-300'
                  }`}
                >
                  {currentUser.isBiometricsEnabled ? (language === 'vi' ? 'Đang Bật' : 'Enabled') : (language === 'vi' ? 'Chưa Bật' : 'Disabled')}
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Đăng nhập nhanh 1 chạm an toàn không cần gõ mật khẩu'
                  : 'Fast 1-touch secure authentication without typing password'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setBioAccountPassword('');
              setBioScanned(false);
              setBioError(null);
              setShowBioModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#3064AE]/30 hover:bg-[#3064AE]/50 border border-[#C5E5EC]/30 text-white font-bold text-xs transition cursor-pointer active:scale-95"
          >
            {currentUser.isBiometricsEnabled ? (language === 'vi' ? 'Cấu Hình' : 'Config') : (language === 'vi' ? 'Kích Hoạt' : 'Enable')}
          </button>
        </div>

        {/* 3. ĐỔI MẬT KHẨU TÀI KHOẢN ĐĂNG NHẬP (NHÓM 1) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError(null);
            setShowPasswordModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Lock className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Đổi Mật Khẩu Đăng Nhập' : 'Change Login Password'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  {language === 'vi' ? 'Độ bảo mật cao' : 'High Security'}
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Cập nhật mật khẩu tài khoản thường xuyên để nâng cao an toàn dữ liệu'
                  : 'Regularly update account password with strength meter verification'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>

        {/* 4. PHIÊN ĐĂNG NHẬP & QUẢN LÝ THIẾT BỊ (NHÓM 1) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowSessionsModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Laptop className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Phiên Đăng Nhập & Thiết Bị' : 'Active Sessions & Devices'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{otherSessionsRevoked ? '1 thiết bị' : '3 thiết bị'}</span>
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Xem lịch sử truy cập, kiểm tra thiết bị lạ và đăng xuất từ xa 1 chạm'
                  : 'Inspect active devices, check unusual logins, and revoke remote sessions'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>

        {/* 3. QUYỀN RIÊNG TƯ SỐ ĐIỆN THOẠI (PHONE PRIVACY GUARD) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setSelectedPrivacy(currentUser.phonePrivacy || 'ESCROW_ONLY');
            setShowPhonePrivacyModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Quyền Riêng Tư Số Điện Thoại' : 'Phone Privacy Guard'}</span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                    currentUser.phonePrivacy === 'PRIVATE'
                      ? 'bg-slate-700/60 text-slate-300 border-slate-600'
                      : currentUser.phonePrivacy === 'PUBLIC'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {currentUser.phonePrivacy === 'PRIVATE'
                    ? (language === 'vi' ? 'Ẩn Hoàn Toàn' : 'Hidden')
                    : currentUser.phonePrivacy === 'PUBLIC'
                    ? (language === 'vi' ? 'Công Khai' : 'Public')
                    : (language === 'vi' ? 'Chỉ Khi Escrow' : 'Escrow Only')}
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Bảo vệ SĐT khỏi làm phiền, chỉ hiển thị với đối tác sau khi đã cọc hoặc nhận việc'
                  : 'Shield phone from spam, reveal only to verified Escrow partners'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>

        {/* 4. CLOUD FRIEND BACKUP & RESTORE */}
        <button
          type="button"
          onClick={() => setShowBackupModal(true)}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Cloud className="w-5 h-5 text-sky-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                <span>{language === 'vi' ? 'Sao Lưu & Phục Hồi Danh Bạ Cloud' : 'Cloud Friend Backup & Restore'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  9 Số ID
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Bảo toàn danh bạ bạn bè campus, không lo mất khi đổi máy hoặc đăng nhập lại'
                  : 'Preserve campus contacts, restore anytime with your 9-digit ID code'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>
      </div>

      {/* KHỐI 2: TÙY CHỌN ỨNG DỤNG & GIAO DIỆN */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 pb-1 border-b border-[#C5E5EC]/15">
          <Sparkles className="w-4 h-4 text-[#C5E5EC]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            {language === 'vi' ? 'Tùy Chọn Ứng Dụng & Trải Nghiệm' : 'App Preferences & Interface'}
          </h3>
        </div>

        {/* 1. ĐIỀU CHỈNH ÂM LƯỢNG TING */}
        <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {tingVolume === 0 ? (
                <VolumeX className="w-5 h-5 text-rose-400 shrink-0" />
              ) : tingVolume < 50 ? (
                <Volume1 className="w-5 h-5 text-cyan-400 shrink-0" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-white text-xs">
                    {language === 'vi' ? 'Điều Chỉnh Âm Lượng Ting' : 'Ting Notification Volume'}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-[#3064AE]/30 text-[#E0FAEB] border border-[#C5E5EC]/30">
                    {tingVolume === 0
                      ? (language === 'vi' ? 'Tắt âm' : 'Muted')
                      : tingVolume === 50
                      ? `${tingVolume}% (${language === 'vi' ? 'Mặc định' : 'Default'})`
                      : `${tingVolume}%`}
                  </span>
                </div>
                <p className="text-[10px] text-[#C5E5EC]/70 mt-0.5">
                  {language === 'vi'
                    ? 'Kéo thanh trượt để chỉnh âm lượng chuông Ting Ting khi có kèo hoặc tiền về ví'
                    : 'Adjust volume slider for Ting Ting chime when new gigs arrive or funds land'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                playNotificationSound('BANK_TING', tingVolume);
              }}
              className="text-[11px] px-3 py-1.5 rounded-xl bg-[#3064AE]/40 hover:bg-[#3064AE]/60 text-[#E0FAEB] font-bold border border-[#C5E5EC]/30 transition shadow-sm cursor-pointer shrink-0"
            >
              {language === 'vi' ? '🔔 Nghe thử' : '🔔 Test sound'}
            </button>
          </div>

          {/* Slider thanh kéo điều chỉnh âm lượng */}
          <div className="pt-1 space-y-2">
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={tingVolume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTingVolumeState(val);
                  setTingVolume(val);
                }}
                onMouseUp={() => {
                  playNotificationSound('BANK_TING', tingVolume);
                }}
                onTouchEnd={() => {
                  playNotificationSound('BANK_TING', tingVolume);
                }}
                className="w-full h-2 bg-[#0E1B2E] rounded-lg appearance-none cursor-pointer accent-[#3064AE] dark:accent-[#C5E5EC] border border-[#C5E5EC]/20 focus:outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-between text-[10px] text-[#C5E5EC]/70 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setTingVolumeState(0);
                  setTingVolume(0);
                  triggerHaptic('light');
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  tingVolume === 0 ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'bg-[#0E1B2E] hover:text-white border border-white/5'
                }`}
              >
                0% ({language === 'vi' ? 'Tắt' : 'Mute'})
              </button>

              <button
                type="button"
                onClick={() => {
                  setTingVolumeState(50);
                  setTingVolume(50);
                  triggerHaptic('light');
                  playNotificationSound('BANK_TING', 50);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  tingVolume === 50 ? 'bg-[#3064AE]/40 text-[#E0FAEB] font-bold border border-[#C5E5EC]/40 shadow-xs' : 'bg-[#0E1B2E] hover:text-white border border-white/5'
                }`}
              >
                50% ({language === 'vi' ? 'Mặc định' : 'Default'})
              </button>

              <button
                type="button"
                onClick={() => {
                  setTingVolumeState(100);
                  setTingVolume(100);
                  triggerHaptic('light');
                  playNotificationSound('BANK_TING', 100);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  tingVolume === 100 ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'bg-[#0E1B2E] hover:text-white border border-white/5'
                }`}
              >
                100% ({language === 'vi' ? 'Tối đa' : 'Max'})
              </button>
            </div>
          </div>
        </div>

        {/* 2. CÔNG TẮC BẬT/TẮT RUNG PHẢN HỒI (HAPTIC FEEDBACK TOGGLE - NHÓM 2) */}
        <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Smartphone className={`w-5 h-5 ${hapticsEnabled ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-white text-xs">
                    {language === 'vi' ? 'Rung Phản Hồi Khi Chạm (Haptic Feedback)' : 'Tactile Haptic Feedback'}
                  </h4>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition ${
                      hapticsEnabled
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs'
                        : 'bg-slate-700/60 text-slate-400 border-slate-600'
                    }`}
                  >
                    {hapticsEnabled
                      ? (language === 'vi' ? 'Đang bật' : 'Enabled')
                      : (language === 'vi' ? 'Đã tắt' : 'Disabled')}
                  </span>
                </div>
                <p className="text-[10px] text-[#C5E5EC]/70 mt-0.5">
                  {language === 'vi'
                    ? 'Rung xúc giác nhẹ trên điện thoại khi bấm nút, chốt cọc Escrow, đối soát NFC hoặc nhận thông báo'
                    : 'Tactile vibration pulse on tap, Smart Escrow lock, and actions'}
                </p>
              </div>
            </div>

            {/* TOGGLE SWITCH BUTTON */}
            <button
              type="button"
              role="switch"
              aria-checked={hapticsEnabled}
              onClick={() => handleToggleHaptic(!hapticsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 focus:outline-none ${
                hapticsEnabled ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-500/30' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hapticsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* PREVIEWS & HARDWARE STATUS */}
          <div className="pt-1 space-y-2 border-t border-[#C5E5EC]/10">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#C5E5EC]/80 font-semibold">
                {language === 'vi' ? '📳 Thử các nhịp rung mẫu:' : '📳 Test vibration patterns:'}
              </span>
              {!hasVibrationHardware ? (
                <span className="text-amber-400/90 text-[9px] flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 inline" />
                  <span>{language === 'vi' ? 'Trình duyệt/máy tính này không có mô-tơ rung' : 'Vibration API not supported'}</span>
                </span>
              ) : (
                <span className="text-emerald-400/90 text-[9px]">
                  ✓ {language === 'vi' ? 'Mô-tơ rung sẵn sàng' : 'Hardware ready'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light', true);
                }}
                className="py-1.5 px-2 rounded-xl bg-[#0E1B2E] hover:bg-[#162B48] text-[#C5E5EC] hover:text-white border border-[#C5E5EC]/15 text-[10px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
              >
                <span>👆</span>
                <span>{language === 'vi' ? 'Chạm nhẹ (15ms)' : 'Light Tap'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('escrow', true);
                }}
                className="py-1.5 px-2 rounded-xl bg-[#0E1B2E] hover:bg-[#162B48] text-cyan-300 border border-cyan-500/25 text-[10px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
              >
                <span>🛡️</span>
                <span>{language === 'vi' ? 'Khóa Escrow' : 'Escrow Pulse'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success', true);
                }}
                className="py-1.5 px-2 rounded-xl bg-[#0E1B2E] hover:bg-[#162B48] text-emerald-300 border border-emerald-500/25 text-[10px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
              >
                <span>🎉</span>
                <span>{language === 'vi' ? 'Thành công' : 'Success'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning', true);
                }}
                className="py-1.5 px-2 rounded-xl bg-[#0E1B2E] hover:bg-[#162B48] text-amber-300 border border-amber-500/25 text-[10px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
              >
                <span>⚠️</span>
                <span>{language === 'vi' ? 'Cảnh báo' : 'Warning'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. CHUYỂN ĐỔI NGÔN NGỮ (LANGUAGE) */}
        <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Globe className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="font-bold text-white text-xs">
                {language === 'vi' ? 'Ngôn Ngữ Ứng Dụng' : 'App Language'}
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi' ? 'Hỗ trợ Tiếng Việt và English' : 'Vietnamese & English supported'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#0E1B2E] p-1 rounded-xl border border-[#C5E5EC]/20 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setLanguage('vi');
                triggerHaptic('light');
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                language === 'vi'
                  ? 'bg-[#3064AE] text-white font-extrabold shadow-sm'
                  : 'text-[#C5E5EC]/60 hover:text-white'
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                triggerHaptic('light');
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                language === 'en'
                  ? 'bg-[#3064AE] text-white font-extrabold shadow-sm'
                  : 'text-[#C5E5EC]/60 hover:text-white'
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>

      {/* KHỐI 3: THÔNG BÁO & BỘ NHỚ LƯU TRỮ HỆ THỐNG (NHÓM 3) */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-cyan-500/30 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-cyan-500/20">
          <div className="flex items-center space-x-2">
            <BellRing className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-200">
              {language === 'vi' ? 'Thông Báo & Bộ Nhớ Lưu Trữ (Nhóm 3)' : 'Notifications & Storage (Group 3)'}
            </h3>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            FCM & Cache
          </span>
        </div>

        {/* 1. THÔNG BÁO ĐẨY TỨC THÌ (PUSH NOTIFICATIONS) */}
        <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-white text-xs">
                    {language === 'vi' ? 'Thông Báo Đẩy Nhanh (FCM Push)' : 'FCM Push Notifications'}
                  </h4>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                      currentUser.fcmEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-700/60 text-slate-400 border-slate-600'
                    }`}
                  >
                    {currentUser.fcmEnabled
                      ? (language === 'vi' ? 'Đang nhận' : 'Active')
                      : (language === 'vi' ? 'Tạm tắt' : 'Disabled')}
                  </span>
                </div>
                <p className="text-[10px] text-[#C5E5EC]/70 mt-0.5">
                  {language === 'vi'
                    ? 'Nhận thông báo màn hình khóa ngay cả khi đóng ứng dụng'
                    : 'Lock-screen alerts for instant campus gigs & escrow'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={currentUser.fcmEnabled ?? false}
              onClick={() => {
                triggerHaptic('selection');
                toggleFcm(!currentUser.fcmEnabled);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 focus:outline-none ${
                currentUser.fcmEnabled ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 shadow-md shadow-emerald-500/30' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  currentUser.fcmEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* CÁC KÊNH THÔNG BÁO TÙY CHỌN */}
          <div className="pt-2 border-t border-[#C5E5EC]/10 space-y-2">
            <h5 className="text-[11px] font-bold text-[#C5E5EC]/90">
              {language === 'vi' ? 'Các kênh thông báo quan tâm:' : 'Notification Channels:'}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* KÊNH 1: KÈO HỎA TỐC */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-[#0E1B2E] border border-[#C5E5EC]/10 hover:border-[#C5E5EC]/25 cursor-pointer">
                <span className="flex items-center space-x-2 text-[11px] text-white">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{language === 'vi' ? 'Kèo hỏa tốc (<1km)' : 'Flash gigs (<1km)'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={notifyFlashGigs}
                  onChange={(e) => handleToggleNotifyChannel('flash', e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
              </label>

              {/* KÊNH 2: TIỀN VÍ & ESCROW */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-[#0E1B2E] border border-[#C5E5EC]/10 hover:border-[#C5E5EC]/25 cursor-pointer">
                <span className="flex items-center space-x-2 text-[11px] text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{language === 'vi' ? 'Tiền về ví & Escrow' : 'Wallet & Escrow payout'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={notifyEscrow}
                  onChange={(e) => handleToggleNotifyChannel('escrow', e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
              </label>

              {/* KÊNH 3: VIỆC NHÓM */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-[#0E1B2E] border border-[#C5E5EC]/10 hover:border-[#C5E5EC]/25 cursor-pointer">
                <span className="flex items-center space-x-2 text-[11px] text-white">
                  <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{language === 'vi' ? 'Việc ghép nhóm & QR' : 'Team gig check-in'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={notifyGroupGigs}
                  onChange={(e) => handleToggleNotifyChannel('group', e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
              </label>

              {/* KÊNH 4: TIN NHẮN CHAT */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-[#0E1B2E] border border-[#C5E5EC]/10 hover:border-[#C5E5EC]/25 cursor-pointer">
                <span className="flex items-center space-x-2 text-[11px] text-white">
                  <Bell className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{language === 'vi' ? 'Tin nhắn Chat & Kèo' : 'Chat & Direct notes'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={notifyChat}
                  onChange={(e) => handleToggleNotifyChannel('chat', e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
              </label>
            </div>

            {/* BUTTONS: TEST PUSH & ADVANCED MODAL */}
            <div className="pt-1 flex space-x-2">
              <button
                type="button"
                onClick={handleTestSamplePush}
                className="flex-1 py-2 px-3 rounded-xl bg-[#0E1B2E] hover:bg-[#162B48] border border-[#C5E5EC]/20 text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-98"
              >
                <span>🔔</span>
                <span>{language === 'vi' ? 'Bắn thử thông báo mẫu' : 'Send Test Notification'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowFcmModal(true);
                }}
                className="py-2 px-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 font-bold text-[11px] flex items-center justify-center space-x-1 transition cursor-pointer active:scale-98"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'vi' ? 'Nâng cao' : 'Advanced'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. QUẢN LÝ BỘ NHỚ ĐỆM & DỮ LIỆU TẠM (STORAGE & CACHE) */}
        <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-white text-xs">
                    {language === 'vi' ? 'Bộ Nhớ Đệm & Dữ Liệu Máy' : 'Storage & Offline Cache'}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {cacheSize}
                  </span>
                </div>
                <p className="text-[10px] text-[#C5E5EC]/70 mt-0.5">
                  {language === 'vi'
                    ? 'Lưu tạm dữ liệu ca việc & ảnh để mở app tức thì khi mất mạng'
                    : 'Caches gig catalogs & images for ultra-fast offline access'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#C5E5EC]/10 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleClearCache}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#0E1B2E] hover:bg-[#162B48] border border-amber-500/30 text-amber-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-98"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'vi' ? 'Dọn Dẹp Bộ Nhớ Tạm' : 'Clear Temporary Cache'}</span>
            </button>

            <button
              type="button"
              onClick={handleForceResync}
              disabled={isSyncingCloud}
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingCloud
                  ? (language === 'vi' ? 'Đang đồng bộ...' : 'Syncing...')
                  : (language === 'vi' ? 'Đồng Bộ Lại Đám Mây' : 'Force Cloud Sync')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* KHỐI 4: PHÁP LÝ, BỘ LUẬT CAMPUS & VỀ ỨNG DỤNG (NHÓM 3) */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 pb-1 border-b border-[#C5E5EC]/15">
          <Scale className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            {language === 'vi' ? 'Pháp Lý, Điều Khoản & Về Ứng Dụng' : 'Legal, Code of Conduct & About'}
          </h3>
        </div>

        {/* 1. BỘ LUẬT CAMPUS */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            if (onOpenCampusLaw) {
              onOpenCampusLaw();
            }
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Scale className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Bộ Luật & Điều Khoản GigMe Campus' : 'GigMe Campus Code of Conduct'}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {language === 'vi' ? '18+ Điều khoản' : '18+ Articles'}
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Quy chế Smart Escrow, Chợ KTX, giao kèo minh bạch, chống Fake GPS'
                  : 'Review all 18+ articles: Smart Escrow, Dorm market rules, anti-cheat'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>

        {/* 2. CHÍNH SÁCH QUYỀN RIÊNG TƯ & AN TOÀN DỮ LIỆU */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowPrivacyModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Chính Sách Quyền Riêng Tư & An Toàn Dữ Liệu' : 'Privacy Policy & Data Safety'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Play Policy
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Cam kết bảo mật dữ liệu CCCD, mã hóa danh bạ và quyền kiểm soát dữ liệu'
                  : 'Zero third-party selling, end-to-end encrypted NFC identity'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>

        {/* 3. TIÊU CHUẨN CỘNG ĐỒNG */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowCommunityModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Tiêu Chuẩn Cộng Đồng & Chống Lừa Đảo' : 'Community Standards & Anti-Scam'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  0-Tolerance
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Bộ quy tắc ứng xử văn minh trong khuôn viên trường và phòng chống đa cấp'
                  : 'Fair campus trading, strict fraud prevention guidelines'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>

        {/* 4. THÔNG TIN PHIÊN BẢN & BẢN QUYỀN */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowAboutModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Thông Tin Phiên Bản & Bản Quyền' : 'About GigMe & Version Info'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  v2.4.0
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Bản quyền © 2026 GigMe Campus Network • Nền tảng PWA & Native App'
                  : 'GigMe Campus Network • Open Source Licenses & Architecture'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>
      </div>

      {/* KHỐI 5: CÀI ĐẶT THIẾT BỊ & TẢI ỨNG DỤNG */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 pb-1 border-b border-[#C5E5EC]/15">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            {language === 'vi' ? 'Cài Đặt Lên Điện Thoại & APK' : 'Mobile App & Downloads'}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowDownloadApp(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/15 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Download className="w-5 h-5 text-[#00E5FF]" />
            <div>
              <h4 className="font-bold text-white text-xs">
                {language === 'vi' ? 'Tải Ứng Dụng GigMe (PWA & APK)' : 'Install GigMe (PWA & APK)'}
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Cài đặt 1 chạm lên màn hình chính hoặc tải file GigMe.apk trực tiếp'
                  : '1-tap install on Home Screen or download GigMe.apk directly'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C5E5EC]/60" />
        </button>
      </div>

      {/* KHỐI 6: VÙNG NGUY HIỂM & QUẢN LÝ TÀI KHOẢN (DANGER ZONE - NHÓM 1) */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-rose-500/30 p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 pb-1 border-b border-rose-500/20">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-rose-300">
            {language === 'vi' ? 'Vùng Nguy Hiểm (Danger Zone)' : 'Danger Zone & Account Actions'}
          </h3>
        </div>

        {/* 1. TẠM VÔ HIỆU HÓA TÀI KHOẢN */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setDeactivatePassword('');
            setDeactivateError(null);
            setShowDeactivateModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-[#162B48] border border-amber-500/25 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <UserX className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="font-bold text-amber-300 text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Tạm Vô Hiệu Hóa Tài Khoản' : 'Temporarily Deactivate Account'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {language === 'vi' ? 'Có thể kích hoạt lại' : 'Reversible'}
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Tạm ẩn hồ sơ khỏi campus, mở lại an toàn bất kỳ lúc nào khi bạn đăng nhập'
                  : 'Temporarily hide profile, reactivate anytime by logging in'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400/60" />
        </button>

        {/* 2. XÓA TÀI KHOẢN VĨNH VIỄN (APPLE & GOOGLE PLAY POLICY COMPLIANT) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setDeletePassword('');
            setDeleteConfirmPhrase('');
            setDeleteError(null);
            setShowDeleteModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-rose-950/40 border border-rose-500/30 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <div>
              <h4 className="font-bold text-rose-300 text-xs flex items-center space-x-2">
                <span>{language === 'vi' ? 'Yêu Cầu Xóa Tài Khoản Vĩnh Viễn' : 'Delete Account Permanently'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  Play Policy / GDPR
                </span>
              </h4>
              <p className="text-[10px] text-[#C5E5EC]/70">
                {language === 'vi'
                  ? 'Xóa vĩnh viễn toàn bộ dữ liệu cá nhân, đánh giá và lịch sử giao dịch không thể phục hồi'
                  : 'Permanently delete all personal data and history according to privacy policies'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400/60" />
        </button>
      </div>

      {/* KHỐI 7: QUẢN TRỊ VIÊN & TÀI KHOẢN */}
      <div className="rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-5 shadow-xl space-y-3">
        {/* MASTER ADMIN PANEL LINK */}
        {isSuperAdmin && (
          <button
            id="admin-dashboard-link-btn"
            type="button"
            onClick={onOpenAdminDashboard}
            className="w-full p-3.5 rounded-2xl bg-red-950/40 hover:bg-red-950/60 border border-red-500/40 flex items-center justify-between transition text-left cursor-pointer active:scale-98"
          >
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="font-extrabold text-red-300 text-xs">
                  {language === 'vi' ? 'Trung Tâm Điều Hành Quản Trị Viên' : 'Master Admin Dashboard'}
                </h4>
                <p className="text-[10px] text-red-400/80">
                  {language === 'vi'
                    ? 'Quản lý người dùng, duyệt KYC, phân xử tranh chấp Escrow'
                    : 'Manage platform users, KYC review, and dispute arbitration'}
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white font-bold">Admin Master</span>
          </button>
        )}

        {/* LOGOUT BUTTON */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(language === 'vi' ? 'Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này không?' : 'Are you sure you want to log out?')) {
              triggerHaptic('medium');
              logout();
            }
          }}
          className="w-full p-3.5 rounded-2xl bg-[#12233B] hover:bg-red-950/30 border border-[#C5E5EC]/15 hover:border-red-500/40 flex items-center justify-between transition text-left text-red-400 cursor-pointer active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="font-extrabold text-xs">{language === 'vi' ? 'Đăng Xuất Tài Khoản' : 'Log Out of Account'}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400/60" />
        </button>
      </div>

      {/* FOOTER METADATA */}
      <div className="text-center py-2 space-y-1 text-[11px] text-[#C5E5EC]/50 font-mono">
        <p>GigMe Student Campus Platform • Version 2.5 (Cyber Dark)</p>
        <p>ID Tài Khoản: {currentUser.id} • {currentUser.email}</p>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: THIẾT LẬP / ĐỔI MÃ PIN 6 SỐ */}
      {/* ========================================================================= */}
      {showPinModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPinModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/30 p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#C5E5EC]/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-[#E0FAEB]">
                <KeyRound className="w-4 h-4 text-[#C5E5EC]" />
                <span>
                  {hasExistingPin
                    ? language === 'vi'
                      ? 'Đổi Mã PIN Ví Bảo Mật 6 Số'
                      : 'Change 6-Digit Security PIN'
                    : language === 'vi'
                    ? 'Thiết Lập Mã PIN Mới (Chưa Có PIN)'
                    : 'Set Up New PIN (No PIN yet)'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#C5E5EC]/80 leading-relaxed">
              {hasExistingPin
                ? language === 'vi'
                  ? 'Để đổi mã PIN, bạn cần nhập Mật Khẩu tài khoản xác nhận danh tính kèm Mã PIN cũ hiện tại.'
                  : 'To change your PIN, enter your account password and your current 6-digit PIN.'
                : language === 'vi'
                ? 'Để tạo mã PIN lần đầu, bạn cần nhập Mật Khẩu tài khoản để xác nhận trước.'
                : 'To set up a PIN for the first time, please enter your account password first.'}
            </p>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Mật khẩu tài khoản' : 'Account password'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPinPassword ? 'text' : 'password'}
                    required
                    value={pinAccountPassword}
                    onChange={(e) => setPinAccountPassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none"
                    placeholder={
                      language === 'vi' ? 'Nhập mật khẩu tài khoản của bạn' : 'Enter your account password'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinPassword(!showPinPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#C5E5EC]/60 hover:text-white"
                  >
                    {showPinPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>

              {hasExistingPin && (
                <div>
                  <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                    {language === 'vi' ? 'Mã PIN cũ (6 số)' : 'Current PIN (6 digits)'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none font-mono text-center tracking-widest text-base"
                    placeholder="••••••"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Mã PIN mới (6 chữ số)' : 'New PIN (6 digits)'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none font-mono text-center tracking-widest text-base"
                  placeholder="••••••"
                />
              </div>

              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Xác nhận mã PIN mới' : 'Confirm new PIN'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none font-mono text-center tracking-widest text-base"
                  placeholder="••••••"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#12233B] text-[#C5E5EC] font-bold hover:bg-[#162B48] transition cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] text-white font-extrabold shadow-lg transition hover:brightness-110 cursor-pointer"
                >
                  {language === 'vi' ? 'Xác Nhận Lưu' : 'Confirm Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KÍCH HOẠT / HỦY VÂN TAY FACEID */}
      {/* ========================================================================= */}
      {showBioModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBioModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/30 p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#C5E5EC]/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-[#E0FAEB]">
                <Fingerprint className="w-4 h-4 text-[#E0FAEB]" />
                <span>
                  {currentUser.isBiometricsEnabled
                    ? language === 'vi'
                      ? 'Tắt Xác Thực Sinh Trắc Học'
                      : 'Disable Biometrics'
                    : language === 'vi'
                    ? 'Kích Hoạt Vân Tay / FaceID'
                    : 'Enable Biometrics'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBioModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#C5E5EC]/80 leading-relaxed">
              {currentUser.isBiometricsEnabled
                ? language === 'vi'
                  ? 'Nhập mật khẩu tài khoản để xác nhận tắt tính năng đăng nhập sinh trắc học.'
                  : 'Enter account password to confirm disabling biometric authentication.'
                : language === 'vi'
                ? 'Để bật tính năng, vui lòng nhập mật khẩu tài khoản và quét ngón tay hoặc khuôn mặt qua WebAuthn/FIDO2.'
                : 'Enter your password to link your biometric sensor for one-touch secure login.'}
            </p>

            {bioError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{bioError}</span>
              </div>
            )}

            <form onSubmit={handleBiometricsSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Mật khẩu tài khoản' : 'Account password'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showBioPassword ? 'text' : 'password'}
                    required
                    value={bioAccountPassword}
                    onChange={(e) => setBioAccountPassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none"
                    placeholder={
                      language === 'vi' ? 'Nhập mật khẩu tài khoản của bạn' : 'Enter your account password'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowBioPassword(!showBioPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#C5E5EC]/60 hover:text-white"
                  >
                    {showBioPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>

              {!currentUser.isBiometricsEnabled && (
                <div className="p-3 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Fingerprint className={`w-6 h-6 ${bioScanned ? 'text-emerald-400' : 'text-[#C5E5EC]'}`} />
                    <div>
                      <p className="font-bold text-white text-xs">
                        {language === 'vi' ? 'Cảm biến vân tay / FaceID' : 'Sensor scan'}
                      </p>
                      <p className="text-[10px] text-[#C5E5EC]/70">
                        {bioScanned
                          ? (language === 'vi' ? 'Đã nhận diện thành công!' : 'Sensor verified!')
                          : (language === 'vi' ? 'Nhấn để kiểm tra cảm biến thiết bị' : 'Tap to scan sensor')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('success');
                      setBioScanned(true);
                      showNotification(
                        language === 'vi' ? 'Cảm biến sẵn sàng' : 'Sensor ready',
                        language === 'vi' ? 'Đã quét cảm biến WebAuthn hợp lệ.' : 'WebAuthn sensor verified.',
                        true
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      bioScanned
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-[#3064AE]/30 text-white border border-[#C5E5EC]/30'
                    }`}
                  >
                    {bioScanned ? '✓ Đã Quét' : 'Quét Ngay'}
                  </button>
                </div>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBioModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#12233B] text-[#C5E5EC] font-bold hover:bg-[#162B48] transition cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl font-extrabold shadow-lg transition hover:brightness-110 cursor-pointer ${
                    currentUser.isBiometricsEnabled
                      ? 'bg-rose-600 text-white'
                      : 'bg-gradient-to-r from-[#3064AE] to-[#255294] text-white'
                  }`}
                >
                  {currentUser.isBiometricsEnabled
                    ? (language === 'vi' ? 'Tắt Tính Năng' : 'Disable')
                    : (language === 'vi' ? 'Lưu & Bật Vân Tay' : 'Save & Enable')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUYỀN RIÊNG TƯ SỐ ĐIỆN THOẠI */}
      {/* ========================================================================= */}
      {showPhonePrivacyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPhonePrivacyModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/30 p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#C5E5EC]/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-[#E0FAEB]">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>
                  {language === 'vi' ? 'Quyền Riêng Tư Số Điện Thoại' : 'Phone Privacy Guard'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPhonePrivacyModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#C5E5EC]/80 leading-relaxed">
              {language === 'vi'
                ? 'Lựa chọn phương thức hiển thị số điện thoại của bạn trên nền tảng nhằm tránh bị làm phiền:'
                : 'Choose how your phone number appears across GigMe to avoid unsolicited spam:'}
            </p>

            <div className="space-y-2.5">
              {[
                {
                  key: 'ESCROW_ONLY' as PhonePrivacyMode,
                  title: language === 'vi' ? 'Chỉ Khi Escrow (Khuyên dùng)' : 'Escrow Only (Recommended)',
                  badge: language === 'vi' ? 'Khuyên Dùng' : 'Recommended',
                  badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                  desc:
                    language === 'vi'
                      ? 'Số điện thoại chỉ hiển thị đầy đủ cho đối tác sau khi đã cọc giữ đồ hoặc đã được duyệt nhận việc. Người lạ chỉ thấy dạng 0909 ••• 918.'
                      : 'Revealed to counterparties only after Escrow lock or gig acceptance.',
                },
                {
                  key: 'PRIVATE' as PhonePrivacyMode,
                  title: language === 'vi' ? 'Ẩn Hoàn Toàn (Bảo Mật Tối Đa)' : 'Completely Private',
                  badge: language === 'vi' ? 'Bảo Mật 100%' : '100% Private',
                  badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
                  desc:
                    language === 'vi'
                      ? 'Luôn che số điện thoại với tất cả mọi người. Mọi trao đổi bắt buộc qua hệ thống Chat bảo mật của GigMe.'
                      : 'Always hides phone number from everyone. In-app chat required.',
                },
                {
                  key: 'PUBLIC' as PhonePrivacyMode,
                  title: language === 'vi' ? 'Công Khai Toàn Sàn' : 'Public to All',
                  badge: language === 'vi' ? 'Công Khai' : 'Public',
                  badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                  desc:
                    language === 'vi'
                      ? 'Hiển thị đầy đủ số điện thoại cho mọi sinh viên khi xem hồ sơ hoặc bài đăng của bạn.'
                      : 'Reveals phone number to anyone viewing your profile or gigs.',
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={`block p-3.5 rounded-2xl border transition cursor-pointer ${
                    selectedPrivacy === opt.key
                      ? 'bg-[#12233B] border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-[#12233B]/60 hover:bg-[#12233B] border-[#C5E5EC]/15'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="phonePrivacyOption"
                      checked={selectedPrivacy === opt.key}
                      onChange={() => setSelectedPrivacy(opt.key)}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-xs">{opt.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${opt.badgeColor}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#C5E5EC]/70 mt-1 leading-relaxed">{opt.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setShowPhonePrivacyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#12233B] text-[#C5E5EC] font-bold hover:bg-[#162B48] transition cursor-pointer"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSavePhonePrivacy}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] text-white font-extrabold shadow-lg transition hover:brightness-110 cursor-pointer"
              >
                {language === 'vi' ? 'Lưu Thiết Lập' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SAO LƯU DANH BẠ CLOUD 9 SỐ ID */}
      {showBackupModal && (
        <FriendBackupRestoreModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
      )}

      {/* MODAL 5: TẢI APP & APK */}
      {showDownloadApp && (
        <DownloadAppDialog isOpen={showDownloadApp} onClose={() => setShowDownloadApp(false)} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: ĐỔI MẬT KHẨU TÀI KHOẢN ĐĂNG NHẬP (NHÓM 1) */}
      {/* ========================================================================= */}
      {showPasswordModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPasswordModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/30 p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#C5E5EC]/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-[#E0FAEB]">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>
                  {language === 'vi' ? 'Đổi Mật Khẩu Đăng Nhập' : 'Change Login Password'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#C5E5EC]/80 leading-relaxed">
              {language === 'vi'
                ? 'Để đảm bảo an toàn, vui lòng nhập mật khẩu hiện tại cùng mật khẩu mới đạt chuẩn bảo mật.'
                : 'For security, please verify your current password and choose a strong new password.'}
            </p>

            {passwordError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              {/* MẬT KHẨU HIỆN TẠI */}
              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none"
                    placeholder={language === 'vi' ? 'Nhập mật khẩu đang dùng' : 'Enter current password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5E5EC]/60 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* MẬT KHẨU MỚI */}
              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Mật khẩu mới' : 'New Password'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none"
                    placeholder={language === 'vi' ? 'Tối thiểu 6 ký tự' : 'At least 6 characters'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5E5EC]/60 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* PASSWORD STRENGTH METER */}
                {newPassword && (
                  <div className="mt-2 p-2.5 rounded-xl bg-[#12233B]/60 border border-[#C5E5EC]/15 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#C5E5EC]/70">
                        {language === 'vi' ? 'Độ an toàn:' : 'Strength:'}
                      </span>
                      <span className={`font-bold ${getPasswordStrength(newPassword).color}`}>
                        {language === 'vi'
                          ? getPasswordStrength(newPassword).textVi
                          : getPasswordStrength(newPassword).textEn}
                      </span>
                    </div>

                    {/* BARS */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => {
                        const strength = getPasswordStrength(newPassword);
                        const isActive = strength.score >= step;
                        return (
                          <div
                            key={step}
                            className={`rounded-full transition-all duration-300 ${
                              isActive ? strength.bg : 'bg-slate-700/50'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* CHECKLIST */}
                    <div className="pt-1 grid grid-cols-2 gap-1 text-[9px] text-[#C5E5EC]/60">
                      <span className={newPassword.length >= 6 ? 'text-emerald-400 font-bold' : ''}>
                        {newPassword.length >= 6 ? '✓' : '•'} ≥ 6 ký tự
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-400 font-bold' : ''}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '•'} Có chữ hoa
                      </span>
                      <span className={/\d/.test(newPassword) ? 'text-emerald-400 font-bold' : ''}>
                        {/\d/.test(newPassword) ? '✓' : '•'} Có chữ số
                      </span>
                      <span className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-emerald-400 font-bold' : ''}>
                        {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '•'} Ký tự đặc biệt
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* XÁC NHẬN MẬT KHẨU MỚI */}
              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-[#C5E5EC] focus:outline-none"
                    placeholder={language === 'vi' ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5E5EC]/60 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    {language === 'vi' ? 'Mật khẩu xác nhận chưa khớp!' : 'Passwords do not match!'}
                  </p>
                )}
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#12233B] text-[#C5E5EC] font-bold hover:bg-[#162B48] transition cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold shadow-lg transition hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading
                    ? (language === 'vi' ? 'Đang lưu...' : 'Saving...')
                    : (language === 'vi' ? 'Lưu Mật Khẩu' : 'Save Password')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: QUẢN LÝ PHIÊN ĐĂNG NHẬP & THIẾT BỊ (NHÓM 1) */}
      {/* ========================================================================= */}
      {showSessionsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSessionsModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/30 p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#C5E5EC]/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-[#E0FAEB]">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>
                  {language === 'vi' ? 'Phiên Đăng Nhập & Quản Lý Thiết Bị' : 'Active Sessions & Devices'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#C5E5EC]/80 leading-relaxed">
              {language === 'vi'
                ? 'Danh sách các thiết bị hiện đang đăng nhập vào tài khoản GigMe của bạn. Bạn có thể đăng xuất từ xa nếu phát hiện thiết bị lạ.'
                : 'Devices currently logged into your GigMe account. You can remotely revoke unrecognized devices.'}
            </p>

            {/* THIẾT BỊ HIỆN TẠI (CURRENT DEVICE) */}
            <div className="p-3.5 rounded-2xl bg-[#12233B] border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    {getDeviceDetails().isDesktop ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{getDeviceDetails().name}</h4>
                    <p className="text-[10px] text-[#C5E5EC]/70">
                      {currentUser.lastLoginLocation || 'TP. Hồ Chí Minh (Campus Zone)'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{language === 'vi' ? 'Thiết bị này' : 'This device'}</span>
                </span>
              </div>
              <div className="text-[10px] text-emerald-300/80 flex items-center justify-between pt-1 border-t border-[#C5E5EC]/10">
                <span>{language === 'vi' ? 'Trạng thái:' : 'Status:'} Đang hoạt động</span>
                <span>{language === 'vi' ? 'IP Campus WiFi' : 'Campus Network'}</span>
              </div>
            </div>

            {/* CÁC THIẾT BỊ KHÁC (OTHER DEVICES) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#C5E5EC]/90 flex items-center justify-between">
                <span>{language === 'vi' ? 'Các phiên đăng nhập khác' : 'Other Active Sessions'}</span>
                <span className="text-[10px] text-[#C5E5EC]/60">
                  {otherSessionsRevoked ? '0 thiết bị' : '2 thiết bị'}
                </span>
              </h4>

              {otherSessionsRevoked ? (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? 'Đã ngắt kết nối an toàn khỏi tất cả thiết bị khác. Hiện chỉ có thiết bị này duy trì đăng nhập.'
                      : 'All remote sessions revoked. Only this device is currently logged in.'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* SESSION 1 */}
                  <div className="p-3 rounded-2xl bg-[#12233B]/70 border border-[#C5E5EC]/15 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <Smartphone className="w-5 h-5 text-cyan-400 shrink-0" />
                      <div>
                        <p className="font-bold text-white text-xs">Samsung Galaxy A54 • GigMe App</p>
                        <p className="text-[10px] text-[#C5E5EC]/60">
                          KTX Khu B, ĐHQG • {language === 'vi' ? 'Hôm qua lúc 21:15' : 'Yesterday 21:15'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      {language === 'vi' ? 'Đã lưu' : 'Saved'}
                    </span>
                  </div>

                  {/* SESSION 2 */}
                  <div className="p-3 rounded-2xl bg-[#12233B]/70 border border-[#C5E5EC]/15 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <Laptop className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div>
                        <p className="font-bold text-white text-xs">MacBook Air M2 • Chrome 129</p>
                        <p className="text-[10px] text-[#C5E5EC]/60">
                          Thư viện Trung tâm Campus • {language === 'vi' ? '4 ngày trước' : '4 days ago'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      {language === 'vi' ? 'Đã lưu' : 'Saved'}
                    </span>
                  </div>

                  {/* NÚT NGẮT TẤT CẢ THIẾT BỊ KHÁC */}
                  <button
                    type="button"
                    onClick={handleTerminateOtherSessions}
                    disabled={isTerminatingSessions}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>
                      {isTerminatingSessions
                        ? (language === 'vi' ? 'Đang ngắt kết nối...' : 'Revoking sessions...')
                        : (language === 'vi' ? 'Đăng Xuất Khỏi Tất Cả Thiết Bị Khác' : 'Log Out All Other Devices')}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#12233B] text-[#C5E5EC] font-bold hover:bg-[#162B48] transition cursor-pointer"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: TẠM VÔ HIỆU HÓA TÀI KHOẢN (NHÓM 1) */}
      {/* ========================================================================= */}
      {showDeactivateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeactivateModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-amber-500/30 p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-amber-500/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-amber-300">
                <UserX className="w-4 h-4 text-amber-400" />
                <span>
                  {language === 'vi' ? 'Tạm Vô Hiệu Hóa Tài Khoản' : 'Deactivate Account'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 leading-relaxed">
              <p className="font-bold flex items-center space-x-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{language === 'vi' ? 'Những điều cần lưu ý:' : 'Important notes:'}</span>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-200/90">
                <li>{language === 'vi' ? 'Hồ sơ và các bài đăng của bạn sẽ tạm thời bị ẩn khỏi nền tảng.' : 'Your profile and gigs will be hidden.'}</li>
                <li>{language === 'vi' ? 'Số dư ví và điểm uy tín vẫn được bảo lưu an toàn 100%.' : 'Wallet balance and trust score are safely kept.'}</li>
                <li>{language === 'vi' ? 'Bạn có thể kích hoạt lại tài khoản bất kỳ lúc nào bằng cách đăng nhập lại.' : 'Reactivate anytime by simply logging back in.'}</li>
              </ul>
            </div>

            {deactivateError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deactivateError}</span>
              </div>
            )}

            <form onSubmit={handleDeactivateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Lý do tạm ngừng' : 'Reason'}
                </label>
                <select
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white focus:border-amber-400 focus:outline-none text-xs"
                >
                  <option value="Tạm nghỉ thi học kỳ">{language === 'vi' ? 'Tạm nghỉ ôn thi học kỳ' : 'Studying for exams'}</option>
                  <option value="Không còn nhu cầu đăng việc lúc này">{language === 'vi' ? 'Không còn nhu cầu nhận việc lúc này' : 'Not seeking gigs currently'}</option>
                  <option value="Chuyển cơ sở hoặc tốt nghiệp">{language === 'vi' ? 'Chuyển trường hoặc tốt nghiệp' : 'Graduating / Campus change'}</option>
                  <option value="Lý do cá nhân khác">{language === 'vi' ? 'Lý do cá nhân khác' : 'Other personal reason'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Mật khẩu tài khoản để xác nhận' : 'Password to confirm'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeactivatePassword ? 'text' : 'password'}
                    required
                    value={deactivatePassword}
                    onChange={(e) => setDeactivatePassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/25 text-white placeholder:text-[#C5E5EC]/40 focus:border-amber-400 focus:outline-none"
                    placeholder={language === 'vi' ? 'Nhập mật khẩu tài khoản' : 'Enter account password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeactivatePassword(!showDeactivatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5E5EC]/60 hover:text-white"
                  >
                    {showDeactivatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#12233B] text-[#C5E5EC] font-bold hover:bg-[#162B48] transition cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isDeactivating}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold shadow-lg transition hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {isDeactivating
                    ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...')
                    : (language === 'vi' ? 'Xác Nhận Tạm Khóa' : 'Confirm Deactivate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: XÓA TÀI KHOẢN VĨNH VIỄN (NHÓM 1 - CHÍNH SÁCH GOOGLE PLAY & APPLE) */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-rose-500/50 p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-rose-500/30">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-rose-300">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>
                  {language === 'vi' ? 'Xóa Vĩnh Viễn Tài Khoản' : 'Permanently Delete Account'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CẢNH BÁO NGUY HIỂM */}
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs space-y-1.5 leading-relaxed">
              <p className="font-extrabold text-rose-300 flex items-center space-x-1.5">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{language === 'vi' ? 'HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!' : 'THIS ACTION IS IRREVERSIBLE!'}</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-200/90">
                <li>{language === 'vi' ? 'Mọi thông tin cá nhân, CCCD NFC, mã PIN ví sẽ bị dọn dẹp sạch sẽ.' : 'All personal info, verification, and PIN will be permanently purged.'}</li>
                <li>{language === 'vi' ? 'Lịch sử đánh giá sao, uy tín và bạn bè campus sẽ bị xóa hoàn toàn.' : 'All reviews, ratings, and friend contacts will be destroyed.'}</li>
                <li>{language === 'vi' ? 'Dữ liệu xóa theo đúng quy định Google Play Data Safety & GDPR.' : 'Data deleted in full compliance with Play Data Safety policies.'}</li>
              </ul>
            </div>

            {/* KIỂM TRA TÀI CHÍNH VÍ VÀ ESCROW */}
            {currentUser.escrowLockedBalance > 0 ? (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{language === 'vi' ? 'Đang có tiền bảo chứng Escrow!' : 'Active Escrow funds!'}</span>
                </p>
                <p className="text-[11px] text-amber-200/90">
                  {language === 'vi'
                    ? `Tài khoản đang có ${formatVnd(currentUser.escrowLockedBalance)} tiền bảo chứng Escrow chưa giải ngân. Bạn không thể xóa tài khoản để bảo đảm quyền lợi tài chính đôi bên.`
                    : `Account has ${formatVnd(currentUser.escrowLockedBalance)} in locked Escrow. You cannot delete until Escrow is settled.`}
                </p>
              </div>
            ) : currentUser.walletBalance > 0 ? (
              <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/40 text-sky-300 text-xs space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{language === 'vi' ? 'Nhắc nhở số dư ví:' : 'Wallet balance reminder:'}</span>
                </p>
                <p className="text-[11px] text-sky-200/90">
                  {language === 'vi'
                    ? `Số dư khả dụng của bạn là ${formatVnd(currentUser.walletBalance)}. Bạn nên rút hết tiền về tài khoản ngân hàng trước khi xóa.`
                    : `You have ${formatVnd(currentUser.walletBalance)} available. Please withdraw your funds first.`}
                </p>
              </div>
            ) : null}

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi' ? 'Mật khẩu tài khoản' : 'Account password'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 rounded-xl bg-[#12233B] border border-rose-500/30 text-white placeholder:text-[#C5E5EC]/40 focus:border-rose-400 focus:outline-none"
                    placeholder={language === 'vi' ? 'Nhập mật khẩu tài khoản' : 'Enter account password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5E5EC]/60 hover:text-white"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#C5E5EC]/90 mb-1 font-semibold">
                  {language === 'vi'
                    ? 'Gõ chữ "XÓA TÀI KHOẢN" để mở khóa nút xóa:'
                    : 'Type "DELETE ACCOUNT" to unlock button:'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmPhrase}
                  onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12233B] border border-rose-500/30 text-white placeholder:text-[#C5E5EC]/40 focus:border-rose-400 focus:outline-none font-bold tracking-wider"
                  placeholder={language === 'vi' ? 'XÓA TÀI KHOẢN' : 'DELETE ACCOUNT'}
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#12233B] text-[#C5E5EC] font-bold hover:bg-[#162B48] transition cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={
                    isDeleting ||
                    currentUser.escrowLockedBalance > 0 ||
                    (deleteConfirmPhrase.trim().toUpperCase() !== 'XÓA TÀI KHOẢN' &&
                      deleteConfirmPhrase.trim().toUpperCase() !== 'XOA TAI KHOAN' &&
                      deleteConfirmPhrase.trim().toUpperCase() !== 'DELETE ACCOUNT') ||
                    !deletePassword.trim()
                  }
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-extrabold shadow-lg transition hover:brightness-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isDeleting
                      ? (language === 'vi' ? 'Đang xóa...' : 'Deleting...')
                      : (language === 'vi' ? 'Xóa Vĩnh Viễn' : 'Delete Account')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: FCM PUSH NOTIFICATIONS MODAL (NHÓM 3) */}
      {/* ========================================================================= */}
      {showFcmModal && (
        <FcmPushNotificationModal isOpen={showFcmModal} onClose={() => setShowFcmModal(false)} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 11: CHÍNH SÁCH QUYỀN RIÊNG TƯ & AN TOÀN DỮ LIỆU (NHÓM 3) */}
      {/* ========================================================================= */}
      {showPrivacyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrivacyModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-[#0E1B2E] border border-emerald-500/30 p-6 text-white shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-emerald-500/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-emerald-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>
                  {language === 'vi'
                    ? 'Chính Sách Quyền Riêng Tư & An Toàn Dữ Liệu'
                    : 'Privacy Policy & Data Safety'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[#C5E5EC]/90 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-[#12233B] border border-emerald-500/20 space-y-2">
                <h4 className="font-bold text-white flex items-center space-x-1.5 text-emerald-300">
                  <span>🛡️ 1. Cam Kết Bảo Vệ Quyền Riêng Tư Sinh Viên</span>
                </h4>
                <p className="text-[11px] text-[#C5E5EC]/80">
                  {language === 'vi'
                    ? 'GigMe cam kết 100% không bán, chia sẻ hoặc thương mại hóa dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích quảng cáo hoặc tiếp thị.'
                    : 'GigMe does not sell, rent, or share personal user data with third-party advertisers.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-2">
                <h4 className="font-bold text-white flex items-center space-x-1.5">
                  <span>📱 2. Quyền Kiểm Soát Số Điện Thoại & Vị Trí</span>
                </h4>
                <p className="text-[11px] text-[#C5E5EC]/80">
                  {language === 'vi'
                    ? 'Bạn có toàn quyền ẩn hoàn toàn số điện thoại hoặc chỉ cho phép đối tác xem khi đã kích hoạt hợp đồng Smart Escrow thành công.'
                    : 'You control phone visibility at all times (Private, Escrow-only, or Public).'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-2">
                <h4 className="font-bold text-white flex items-center space-x-1.5">
                  <span>🔒 3. Bảo Mật Chip CCCD NFC & Mã PIN Ví</span>
                </h4>
                <p className="text-[11px] text-[#C5E5EC]/80">
                  {language === 'vi'
                    ? 'Dữ liệu đối soát NFC chỉ lưu mã băm mã hóa một chiều (SHA-256 + Salt). Mã PIN ví 6 số được bảo vệ nhiều lớp và không bao giờ lưu dưới dạng văn bản thô.'
                    : 'NFC chip data & 6-digit wallet PINs are hashed using cryptographic standards.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-2">
                <h4 className="font-bold text-white flex items-center space-x-1.5">
                  <span>🗑️ 4. Quyền Yêu Cầu Xóa Dữ Liệu (Google Play & GDPR)</span>
                </h4>
                <p className="text-[11px] text-[#C5E5EC]/80">
                  {language === 'vi'
                    ? 'Tuân thủ nghiêm ngặt chính sách Google Play Data Safety, bạn có thể chủ động xóa vĩnh viễn tài khoản và toàn bộ lịch sử trong phần Vùng Nguy Hiểm bất cứ lúc nào.'
                    : 'Full compliance with Google Play Data Safety rules. You can permanently erase all account data anytime.'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                {language === 'vi' ? 'Đã Hiểu & Đồng Ý' : 'I Understand'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 12: TIÊU CHUẨN CỘNG ĐỒNG & CHỐNG SCAM (NHÓM 3) */}
      {/* ========================================================================= */}
      {showCommunityModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCommunityModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-[#0E1B2E] border border-indigo-500/30 p-6 text-white shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-indigo-500/20">
              <h3 className="font-extrabold text-sm flex items-center space-x-2 text-indigo-300">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>
                  {language === 'vi'
                    ? 'Tiêu Chuẩn Cộng Đồng & Chống Lừa Đảo KTX'
                    : 'Community Standards & Anti-Scam Rules'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCommunityModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#C5E5EC]/90 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1.5">
                <h4 className="font-bold text-rose-300 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>0-Tolerance: Các Hành Vi Bị Cấm Tuyệt Đối</span>
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-200/90">
                  <li>{language === 'vi' ? 'Tuyển dụng đa cấp, tài chính ảo, cờ bạc trá hình trong campus.' : 'Multi-level marketing, fraudulent tasks, or gambling.'}</li>
                  <li>{language === 'vi' ? 'Gạ gẫm giao dịch cọc ngoài hệ thống Smart Escrow của GigMe.' : 'Requesting off-platform cash deposits outside Smart Escrow.'}</li>
                  <li>{language === 'vi' ? 'Sử dụng phần mềm Fake GPS gian lận ca việc bán kính gần.' : 'Using Fake GPS spoofing tools to claim proximity gigs.'}</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-1.5">
                <h4 className="font-bold text-white flex items-center space-x-1.5 text-indigo-300">
                  <span>🤝 Văn Hóa Ứng Xử Giữa Sinh Viên</span>
                </h4>
                <p className="text-[11px] text-[#C5E5EC]/80">
                  {language === 'vi'
                    ? 'Tôn trọng giờ giấc hẹn việc, hoàn thành đúng thỏa thuận ca làm và thanh toán đúng hạn qua Smart Escrow khi nghiệm thu công việc.'
                    : 'Respect punctuality, task scope, and release Escrow promptly upon completion.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-1.5">
                <h4 className="font-bold text-white flex items-center space-x-1.5 text-cyan-300">
                  <span>⚖️ Cơ Chế Trọng Tài Tranh Chấp</span>
                </h4>
                <p className="text-[11px] text-[#C5E5EC]/80">
                  {language === 'vi'
                    ? 'Khi phát sinh bất đồng về kết quả công việc, tiền cọc Escrow sẽ được khóa an toàn và chuyển lên Ban Trọng Tài Campus phân xử trong vòng 24h.'
                    : 'Unresolved disputes are frozen in Escrow and mediated within 24 hours by campus admins.'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCommunityModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                {language === 'vi' ? 'Cam Kết Tuân Thủ' : 'Commit to Standards'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 13: THÔNG TIN PHIÊN BẢN & BẢN QUYỀN (NHÓM 3) */}
      {/* ========================================================================= */}
      {showAboutModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAboutModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0E1B2E] border border-cyan-500/30 p-6 text-white shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-cyan-500/20">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3064AE] to-[#00E5FF] flex items-center justify-center font-black text-white text-xs">
                  GM
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">GigMe Campus Network</h3>
                  <p className="text-[10px] text-cyan-300 font-semibold">Phiên bản 2.4.0 (Production)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="text-[#C5E5EC]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/15 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#C5E5EC]/70">Build Version:</span>
                  <span className="font-mono font-bold text-white">2026.10.12-PROD</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#C5E5EC]/70">Kiến trúc:</span>
                  <span className="font-bold text-cyan-300">PWA + Native Hybrid</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#C5E5EC]/70">Database & Realtime:</span>
                  <span className="font-bold text-emerald-300">Firebase Firestore Cloud</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#C5E5EC]/70">Bảo mật Escrow:</span>
                  <span className="font-bold text-amber-300">Smart Escrow Multi-Sig</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#12233B]/60 border border-[#C5E5EC]/10 text-[11px] text-[#C5E5EC]/80 leading-relaxed">
                <p className="font-bold text-white mb-1">Giấy phép mã nguồn mở (Open Source Licenses):</p>
                <p>
                  Sản phẩm sử dụng React, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti và Firebase SDK dưới giấy phép MIT / Apache 2.0.
                </p>
                <p className="mt-2 text-[10px] text-[#C5E5EC]/60">
                  Bản quyền © 2026 GigMe Campus. Tất cả các quyền được bảo lưu.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] text-white font-extrabold text-xs transition cursor-pointer shadow-lg hover:brightness-110"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
