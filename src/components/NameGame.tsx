"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canonicalize } from '../lib/canonicalize';
import { loadNames } from '../lib/loadNames';
import { track } from '@/lib/analytics';

interface AcceptedName {
    key: string;
    display: string;
    timestamp: number;
}

type FeedbackType = 'success' | 'duplicate' | 'invalid' | 'time' | 'already' | 'loading' | '';

const TOTAL_TARGET = 100;
const START_SECONDS = 600; // 10 minutes

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export const NameGame: React.FC = () => {
    const [nameMap, setNameMap] = useState<Map<string, string> | null>(null);
    const [input, setInput] = useState('');
    const [accepted, setAccepted] = useState<AcceptedName[]>([]);
    const [feedback, setFeedback] = useState<{ type: FeedbackType; msg: string }>({ type: 'loading', msg: 'Loading names...' });
    const [started, setStarted] = useState<number | null>(null);
    const [remaining, setRemaining] = useState(START_SECONDS);
    const [finished, setFinished] = useState(false);
    const [win, setWin] = useState(false);
    const intervalRef = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [bestScore, setBestScore] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const v = localStorage.getItem('bestScore');
        return v ? parseInt(v) : 0;
    });
    const [bestTime, setBestTime] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        const v = localStorage.getItem('bestTime');
        return v ? parseInt(v) : null;
    });
    const [showInfo, setShowInfo] = useState(false);
    const infoDialogRef = useRef<HTMLDivElement | null>(null);
    const resultDialogRef = useRef<HTMLDivElement | null>(null);
    const liveFeedbackRef = useRef<HTMLDivElement | null>(null); // for screen reader announcements

    // load names
    useEffect(() => {
        let active = true;
        loadNames().then(map => {
            if (!active) return;
            setNameMap(map);
            setFeedback({ type: '', msg: '' });
            track('names_loaded', { count: map.size });
        }).catch(err => {
            console.error(err);
            setFeedback({ type: 'invalid', msg: 'Failed to load names' });
            track('names_load_error');
        });
        return () => { active = false; };
    }, []);

    const acceptedKeys = useMemo(() => new Set(accepted.map(a => a.key)), [accepted]);

    // timer effect with drift correction
    useEffect(() => {
        if (finished) return;
        if (started == null) return; // only starts on first verify attempt (successful or not)
        if (intervalRef.current != null) return;
        intervalRef.current = window.setInterval(() => {
            if (started == null) return;
            const elapsed = Math.floor((Date.now() - started) / 1000);
            const rem = START_SECONDS - elapsed;
            if (rem <= 0) {
                setRemaining(0);
                setFinished(true);
                setWin(false);
                setFeedback({ type: 'time', msg: 'Time\'s up!' });
                window.clearInterval(intervalRef.current!);
                intervalRef.current = null;
            } else {
                setRemaining(rem);
            }
        }, 1000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [started, finished]);

    const handleVerify = useCallback(() => {
        if (!nameMap) return;
        if (finished) return;
        const raw = input.trim();
        if (!raw) return;
        if (started == null) setStarted(Date.now()); // start timer on first attempt
        const key = canonicalize(raw);
        if (!nameMap.has(key)) {
            setFeedback({ type: 'invalid', msg: 'Not found' });
            track('name_invalid', { value: raw });
            return;
        }
        if (acceptedKeys.has(key)) {
            setFeedback({ type: 'duplicate', msg: 'Already entered' });
            track('name_duplicate', { key });
            return;
        }
        // accept
        const fullName = nameMap.get(key)!;
        setAccepted(prev => [{ key, display: fullName, timestamp: Date.now() }, ...prev]);
        track('name_accepted', { key, display: fullName, total: accepted.length + 1 });
        setFeedback({ type: 'success', msg: "" });
        setInput('');
        inputRef.current?.focus();
    }, [input, nameMap, acceptedKeys, finished, started, accepted.length]);

    const progress = accepted.length;
    const percent = Math.min(100, (progress / TOTAL_TARGET) * 100);

    const restart = useCallback(() => {
        const previousCount = accepted.length;
        const previousWin = win;
        const timeTaken = START_SECONDS - remaining;
        track('game_reset', { previousCount, previousWin, timeTaken });
        setInput('');
        setAccepted([]);
        setFeedback({ type: '', msg: '' });
        setStarted(null);
        setRemaining(START_SECONDS);
        setFinished(false);
        setWin(false);
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [accepted.length, win, remaining]);

    const share = async () => {
        const url = window.location.href;
        const text = win ? `I named 100 women in ${formatTime(START_SECONDS - remaining)}!` : `I named ${progress} women. Can you name 100?`;
        track('share_click', { win, progress, time: START_SECONDS - remaining });
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Oh, you like women? Name 100 Women', text, url });
                track('share_native_success');
            } catch {
                track('share_native_cancel');
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                setFeedback({ type: 'success', msg: 'Link copied to clipboard' });
                track('share_clipboard_success');
            } catch {
                alert('Copy this link: ' + url);
                track('share_clipboard_fail');
            }
        }
    };

    // Add keyboard shortcut for Reset (R) outside of the input field
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'r') {
                // avoid triggering while typing in the input
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;
                e.preventDefault();
                restart();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [restart]);

    useEffect(() => { inputRef.current?.focus(); }, [restart]);

    useEffect(() => {
        if (started != null && accepted.length === 0) {
            track('game_started');
        }
    }, [started, accepted.length]);

    useEffect(() => {
        if (accepted.length === TOTAL_TARGET && !finished) {
            setFinished(true);
            setWin(true);
            const timeTaken = START_SECONDS - remaining;
            setFeedback({ type: 'success', msg: `You did it in ${formatTime(timeTaken)}!` });
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            // persist stats
            if (accepted.length > bestScore) {
                setBestScore(accepted.length);
                localStorage.setItem('bestScore', String(accepted.length));
            }
            if (!bestTime || timeTaken < bestTime) {
                setBestTime(timeTaken);
                localStorage.setItem('bestTime', String(timeTaken));
            }
            track('game_win', { timeTaken, bestScore: accepted.length, bestTime: timeTaken });
        }
    }, [accepted, finished, remaining, bestScore, bestTime]);

    // Move focus into info dialog when opened
    useEffect(() => {
        if (showInfo) {
            // delay to ensure in DOM
            setTimeout(() => {
                infoDialogRef.current?.focus();
            }, 0);
        }
    }, [showInfo]);

    // Focus result dialog when game finished
    useEffect(() => {
        if (finished) {
            setTimeout(() => {
                resultDialogRef.current?.focus();
            }, 0);
        }
    }, [finished]);

    // ESC key handling for dialogs
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showInfo) {
                    e.preventDefault();
                    setShowInfo(false);
                    return;
                }
                if (finished) {
                    e.preventDefault();
                    // do not auto-reset; just close share dialog not provided; ignore
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showInfo, finished]);

    // Announce non-empty feedback messages explicitly
    useEffect(() => {
        if (feedback.msg && liveFeedbackRef.current) {
            liveFeedbackRef.current.textContent = feedback.msg;
        }
    }, [feedback]);

    return (
        <section id="game" className="game-shell max-w-4xl mx-auto p-4 pb-12 flex flex-col min-h-screen">
            <header className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-4 relative">
                <div className="flex items-center gap-2">
                    <h1 className="h2 font-semibold tracking-tight m-0">Name 100 Women</h1>
                    <button
                        type="button"
                        onClick={() => { setShowInfo(o => { const n = !o; if (!o && typeof track === 'function') track('info_open'); return n; }); }}
                        aria-label="How to play"
                        aria-haspopup="dialog"
                        aria-expanded={showInfo}
                        aria-controls="game-info-panel"
                        className="w-6 h-6 inline-flex items-center justify-center rounded-full border border-[oklch(70%_0.05_340)] text-[oklch(40%_0.153_2.432)] text-xs font-bold hover:bg-[oklch(95%_0.03_340)] focus:outline-none focus:ring-2 focus:ring-[oklch(55%_0.2_340)]"
                    >i<span className="sr-only"> How to play</span></button>
                </div>
                <div className="text-2xl font-mono tabular-nums px-4 py-2 rounded var(--radius-box) bg-[oklch(94%_0.028_342.258)]" aria-live="polite" aria-label="Time remaining">{formatTime(remaining)}</div>
                {showInfo && (
                    <div
                        id="game-info-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-label="How to play"
                        ref={infoDialogRef}
                        tabIndex={-1}
                        className="absolute z-20 top-full left-0 mt-2 max-w-sm p-4 rounded-xl border border-[oklch(89%_0.061_343.231)] bg-white shadow-lg text-sm leading-snug space-y-2 focus:outline-none"
                    >
                        <p id="howto-objective"><strong>Objective:</strong> Name 100 famous / influential women within 10 minutes to win.</p>
                        <ul className="list-disc pl-5 space-y-1" aria-describedby="howto-objective">
                            <li>Timer starts on first submission.</li>
                            <li>Type a full name then press Enter or Verify.</li>
                            <li>Duplicates don&apos;t count.</li>
                            <li>Reset anytime with the R key.</li>
                            <li>Press Escape to close this panel.</li>
                        </ul>
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => setShowInfo(false)}
                                className="text-xs font-medium px-2 py-1 rounded border border-[oklch(80%_0.04_340)] hover:bg-[oklch(95%_0.03_340)]"
                            >Close</button>
                        </div>
                    </div>
                )}
            </header>
            <p id="nameInputHelp" className="sr-only">Enter the full name of a notable woman. Press Enter or the Verify button to submit.</p>
            <form className="flex flex-col sm:flex-row gap-3 items-stretch game-input-wrapper" aria-label="Input section" onSubmit={e => { e.preventDefault(); handleVerify(); }}>
                <div className="field flex-1">
                    <label htmlFor="nameInput">Enter a name</label>
                    <input
                        id="nameInput"
                        ref={inputRef}
                        type="text"
                        autoComplete="off"
                        className="input w-full"
                        placeholder={nameMap ? 'e.g. Ada Lovelace' : 'Loading...'}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVerify(); } }}
                        disabled={!nameMap || finished}
                        aria-describedby="nameInputHelp"
                        aria-invalid={feedback.type === 'invalid'}
                    />
                    {feedback.type === 'invalid' && <p className="field-error" id="nameInputError">Name not in list.</p>}
                </div>
                <div className="flex gap-2 sm:flex-col">
                    <button
                        type="submit"
                        disabled={!input.trim() || !nameMap || finished}
                        className="btn btn-primary flex-1"
                        aria-label="Verify name"
                    >
                        <span>Verify</span>
                        <span className="key-hint" aria-hidden="true">Enter</span>
                    </button>
                    <button type="button" onClick={restart} className="btn btn-secondary flex-1" aria-label="Reset game">
                        <span>Reset</span>
                        <span className="key-hint" aria-hidden="true">R</span>
                    </button>
                </div>
            </form>
            <div className="mt-3 min-h-10" aria-live="polite" aria-atomic="true">
                {feedback.msg && (
                    <div role="status" className={`alert ${{
                        success: 'alert-success',
                        duplicate: 'alert-warning',
                        invalid: 'alert-error',
                        time: 'alert-error',
                        loading: 'alert-info',
                        already: 'alert-warning',
                        '': ''
                    }[feedback.type]}`}>{feedback.msg}</div>
                )}
                {/* Hidden polite region for screen reader announcements when visual message suppressed */}
                <div ref={liveFeedbackRef} aria-live="polite" className="sr-only" />
            </div>
            <div className="mt-6" aria-label="Progress">
                <div className="flex items-center justify-between mb-2 text-sm font-medium">
                    <span>{progress} / {TOTAL_TARGET}</span>
                    {bestScore > 0 && <span className="text-[oklch(40%_0.153_2.432_/_0.65)]">Best: {bestScore}{bestTime ? ` in ${formatTime(bestTime)}` : ''}</span>}
                </div>
                <div className="progress" aria-hidden="true"><span style={{ width: percent + '%' }} /></div>
                <span className="sr-only">{percent.toFixed(0)}% complete</span>
            </div>
            {/* Accepted names list now uses semantic list */}
            <div className="mt-6 flex-1 overflow-y-auto border border-[oklch(89%_0.061_343.231)] p-3 rounded-xl bg-[oklch(97%_0.014_343.198)]" aria-label="Accepted names">
                <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" aria-live="polite" aria-relevant="additions" aria-atomic="false">
                    {accepted.map(a => (
                        <li key={a.timestamp} className="text-xs px-3 py-1 font-medium text-[oklch(40%_0.153_2.432)] tracking-wide list-none">
                            {a.display}
                        </li>
                    ))}
                </ol>
            </div>
            {(finished) && (
                <div className="mt-6 flex gap-3">
                    <button onClick={share} className="btn btn-accent" aria-label="Share results">Share</button>
                    <button onClick={restart} className="btn btn-secondary" aria-label="Reset">Reset <span className="key-hint" aria-hidden="true">R</span></button>
                </div>
            )}
            {finished && (
                <div role="dialog" aria-modal="true" className="dialog-overlay">
                    <div className="dialog" ref={resultDialogRef} tabIndex={-1} aria-label={win ? 'Win dialog' : 'Time up dialog'}>
                        {win ? (
                            <>
                                <h2 className="h3 mb-2">You did it!</h2>
                                <p className="mb-6">You named all 100 women. Share your result?</p>
                                <div className="flex gap-2">
                                    <button onClick={share} className="btn btn-primary">Share</button>
                                    <button onClick={restart} className="btn btn-secondary">Reset <span className="key-hint" aria-hidden="true">R</span></button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="h3 mb-2">Time&#39;s up!</h2>
                                <p className="mb-6">You named {progress}. Try again.</p>
                                <div className="flex gap-2">
                                    <button onClick={share} className="btn btn-primary">Share</button>
                                    <button onClick={restart} className="btn btn-secondary">Reset <span className="key-hint" aria-hidden="true">R</span></button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            <footer className="mt-10 text-center text-xs text-[oklch(40%_0.153_2.432_/_0.55)] flex flex-col sm:flex-row items-center justify-center gap-3">
                <span>&copy; {(new Date()).getFullYear()} Name 100 Women</span>
                <a
                    href="https://github.com/billydyball/name-100-women"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-[oklch(55%_0.2_340)] rounded"
                    aria-label="View source code on GitHub"
                >GitHub</a>
                <button
                    type="button"
                    onClick={share}
                    className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-[oklch(55%_0.2_340)] rounded cursor-pointer"
                    aria-label="Share this game"
                >Share</button>
            </footer>
        </section>
    );
};
