"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canonicalize } from '../lib/canonicalize';
import { loadNames } from '../lib/loadNames';

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

    // load names
    useEffect(() => {
        let active = true;
        loadNames().then(map => {
            if (!active) return;
            setNameMap(map);
            setFeedback({ type: '', msg: '' });
        }).catch(err => {
            console.error(err);
            setFeedback({ type: 'invalid', msg: 'Failed to load names' });
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
        }
    }, [accepted, finished, remaining, bestScore, bestTime]);

    const handleVerify = useCallback(() => {
        if (!nameMap) return;
        if (finished) return;
        const raw = input.trim();
        if (!raw) return;
        if (started == null) setStarted(Date.now()); // start timer on first attempt
        const key = canonicalize(raw);
        if (!nameMap.has(key)) {
            setFeedback({ type: 'invalid', msg: 'Not found' });
            return;
        }
        if (acceptedKeys.has(key)) {
            setFeedback({ type: 'duplicate', msg: 'Already entered' });
            return;
        }
        // accept
        const fullName = nameMap.get(key)!;
        setAccepted(prev => [{ key, display: fullName, timestamp: Date.now() }, ...prev]);
        setFeedback({ type: 'success', msg: "" });
        setInput('');
        inputRef.current?.focus();
    }, [input, nameMap, acceptedKeys, finished, started]);

    const progress = accepted.length;
    const percent = Math.min(100, (progress / TOTAL_TARGET) * 100);

    const restart = () => {
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
    };

    const share = async () => {
        const url = window.location.href;
        const text = win ? `I named 100 women in ${formatTime(START_SECONDS - remaining)}!` : `I named ${progress} women. Can you name 100?`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Name 100 Women', text, url });
            } catch {
                // ignore
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                setFeedback({ type: 'success', msg: 'Link copied to clipboard' });
            } catch {
                alert('Copy this link: ' + url);
            }
        }
    };

    useEffect(() => { inputRef.current?.focus(); }, []);

    return (
        <section id="game" className="game-shell max-w-4xl mx-auto p-4 pb-12 flex flex-col min-h-screen">
            <header className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-4">
                <h1 className="h2 font-semibold tracking-tight">Name 100 Women</h1>
                <div className="text-2xl font-mono tabular-nums px-4 py-2 rounded var(--radius-box) bg-[oklch(94%_0.028_342.258)]" aria-live="polite" aria-label="Time remaining">{formatTime(remaining)}</div>
            </header>
            <div className="text-sm text-[oklch(40%_0.153_2.432)] mb-4">Target: {TOTAL_TARGET}</div>
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
                        aria-label="Name input"
                        aria-invalid={feedback.type === 'invalid'}
                    />
                    {feedback.type === 'invalid' && <p className="field-error">Name not in list.</p>}
                </div>
                <div className="flex gap-2 sm:flex-col">
                    <button
                        type="submit"
                        disabled={!input.trim() || !nameMap || finished}
                        className="btn btn-primary flex-1"
                        aria-label="Verify name"
                    >Verify</button>
                    <button type="button" onClick={restart} className="btn btn-secondary flex-1" aria-label="Restart game">Restart</button>
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
            </div>
            <div className="mt-6" aria-label="Progress">
                <div className="flex items-center justify-between mb-2 text-sm font-medium">
                    <span>{progress} / {TOTAL_TARGET}</span>
                    {bestScore > 0 && <span className="text-[oklch(40%_0.153_2.432_/_0.65)]">Best: {bestScore}{bestTime ? ` in ${formatTime(bestTime)}` : ''}</span>}
                </div>
                <div className="progress" aria-hidden="true"><span style={{ width: percent + '%' }} /></div>
                <span className="sr-only">{percent.toFixed(0)}% complete</span>
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 flex-1 overflow-y-auto border border-[oklch(89%_0.061_343.231)] p-3 rounded-xl bg-[oklch(97%_0.014_343.198)]" aria-label="Accepted names list">
                {accepted.map(a => (
                    <div key={a.timestamp} className="text-xs px-3 py-1 font-medium text-[oklch(40%_0.153_2.432)] tracking-wide">
                        {a.display}
                    </div>
                ))}
            </div>
            {(finished) && (
                <div className="mt-6 flex gap-3">
                    <button onClick={share} className="btn btn-accent" aria-label="Share results">Share</button>
                    <button onClick={restart} className="btn btn-secondary" aria-label="Restart">Restart</button>
                </div>
            )}
            {finished && (
                <div role="dialog" aria-modal="true" className="dialog-overlay">
                    <div className="dialog">
                        {win ? (
                            <>
                                <h2 className="h3 mb-2">You did it!</h2>
                                <p className="mb-6">You named all 100 women. Share your result?</p>
                                <div className="flex gap-2">
                                    <button onClick={share} className="btn btn-primary">Share</button>
                                    <button onClick={restart} className="btn btn-secondary">Restart</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="h3 mb-2">Time&#39;s up!</h2>
                                <p className="mb-6">You named {progress}. Try again.</p>
                                <div className="flex gap-2">
                                    <button onClick={share} className="btn btn-primary">Share</button>
                                    <button onClick={restart} className="btn btn-secondary">Restart</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            <footer className="mt-10 text-center text-xs text-[oklch(40%_0.153_2.432_/_0.55)]">
                &copy; {(new Date()).getFullYear()} Name 100 Women
            </footer>
        </section>
    );
};
