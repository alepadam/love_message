import { SpaceView } from "@/components/SpaceView";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SpaceView slug={slug} />;
}
