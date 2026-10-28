import { LogoLoader } from "@/components/LogoLoader";

// Shown while a page of the site streams in: the Juko mark loader, centred.
export default function Loading() {
  return (
    <div className="page-loader">
      <LogoLoader size={104} />
    </div>
  );
}
