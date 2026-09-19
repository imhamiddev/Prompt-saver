import { ThemeToggle } from "@/components/theme-toggle";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
