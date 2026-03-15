"use client";

import EditRecruitmentPage from "./recruitmentEditPage/page";
import { Recruitment } from "./recruitmentPage/page";

const sampleRecruitment: Recruitment = {
  id: "rec-9d2f1a",
  title: "Generative AI For Healthcare Applications",
  description:
    "We want to develop an LLM-powered virtual assistant to enhance healthcare delivery. " +
    "By fine-tuning models on medical data, the chatbot provides patients and providers with " +
    "personalized, accurate guidance on symptoms, treatments, and lifestyle choices.\n\n" +
    "This project empowers users with instant access to reliable health information while remaining " +
    "transparent and trustworthy for clinical stakeholders.\n\n" +
    "Students should be curious and ready to get their hands dirty. " +
    "Prior experience with programming and AI — in particular, LLMs — will be very useful.",
  description_format: "plain-text",
  domains: ["Generative AI", "LLMs", "Agentic AI"],
  prerequisites: ["Python", "Natural Language Processing", "LlamaIndex", "Fine-tuning"],
  allowed_designations: ["UG (3rd yr+)", "PG", "PhD"],
  allowed_departments: ["CSE", "EE", "MTH", "BioSciences"],
  status: "Open",
  created_at: "2025-03-01T09:00:00Z",
  updated_at: "2025-03-10T16:30:00Z",
  recruiters: [
    { id: "u1", name: "Alice Myers",   avatar_url: "https://i.pravatar.cc/150?u=alicemyers" },
    { id: "u2", name: "Mikhael Smith", avatar_url: "https://i.pravatar.cc/150?u=mikhaelsmith" },
  ],
  application_count: 14,
};

export default function Page() {
  return (
    <EditRecruitmentPage
      recruitment={sampleRecruitment}
      onSave={(updated) => {
        console.log("Saving updated recruitment:", updated);
        // wire this up to your PATCH /recruitments/:id API call
      }}
    />
  );
}