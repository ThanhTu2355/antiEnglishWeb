import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, User, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register(username.trim(), email.trim(), password, fullName.trim());
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-app relative overflow-hidden transition-colors duration-200">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface border border-theme rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/25">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-theme-main tracking-tight">Tạo tài khoản mới</h1>
          <p className="text-sm text-theme-subtle mt-1 font-medium">Bắt đầu hành trình chinh phục từ vựng tiếng Anh</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-400 text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Họ và tên
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Tên đăng nhập <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: user123"
                className="w-full pl-10 pr-4 py-2 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Địa chỉ Email <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: user@example.com"
                className="w-full pl-10 pr-4 py-2 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Mật khẩu <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-4 py-2 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Xác nhận mật khẩu <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu vừa đặt"
                className="w-full pl-10 pr-4 py-2 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 mt-4"
          >
            <span>{loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-theme-subtle">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
