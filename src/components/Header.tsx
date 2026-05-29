import { Calendar, Clapperboard, RefreshCw } from "lucide-react";

interface HeaderProps {
  selectedDate: string; // Format: "YYYY-MM-DD"
  onDateChange: (newDate: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function Header({ selectedDate, onDateChange, isLoading, onRefresh }: HeaderProps) {
  // Format state from "YYYY-MM-DD" to human readable Korean date "2026년 05월 28일"
  const getFormattedKoreanDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 10) return "";
    const parts = dateStr.split("-");
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
  };

  // Prevent selecting future dates by setting the max date attribute to yesterday or today
  const getMaxDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get past dates formatted for quick selection
  const getPastDateString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const yesterdayStr = getPastDateString(1);
  const twoDaysAgoStr = getPastDateString(2);
  const threeDaysAgoStr = getPastDateString(3);
  const sevenDaysAgoStr = getPastDateString(7);

  const getQuickDateLabel = (dateStr: string, indexStr: string) => {
    const parts = dateStr.split("-");
    const md = `${parts[1]}.${parts[2]}`;
    return `${md} (${indexStr})`;
  };

  return (
    <header className="bg-cinema-black border-b border-white/5 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.8)]" id="app-header">
      {/* Primary Navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo & title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 bg-cinema-gold rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(245,197,24,0.3)] hover:rotate-6 transition-transform duration-200">
            <Clapperboard className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-white">
              KOBIS<span className="text-cinema-gold uppercase">BOX</span>
            </span>
            <span className="text-[9px] text-white/40 tracking-wider -mt-1 font-semibold">CINEMATIC REALTIME PLATFORM</span>
          </div>
        </div>

        {/* Global navigation tabs & API active status */}
        <div className="hidden md:flex items-center space-x-6 text-sm font-semibold tracking-wide text-white/50">
          <span className="text-cinema-gold font-bold hover:text-white transition-colors cursor-pointer">RANKING</span>
          <span className="hover:text-white transition-colors cursor-pointer">TRENDS</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center space-x-2 bg-white/15 border border-white/5 px-3 py-1.5 rounded-full text-white">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider font-mono">API SECURE ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Date timeline controller section */}
      <div className="bg-gradient-to-r from-neutral-950 via-[#0d0d0d] to-neutral-950 border-t border-white/5 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Target Date Labels or Timeline buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] text-cinema-gold font-bold uppercase tracking-widest mr-2">
            Target Date
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => onDateChange(yesterdayStr)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                selectedDate === yesterdayStr
                  ? "bg-cinema-gold text-black shadow-[0_0_15px_rgba(245,197,24,0.2)]"
                  : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              어제 ({yesterdayStr.substring(5)})
            </button>
            <button
              onClick={() => onDateChange(twoDaysAgoStr)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                selectedDate === twoDaysAgoStr
                  ? "bg-cinema-gold text-black shadow-[0_0_15px_rgba(245,197,24,0.25)]"
                  : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              2일 전
            </button>
            <button
              onClick={() => onDateChange(threeDaysAgoStr)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                selectedDate === threeDaysAgoStr
                  ? "bg-cinema-gold text-black shadow-[0_0_15px_rgba(245,197,24,0.25)]"
                  : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              3일 전
            </button>
            <button
              onClick={() => onDateChange(sevenDaysAgoStr)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                selectedDate === sevenDaysAgoStr
                  ? "bg-cinema-gold text-black shadow-[0_0_15px_rgba(245,197,24,0.25)]"
                  : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              1주 전
            </button>
          </div>
        </div>

        {/* Right detailed calendar & refresh pickers */}
        <div className="flex items-center gap-2 sm:self-end">
          {/* Custom elegant calendar wrapper */}
          <div className="relative flex items-center bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 hover:border-white/30 focus-within:border-cinema-gold focus-within:ring-2 focus-within:ring-cinema-gold/15 transition-all duration-200">
            <Calendar className="w-3.5 h-3.5 text-cinema-gold mr-2" />
            <input
              type="date"
              value={selectedDate}
              max={getMaxDateString()}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Refresh Action Trigger */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-150 disabled:opacity-40"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cinema-gold" : ""}`} />
          </button>
        </div>
      </div>

      {/* Selected dynamic alert subheader bar */}
      <div className="bg-cinema-gold/5 border-t border-white/5 py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cinema-gold animate-pulse" />
            <p className="text-[11px] text-white/70 font-medium font-sans">
              현재 <strong className="text-cinema-gold font-bold">{getFormattedKoreanDate(selectedDate)}</strong> 기준 서울 영진위 실시간 박스오피스 데이터를 분석 중입니다.
            </p>
          </div>
          <span className="text-[9px] text-[#F5C518]/60 font-mono font-bold tracking-wider hidden sm:inline">OFFICIAL SOURCE: KOBIS (KOREAN FILM COUNCIL)</span>
        </div>
      </div>
    </header>
  );
}

