import mongoose from 'mongoose';

const onboardingRegistrationSchema = new mongoose.Schema(
    {
        userType: {
            type: String,
            enum: ['RESTAURANT', 'DELIVERY_PARTNER'],
            required: true,
            index: true
        },
        phone: { type: String, required: true, trim: true },
        onboardingStatus: {
            type: String,
            enum: ['REGISTERED', 'IN_PROGRESS', 'SUBMITTED'],
            default: 'REGISTERED',
            index: true
        },
        profileId: { type: mongoose.Schema.Types.ObjectId, default: null },
        lastActiveAt: { type: Date, default: Date.now, index: true },
        submittedAt: { type: Date, default: null }
    },
    { collection: 'food_onboarding_registrations', timestamps: true }
);

onboardingRegistrationSchema.index({ userType: 1, phone: 1 }, { unique: true });
onboardingRegistrationSchema.index({ userType: 1, onboardingStatus: 1, createdAt: -1 });

export const FoodOnboardingRegistration = mongoose.model(
    'FoodOnboardingRegistration',
    onboardingRegistrationSchema
);
