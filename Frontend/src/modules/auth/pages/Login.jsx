import React, { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  ShieldCheck,
  Loader2,
  Bike,
  Star,
  ChevronDown,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { authAPI, userAPI } from "@food/api"
import { setAuthData } from "@food/utils/auth"
import logoNew from "@/assets/logo.png"
import authBg from "@/assets/auth-bg.png"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"

export default function UnifiedOTPFastLogin() {
  const RESEND_COOLDOWN_SECONDS = 60
  const [phoneNumber, setPhoneNumber] = useState(() => sessionStorage.getItem("draft_phone_login") || "")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [showNameModal, setShowNameModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [tempAuth, setTempAuth] = useState(null)
  const [pendingVerify, setPendingVerify] = useState(null)
  const navigate = useNavigate()
  const submitting = useRef(false)

  const normalizedPhone = () => {
    const digits = String(phoneNumber).replace(/\D/g, "").slice(-15)
    return digits.length >= 8 ? digits : ""
  }

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault()
    const phone = normalizedPhone()
    if (phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtp("")
      setStep(2)
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("OTP sent successfully to +91 " + phone)
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleResendOTP = async () => {
    const phone = normalizedPhone()
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number")
      return
    }
    if (resendTimer > 0 || submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtp("")
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("New OTP sent successfully!")
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to resend OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleEditNumber = () => {
    setStep(1)
    setOtp("")
    setResendTimer(0)
    setPendingVerify(null)
    setShowNameModal(false)
    setNewName("")
  }

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault()
    const otpDigits = String(otp).replace(/\D/g, "").slice(0, 6)
    if (otpDigits.length !== 6) {
      toast.error("Please enter the 6-digit verification code")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    let fcmToken = null
    let platform = "web"
    try {
      try {
        if (typeof window !== "undefined") {
          if (window.flutter_inappwebview) {
            platform = "mobile"
            const handlerNames = ["getFcmToken", "getFCMToken", "getPushToken", "getFirebaseToken"]
            for (const handlerName of handlerNames) {
              try {
                const t = await window.flutter_inappwebview.callHandler(handlerName, { module: "user" })
                if (t && typeof t === "string" && t.length > 20) {
                  fcmToken = t.trim()
                  break
                }
              } catch (e) { }
            }
          } else {
            fcmToken = localStorage.getItem("fcm_web_registered_token_user") || null
          }
        }
      } catch (e) {
        console.warn("Failed to get FCM token during login", e)
      }

      const response = await authAPI.verifyOTP(
        phoneNumber,
        otpDigits,
        "login",
        null,
        null,
        "user",
        null,
        null,
        fcmToken,
        platform
      )
      const data = response?.data?.data || response?.data || {}

      const needsName =
        data.needsName === true ||
        data.isNewUser === true ||
        (data.user &&
          (!data.user.name ||
            String(data.user.name).trim().length === 0 ||
            String(data.user.name).toLowerCase() === "null"))

      if (needsName) {
        setPendingVerify({ phone: phoneNumber, otp: otpDigits, fcmToken, platform })
        setShowNameModal(true)
        return
      }

      const accessToken = data.accessToken
      const refreshToken = data.refreshToken || null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid response from server")
      }

      setAuthData("user", accessToken, user, refreshToken)

      toast.success("Welcome to Tifora!")
      navigate("/food/user", { replace: true })
    } catch (err) {
      const status = err?.response?.status
      let msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Invalid verification code. Please try again."
      const nameRequired = /name\s+is\s+required.*first[- ]?time|first[- ]?time.*name\s+is\s+required|first[- ]?time\s*sign\s*up/i.test(
        String(msg)
      )
      if (nameRequired) {
        setPendingVerify({ phone: phoneNumber, otp: otpDigits, fcmToken, platform })
        setShowNameModal(true)
        return
      }
      if (status === 401) {
        if (/deactivat(ed|e)/i.test(String(msg))) {
          msg = "Your account is deactivated. Please contact support."
        } else {
          msg = "Invalid or expired code. Please request a new one."
        }
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleNameSubmit = async (e) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("Please enter your name")
      return
    }

    try {
      setIsUpdatingName(true)
      if (pendingVerify) {
        const response = await authAPI.verifyOTP(
          pendingVerify.phone,
          pendingVerify.otp,
          "login",
          newName.trim(),
          null,
          "user",
          null,
          null,
          pendingVerify.fcmToken,
          pendingVerify.platform
        )
        const data = response?.data?.data || response?.data || {}
        const accessToken = data.accessToken
        const refreshToken = data.refreshToken || null
        const user = data.user

        setAuthData("user", accessToken, user, refreshToken)
        setPendingVerify(null)
        toast.success(`Welcome aboard, ${newName.trim()}!`)
        setShowNameModal(false)
        navigate("/food/user", { replace: true })
        return
      }

      await userAPI.updateProfile({ name: newName.trim() })

      const updatedUser = { ...tempAuth.user, name: newName.trim() }
      setAuthData("user", tempAuth.accessToken, updatedUser, tempAuth.refreshToken)

      toast.success(`Welcome aboard, ${newName.trim()}!`)
      setShowNameModal(false)
      navigate("/food/user", { replace: true })
    } catch (err) {
      toast.error("Failed to update name. You can skip this for now or try again.")
      console.error(err)
    } finally {
      setIsUpdatingName(false)
    }
  }

  useEffect(() => {
    if (step !== 2 || resendTimer <= 0) return
    const intervalId = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [step, resendTimer])

  const formatResendTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen w-full bg-[#E5F5EF] flex items-center justify-center p-0 sm:p-4 select-none font-sans">
      {/* Centered Phone Canvas Wrapper with auth-bg.png Background */}
      <div
        className="relative w-full max-w-[440px] min-h-screen sm:min-h-[920px] sm:max-h-[960px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col justify-between bg-cover bg-top bg-no-repeat border border-emerald-100/50"
        style={{ backgroundImage: `url(${authBg})` }}
      >
        {/* Main Content Overlay */}
        <div className="relative z-10 w-full px-5 sm:px-6 pt-10 sm:pt-12 pb-4 flex flex-col items-center">

          {/* Top Logo & Branding */}
          <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
            {/* Tifora Emerald Emblem */}
            <div className="w-14 h-14 rounded-2xl bg-white/90 shadow-md shadow-[#00C28A]/15 border border-white p-2 flex items-center justify-center mb-2">
              <img src={logoNew} alt="Tifora" className="w-full h-full object-contain" />
            </div>



            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
              Welcome to <span className="text-[#00C28A]">Tifora</span>
            </h1>

            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1 max-w-[270px]">
              Healthy tiffins. Comfortable hotels.<br />
              One app for everything you need.
            </p>

            {/* Carousel / Indicator Dots */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <div className="w-6 h-1.5 rounded-full bg-[#00C28A]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#00C28A]/50" />
            </div>
          </div>

          {/* Floating Main White Card (Login / Sign Up) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full bg-white/95 backdrop-blur-md rounded-[28px] p-6 shadow-[0_12px_35px_rgba(0,0,0,0.06)] border border-white"
          >
            {/* Card Header */}
            <div className="text-center mb-4 sm:mb-5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {step === 1 ? "Login / Sign Up" : "Verify Phone Number"}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {step === 1
                  ? "Enter your mobile number to continue"
                  : `Enter the 6-digit code sent to +91 ${phoneNumber}`}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                /* Step 1: Phone Input */
                <motion.form
                  key="step-1"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  onSubmit={handleSendOTP}
                  className="space-y-3.5"
                >
                  {/* Combined Phone Input */}
                  <div className="flex items-center h-[50px] rounded-2xl border border-slate-200 hover:border-slate-300 focus-within:border-[#00C28A] focus-within:ring-2 focus-within:ring-[#00C28A]/20 transition-all bg-white overflow-hidden px-3">
                    {/* Flag & Country Code */}
                    <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 cursor-pointer shrink-0">
                      <span className="text-lg leading-none">🇮🇳</span>
                      <span className="text-sm font-bold text-slate-800">+91</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    {/* Number Input */}
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10)
                        setPhoneNumber(val)
                        sessionStorage.setItem("draft_phone_login", val)
                      }}
                      maxLength={10}
                      placeholder="Enter mobile number"
                      className="w-full h-full pl-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent border-0 outline-none focus:ring-0"
                    />
                  </div>

                  {/* Continue Button */}
                  <button
                    type="submit"
                    disabled={loading || phoneNumber.length < 10}
                    className="w-full h-[48px] rounded-2xl bg-[#00C28A] hover:bg-[#00b07d] text-white font-bold text-sm shadow-[0_8px_20px_rgba(0,194,138,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Trust Notice */}
                  <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00C28A] shrink-0" />
                    <span>We never share your number with anyone</span>
                  </div>
                </motion.form>
              ) : (
                /* Step 2: OTP Verification */
                <motion.form
                  key="step-2"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  onSubmit={handleVerifyOTP}
                  className="space-y-3.5"
                >
                  {/* 6 OTP Inputs */}
                  <div className="flex justify-between gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="tel"
                        inputMode="numeric"
                        required
                        autoFocus={index === 0}
                        value={otp[index] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(-1)
                          if (!val) return
                          const newOtp = otp.split("")
                          newOtp[index] = val
                          const combined = newOtp.join("").slice(0, 6)
                          setOtp(combined)
                          if (index < 5 && val) {
                            document.getElementById(`otp-${index + 1}`)?.focus()
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            if (!otp[index] && index > 0) {
                              document.getElementById(`otp-${index - 1}`)?.focus()
                            } else {
                              const newOtp = otp.split("")
                              newOtp[index] = ""
                              setOtp(newOtp.join(""))
                            }
                          }
                        }}
                        className="w-full h-11 text-center text-lg font-bold bg-slate-50 border border-slate-200 focus:border-[#00C28A] focus:bg-white focus:ring-2 focus:ring-[#00C28A]/20 rounded-xl outline-none transition-all text-[#00C28A]"
                        placeholder="•"
                      />
                    ))}
                  </div>

                  {/* Resend & Change Number Actions */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div>
                      {resendTimer > 0 ? (
                        <span className="text-slate-400 font-medium">
                          Resend in <span className="text-[#00C28A] font-bold">{formatResendTimer(resendTimer)}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          className="text-[#00C28A] hover:underline font-bold transition-all"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleEditNumber}
                      className="text-slate-500 hover:text-slate-800 font-semibold underline transition-colors"
                    >
                      Edit Number
                    </button>
                  </div>

                  {/* Verify Button */}
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full h-[48px] rounded-2xl bg-[#00C28A] hover:bg-[#00b07d] text-white font-bold text-sm shadow-[0_8px_20px_rgba(0,194,138,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 3-Column Trust Bar Card */}
          <div className="w-full mt-3.5 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-white grid grid-cols-3 divide-x divide-slate-100 text-center">
            {/* Col 1 */}
            <div className="flex items-center justify-center gap-1.5 px-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#00C28A] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-800 leading-tight">Secure</div>
                <div className="text-[9px] text-slate-400 leading-tight">100% Safe</div>
              </div>
            </div>

            {/* Col 2 */}
            <div className="flex items-center justify-center gap-1.5 px-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#00C28A] flex items-center justify-center shrink-0">
                <Bike className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-800 leading-tight">Fast Delivery</div>
                <div className="text-[9px] text-slate-400 leading-tight">On-time</div>
              </div>
            </div>

            {/* Col 3 */}
            <div className="flex items-center justify-center gap-1.5 px-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#00C28A] flex items-center justify-center shrink-0">
                <Star className="w-3.5 h-3.5 fill-[#00C28A]" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-800 leading-tight">Trusted</div>
                <div className="text-[9px] text-slate-400 leading-tight">50K+ Users</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section (Center Floating Badge & Terms) */}
        <div className="relative z-10 w-full pt-16 pb-6 px-4 flex flex-col items-center">
          {/* Floating Center Tifora Badge over the bottom split images */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white shadow-xl shadow-[#00C28A]/30 border border-white p-2.5 flex items-center justify-center">
            <img src={logoNew} alt="Tifora" className="w-full h-full object-contain" />
          </div>

          {/* Terms & Privacy Policy Footer */}
          <div className="w-full text-center mt-6">
            <p className="text-[11px] text-slate-500 font-normal">
              By continuing, you agree to our<br />
              <Link to="/profile/terms" className="text-[#00C28A] font-semibold hover:underline">
                Terms of Service
              </Link>{" "}
              &{" "}
              <Link to="/profile/privacy" className="text-[#00C28A] font-semibold hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Name Collection Modal (First-time user onboarding) */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent
          className="w-[92vw] max-w-[400px] rounded-3xl border border-slate-100 p-0 overflow-hidden bg-white text-slate-900 shadow-2xl"
          showCloseButton={false}
        >
          <div className="relative pt-7 pb-3 px-6 text-center bg-gradient-to-b from-emerald-50/70 to-white">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-[#00C28A] flex items-center justify-center mx-auto mb-3">
              <User className="w-7 h-7" />
            </div>

            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
              Welcome to Tifora!
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-medium mt-1">
              Please enter your name to complete your profile setup.
            </DialogDescription>
          </div>

          <form onSubmit={handleNameSubmit} className="px-6 pb-6 pt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-700 block">
                Full Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:border-[#00C28A] focus:bg-white focus:ring-2 focus:ring-[#00C28A]/20 transition-all outline-none"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={isUpdatingName || !newName.trim()}
                className="w-full h-11 bg-[#00C28A] hover:bg-[#00b07d] text-white rounded-xl font-bold text-sm shadow-md shadow-[#00C28A]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Complete Signup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {!pendingVerify && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNameModal(false)
                    navigate("/food/user", { replace: true })
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium py-1 text-center"
                >
                  Skip for now
                </button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
