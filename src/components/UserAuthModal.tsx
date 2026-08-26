import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { X, Sparkles, Cloud, Lock, Mail, User as UserIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'zh' | 'en';
  onLoginSuccess?: (user: User) => void;
}

export default function UserAuthModal({
  isOpen,
  onClose,
  language = 'zh',
  onLoginSuccess,
}: UserAuthModalProps) {
  const isEn = language === 'en';
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const saveUserProfile = async (user: User, customName?: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          id: user.uid,
          email: user.email || '',
          displayName: customName || user.displayName || user.email?.split('@')[0] || 'Princess User',
          photoURL: user.photoURL || '',
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to save user profile to firestore:', e);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await saveUserProfile(result.user);
      setSuccessMsg(isEn ? 'Signed in successfully with Google!' : 'Google 账号登录成功！');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(result.user);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg(isEn ? 'Sign in popup was closed.' : '登录弹窗已关闭');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg(
          isEn
            ? 'Google Sign-in is not enabled in Firebase Console. Please enable "Google" under Authentication > Sign-in method.'
            : 'Firebase 控制台尚未启用「Google」登录提供商。请前往 Firebase Console (Authentication -> Sign-in method) 启用 Google 登录。'
        );
      } else {
        setErrorMsg(err.message || (isEn ? 'Google sign in failed.' : 'Google 登录失败，请重试'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || (mode !== 'reset' && !password.trim())) {
      setErrorMsg(isEn ? 'Please fill in all required fields.' : '请填写完整的信息');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(result.user, { displayName: displayName.trim() });
        }
        await saveUserProfile(result.user, displayName.trim());
        setSuccessMsg(isEn ? 'Account created and synced successfully!' : '账号注册成功，已开启云端多端同步！');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(result.user);
          onClose();
        }, 800);
      } else if (mode === 'signin') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await saveUserProfile(result.user);
        setSuccessMsg(isEn ? 'Welcome back! Synced successfully.' : '欢迎回来！已同步您的云端心愿清单');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(result.user);
          onClose();
        }, 800);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg(isEn ? 'Password reset email sent. Please check your inbox.' : '重置密码链接已发送至您的邮箱，请查收');
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      let message = err.message;
      if (err.code === 'auth/invalid-email') {
        message = isEn ? 'Invalid email format.' : '邮箱格式不正确';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = isEn
          ? 'Email/Password sign-in is not enabled in Firebase. Please use "Continue with Google" or enable "Email/Password" in Firebase Console (Authentication > Sign-in method).'
          : 'Firebase 后台尚未启用「邮箱/密码」登录方式。推荐点击上方「Google 账号一键登录」，或前往 Firebase 控制台 (Authentication -> Sign-in method) 开启「Email/Password」。';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = isEn ? 'Incorrect email or password.' : '邮箱或密码不匹配，请检查后再试';
      } else if (err.code === 'auth/email-already-in-use') {
        message = isEn ? 'This email is already registered. Please sign in.' : '该邮箱已注册，请直接登录';
      } else if (err.code === 'auth/weak-password') {
        message = isEn ? 'Password must be at least 6 characters.' : '密码强度较低，请输入至少6位字符';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn" id="auth-modal-overlay">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[32px] p-7 md:p-8 shadow-2xl border border-white/80 overflow-hidden text-[#4a3a3a]">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-pink-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-100/60 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8e6d72]/70 hover:text-[#8e6d72] hover:bg-[#8e6d72]/10 rounded-full transition-colors"
          title={isEn ? 'Close' : '关闭'}
          id="close-auth-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#fcf0e2] to-[#ffe4e9] border border-[#8e6d72]/20 mb-3 shadow-inner">
            <Cloud className="w-6 h-6 text-[#8e6d72]" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#8e6d72] tracking-wide">
            {mode === 'signup' 
              ? (isEn ? 'Join the Manifestation Realm' : '开启云端心愿同步') 
              : mode === 'reset'
              ? (isEn ? 'Reset Password' : '找回账户密码')
              : (isEn ? 'Welcome to Manifestation Palace' : '登录心愿殿堂 • 云端多端同步')}
          </h3>
          <p className="text-xs text-[#b49196] mt-1.5 font-sans leading-relaxed">
            {isEn 
              ? 'Synchronize your manifestation desires across all your devices securely with Cloud Firestore.' 
              : '登录后自动将您的愿望清单与显化场景安全同步至云端，换设备或清理缓存不丢失。'}
          </p>
        </div>

        {/* Guest / Offline Mode Notice & Direct Button */}
        <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-pink-50/90 border border-amber-200/60 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{isEn ? 'No Sign-In Required • Local Vault' : '无需登录 • 本地私密专属保险库'}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
              {isEn ? '100% Free & Ready' : '即开即用'}
            </span>
          </div>
          <p className="text-[11px] text-[#6d5b5e] leading-relaxed mb-2.5">
            {isEn
              ? 'All wishes, AI visual details, breathing guides, and notes are automatically saved securely in your current browser. You can enjoy the full experience without Firebase login.'
              : '您的所有愿望清单、Gemini 具象化场景、SOHUM 呼吸记录与读书笔记均会自动保存在当前浏览器本地中，完全无需登录即可畅享全部功能！'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-amber-100/50 border border-amber-300/80 text-amber-950 text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            id="continue-guest-btn"
          >
            <span>🌟</span>
            <span>{isEn ? 'Continue in Local Private Mode (Enjoy Instantly)' : '直接以本地专属模式畅享（无需登录）'}</span>
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-1.5 text-xs text-rose-700 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
            <div className="text-[11px] text-rose-600/90 pl-6">
              💡 {isEn ? 'Tip: You can simply click "Continue in Local Private Mode" above to use all features offline.' : '提示：如果您无法操作 Firebase 控制台，点击上方「直接以本地专属模式畅享」即可无障碍使用全部功能。'}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-700 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google 1-Click Login */}
        {mode !== 'reset' && (
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-gray-50 border border-[#8e6d72]/20 text-[#4a3a3a] text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              id="google-signin-btn"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isEn ? 'Continue with Google (1-Click Sync)' : '使用 Google 账号一键快捷登录'}</span>
            </button>

            <div className="flex items-center gap-3 my-3">
              <div className="h-px flex-1 bg-[#8e6d72]/15" />
              <span className="text-[10px] text-[#b49196] font-medium uppercase tracking-wider">
                {isEn ? 'Or with email' : '或使用邮箱密码'}
              </span>
              <div className="h-px flex-1 bg-[#8e6d72]/15" />
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#8e6d72] block">
                {isEn ? 'Princess / User Nickname' : '称谓 / 用户昵称'}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-[#b49196]" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isEn ? 'e.g. Princess Seraphina' : '例如：静谧优雅公主'}
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-[#8e6d72]/20 bg-white/70 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#8e6d72] block">
              {isEn ? 'Email Address' : '邮箱地址'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#b49196]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isEn ? 'yourname@example.com' : '请输入您的常用邮箱'}
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-[#8e6d72]/20 bg-white/70 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#8e6d72] block">
                  {isEn ? 'Password' : '登录密码'}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[10px] text-[#8e6d72] hover:underline"
                  >
                    {isEn ? 'Forgot password?' : '忘记密码？'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#b49196]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEn ? '••••••••' : '请输入至少 6 位密码'}
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-[#8e6d72]/20 bg-white/70 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white font-sans text-xs font-bold shadow-lg shadow-pink-950/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            id="auth-submit-btn"
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {mode === 'signup'
                ? (isEn ? 'Create Account & Sync Wishes' : '注册并同步心愿')
                : mode === 'reset'
                ? (isEn ? 'Send Reset Link' : '发送重置密码邮件')
                : (isEn ? 'Sign In & Sync' : '立即登录并同步')}
            </span>
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-5 text-center text-xs text-[#6d5b5e]">
          {mode === 'signin' ? (
            <p>
              {isEn ? "Don't have an account yet? " : "还没有同步账号？ "}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="font-bold text-[#8e6d72] hover:underline cursor-pointer"
              >
                {isEn ? 'Create Free Account' : '免费注册'}
              </button>
            </p>
          ) : mode === 'signup' ? (
            <p>
              {isEn ? 'Already have an account? ' : '已有账号？ '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="font-bold text-[#8e6d72] hover:underline cursor-pointer"
              >
                {isEn ? 'Sign In' : '直接登录'}
              </button>
            </p>
          ) : (
            <p>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="font-bold text-[#8e6d72] hover:underline cursor-pointer"
              >
                {isEn ? 'Back to Sign In' : '返回登录'}
              </button>
            </p>
          )}
        </div>

        {/* Help / Guidance Box for Firebase Access */}
        <div className="mt-5 pt-4 border-t border-[#8e6d72]/15 text-[11px] text-[#6d5b5e] space-y-2">
          <div className="flex items-center justify-between text-[#8e6d72] font-semibold">
            <span className="flex items-center gap-1.5">
              <span>❓</span>
              <span>{isEn ? 'Cannot access Firebase Console?' : '无法进入 Firebase 控制台？'}</span>
            </span>
          </div>
          <div className="p-3 bg-white/50 rounded-xl border border-white/80 space-y-1.5 leading-relaxed text-[11px]">
            <p>
              {isEn ? (
                <>
                  1. <strong>Direct Console URL</strong>: Visit{' '}
                  <a
                    href="https://console.firebase.google.com/project/ai-studio-amandas-9d421796-4c85-46ba-95a4-a49027a3c54d"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8e6d72] underline font-semibold hover:text-black"
                  >
                    Firebase Console
                  </a>{' '}
                  with your developer Google account.
                </>
              ) : (
                <>
                  1. <strong>直达项目地址</strong>：请使用注册项目的 Google 账号（如 <code>zfm19990722@gmail.com</code>）访问{' '}
                  <a
                    href="https://console.firebase.google.com/project/ai-studio-amandas-9d421796-4c85-46ba-95a4-a49027a3c54d"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8e6d72] underline font-semibold hover:text-black"
                  >
                    Firebase 项目控制台链接
                  </a>。
                </>
              )}
            </p>
            <p>
              {isEn ? (
                <>
                  2. <strong>Network & Region</strong>: Firebase services may require network proxy access depending on your region.
                </>
              ) : (
                <>
                  2. <strong>网络环境原因</strong>：Firebase 控制台属于 Google 境外云服务，如处于国内网络环境需开启全局网络代理访问。
                </>
              )}
            </p>
            <p className="text-amber-800 font-medium pt-0.5">
              {isEn ? (
                <>
                  💡 <strong>Recommendation</strong>: You don't need Firebase console to use this app. Simply click "Continue in Local Private Mode" to store everything locally in your browser.
                </>
              ) : (
                <>
                  💡 <strong>最省心推荐</strong>：您<strong>完全无需配置 Firebase</strong>，直接点击上方「以本地专属模式畅享」，愿望、读书心得、冥想记录都会安全保存在浏览器本地，即开即用！
                </>
              )}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
