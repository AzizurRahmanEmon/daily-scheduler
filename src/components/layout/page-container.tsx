import { type ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  centered?: boolean;
  narrow?: boolean;
  wide?: boolean;
};

export function PageContainer({
  children,
  centered = false,
  narrow = false,
  wide = false,
}: PageContainerProps) {
  const maxWidth = wide
    ? "max-w-5xl"
    : narrow
      ? "max-w-md"
      : "max-w-2xl";

  return (
    <div
      className={`w-full px-4 py-8 sm:px-6 lg:px-8 ${maxWidth} ${centered ? "mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center lg:min-h-screen" : ""}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-base text-slate-600">{description}</p>
      )}
    </header>
  );
}
