import { FoodOnboardingRegistration } from '../models/onboardingRegistration.model.js';

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

export const recordOnboardingLogin = async (userType, phone) => {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return null;

    return FoodOnboardingRegistration.findOneAndUpdate(
        { userType, phone: normalizedPhone },
        {
            $set: { lastActiveAt: new Date() },
            $setOnInsert: { onboardingStatus: 'REGISTERED' }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
};

export const markOnboardingSubmitted = async (userType, phone, profileId) => {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return null;

    return FoodOnboardingRegistration.findOneAndUpdate(
        { userType, phone: normalizedPhone },
        {
            $set: {
                onboardingStatus: 'SUBMITTED',
                profileId,
                lastActiveAt: new Date(),
                submittedAt: new Date()
            }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
};
