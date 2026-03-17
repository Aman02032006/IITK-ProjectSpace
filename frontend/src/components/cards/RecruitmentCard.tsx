import OverflowTooltip from "@/components/cards/OverflowTooltip"

interface RecruitmentCardProps {
  title: string
  recruiter: string
  designation: string
  fields: string[]
  prerequisites: string[]
}

export default function RecruitmentCard({
  title,
  recruiter,
  designation,
  fields,
  prerequisites
}: RecruitmentCardProps) {

  return (
    <div className="bg-card border border-border rounded-xl px-2 py-2 shadow-sm hover:shadow-md transition w-full max-w-sm">

      <div className="border border-border rounded-md px-4 py-2 mb-2">
        <OverflowTooltip
          text={title}
          className="font-semibold text-lg"
          lines={2}
        />
      </div>

      <OverflowTooltip
        text={`${recruiter}, ${designation}`}
        className="font-medium mb-3"
      />

      <div className="mb-3">
        <p className="text-sm font-medium">Project Fields</p>

        <OverflowTooltip
          text={fields.join(", ")}
          className="text-sm text-muted-foreground"
          lines={2}
        />
      </div>

      <div>
        <p className="text-sm font-medium">Prerequisites</p>

        <OverflowTooltip
          text={prerequisites.join(", ")}
          className="text-sm text-muted-foreground"
          lines={2}
        />
      </div>

    </div>
  )
}