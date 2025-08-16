import posthog from 'posthog-js';

interface AnalyticsProps {
    [key: string]: string | number | boolean | null | undefined;
}

let inited = false;

const defaultProps: AnalyticsProps = {
    source: 'web',
    app: 'name-100-women',
    version: process.env.NEXT_PUBLIC_VERSION || 'unknown',
};

export function initAnalytics() {
    if (typeof window === 'undefined') return;
    if (inited) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
        api_host: window.location.origin + '/relay-iT7i',
        capture_pageview: true,
        capture_pageleave: true,
    });
    inited = true;
}

export function track(event: string, properties?: AnalyticsProps) {
    if (!inited) return;
    posthog.capture(event, { ...defaultProps, ...properties });
}
