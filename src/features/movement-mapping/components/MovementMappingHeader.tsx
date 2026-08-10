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
    <header>
      <BackButton to={backTo} />
      <div className="mt-6 grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold text-gray-800">{title}</h1>
        <p className="m-0 text-sm leading-6 text-gray-600">{description}</p>
      </div>
    </header>
  );
}
