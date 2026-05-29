import { useState, useEffect } from "react";
import Header from "./components/Header";
import MovieDetailPanel from "./components/MovieDetailPanel";
import { DailyBoxOfficeItem, BoxOfficeResponse } from "./types";
import { TrendingUp, Award, Film, AlertCircle, PlayCircle, Eye, Users, ChevronUp, ChevronDown, ListFilter, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Setup default selected date string (Yesterday: YYYY-MM-DD input format)
  const getYesterdayDateString = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getYesterdayDateString());
  const [boxOfficeList, setBoxOfficeList] = useState<DailyBoxOfficeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMovieCd, setSelectedMovieCd] = useState<string | null>(null);
  const [selectedMovieNm, setSelectedMovieNm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Convert date format from YYYY-MM-DD to YYYYMMDD for KOBIS API
  const getApiFormattedDate = (dateStr: string) => {
    return dateStr.replace(/-/g, "");
  };

  const fetchBoxOffice = async (targetDate: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const apiDate = getApiFormattedDate(targetDate);
      const response = await fetch(`/api/boxoffice?date=${apiDate}`);
      if (!response.ok) {
        throw new Error("서버에서 박스오피스 데이터를 받아오지 못했습니다.");
      }
      const data: BoxOfficeResponse = await response.json();

      if (data.boxOfficeResult?.dailyBoxOfficeList) {
        const list = data.boxOfficeResult.dailyBoxOfficeList;
        setBoxOfficeList(list);
        if (list.length > 0) {
          // Default to select first movie (Rank #1) on load
          setSelectedMovieCd(list[0].movieCd);
          setSelectedMovieNm(list[0].movieNm);
        } else {
          setSelectedMovieCd(null);
          setSelectedMovieNm("");
        }
      } else {
        throw new Error("올바른 박스오피스 목록 형식이 아닙니다.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "오류가 발생했습니다.");
      setBoxOfficeList([]);
      setSelectedMovieCd(null);
      setSelectedMovieNm("");
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch box office whenever selected date changes
  useEffect(() => {
    fetchBoxOffice(selectedDate);
  }, [selectedDate]);

  // Handle refresh action
  const handleRefresh = () => {
    fetchBoxOffice(selectedDate);
  };

  // Format big numbers with comma string (e.g., 20120150 -> "20,120,150")
  const formatNumber = (numStr: string) => {
    const val = parseInt(numStr, 10);
    if (isNaN(val)) return "0";
    return val.toLocaleString();
  };

  // Parse Rank intensity display
  const renderRankChange = (item: DailyBoxOfficeItem) => {
    if (item.rankOldAndNew === "NEW") {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-white motion-safe:animate-bounce">
          NEW
        </span>
      );
    }

    const value = parseInt(item.rankInten, 10);
    if (value > 0) {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-red-500 font-mono">
          <ChevronUp className="w-3.5 h-3.5" />
          {value}
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-blue-500 font-mono">
          <ChevronDown className="w-3.5 h-3.5" />
          {Math.abs(value)}
        </span>
      );
    }

    return <span className="text-gray-400 text-xs font-mono font-medium">-</span>;
  };

  // Filter movies in state based on title search
  const filteredBoxOffice = boxOfficeList.filter((movie) =>
    movie.movieNm.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculations for dynamic general dashboard overview cards
  const totalDailyAudience = boxOfficeList.reduce(
    (acc, m) => acc + parseInt(m.audiCnt, 10),
    0
  );
  
  const topMovie = boxOfficeList.length > 0 ? boxOfficeList[0] : null;

  return (
    <div className="min-h-screen bg-cinema-black text-white flex flex-col font-sans" id="box-office-app">
      {/* Brand Header & Date Controls */}
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Dynamic Highlight/Metric Cards */}
        {boxOfficeList.length > 0 && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-summary">
            {/* Metric Card 1: Total Spectators */}
            <div className="glass-card p-5 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
              <div>
                <span className="text-xs text-white/40 font-black uppercase tracking-widest block">총 박스오피스 관객수</span>
                <span className="text-2xl font-black text-white mt-1 block font-sans">
                  {formatNumber(String(totalDailyAudience))} 명
                </span>
              </div>
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-cinema-gold">
                <Users className="w-5.5 h-5.5" />
              </div>
            </div>

            {/* Metric Card 2: Highest Grossing Movie */}
            <div className="glass-card p-5 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
              <div>
                <span className="text-xs text-white/40 font-black uppercase tracking-widest block">일일 관객수 1위</span>
                <span className="text-xl font-black text-cinema-gold truncate max-w-[190px] mt-1.5 block">
                  {topMovie ? topMovie.movieNm : "데이터 없음"}
                </span>
              </div>
              <div className="w-12 h-12 bg-cinema-gold/10 border border-cinema-gold/20 rounded-xl flex items-center justify-center text-cinema-gold">
                <Award className="w-5.5 h-5.5" />
              </div>
            </div>

            {/* Metric Card 3: Top Sales Share */}
            <div className="glass-card p-5 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
              <div>
                <span className="text-xs text-white/40 font-black uppercase tracking-widest block">1위 매출액 점유율</span>
                <span className="text-2xl font-black text-cinema-gold mt-1 block font-sans animate-pulse">
                  {topMovie ? `${topMovie.salesShare}%` : "0%"}
                </span>
              </div>
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-cinema-gold">
                <TrendingUp className="w-5.5 h-5.5" />
              </div>
            </div>
          </div>
        )}

        {/* Master-Detail Page Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Master Box Office List Column */}
          <div className="lg:col-span-7 space-y-4" id="box-office-master-column">
            {/* List Controls card */}
            <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Film className="w-4.5 h-4.5 text-cinema-gold" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  일일 상위 10위 박스오피스 리스트
                </h3>
              </div>
              
              {/* Box office inline search */}
              <div className="relative flex items-center bg-white/5 border border-white/10 hover:border-white/20 focus-within:border-cinema-gold/60 focus-within:bg-white/10 rounded-xl px-3.5 py-1.5 transition-all duration-200">
                <ListFilter className="w-3.5 h-3.5 text-white/40 mr-2" />
                <input
                  type="text"
                  placeholder="작명/제목 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-white/25"
                />
              </div>
            </div>

            {/* Main Listing Viewport */}
            <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-32 flex flex-col items-center justify-center"
                    key="listing-loading"
                  >
                    <div className="w-10 h-10 border-3 border-cinema-gold/10 border-t-cinema-gold rounded-full animate-spin mb-4" />
                    <p className="text-white/50 text-xs font-semibold">실시간 집계 영화 순위를 동기화하는 중...</p>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-16 px-6 text-center flex flex-col items-center justify-center"
                    key="listing-error"
                  >
                    <AlertCircle className="w-12 h-12 text-red-500 mb-3 stroke-[1.5]" />
                    <h4 className="text-base font-bold text-white mb-1">데이터 동기화 실패</h4>
                    <p className="text-white/50 text-xs max-w-sm mb-4 leading-relaxed">{error}</p>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-cinema-gold hover:bg-amber-500 text-black rounded-xl text-xs font-black shadow-lg shadow-cinema-gold/10 active:scale-95 transition-all duration-150"
                    >
                      박스오피스 다시 로드
                    </button>
                  </motion.div>
                ) : filteredBoxOffice.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-20 px-6 text-center text-white/40 flex flex-col items-center justify-center"
                    key="listing-empty"
                  >
                    <Film className="w-10 h-10 text-white/20 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-white/80">해당하는 조회 영화가 존재하지 않습니다.</p>
                    <p className="text-xs text-white/40 mt-1 max-w-[280px] leading-relaxed">선택 날짜를 변경하시거나 검색어를 다시 조율해 주시기 바랍니다.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-x-auto"
                    key="listing-table"
                  >
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-black text-white/40 uppercase tracking-widest">
                          <th className="py-4 px-4 text-center w-20">RANK</th>
                          <th className="py-4 px-3">TITLE / RELEASE INFO</th>
                          <th className="py-4 px-3 text-right hidden sm:table-cell">DAILY VIEW</th>
                          <th className="py-4 px-3 text-right hidden md:table-cell font-sans">ACCUMULATED</th>
                          <th className="py-4 px-4 text-right w-24">SALES %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredBoxOffice.map((movie, idx) => {
                          const isSelected = selectedMovieCd === movie.movieCd;
                          const rankNum = parseInt(movie.rank, 10);
                          
                          // Style rank badge dynamically based on top ranks in Immersive style
                          const getRankColorClasses = (rankVal: number) => {
                            if (rankVal === 1) return "text-cinema-gold font-black";
                            if (rankVal === 2) return "text-white/90";
                            if (rankVal === 3) return "text-white/85";
                            return "text-white/50";
                          };

                          return (
                            <tr
                              key={movie.movieCd}
                              onClick={() => {
                                setSelectedMovieCd(movie.movieCd);
                                setSelectedMovieNm(movie.movieNm);
                                // Scroll gracefully on mobile view to the detail panel
                                if (window.innerWidth < 1024) {
                                  document.getElementById("movie-detail-panel")?.scrollIntoView({ behavior: "smooth" });
                                }
                              }}
                              className={`group cursor-pointer transition-all duration-200 relative ${
                                isSelected
                                  ? "bg-white/[0.04] border-l-2 border-cinema-gold"
                                  : "hover:bg-white/[0.02]"
                              }`}
                            >
                              {/* Rank */}
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`rank-number text-3xl font-black ${getRankColorClasses(rankNum)}`}>
                                    {movie.rank.padStart(2, "0")}
                                  </span>
                                  <div className="flex items-center h-4">
                                    {renderRankChange(movie)}
                                  </div>
                                </div>
                              </td>

                              {/* Title / Release Date */}
                              <td className="py-4 px-3">
                                <div>
                                  <p className="font-bold text-white group-hover:text-cinema-gold transition-colors duration-150 leading-snug">
                                    {movie.movieNm}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] font-bold text-white/40 font-mono">
                                    <span>개봉: {movie.openDt}</span>
                                    <span className="hidden sm:inline text-white/10">|</span>
                                    <span className="sm:hidden text-cinema-gold">관객: {formatNumber(movie.audiCnt)}명</span>
                                  </div>
                                </div>
                              </td>

                              {/* Daily Viewers */}
                              <td className="py-4 px-3 text-right text-white/80 font-bold font-sans text-xs hidden sm:table-cell">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Eye className="w-3.5 h-3.5 text-white/30 stroke-[1.5]" />
                                  <span>{formatNumber(movie.audiCnt)} 명</span>
                                </div>
                              </td>

                              {/* Acc. Viewers */}
                              <td className="py-4 px-3 text-right text-white/40 text-xs hidden md:table-cell font-sans font-medium">
                                <div>{formatNumber(movie.audiAcc)} 명</div>
                              </td>

                              {/* Sales Share % with dynamic overlay bar */}
                              <td className="py-4 px-4 text-right">
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className="text-xs font-black text-white/80 font-mono leading-none">
                                    {movie.salesShare}%
                                  </span>
                                  <div className="w-16 bg-white/10 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-amber-500 to-cinema-gold h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(parseFloat(movie.salesShare) || 0, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Detailed View Panel Column (Master-Detail target) */}
          <div className="lg:col-span-5 h-full lg:sticky lg:top-[160px]">
            <MovieDetailPanel
              movieCd={selectedMovieCd}
              movieNm={selectedMovieNm}
            />
          </div>

        </div>
      </main>

      {/* App Footer */}
      <footer className="bg-white/[0.02] border-t border-white/5 mt-16 py-10 text-center text-white/20 text-[10px] font-bold uppercase tracking-widest">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>Data provided in real-time by Korean Film Council (KOBIS)</p>
          <p>© {new Date().getFullYear()} Cinematic Data Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
