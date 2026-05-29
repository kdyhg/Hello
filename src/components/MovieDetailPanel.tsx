import { useState, useEffect } from "react";
import { MovieInfo, MovieDetailResponse } from "../types";
import { Film, User, MapPin, Users, Activity, Tag, ShieldAlert, Award, Sparkles, Copy, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MovieDetailPanelProps {
  movieCd: string | null;
  movieNm: string;
}

interface GeneratedReview {
  headline: string;
  review: string;
  rating: string;
  keyword: string;
  userDraft: string;
  savedAt: string;
}

export default function MovieDetailPanel({ movieCd, movieNm }: MovieDetailPanelProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [detail, setDetail] = useState<MovieInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Review States
  const [userDraft, setUserDraft] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedReview, setGeneratedReview] = useState<GeneratedReview | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!movieCd) {
      setDetail(null);
      return;
    }

    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/movie?movieCd=${movieCd}`);
        if (!response.ok) {
          throw new Error("영화 정보를 불러오지 못했습니다.");
        }
        const data: MovieDetailResponse = await response.json();
        if (data.movieInfoResult?.movieInfo) {
          setDetail(data.movieInfoResult.movieInfo);
        } else {
          throw new Error("영화 정보가 존재하지 않습니다.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [movieCd]);

  // Sync with LocalStorage on movieCd changes
  useEffect(() => {
    if (!movieCd) {
      setGeneratedReview(null);
      setUserDraft("");
      setGenError(null);
      return;
    }

    const key = `movie_review_${movieCd}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGeneratedReview(parsed);
        setUserDraft(parsed.userDraft || "");
      } catch (e) {
        // ignore
      }
    } else {
      setGeneratedReview(null);
      setUserDraft("");
    }
    setGenError(null);
    setCopied(false);
  }, [movieCd]);

  // Handle Generate with AI
  const handleGenerateReview = async () => {
    if (!movieCd || !userDraft.trim() || !detail) return;

    setGenerating(true);
    setGenError(null);

    const directorsStr = detail.directors?.map((d) => d.peopleNm).join(", ") || "";
    const genresStr = detail.genres?.map((g) => g.genreNm).join(", ") || "";
    const releaseDateStr = detail.openDt
      ? `${detail.openDt.substring(0, 4)}.${detail.openDt.substring(4, 6)}.${detail.openDt.substring(6, 8)}`
      : "";

    try {
      const response = await fetch("/api/review/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieNm: detail.movieNm,
          userThoughts: userDraft,
          directors: directorsStr,
          genres: genresStr,
          releaseDate: releaseDateStr,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "감상평 생성 과정에서 장애가 발생했습니다.");
      }

      const data = await response.json();

      const newReview: GeneratedReview = {
        headline: data.headline || `${detail.movieNm}을 감상하고`,
        review: data.review || "상세평 작성이 완료되었습니다.",
        rating: data.rating || "★ 4.0 / 5.0",
        keyword: data.keyword || "비평",
        userDraft: userDraft,
        savedAt: new Date().toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setGeneratedReview(newReview);
      localStorage.setItem(`movie_review_${movieCd}`, JSON.stringify(newReview));
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || "평론 서버와 통신 중 장애가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setGenerating(false);
    }
  };

  // Copy helper
  const handleCopyReview = () => {
    if (!generatedReview) return;
    const fullText = `[${detail?.movieNm || movieNm} 영화 감상평]\n평점: ${generatedReview.rating}\n제목: "${generatedReview.headline}"\n\n${generatedReview.review}\n\n- (AI 시네마 비평 시스템 생성)`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Delete/Reset helper
  const handleDeleteReview = () => {
    localStorage.removeItem(`movie_review_${movieCd}`);
    setGeneratedReview(null);
    setUserDraft("");
    setGenError(null);
  };

  if (!movieCd) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border border-white/10 rounded-3xl glass-card text-white/30">
        <Film className="w-12 h-12 text-cinema-gold/40 mb-4 stroke-[1.5] animate-pulse" />
        <p className="text-white font-semibold text-base">영화 정보가 선택되지 않았습니다</p>
        <p className="text-white/40 text-xs mt-1.5 max-w-[280px] leading-relaxed">
          왼쪽 실시간 박스오피스 리스트에서 원하는 영화를 선택하시면 상세 내역을 이곳에서 확인하실 수 있습니다.
        </p>
      </div>
    );
  }

  // Format running time
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "시간 정보 없음";
    const mins = parseInt(timeStr, 10);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}시간 ${m}분` : `${m}분`;
  };

  // Get age rating badge styling
  const getWatchGradeBadge = (grade?: string) => {
    if (!grade) return { style: "bg-white/10 text-white/70 border border-white/10", label: "정보없음" };
    if (grade.includes("전체")) return { style: "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30", label: "전체관람가" };
    if (grade.includes("12")) return { style: "bg-blue-950/80 text-blue-300 border border-blue-500/30", label: "12세이상관람가" };
    if (grade.includes("15")) return { style: "bg-amber-950/80 text-amber-300 border border-amber-500/30", label: "15세이상관람가" };
    if (grade.includes("청소년") || grade.includes("18") || grade.includes("미성년")) {
      return { style: "bg-red-950/80 text-red-300 border border-red-500/30", label: "청불" };
    }
    return { style: "bg-white/10 text-white border border-white/25", label: grade };
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden h-full flex flex-col cinema-shadow-glow" id="movie-detail-panel">
      {/* Premium cinema top accent line */}
      <div className="h-1 bg-gradient-to-r from-cinema-gold via-amber-500 to-amber-200" />
      
      <div className="p-7 flex-1 overflow-y-auto space-y-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-32 flex flex-col items-center justify-center"
              key="loading"
            >
              <div className="w-9 h-9 border-3 border-cinema-gold/10 border-t-cinema-gold rounded-full animate-spin mb-4" />
              <p className="text-white/50 text-xs font-semibold">영화 수집 제원을 다듬는 중...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 flex flex-col items-center justify-center text-center p-4"
              key="error"
            >
              <ShieldAlert className="w-12 h-12 text-red-400 mb-3 stroke-[1.5]" />
              <p className="text-white font-bold mb-1">상세 데이터 연동 실패</p>
              <p className="text-red-400/80 text-xs max-w-sm">{error}</p>
              <p className="text-white/30 text-[10px] mt-4">영진위 API 트래픽 문제일 수 있습니다.</p>
            </motion.div>
          ) : detail ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
              key="content"
            >
              {/* Title Header */}
              <div className="relative">
                <div className="absolute right-0 top-0 text-white/5 font-mono text-7xl font-black select-none pointer-events-none tracking-tighter">
                  KOBIS
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-white/5 border border-white/10 text-cinema-gold font-mono mb-2.5">
                  CODE {detail.movieCd}
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                  {detail.movieNm}
                </h2>
                {detail.movieNmEn && (
                  <p className="text-white/40 text-[13px] font-bold mt-1.5 font-sans flex items-center gap-2">
                    <span>{detail.movieNmEn}</span>
                    {detail.prdtYear && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-white/30 font-medium">{detail.prdtYear}년 제작</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Badges Info row */}
              <div className="flex flex-wrap gap-2 pt-1">
                {detail.audits && detail.audits.length > 0 && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold leading-none flex items-center ${getWatchGradeBadge(detail.audits[0].watchGradeNm).style}`}>
                    {getWatchGradeBadge(detail.audits[0].watchGradeNm).label}
                  </span>
                )}
                {detail.typeNm && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold leading-none bg-white/5 text-white/80 border border-white/10">
                    {detail.typeNm}
                  </span>
                )}
                {detail.showTm && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold leading-none bg-white/5 text-cinema-gold/90 border border-cinema-gold/15">
                    {formatTime(detail.showTm)}
                  </span>
                )}
                {detail.statusNm && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold leading-none bg-cinema-gold/10 text-cinema-gold border border-cinema-gold/20">
                    {detail.statusNm}
                  </span>
                )}
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Metadata details Grid block */}
              <div className="grid grid-cols-2 gap-3">
                {/* Director */}
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    <User className="w-3.5 h-3.5 text-cinema-gold" />
                    <span>Director</span>
                  </div>
                  <p className="text-white font-bold text-sm truncate">
                    {detail.directors && detail.directors.length > 0
                      ? detail.directors.map((d) => d.peopleNm).join(", ")
                      : "감독 없음"}
                  </p>
                </div>

                {/* Genre */}
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-cinema-gold" />
                    <span>Genre</span>
                  </div>
                  <p className="text-white font-bold text-sm truncate">
                    {detail.genres && detail.genres.length > 0
                      ? detail.genres.map((g) => g.genreNm).join(", ")
                      : "장르 정보 없음"}
                  </p>
                </div>

                {/* Nation */}
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cinema-gold" />
                    <span>Country</span>
                  </div>
                  <p className="text-white font-bold text-sm truncate">
                    {detail.nations && detail.nations.length > 0
                      ? detail.nations.map((n) => n.nationNm).join(", ")
                      : "국가 정보 없음"}
                  </p>
                </div>

                {/* Release Date */}
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    <Activity className="w-3.5 h-3.5 text-cinema-gold" />
                    <span>Released</span>
                  </div>
                  <p className="text-white font-bold text-sm font-sans tracking-wide">
                    {detail.openDt
                      ? `${detail.openDt.substring(0, 4)}.${detail.openDt.substring(4, 6)}.${detail.openDt.substring(6, 8)}`
                      : "개봉 정보 없음"}
                  </p>
                </div>
              </div>

              {/* Actors Casting list */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-cinema-gold uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-cinema-gold" />
                  <h4>Casting Members</h4>
                </div>
                {detail.actors && detail.actors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {detail.actors.slice(0, 8).map((actor, idx) => (
                      <div key={idx} className="flex flex-col p-2.5 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-colors">
                        <span className="font-bold text-[13px] text-white/90 truncate">{actor.peopleNm}</span>
                        {actor.cast ? (
                          <span className="text-white/30 text-[10px] mt-0.5 truncate font-medium">배역: {actor.cast}</span>
                        ) : (
                          <span className="text-white/20 text-[10px] mt-0.5 truncate font-medium">Cast</span>
                        )}
                      </div>
                    ))}
                    {detail.actors.length > 8 && (
                      <div className="text-[10px] text-white/30 italic py-1 col-span-2 text-center bg-white/[0.01] border border-white/5 rounded-lg">
                        외 {detail.actors.length - 8}명의 배우가 추가 등록되어 있습니다.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-white/30 text-xs bg-white/[0.01] border border-white/5 p-4 rounded-xl text-center">등록된 캐스팅 배우가 존재하지 않습니다.</p>
                )}
              </div>

              {/* Production Companies */}
              {detail.companys && detail.companys.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-black text-cinema-gold uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5 text-cinema-gold" />
                    <h4>Production Companies</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.companys.slice(0, 4).map((c, idx) => (
                      <span key={idx} className="px-2.5 py-1 text-[11px] font-medium text-white/70 bg-white/5 border border-white/5 rounded-lg">
                        {c.companyNm} <span className="text-white/30 text-[9px]/none">({c.companyPartNm})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="h-[1px] bg-white/5" />

              {/* AI Critic Section */}
              <div className="space-y-4" id="ai-critic-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-cinema-gold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-cinema-gold animate-pulse" />
                    <h4>AI 클래식 평론가 관제소</h4>
                  </div>
                  {generatedReview && (
                    <button
                      onClick={handleDeleteReview}
                      className="text-white/30 hover:text-red-400 text-[10px] uppercase font-black tracking-widest flex items-center gap-1 transition-colors duration-150 cursor-pointer"
                      title="감상평 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                      초기화
                    </button>
                  )}
                </div>

                {!generatedReview ? (
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/50 block">나만의 감상평 초안 쓰기</label>
                      <textarea
                        value={userDraft}
                        onChange={(e) => {
                          setUserDraft(e.target.value);
                          setGenError(null);
                        }}
                        placeholder="이 영화의 연기력, 연출, 스토리, 반전 등에 대한 짤막한 초안이나 키워드를 편하게 남겨보세요. (예: 배우 연기가 숨 막히고 사운드 배경이 압도적이었어!)"
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cinema-gold/40 focus:bg-white/[0.08] transition-all resize-none leading-relaxed"
                      />
                    </div>

                    {genError && (
                      <p className="text-red-400 text-[11px] bg-red-950/20 border border-red-500/10 px-3 py-2 rounded-lg leading-snug">
                        {genError}
                      </p>
                    )}

                    <button
                      onClick={handleGenerateReview}
                      disabled={generating || !userDraft.trim()}
                      className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                        generating 
                          ? "bg-white/5 text-white/40 cursor-not-allowed border border-white/5"
                          : !userDraft.trim()
                          ? "bg-white/[0.02] text-white/20 cursor-not-allowed border border-white/5"
                          : "bg-gradient-to-r from-amber-500 to-cinema-gold hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-cinema-gold/5 active:scale-[0.98]"
                      }`}
                    >
                      {generating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>AI가 고급 해설평으로 확장 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI 명품 감상평 작성기 가동</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Expanded review display card */
                  <div className="bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                    {/* Background decor keyword */}
                    <div className="absolute right-3 top-3 px-2 py-0.5 rounded bg-cinema-gold/10 border border-cinema-gold/20 text-[9px] font-black text-cinema-gold tracking-wide uppercase select-none">
                      #{generatedReview.keyword || "영화비평"}
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-cinema-gold/60 uppercase tracking-widest flex items-center gap-1">
                        <span>AI CRITICIZED RATING:</span>
                        <span className="text-cinema-gold font-black">{generatedReview.rating}</span>
                      </div>
                      <h5 className="text-base font-black text-white tracking-tight pt-1 leading-snug">
                        "{generatedReview.headline}"
                      </h5>
                    </div>

                    <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                      {generatedReview.review}
                    </p>

                    <div className="pt-2 h-[1px] bg-white/5" />

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-white/30 font-sans">
                        작성: {generatedReview.savedAt}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyReview}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">복사 완료</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>감상평 복사</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            // Allow rewriting keeping local draft
                            setGeneratedReview(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cinema-gold/10 hover:bg-cinema-gold/20 active:scale-95 text-cinema-gold text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          수정하기
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/20 text-xs">
              세부 정보 로드 실패
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

