import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { ClubSection, DisciplinesSection, FacilitiesSection } from "@/src/components/home/club-sections";
import { FaqSection } from "@/src/components/home/faq-section";
import { HeroSection } from "@/src/components/home/hero-section";
import {
  CoachesSection,
  CommunitySection,
  PlansSection,
  ScheduleSection,
} from "@/src/components/home/program-sections";
import { SiteFooter } from "@/src/components/home/site-footer";
import { TrialBookingSection } from "@/src/components/home/trial-booking-section";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymHub · Club de fuerza",
  description:
    "Fuerza, energía y una comunidad que te impulsa. Reserva tu primera clase gratis en GymHub.",
};

export default function HomePage() {
  return (
    <main
      className={`${barlowCondensed.variable} ${inter.variable} flex-1 bg-gym-ink font-body text-gym-text`}
    >
      <HeroSection />
      <ClubSection />
      <DisciplinesSection />
      <FacilitiesSection />
      <CoachesSection />
      <ScheduleSection />
      <PlansSection />
      <CommunitySection />
      <FaqSection />
      <TrialBookingSection />
      <SiteFooter />
    </main>
  );
}
