import { getPhotos } from "../actions";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const photos = await getPhotos();
  
  // Format photos for the client component
  const formattedPhotos = photos.map(p => ({
    id: p.id,
    url: p.url,
    publicId: p.publicId,
    title: p.title,
    displayOrder: p.displayOrder,
    createdAt: p.createdAt ? new Date(p.createdAt) : null
  }));

  return <AdminDashboard initialPhotos={formattedPhotos} />;
}
