import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Sparkles, Layers, Award, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import ThemeToggle from './ThemeToggle';
import ConfirmModal from './ConfirmModal';

export default function Navbar() {
  const { user, stats, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  const isDashboard = path === '/' || path.startsWith('/folders');
  const isFlashcards = path.startsWith('/flashcards');
  const isPractice = path.startsWith('/practice');

  return (
    <header className="sticky top-0 z-40 bg-header-theme backdrop-blur-md border-b border-theme shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 lg:gap-4 min-w-0">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="shrink-0">
              <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent block leading-tight">
                AntiEnglish
              </span>
              <span className="hidden xl:block text-[10px] text-theme-subtle font-medium leading-none">Học Từ Vựng Tiếng Anh</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 shrink-0">
            <Link
              to="/"
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                isDashboard
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-theme-muted hover:text-theme-main hover:bg-surface-hover'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Thư mục<span className="hidden xl:inline"> từ vựng</span></span>
            </Link>

            <Link
              to="/flashcards"
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                isFlashcards
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-theme-muted hover:text-theme-main hover:bg-surface-hover'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span><span className="hidden xl:inline">Học </span>Flashcard</span>
            </Link>

            <Link
              to="/practice"
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                isPractice
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-theme-muted hover:text-theme-main hover:bg-surface-hover'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Điền nghĩa<span className="hidden xl:inline"> & Bài tập</span></span>
            </Link>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 lg:space-x-3 shrink-0">
            {stats && (
              <div className="hidden lg:flex items-center space-x-2 bg-surface px-3 py-1.5 rounded-full border border-theme text-xs shrink-0 whitespace-nowrap shadow-xs">
                <span className="font-bold text-rose-400 flex items-center gap-1" title="Số từ chưa thuộc">
                  <span className="hidden xl:inline">Chưa thuộc:</span>
                  <span className="xl:hidden">❌</span>
                  <span>{stats.unmastered_cards !== undefined ? stats.unmastered_cards : (stats.total_cards - stats.mastered_cards)}</span>
                </span>
                <span className="text-theme-subtle">|</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1" title="Số từ đã thuộc">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Đã thuộc:</span>
                  <span>{stats.mastered_cards}/{stats.total_cards}</span>
                </span>
              </div>
            )}

            {/* Theme Toggle Selector */}
            <ThemeToggle />

            <div className="flex items-center space-x-2 pl-2 border-l border-theme shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden xl:block text-left shrink-0">
                  <p className="text-xs font-bold text-theme-main leading-none truncate max-w-[90px]">{user?.full_name || user?.username}</p>
                  <p className="text-[10px] text-theme-subtle leading-none mt-1 truncate max-w-[90px]">@{user?.username}</p>
                </div>
              </div>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Đăng xuất"
                className="p-1.5 sm:p-2 text-theme-subtle hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-theme bg-surface text-xs">
        <Link
          to="/"
          className={`flex flex-col items-center py-1 px-3 rounded-lg ${
            isDashboard ? 'text-indigo-400 font-bold' : 'text-theme-subtle'
          }`}
        >
          <Layers className="w-4 h-4 mb-1" />
          <span>Thư mục</span>
        </Link>
        <Link
          to="/flashcards"
          className={`flex flex-col items-center py-1 px-3 rounded-lg ${
            isFlashcards ? 'text-indigo-400 font-bold' : 'text-theme-subtle'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-1" />
          <span>Flashcard</span>
        </Link>
        <Link
          to="/practice"
          className={`flex flex-col items-center py-1 px-3 rounded-lg ${
            isPractice ? 'text-indigo-400 font-bold' : 'text-theme-subtle'
          }`}
        >
          <Award className="w-4 h-4 mb-1" />
          <span>Điền nghĩa</span>
        </Link>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không? Tiến trình học tập của bạn đã được đồng bộ an toàn trên hệ thống."
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        type="warning"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}
