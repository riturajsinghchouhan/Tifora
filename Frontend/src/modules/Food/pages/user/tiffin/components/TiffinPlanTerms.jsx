import React, { useState } from 'react';
import { FileText } from 'lucide-react';

/**
 * Plan policy terms shown at checkout, in English and Hindi.
 * Pause days come from the plan itself, so editing the plan updates these.
 */
export default function TiffinPlanTerms({ durationDays, maxPauseDays, steelBoxPrice = 0, className = '' }) {
    const [lang, setLang] = useState('en');

    const days = Number(durationDays) || 0;
    const pauseDays = Math.max(0, Number(maxPauseDays) || 0);
    const hasSteelDeposit = Number(steelBoxPrice) > 0;

    const terms = {
        en: [
            hasSteelDeposit &&
                'Security Deposit: The amount paid for the steel tiffin box is held as a refundable security deposit.',
            pauseDays > 0
                ? `Pause Option: This ${days}-day plan allows a maximum of ${pauseDays} pause ${pauseDays === 1 ? 'day' : 'days'}.`
                : 'Pause Option: This plan does not include any pause days.',
            pauseDays > 0 &&
                'Pause Validity: Pause days can only be used within the validity period of this plan.',
            pauseDays > 0 &&
                'Plan Expiry: Any unused pause days cannot be carried forward once the plan validity ends.'
        ].filter(Boolean),
        hi: [
            hasSteelDeposit &&
                'सिक्योरिटी डिपॉज़िट: स्टील टिफ़िन बॉक्स के लिए जमा की गई राशि सिक्योरिटी डिपॉज़िट के रूप में रखी जाएगी।',
            pauseDays > 0
                ? `पॉज़ ऑप्शन: इस ${days} दिन के प्लान में अधिकतम ${pauseDays} दिन का पॉज़ ऑप्शन दिया जाएगा।`
                : 'पॉज़ ऑप्शन: इस प्लान में पॉज़ की सुविधा उपलब्ध नहीं है।',
            pauseDays > 0 &&
                'पॉज़ वैधता: पॉज़ सुविधा का लाभ केवल इस प्लान की निर्धारित वैधता के भीतर ही लिया जा सकता है।',
            pauseDays > 0 &&
                'प्लान समाप्ति: प्लान की वैधता समाप्त होने के बाद बचे हुए पॉज़ दिनों का उपयोग नहीं किया जा सकेगा।'
        ].filter(Boolean)
    };

    return (
        <div className={`bg-white rounded-2xl p-5 border border-gray-200 shadow-sm ${className}`}>
            <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0cb884]" />
                    Terms &amp; Conditions
                </h3>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 shrink-0">
                    {[
                        { id: 'en', label: 'English' },
                        { id: 'hi', label: 'हिंदी' }
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setLang(option.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                lang === option.id ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            <p className="text-[11px] font-medium text-gray-400 mb-3">
                {lang === 'en' ? 'Tiffin Service – Plan Policies' : 'टिफ़िन सेवा – प्लान नीतियाँ'}
            </p>

            <ol className="space-y-2">
                {terms[lang].map((term, index) => (
                    <li key={index} className="flex gap-2.5 text-xs text-gray-600 leading-relaxed">
                        <span className="w-5 h-5 rounded-lg bg-gray-100 text-gray-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            {index + 1}
                        </span>
                        <span>{term}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}
