import BackButton from "@/components/BackButton";

export default function MovementMappingHeader() {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold text-gray-800">
          Record and Map New Movement
        </h1>
        <p className="m-0 text-sm leading-6 text-gray-600">
          Capture a physical movement and assign it to a keybind.
        </p>
      </div>
      <BackButton />
    </header>
  );
}
