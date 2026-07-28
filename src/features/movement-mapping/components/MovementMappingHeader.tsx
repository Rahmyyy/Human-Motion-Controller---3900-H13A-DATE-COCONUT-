import BackButton from "@/components/BackButton";

interface MovementMappingHeaderProps {
  backTo: string;
  description: string;
  title: string;
}

export default function MovementMappingHeader({
  backTo,
  description,
  title,
}: MovementMappingHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold text-gray-800">{title}</h1>
        <p className="m-0 text-sm leading-6 text-gray-600">{description}</p>
      </div>
      <BackButton to={backTo} />
    </header>
  );
}
