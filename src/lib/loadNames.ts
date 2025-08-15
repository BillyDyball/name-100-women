import { canonicalize } from './canonicalize';

export async function loadNames(): Promise<Map<string, string>> {
    const res = await fetch('/names.txt');
    if (!res.ok) throw new Error('Failed to load names list');
    const text = await res.text();
    const map = new Map<string, string>();
    text.split(/\r?\n/).forEach(line => {
        const full = line.trim();
        if (!full) return;
        const key = canonicalize(full);
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, full);
        }
    });
    return map;
}
