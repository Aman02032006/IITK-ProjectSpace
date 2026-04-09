/* eslint-disable @next/next/no-img-element */
import OverflowTooltip from "@/app/components/cards/OverflowTooltip"

// Props for user profile card
interface UserCardProps {
  name: string
  designation: string
  department: string
  organisation: string
  image?: string
}

// Displays user information card
export default function UserCard({ name, designation, department, organisation, image}: UserCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_0_10px_rgba(0,0,0,0.1)] hover:shadow-[0_0_15px_rgba(0,0,0,0.15)] transition-shadow duration-200 flex items-center gap-4 w-full max-w-sm">
      
      {/* User avatar container */}
      <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-300" />
        )}
      </div>

      {/* User details */}
      <div className="min-w-0">
        {/* User name */}
        <OverflowTooltip
          text={name}
          className="font-semibold"
        />
        {/* User designation */}
        <OverflowTooltip
          text={designation}
          className="text-sm text-muted-foreground"
        />
        {/* User department */}
        <OverflowTooltip
          text={department}
          className="text-sm text-muted-foreground"
        />
        {/* User organisation */}
        <OverflowTooltip
          text={organisation}
          className="text-sm text-muted-foreground"
        />
      </div>
    </div>
  )
}
