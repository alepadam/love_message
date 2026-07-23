import { RoleProvider } from "@/lib/role-context";
import { TabNav } from "@/components/TabNav";

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <RoleProvider slug={slug}>
      <TabNav slug={slug} />
      {children}
    </RoleProvider>
  );
}
