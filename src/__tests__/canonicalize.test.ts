import { describe, it, expect } from 'vitest';
import { canonicalize } from '../lib/canonicalize';

describe('canonicalize', () => {
    it('lowercases and strips spaces/punctuation', () => {
        expect(canonicalize('Ada   Lovelace')).toBe('adalovelace');
        expect(canonicalize('Marie Curie')).toBe('mariecurie');
    });
    it('handles diacritics', () => {
        expect(canonicalize('Frída Kahlo')).toBe('fridakahlo');
    });
    it('strips trailing punctuation', () => {
        expect(canonicalize('Ada Lovelace,')).toBe('adalovelace');
    });
});
