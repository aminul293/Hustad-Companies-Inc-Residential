"use client";

import AutoScroll from "embla-carousel-auto-scroll";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface LogoCredential {
  id: string;
  logo_name: string;
  logo_type: "manufacturer" | "client" | "association" | "distributor" | "internal";
  credential_name: string;
  credential_status: "active" | "expired" | "pending" | "unknown";
  expiration_date: string | null;
  approved_for_marketing: boolean;
  approved_context: string[];
  last_verified_date: string;
  svg: () => React.JSX.Element;
}

const rawLogos: LogoCredential[] = [
  {
    id: "gaf",
    logo_name: "GAF",
    logo_type: "manufacturer",
    credential_name: "Certified Installer",
    credential_status: "active",
    expiration_date: "2027-12-31",
    approved_for_marketing: true,
    approved_context: ["residential", "commercial"],
    last_verified_date: "2026-01-15",
    svg: () => (
      <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
        <rect width="100" height="40" rx="4" fill="#D32F2F" />
        <text x="50" y="27" fill="white" fontSize="22" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="1">GAF</text>
      </svg>
    ),
  },
  {
    id: "owens-corning",
    logo_name: "Owens Corning",
    logo_type: "manufacturer",
    credential_name: "Preferred Contractor",
    credential_status: "active",
    expiration_date: "2027-06-30",
    approved_for_marketing: true,
    approved_context: ["residential"],
    last_verified_date: "2026-02-10",
    svg: () => (
      <svg viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto text-hustad-navy dark:text-hustad-tx1">
        <text x="10" y="25" fill="currentColor" fontSize="14" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.5">OWENS CORNING</text>
        <rect x="145" y="12" width="12" height="12" fill="#FF80AB" />
      </svg>
    ),
  },
  {
    id: "certainteed",
    logo_name: "CertainTeed",
    logo_type: "manufacturer",
    credential_name: "ShingleMaster",
    credential_status: "active",
    expiration_date: "2026-12-31",
    approved_for_marketing: true,
    approved_context: ["residential", "commercial"],
    last_verified_date: "2026-03-01",
    svg: () => (
      <svg viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto text-hustad-navy dark:text-hustad-tx1">
        <path d="M10 28 L22 12 L34 28 Z" stroke="#1E4D8C" strokeWidth="3" fill="none" className="dark:stroke-indigo-400" />
        <text x="42" y="26" fill="currentColor" fontSize="13" fontWeight="bold" fontFamily="sans-serif">CertainTeed</text>
      </svg>
    ),
  },
  {
    id: "tamko",
    logo_name: "TAMKO",
    logo_type: "manufacturer",
    credential_name: "Certified Installer",
    credential_status: "active",
    expiration_date: "2027-03-31",
    approved_for_marketing: true,
    approved_context: ["residential"],
    last_verified_date: "2026-01-20",
    svg: () => (
      <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto text-hustad-navy dark:text-hustad-tx1">
        <polygon points="18,8 30,20 18,32 6,20" fill="#1E4D8C" className="dark:fill-indigo-400" />
        <text x="18" y="24" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">T</text>
        <text x="38" y="26" fill="currentColor" fontSize="16" fontWeight="extrabold" fontFamily="sans-serif" letterSpacing="1">TAMKO</text>
      </svg>
    ),
  },
  {
    id: "elevate",
    logo_name: "Elevate",
    logo_type: "manufacturer",
    credential_name: "Licensed Contractor",
    credential_status: "active",
    expiration_date: "2026-08-31",
    approved_for_marketing: true,
    approved_context: ["residential", "commercial"],
    last_verified_date: "2026-02-15",
    svg: () => (
      <svg viewBox="0 0 110 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto text-hustad-navy dark:text-hustad-tx1">
        <text x="10" y="26" fill="currentColor" fontSize="18" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">ELEVATE</text>
        <rect x="94" y="14" width="10" height="10" fill="#D32F2F" />
      </svg>
    ),
  },
  // Unverified/expired partner that should be filtered out from residential view
  {
    id: "unverified-brand",
    logo_name: "Generic Roof Co",
    logo_type: "manufacturer",
    credential_name: "Unverified Partner",
    credential_status: "expired",
    expiration_date: "2025-01-01",
    approved_for_marketing: false,
    approved_context: ["residential"],
    last_verified_date: "2025-01-01",
    svg: () => (
      <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
        <text x="10" y="25" fill="currentColor">Generic</text>
      </svg>
    ),
  }
];

const verifiedLogos = rawLogos.filter(logo => 
  logo.logo_type === "manufacturer" &&
  logo.credential_status === "active" &&
  logo.approved_for_marketing &&
  logo.approved_context.includes("residential")
);

interface Logos3Props {
  heading?: string;
  logos?: LogoCredential[];
  className?: string;
}

const Logos3 = ({
  heading = "Certified installers for trusted manufacturers",
  logos = verifiedLogos,
}: Logos3Props) => {
  return (
    <section className="py-12 md:py-20 bg-transparent">
      <div className="container flex flex-col items-center text-center px-4">
        <h2 className="mb-10 text-xs font-mono uppercase tracking-[0.4em] text-[var(--tx3)]">
          {heading}
        </h2>
      </div>
      <div className="relative">
        <div className="mx-auto flex items-center justify-center lg:max-w-7xl">
          <Carousel
            opts={{ loop: true }}
            plugins={[AutoScroll({ playOnInit: true, speed: 1.2 })]}
          >
            <CarouselContent className="ml-0">
              {[...logos, ...logos].map((logo, index) => (
                <CarouselItem
                  key={`${logo.id}-${index}`}
                  className="flex basis-1/2 justify-center pl-0 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                >
                  <div className="mx-3 flex shrink-0 items-center justify-center">
                    <div className="group relative bg-[var(--bg-surface)] border border-[var(--border-color)] px-8 py-5 rounded-2xl hover:scale-105 transition-all duration-500 shadow-md">
                      {logo.svg()}
                      {/* Tooltip for Credential Status */}
                      <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold text-[var(--tx1)] opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-2xl z-20 uppercase tracking-widest">
                        {logo.logo_name} &bull; {logo.credential_name}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          
          {/* Gradient Masks for seamless scroll */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--bg-base)] to-transparent z-10 pointer-events-none transition-colors duration-300"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--bg-base)] to-transparent z-10 pointer-events-none transition-colors duration-300"></div>
        </div>
      </div>
      <div className="container flex flex-col items-center text-center px-4 mt-6">
        <p className="text-xs font-body text-[var(--tx3)] italic">
          Manufacturer credentials are verified before final proposal presentation.
        </p>
      </div>
    </section>
  );
};

export { Logos3 };
