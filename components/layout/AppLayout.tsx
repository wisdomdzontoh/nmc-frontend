import Header from "./Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* DHIS2-style top header */}
      <Header />
      {/* Page content */}
      <main className="flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-4">{children}</div>
      </main>
    </div>
  );
}
