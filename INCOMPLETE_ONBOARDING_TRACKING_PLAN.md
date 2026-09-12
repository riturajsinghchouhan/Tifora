# Incomplete Restaurant & Delivery Partner Onboarding Tracking Plan

## Goal

Admin panel mein un restaurants aur delivery partners ka record dikhana jo app download karke login/OTP verification complete kar chuke hain, lekin onboarding ya KYC process complete nahi kar paaye.

## 1. Registration Record Creation

- Mobile number aur OTP verification successful hote hi backend mein user record create hoga.
- User type store hoga: `RESTAURANT` ya `DELIVERY_PARTNER`.
- Onboarding complete hone ka wait nahi kiya jayega; isse incomplete users bhi track honge.

## 2. Onboarding Progress Tracking

Har screen ya step complete hone par data auto-save hoga. Possible steps:

- Basic profile details
- Address aur location
- Bank details
- KYC documents
- Vehicle details (delivery partner)
- Restaurant documents, business details aur menu details (restaurant)
- Final submit

Required fields aur completed steps ke basis par onboarding progress percentage calculate hogi.

## 3. Statuses

| Status | Meaning |
| --- | --- |
| `REGISTERED` | OTP/login complete, onboarding start nahi hua |
| `ONBOARDING_INCOMPLETE` | Onboarding start hua, par required steps pending hain |
| `DOCUMENTS_PENDING` | Required documents upload nahi hue hain |
| `VERIFICATION_PENDING` | Documents submitted hain, admin/KYC verification pending hai |
| `APPROVED` | Onboarding aur verification complete hai |
| `REJECTED` | Verification ya application reject ho gayi |
| `INACTIVE` | User ne process chhod diya ya account inactive hai |

## 4. Admin Panel Changes

Restaurant aur Delivery Partner modules mein ye filters/tabs add honge:

- All
- Incomplete Registrations
- Documents Pending
- Verification Pending
- Approved
- Rejected
- Inactive

## 5. List View Fields

Har record ke liye admin ko ye information dikhegi:

- Name (available ho to)
- Mobile number
- Email (available ho to)
- User type
- Registration date/time
- Last active time
- Current status
- Onboarding completion percentage
- Current/pending onboarding step

## 6. Detail View

Admin detail page mein user ke filled aur pending fields clearly dikhenge:

- Profile and contact details
- Address/location
- Bank details status
- Uploaded documents and verification status
- Vehicle details for delivery partner
- Restaurant/business/menu information for restaurant
- Onboarding activity and status history

## 7. Resume & Follow-up

- User dobara login kare to wahi pending onboarding step se resume kar sakega.
- Incomplete onboarding ke liye push notification, SMS ya WhatsApp reminders bheje ja sakte hain.
- Admin follow-up notes aur reminder history maintain ki ja sakti hai.

## 8. Backend Requirements

- OTP verification ke baad user profile ka initial record create karna.
- Every onboarding-step update ke liye API aur auto-save support.
- Required fields ke basis par status/progress update karna.
- Admin listing APIs mein user type, status, date aur pending step filters dena.
- Last login/last activity timestamp store karna.

## 9. Security & Privacy

- KYC documents secure storage mein encrypt/protect karke store honge.
- Document access sirf authorized admin roles ko milega.
- Privacy policy aur user consent flow maintain hoga.
- Incomplete account data ke archive/delete retention rules define kiye jayenge.

## 10. Testing Checklist

- OTP login ke baad, onboarding complete kiye bina user record admin panel mein show ho.
- Midway app close karne par entered data aur current step save rahe.
- Re-login par user pending step se onboarding resume kar sake.
- Restaurant aur delivery partner ka data separate filters mein sahi dikhe.
- Status, completion percentage aur pending step correct update hon.
- Admin permissions aur document access verify ho.
