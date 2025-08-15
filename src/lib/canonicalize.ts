// Canonicalization: lowercase, trim, collapse spaces, NFD normalize & strip diacritics,
// remove punctuation (.,'-) and spaces, remove trailing commas/periods
export function canonicalize(raw: string): string {
    if (!raw) return "";
    let s = raw
        .trim()
        .replace(/[.,]+$/g, "") // drop trailing punctuation
        .replace(/\s+/g, " ") // collapse internal whitespace
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    // remove punctuation and spaces
    s = s.replace(/[\s.'\-]/g, "");
    return s;
}

export function isCanonicalMatch(a: string, b: string): boolean {
    return canonicalize(a) === canonicalize(b);
}
