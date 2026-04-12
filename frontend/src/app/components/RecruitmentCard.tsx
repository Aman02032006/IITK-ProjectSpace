import OverflowTooltip from "@/app/components/OverflowTooltip"
import Link from "next/link"

// Props for recruitment card component
interface RecruitmentCardProps {
  id: string
  title: string
  recruiter: string
  fields: string[]
  prerequisites: string[]
}

// Displays recruitment listing card
export default function RecruitmentCard({
  id,
  title,
  recruiter,
  fields,
  prerequisites
}: RecruitmentCardProps) {

  return (
    <Link 
      href={`/recruitment-page?id=${id}`} 
      className="flex flex-col bg-white border border-gray-200 rounded-xl p-5 shadow-[0_0_10px_rgba(0,0,0,0.1)] w-full min-w-0 h-[260px] overflow-hidden font-['Montserrat'] cursor-pointer hover:shadow-[0_0_15px_rgba(0,0,0,0.15)] transition-shadow duration-200"
    >

      {/* Recruitment title */}
      <div className="mb-3">
        <OverflowTooltip
          text={title}
          className="text-lg font-bold text-card-foreground"
          lines={2}
        />
      </div>

      {/* Horizontal separator */}
      <hr className="border-border mb-3" />

      {/* Card content container */}
      <div className="flex flex-col gap-2 flex-grow overflow-hidden">
        
        {/* Recruiter name */}
        <OverflowTooltip
          text={recruiter}
          className="text-sm font-semibold text-card-foreground"
          lines={1}
        />

        {/* Recruitment fields */}
        <OverflowTooltip 
          text={fields.join(", ")} 
          className="text-sm text-muted-foreground italic" 
          lines={1} 
        />

        {/* Prerequisites list */}
        <OverflowTooltip 
          text={`Prerequisites: ${prerequisites.join(", ")}`} 
          className="text-sm text-muted-foreground italic mt-1" 
          lines={4} 
        />
        
      </div>
    </Link>
  )
}