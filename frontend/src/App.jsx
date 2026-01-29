import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AddPurchase } from './pages/AddPurchase';
import { PurchaseList } from './pages/PurchaseList';
import { ThemeProvider } from './context/ThemeContext';

function Layout({ children }) {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 overflow-auto flex flex-col">
                {/* Mobile Header */}
                <header className="md:hidden bg-slate-900 dark:bg-slate-950 text-white p-4 flex justify-between items-center sticky top-0 z-10 transition-colors duration-200">
                    <span className="font-bold tracking-wider">GROCERY</span>
                    {/* Menu button would go here */}
                </header>

                <main className="flex-1 p-4 md:p-8 w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/add" element={<AddPurchase />} />
                        <Route path="/purchases" element={<PurchaseList />} />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </ThemeProvider>
    )
}
export default App
