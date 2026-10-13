import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  LogOut,
  Edit2,
  Clock,
  Send,
  Lock,
  Flame,
  Info
} from 'lucide-react';
import { useGigMe } from '../context/GigMeContext';
import { triggerHaptic } from '../utils/haptics';

export const EmailVerificationScreen: React.FC = () => {
  const {
    currentUser,
    sendEmailVerificationLink,
    checkEmailVerificationStatus,
    verifyEmailOtp,
    markUserEmailVerified,
    updateUserEmailAddress,
    logout,
    language,
    showNotification,
  } = useGigMe();

  const [otpInput, setOtpInput] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);
  const [isSuccessUnlocked, setIsSuccessUnlocked] = useState<boolean>(false);
  const [showEditEmailModal, setShowEditEmailModal] = useState<boolean>(false);
  const [newEmailInput, setNewEmailInput] = useState<string>(currentUser?.email || '');
  const [editEmailError, setEditEmailError] = useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState<boolean>(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState<boolean>(false);
  const [pulseCount, setPulseCount] = useState<number>(0);

  const isCheckingRef = useRef(false);

  // 1. REAL-TIME POLLING & LISTENER: Polls every 2.5s for instant unlock
  useEffect(() => {
    if (!currentUser || currentUser.isEmailVerified || isSuccessUnlocked) return;

    const interval = setInterval(async () => {
      setPulseCount((prev) => prev + 1);

      // Prevent concurrent overlapping checks
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const res = await checkEmailVerificationStatus();
        if (res.isVerified) {
          triggerSuccessUnlock();
        }
      } catch (err) {
        // quiet background poll
      } finally {
        isCheckingRef.current = false;
      }
    }, 2500);

    // Also trigger immediate check when user focuses tab back from Gmail app
    const onWindowFocus = async () => {
      if (isCheckingRef.current || isSuccessUnlocked) return;
      isCheckingRef.current = true;
      try {
        const res = await checkEmailVerificationStatus();
        if (res.isVerified) {
          triggerSuccessUnlock();
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onWindowFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onWindowFocus);
    };
  }, [currentUser?.id, currentUser?.isEmailVerified, isSuccessUnlocked]);

  // 2. Resend Cooldown Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const triggerSuccessUnlock = () => {
    setIsSuccessUnlocked(true);
    triggerHaptic('success');
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00F2FE', '#4FACFE', '#10B981', '#F59E0B', '#E0FAEB'],
      });
    } catch {}

    showNotification(
      language === 'vi' ? 'Email đã được xác thực thành công! 🎉' : 'Email successfully verified! 🎉',
      language === 'vi'
        ? 'Chào mừng bạn! Toàn bộ nền tảng GigMe Campus đã sẵn sàng mở khóa.'
        : 'Welcome! All GigMe Campus features are now unlocked.',
      true,
      true
    );

    setTimeout(() => {
      markUserEmailVerified();
    }, 1500);
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpInput).trim();
    if (!code || code.length < 6) {
      setOtpError(language === 'vi' ? 'Vui lòng nhập đủ 6 chữ số OTP!' : 'Please enter the 6-digit OTP!');
      triggerHaptic('warning');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);
    setLastCheckMessage(null);
    triggerHaptic('medium');

    try {
      const res = await verifyEmailOtp(code);
      if (res.success) {
        setLastCheckMessage(
          language === 'vi'
            ? '✅ Tuyệt vời! Xác thực thành công. Đang mở khóa tài khoản...'
            : '✅ Verification successful! Unlocking account...'
        );
        triggerSuccessUnlock();
      } else {
        setOtpError(res.error || (language === 'vi' ? 'Mã xác thực không chính xác!' : 'Invalid verification code!'));
        triggerHaptic('error');
      }
    } catch (err: any) {
      setOtpError(err?.message || (language === 'vi' ? 'Lỗi kết nối khi xác thực OTP!' : 'Connection error during OTP verification!'));
      triggerHaptic('error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Manual Check Now action
  const handleManualCheck = async () => {
    setIsChecking(true);
    setLastCheckMessage(null);
    setOtpError(null);
    triggerHaptic('selection');

    try {
      const res = await checkEmailVerificationStatus();
      if (res.isVerified) {
        setLastCheckMessage(
          language === 'vi'
            ? '✅ Tuyệt vời! Xác thực thành công. Đang chuyển hướng vào hệ thống...'
            : '✅ Verification confirmed! Redirecting to platform...'
        );
        triggerSuccessUnlock();
      } else {
        setLastCheckMessage(
          language === 'vi'
            ? '⏳ Chưa phát hiện bấm link xác thực. Bạn có thể nhập mã OTP 6 số nhận được trong email vào ô bên trên để kích hoạt ngay!'
            : '⏳ Verification link not yet detected. You can enter the 6-digit OTP code from your email above to activate instantly!'
        );
      }
    } catch {
      setLastCheckMessage(
        language === 'vi'
          ? 'Không thể kiểm tra lúc này. Đang tự động kiểm tra lại...'
          : 'Could not check at this moment. Retrying automatically...'
      );
    } finally {
      setIsChecking(false);
    }
  };

  // Resend Verification Email action
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setLastCheckMessage(null);
    setOtpError(null);
    triggerHaptic('medium');

    try {
      const res = await sendEmailVerificationLink(currentUser?.email);
      if (res.success) {
        setResendCooldown(60);
        showNotification(
          language === 'vi' ? 'Đã gửi lại mã xác thực tới Gmail! 📨' : 'Verification code resent! 📨',
          language === 'vi'
            ? `Mã OTP và liên kết kích hoạt đã được gửi tới ${currentUser?.email}. Vui lòng kiểm tra hộp thư.`
            : `A fresh verification email has been sent to ${currentUser?.email}. Please check your inbox.`,
          true
        );
        setLastCheckMessage(
          language === 'vi'
            ? `📨 Đã gửi mã OTP mới tới ${currentUser?.email}. Vui lòng kiểm tra Hộp thư đến hoặc Thư rác (Spam).`
            : `📨 New OTP code sent to ${currentUser?.email}. Please check Inbox or Spam.`
        );
      } else {
        setLastCheckMessage(
          res.error || (language === 'vi' ? 'Lỗi khi gửi lại email.' : 'Error resending verification email.')
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  // Update Email Address action
  const handleSaveNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditEmailError(null);
    const clean = newEmailInput.trim().toLowerCase();

    if (!clean || !clean.includes('@')) {
      setEditEmailError(language === 'vi' ? 'Vui lòng nhập địa chỉ email hợp lệ!' : 'Please enter a valid email address!');
      return;
    }
    if (clean === currentUser?.email) {
      setShowEditEmailModal(false);
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await updateUserEmailAddress(clean);
      if (res.success) {
        setShowEditEmailModal(false);
        setResendCooldown(60);
        showNotification(
          language === 'vi' ? 'Cập nhật email thành công!' : 'Email updated successfully!',
          language === 'vi'
            ? `Đã đổi thành ${clean} và gửi mã xác thực mới!`
            : `Updated to ${clean} and sent a fresh verification code!`,
          true
        );
      } else {
        setEditEmailError(res.error || (language === 'vi' ? 'Lỗi khi cập nhật email.' : 'Error updating email.'));
      }
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070E18] text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#3064AE]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#10B981]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-lg mx-auto w-full pt-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3064AE] to-[#20457A] flex items-center justify-center border border-[#C5E5EC]/30 shadow-lg shadow-[#3064AE]/30">
            <ShieldCheck className="w-5 h-5 text-[#E0FAEB]" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-white flex items-center space-x-1">
              <span>Gig<span className="text-[#C5E5EC]">Me</span></span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#3064AE]/40 text-[#C5E5EC] border border-[#3064AE]">CAMPUS</span>
            </div>
            <p className="text-[10px] text-[#C5E5EC]/70">Hệ Thống Xác Thực Gmail Tự Động 24/7</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Đăng xuất' : 'Sign Out'}</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-lg mx-auto w-full my-auto py-6 z-10">
        <div className="bg-[#0E1B2E]/90 backdrop-blur-xl border border-[#3064AE]/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          {/* Status Badge */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#12233B] border border-[#3064AE] shadow-inner text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-[#E0FAEB]">
                {language === 'vi' ? 'Đang lắng nghe xác thực thời gian thực' : 'Real-time verification listener active'}
              </span>
            </div>
          </div>

          {/* Icon Hero Graphic */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#0A1628] border-2 border-[#C5E5EC]/50 flex items-center justify-center shadow-xl shadow-[#3064AE]/30">
                {isSuccessUnlocked ? (
                  <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-bounce" />
                ) : (
                  <Mail className="w-9 h-9 text-[#C5E5EC] animate-pulse" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[#3064AE] border-2 border-[#0E1B2E] flex items-center justify-center shadow">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center space-y-1.5 mb-5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isSuccessUnlocked
                ? (language === 'vi' ? 'Xác Thực Hoàn Tất! 🎉' : 'Verification Complete! 🎉')
                : (language === 'vi' ? 'Xác Nhận Gmail Của Bạn' : 'Confirm Your Gmail')}
            </h2>
            <p className="text-xs text-[#C5E5EC]/80 max-w-sm mx-auto leading-relaxed">
              {language === 'vi'
                ? 'Mã OTP 6 số đã được gửi tự động tới Gmail của bạn. Vui lòng nhập mã để kích hoạt tài khoản ngay.'
                : 'A 6-digit OTP code was sent to your Gmail. Please enter it to activate your account.'}
            </p>
          </div>

          {/* Target Email Box */}
          <div className="bg-[#081120] border border-[#1E3A5F] rounded-xl p-3.5 mb-5 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#3064AE]/20 border border-[#3064AE]/40 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#C5E5EC]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#8FA3BF] uppercase font-bold tracking-wider">
                  {language === 'vi' ? 'Email nhận mã xác thực' : 'Receiving email'}
                </p>
                <p className="text-xs sm:text-sm font-bold text-white truncate font-mono">
                  {currentUser?.email || 'user@example.com'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setNewEmailInput(currentUser?.email || '');
                setEditEmailError(null);
                setShowEditEmailModal(true);
              }}
              className="shrink-0 ml-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#C5E5EC] hover:text-white bg-[#3064AE]/20 hover:bg-[#3064AE]/40 border border-[#3064AE]/50 flex items-center space-x-1 cursor-pointer transition-all"
              title="Đổi địa chỉ email khác nếu gõ sai"
            >
              <Edit2 className="w-3 h-3" />
              <span>{language === 'vi' ? 'Đổi email' : 'Edit'}</span>
            </button>
          </div>

          {/* 🌟 DIRECT OTP INPUT FORM 🌟 */}
          <div className="bg-[#091526] border-2 border-[#3064AE]/60 rounded-xl p-4 mb-5 shadow-inner">
            <label className="block text-center text-xs font-bold text-[#E0FAEB] mb-2 uppercase tracking-wide">
              {language === 'vi' ? 'Nhập mã xác thực 6 số trong email:' : 'Enter 6-digit code from email:'}
            </label>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-full max-w-xs relative">
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(clean);
                    setOtpError(null);
                    if (clean.length === 6) {
                      handleVerifyOtp(clean);
                    }
                  }}
                  placeholder="000000"
                  className="w-full text-center text-2xl sm:text-3xl font-mono font-black tracking-[0.45em] py-2.5 px-3 rounded-xl bg-[#070D18] border-2 border-[#38BDF8]/60 focus:border-[#38BDF8] text-[#38BDF8] placeholder-slate-700 outline-none shadow-lg shadow-[#3064AE]/20 transition-all"
                  autoFocus
                />
              </div>

              {otpError && (
                <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-semibold animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <button
                onClick={() => handleVerifyOtp()}
                disabled={isVerifyingOtp || otpInput.trim().length < 6}
                className="w-full max-w-xs py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'vi' ? 'Đang kiểm tra...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === 'vi' ? 'KÍCH HOẠT TÀI KHOẢN NGAY' : 'VERIFY & UNLOCK ACCOUNT'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback message banner */}
          {lastCheckMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#081120] border border-[#3064AE]/60 text-xs text-[#E0FAEB] flex items-start space-x-2 animate-fadeIn">
              <Info className="w-4 h-4 text-[#C5E5EC] shrink-0 mt-0.5" />
              <div className="leading-relaxed">{lastCheckMessage}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* Primary Button: Open Gmail */}
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-[#12233B] hover:bg-[#1a3356] text-[#E0FAEB] font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 border border-[#3064AE] shadow transition-all cursor-pointer group"
            >
              <span>{language === 'vi' ? 'Mở Hộp Thư Gmail (Web/App)' : 'Open Gmail (Web/App)'}</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            {/* Resend Verification Email Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleResendEmail}
                disabled={resendCooldown > 0 || isResending}
                className="text-xs text-[#C5E5EC] hover:text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {resendCooldown > 0
                    ? (language === 'vi' ? `Gửi lại mã sau (${resendCooldown}s)` : `Resend in (${resendCooldown}s)`)
                    : isResending
                    ? (language === 'vi' ? 'Đang gửi...' : 'Sending...')
                    : (language === 'vi' ? 'Gửi lại mã xác thực tới Gmail' : 'Resend verification code')}
                </span>
              </button>

              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className="text-[11px] text-[#8FA3BF] hover:text-[#C5E5EC] flex items-center space-x-1 underline transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{language === 'vi' ? 'Kiểm tra liên kết' : 'Check link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-3 text-center text-[11px] text-[#8FA3BF]">
          <p>
            {language === 'vi'
              ? 'Thư gửi từ hệ thống: deffqsqw@gmail.com • Kiểm tra cả mục Spam nếu không thấy trong Hộp thư đến'
              : 'Sent from deffqsqw@gmail.com • Please check Spam if not in Inbox'}
          </p>
        </div>

        {/* Firebase Authentication Template Preview Card */}
        {showTemplatePreview && (
          <div className="mt-4 bg-[#081120] border border-[#3064AE]/40 rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-[#8FA3BF] border-b border-[#1E3A5F] pb-2">
              <span className="font-bold text-[#E0FAEB]">Mẫu Email Firebase Authentication</span>
              <span className="text-[10px] font-mono">Firebase Console Auth Template</span>
            </div>
            <div className="space-y-1 text-[#C5E5EC]">
              <p><strong>Tiêu đề:</strong> [GigMe Campus] Xác thực địa chỉ email của bạn</p>
              <p><strong>Người gửi:</strong> GigMe Authentication &lt;noreply@gigme.vn&gt;</p>
              <p><strong>Nội dung:</strong> Chào bạn, vui lòng nhấn vào liên kết bên dưới để xác thực địa chỉ email cho tài khoản GigMe của bạn.</p>
              <p><strong>Hành động:</strong> Nút "Verify Email" kèm liên kết có thời hạn 24 giờ.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-lg mx-auto w-full text-center text-[11px] text-[#8FA3BF] pb-4 z-10">
        <p>© 2026 GigMe Student Platform • Bảo vệ bởi Google Firebase Authentication</p>
      </div>

      {/* Edit Email Modal */}
      {showEditEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0E1B2E] border border-[#3064AE] rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
              <Edit2 className="w-4 h-4 text-[#C5E5EC]" />
              <span>{language === 'vi' ? 'Đổi Địa Chỉ Email' : 'Change Email Address'}</span>
            </h3>
            <p className="text-xs text-[#C5E5EC]/80 mb-4">
              {language === 'vi'
                ? 'Nếu bạn nhập nhầm địa chỉ email khi đăng ký, hãy nhập địa chỉ chính xác bên dưới để nhận liên kết xác thực mới.'
                : 'Enter your correct email address below to receive a new verification link.'}
            </p>

            <form onSubmit={handleSaveNewEmail} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8FA3BF] mb-1">
                  {language === 'vi' ? 'Địa chỉ Gmail mới' : 'New Gmail address'}
                </label>
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="vidu@gmail.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#081120] border border-[#1E3A5F] focus:border-[#C5E5EC] text-white text-xs font-mono outline-none"
                  autoFocus
                />
                {editEmailError && (
                  <p className="text-[11px] text-rose-400 mt-1">{editEmailError}</p>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditEmailModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#12233B] hover:bg-[#1a3356] text-[#8FA3BF] text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#3064AE] hover:bg-[#3b7ad6] text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingEmail
                    ? (language === 'vi' ? 'Đang lưu...' : 'Saving...')
                    : (language === 'vi' ? 'Lưu & Gửi lại' : 'Save & Resend')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
