"use client";

import AutoScroll from "embla-carousel-auto-scroll";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface Logo {
  id: string;
  description: string;
  image: string;
  className?: string;
}

interface Logos3Props {
  heading?: string;
  logos?: Logo[];
  className?: string;
}

const Logos3 = ({
  heading = "Trusted by National Asset Managers",
  logos = [
    {
      id: "logo-1",
      description: "Colliers International",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2016/12/hus-colliers-international.png",
      className: "h-10 w-auto opacity-80 hover:opacity-100 transition-all duration-300",
    },
    {
      id: "logo-2",
      description: "NP Dodge Management Company",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2016/12/hus-np-dodge.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-3",
      description: "Seldin Company",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2016/12/seldin.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-4",
      description: "Asset Living",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2024/12/AssetLiving-e1733161297463.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-5",
      description: "Cardinal Capital Management",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2024/12/Cardinal-Capitalimages-e1733161711260.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-6",
      description: "Dial Land Development",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2016/12/hus-dial-companies.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-7",
      description: "DP Management, LLC",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2016/12/DPlogo.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-8",
      description: "Burlington Capital",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2018/12/hus-burlington-capital.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-9",
      description: "OMNE Partners",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2019/09/OMNE-logo.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-10",
      description: "GreenSlate Management",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2017/03/Green-Slate-Management.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-11",
      description: "Gallina",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2016/12/hus-gallina.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
    {
      id: "logo-12",
      description: "Encore Construction",
      image: "https://www.hustadcompanies.com/wp-content/uploads/2016/12/huse-encore-construction.png",
      className: "h-10 w-auto opacity-100 hover:scale-110 transition-all duration-300",
    },
  ],
}: Logos3Props) => {
  return (
    <section className="py-12 md:py-20 bg-transparent">
      <div className="container flex flex-col items-center text-center px-4">
        <h2 className="mb-10 text-xs font-mono uppercase tracking-[0.4em] text-white/40">
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
                    <div className="group relative bg-white/95 backdrop-blur-xl border border-white/20 px-8 py-5 rounded-2xl hover:bg-white hover:scale-105 transition-all duration-500 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                      <img
                        src={logo.image}
                        alt={logo.description}
                        className={logo.className}
                      />
                      {/* Tooltip for Company Name */}
                      <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#060606]/90 backdrop-blur-xl rounded-lg text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap border border-white/10 pointer-events-none shadow-2xl z-20 uppercase tracking-widest">
                        {logo.description}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          
          {/* Gradient Masks for seamless scroll */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#060606] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#060606] to-transparent z-10 pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
};

export { Logos3 };
