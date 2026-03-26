import React from "react";
import Link from "next/link";
import OverflowTooltip from "./OverflowTooltip";

interface ProjectsCardProps {
  id: string;
  title: string;
  author: string;
  designation: string;
  fields: string[];
  description: string;
}

export function ProjectsCard({ id, title, author, designation, fields, description }: ProjectsCardProps) {
  return (
    <Link href={`/projectPage?id=${id}`} className="flex flex-col bg-white border border-gray-200 rounded-xl p-5 shadow-[0_0_10px_rgba(0,0,0,0.1)] w-full min-w-0 h-[260px] overflow-hidden font-['Montserrat'] cursor-pointer hover:shadow-[0_0_15px_rgba(0,0,0,0.15)] transition-shadow duration-200">
      
      {/* Project Title */}
      <div className="mb-3">
        <OverflowTooltip 
          text={title} 
          className="text-lg font-bold text-card-foreground" 
          lines={2} 
        />
      </div>

      {/* Horizontal Line Separator */}
      <hr className="border-border mb-3" />

      {/* Card Details */}
      <div className="flex flex-col gap-2 flex-grow overflow-hidden">
        
        {/* Author, Designation */}
        <OverflowTooltip 
          text={`${author}, ${designation}`} 
          className="text-sm font-semibold text-card-foreground" 
          lines={1}
        />

        {/* Project Fields */}
        <OverflowTooltip 
          text={fields.join(", ")} 
          className="text-sm text-muted-foreground italic" 
          lines={1} 
        />

        {/* Project Description */}
        <OverflowTooltip 
          text={description} 
          className="text-sm text-muted-foreground italic mt-1" 
          lines={4} 
        />
        
      </div>
    </Link>
  );
}

export default ProjectsCard;  