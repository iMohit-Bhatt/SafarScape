import type { Photo as PhotoT } from "@/db/schema";

type Scene = "mountains" | "snow" | "hills" | "lake" | "desert" | "beach" | "temple" | "flat";

function pickScene(p: Pick<PhotoT, "alt" | "caption">): Scene {
  const t = `${p.alt} ${p.caption ?? ""}`.toLowerCase();
  if (/houseboat|shikara|backwater|lake|dal|pangong|river/.test(t)) return "lake";
  if (/snow|gulmarg|gondola|glacier|winter/.test(t)) return "snow";
  if (/tea|terrace|munnar|meadow|garden|valley|rice/.test(t)) return "hills";
  if (/desert|fort|jaisalmer|udaipur|rajasthan|camp|chinar/.test(t)) return "desert";
  if (/beach|goa|andaman|island|reef|palolem|villa/.test(t)) return "beach";
  if (/temple|kedarnath|yatra|monastery|ghat/.test(t)) return "temple";
  return "mountains";
}

/** Flat illustrated placeholder scenes matching the Paper design. Real photos (url) replace them. */
function SceneArt({ scene, color }: { scene: Scene; color: string }) {
  switch (scene) {
    case "snow":
      return (
        <>
          <rect width="400" height="300" fill={color} />
          <path d="M0 150 L80 70 L140 120 L220 50 L300 130 L400 90 L400 300 L0 300Z" fill="#B9C2C0" />
          <path d="M0 200 L400 190 L400 300 L0 300Z" fill="#F1EEE7" />
          <path d="M0 255 C130 245 270 262 400 250 L400 300 L0 300Z" fill="#6F8077" />
        </>
      );
    case "hills":
      return (
        <>
          <rect width="400" height="300" fill={color} />
          <path d="M0 150 C80 120 170 170 400 130 L400 300 L0 300Z" fill="#7FA36F" />
          <path d="M0 200 C90 180 220 220 400 190 L400 300 L0 300Z" fill="#4F7A55" />
          <path d="M0 250 C120 240 220 262 400 245 L400 300 L0 300Z" fill="#2F5A40" />
        </>
      );
    case "lake":
      return (
        <>
          <rect width="400" height="300" fill={color} />
          <circle cx="300" cy="80" r="26" fill="#F1E4CC" opacity="0.9" />
          <path d="M0 165 L400 150 L400 300 L0 300Z" fill="#5E7F80" />
          <rect x="120" y="128" width="110" height="30" fill="#8C6A4C" />
          <rect x="140" y="114" width="70" height="16" fill="#6B4E36" />
          <path d="M0 235 C140 225 260 245 400 230 L400 300 L0 300Z" fill="#3E6162" />
        </>
      );
    case "desert":
      return (
        <>
          <rect width="400" height="300" fill={color} />
          <path d="M0 200 C100 170 220 215 400 180 L400 300 L0 300Z" fill="#D29A62" />
          <rect x="250" y="110" width="70" height="80" fill="#B4532A" />
          <rect x="270" y="90" width="30" height="20" fill="#B4532A" />
        </>
      );
    case "beach":
      return (
        <>
          <rect width="400" height="300" fill={color} />
          <path d="M0 160 L400 150 L400 300 L0 300Z" fill="#4E8A8C" />
          <path d="M0 235 C150 222 260 245 400 228 L400 300 L0 300Z" fill="#E6D6B6" />
        </>
      );
    case "temple":
      return (
        <>
          <rect width="400" height="300" fill={color} />
          <path d="M0 170 L110 80 L190 140 L280 60 L400 160 L400 300 L0 300Z" fill="#9AA79E" />
          <path d="M170 210 L200 150 L230 210Z" fill="#8C6A4C" />
          <rect x="175" y="205" width="50" height="40" fill="#8C6A4C" />
          <path d="M0 250 L400 240 L400 300 L0 300Z" fill="#5E6B5F" />
        </>
      );
    case "flat":
      return <rect width="400" height="300" fill={color} />;
    default:
      return (
        <>
          <rect width="400" height="300" fill={color} />
          <path d="M0 165 L65 110 L115 145 L180 75 L245 135 L305 100 L400 160 L400 300 L0 300Z" fill="#7E8C86" />
          <path d="M0 190 L50 160 L110 185 L165 150 L230 180 L295 155 L400 195 L400 300 L0 300Z" fill="#4E6A6B" />
          <path d="M0 220 L400 220 L400 300 L0 300Z" fill="#2C5A61" />
          <path d="M0 235 C110 228 230 243 400 233 L400 300 L0 300Z" fill="#0E3B43" />
        </>
      );
  }
}

export function Photo({
  photo,
  className = "",
  scene,
  label,
  priority,
  children,
}: {
  photo: Pick<PhotoT, "color" | "alt" | "caption" | "url">;
  className?: string;
  scene?: Scene;
  label?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: photo.color }}>
      {photo.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt={photo.alt}
          loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={photo.alt}
        >
          <SceneArt scene={scene ?? pickScene(photo)} color={photo.color} />
        </svg>
      )}
      {label && (
        <span className="absolute bottom-4 left-4 text-[11px] tracking-[0.12em] text-ivory/90 uppercase">{label}</span>
      )}
      {children}
    </div>
  );
}
