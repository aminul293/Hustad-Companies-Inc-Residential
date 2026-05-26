import { Star } from "lucide-react"
import { LiquidCard, CardContent } from "@/components/ui/liquid-glass-card"
import { Marquee } from "@/components/ui/marquee"

const testimonials = [
  {
    name: "John",
    location: "Madison, WI",
    content: "They showed us the photos first, then explained what mattered and what could wait.",
    rating: 5,
  },
  {
    name: "Linda",
    location: "Cross Plains, WI",
    content: "The process was clear, local, and easy to understand.",
    rating: 5,
  },
  {
    name: "Steve",
    location: "Sun Prairie, WI",
    content: "The findings were organized by category, which made the decision much easier.",
    rating: 5,
  },
  {
    name: "Linda",
    location: "Cross Plains, WI",
    content: "The process was clear, local, and easy to understand.",
    rating: 5,
  },
]

export const MarqueeTestimonials = () => {
  return (
    <Marquee pauseOnHover speed="normal">
      {testimonials.map((t, index) => (
        <LiquidCard key={index} className="mx-1 rounded-3xl w-80 h-full border-[var(--border-color)]">
          <CardContent className="p-6 py-0">
            <div className="mb-4 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-hustad-blue/10 dark:bg-white/10 flex items-center justify-center font-bold text-hustad-blue dark:text-[var(--tx1)] border border-[var(--border-color)] shrink-0">
                {t.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-semibold text-[var(--tx1)]">{t.name}</h4>
                <p className="text-sm text-[var(--tx3)]">{t.location}</p>
              </div>
            </div>
            <p className="mb-3 text-[var(--tx2)] leading-relaxed">&ldquo;{t.content}&rdquo;</p>
            <div className="flex space-x-1">
              {[...Array(t.rating)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-[#fff200] text-[#fff200]" />
              ))}
            </div>
          </CardContent>
        </LiquidCard>
      ))}
    </Marquee>
  )
}
