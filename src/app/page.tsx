import Link from "next/link";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { getPhotos } from "./actions";
import VelocityCarousel from "./components/VelocityCarousel";
import { Meteors } from "./components/Meteors";
import { LightRays } from "./components/LightRays";
import { AntiScreenshot } from "./components/AntiScreenshot";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rawPhotos = await getPhotos();
  
  // Format photos for carousel
  const photos = rawPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    publicId: p.publicId,
    title: p.title,
    displayOrder: p.displayOrder,
  }));

  return (
    <div className={styles.homeContainer}>
      <AntiScreenshot />
      <Meteors number={50} className="z-0" />
      <LightRays className="z-0" />
      {/* Dynamic luxury layout branding absolute details */}
      <div className={styles.branding}>
        <h1 className={styles.brandTitle}>JAYESH&nbsp;&nbsp;SUTHAR</h1>
        <h2 className={styles.brandSub}>
          devloper
          {/* <span className={styles.collectionCount}>({photos.length})</span> */}
        </h2>
      </div>

      <Link href="/admin" className={styles.adminLink}>
        Admin Control
      </Link>

      {photos.length > 0 ? (
        <VelocityCarousel photos={photos} />
      ) : (
        <div className={styles.emptyState}>
          <ImageIcon size={32} style={{ color: "#7a8180" }} />
          <h3 className={styles.emptyHeading}>No photos in gallery</h3>
          <p className={styles.emptyText}>
            The portfolio database is currently empty. Visit the admin dashboard to upload images to the database and populate the carousel.
          </p>
          <Link href="/admin/login" className={styles.emptyAction}>
            <span>Access Admin Panel</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className={styles.scrollSurf}>
        Scroll to surf
      </div>
    </div>
  );
}
