import React from "react";
import Link from "next/link";
import OverflowTooltip from "@/app/components/cards/OverflowTooltip";

interface UserCardProps {
  id?: string;
  name: string;
  designation: string;
  department: string;
  organisation: string;
  image?: string;
}

export default function UserCard({
  id,
  name,
  designation,
  department,
  organisation,
  image
}: UserCardProps) {
  
  // 1. Define the shared classes
  const cardClasses = "flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-[0_0_10px_rgba(0,0,0,0.1)] w-full max-w-sm min-w-0 font-['Montserrat'] cursor-pointer hover:shadow-[0_0_15px_rgba(0,0,0,0.15)] transition-shadow duration-200";

  // 2. Extract the inner content to avoid duplicating code
  const cardContent = (
    <>
      {/* Avatar (Left side) */}
      <div className="w-16 h-16 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400 font-bold text-2xl">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Details (Right side) */}
      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
        <OverflowTooltip
          text={name}
          className="text-lg font-bold text-card-foreground"
          lines={1}
        />
        <OverflowTooltip
          text={designation}
          className="text-sm font-semibold text-card-foreground"
          lines={1}
        />
        <OverflowTooltip
          text={department}
          className="text-sm text-muted-foreground italic"
          lines={1}
        />
        {organisation && (
          <OverflowTooltip
            text={organisation}
            className="text-sm text-muted-foreground italic"
            lines={1}
          />
        )}
      </div>
    </>
  );

  // 3. Explicitly return the correct wrapper to keep TypeScript happy
  if (id) {
    return (
      <Link href={`/profilePage?id=${id}`} className={cardClasses}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={cardClasses}>
      {cardContent}
    </div>
  );
}