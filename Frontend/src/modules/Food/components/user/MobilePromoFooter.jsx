import mobilePromoFooterImage from "../../../../assets/MobilePromoFooter.png"

export default function MobilePromoFooter() {
  return (
    <section className="md:hidden mt-6 px-3 pb-4">
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-[1.75rem] border border-gray-200 bg-[#f8f7f4] px-4 pb-6 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-x-0 top-2.5 flex items-center justify-center gap-1.5 opacity-65">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 rotate-45 rounded-[2px] bg-gray-300/80"
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center">
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
            Great taste delivered
          </p>
          <h2 className="mt-1 text-[1.55rem] font-black leading-none tracking-tight text-gray-300">
            at lowest rate
          </h2>

          <div className="mt-4 w-full flex justify-center">
            <img
              src={mobilePromoFooterImage}
              alt="Great taste delivered at lowest rate"
              className="w-full max-w-[280px] object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
