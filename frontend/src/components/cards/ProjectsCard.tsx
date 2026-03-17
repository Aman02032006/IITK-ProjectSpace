import OverflowTooltip from "@/components/cards/OverflowTooltip"

interface ProjectCardProps {
  title: string
  author: string
  designation: string
  fields: string[]
  description: string
}

export default function ProjectCard({
  title,
  author,
  designation,
  fields,
  description
}: ProjectCardProps) {

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
        text={`${author}, ${designation}`}
        className="font-medium mb-2"
      />

      <OverflowTooltip
        text={fields.join(", ")}
        className="text-sm text-muted-foreground"
        lines={2}
      />

      <OverflowTooltip
        text={description}
        className="text-sm text-muted-foreground mt-2"
        lines={3}
      />

    </div>
  )
}