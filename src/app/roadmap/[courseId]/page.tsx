interface RoadmapDetailPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function RoadmapDetailPage({ params }: RoadmapDetailPageProps) {
  const { courseId } = await params;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="text-3xl font-extrabold text-[#131b2e]">Chi tiết lộ trình: {courseId}</h1>
      <p className="mt-2 text-[#625e56]">Cây tiến độ và các đơn vị kiến thức (KC) phân rã theo đồ thị phụ thuộc.</p>
    </div>
  );
}
