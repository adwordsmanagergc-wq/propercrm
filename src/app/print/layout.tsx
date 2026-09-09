/**
 * A bare shell for anything meant to come out of a printer. Sits outside the
 * app layout on purpose — nobody wants the sidebar on their invoice.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-white">{children}</div>;
}
