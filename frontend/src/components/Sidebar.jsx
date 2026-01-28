import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Image as ImageIcon, LogOut, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';

export function Sidebar() {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Add Purchase', path: '/add', icon: PlusCircle },
        { name: 'History & Compare', path: '/purchases', icon: List },
    ];

    return (
        <div className="w-64 bg-slate-900 dark:bg-slate-950 text-white min-h-screen p-4 flex flex-col hidden md:flex border-r border-slate-800 transition-colors duration-200">
            <h1 className="text-2xl font-bold mb-8 text-center text-blue-400 tracking-wider">GROCERY</h1>
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-blue-600/20 text-blue-400 font-medium"
                                    : "text-gray-400 hover:bg-slate-800 dark:hover:bg-slate-900 hover:text-white"
                            )}
                        >
                            <Icon size={20} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-slate-800 dark:hover:bg-slate-900 hover:text-white transition-all duration-200 mb-2"
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>

            {/* Mobile disclaimer or footer */}
            <div className="p-4 text-xs text-center text-gray-600">
                v1.1.0
            </div>
        </div>
    );
}
