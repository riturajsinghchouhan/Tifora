import React, { useEffect, useState } from 'react';
import { Phone, Headphones } from 'lucide-react';
import { adminAPI } from '@food/api';

/**
 * Highlighted helpline strip shown on the tiffin checkout and subscription pages.
 * Numbers are configured once in Admin → Business Settings → Tiffin Helpline Numbers,
 * so they are the same for every plan.
 */
export default function TiffinHelplineBanner({ className = '' }) {
    const [numbers, setNumbers] = useState([]);

    useEffect(() => {
        let cancelled = false;
        adminAPI
            .getPublicBusinessSettings()
            .then((res) => {
                const settings = res?.data?.data || res?.data || {};
                const list = Array.isArray(settings.tiffinHelplineNumbers) ? settings.tiffinHelplineNumbers : [];
                if (!cancelled) setNumbers(list.filter(Boolean));
            })
            .catch(() => {
                // Helpline is informational only; stay silent if settings cannot load
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (numbers.length === 0) return null;

    return (
        <div
            className={`rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 p-3.5 sm:p-4 ${className}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Headphones className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            Helpline Number
                        </p>
                        <p className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400/80">
                            Any issue with your tiffin? Call us anytime.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {numbers.map((number) => (
                        <a
                            key={number}
                            href={`tel:${number.replace(/[^0-9+]/g, '')}`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 text-sm font-black text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 active:scale-95 transition"
                        >
                            <Phone className="w-3.5 h-3.5" />
                            {number}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
