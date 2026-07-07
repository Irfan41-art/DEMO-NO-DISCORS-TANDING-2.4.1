import React from 'react';

// Configuration for Custom Hukuman Icons - Users can upload PNG/JPG/SVG directly through the AI Studio file explorer and reference the paths here.
export const CUSTOM_HUKUMAN_ICONS = {
  Binaan1: "/assets/binaan1.svg?v=15",      // Masukkan path untuk Binaan 1 (contoh: "/assets/binaan1.png")
  Binaan2: "/assets/binaan2.svg?v=15",      // Masukkan path untuk Binaan 2
  Teguran1: "/assets/teguran1.svg?v=15",     // Masukkan path untuk Teguran 1
  Teguran2: "/assets/teguran2.svg?v=15",     // Masukkan path untuk Teguran 2
  Peringatan1: "/assets/peringatan1.svg?v=15",  // Masukkan path untuk Peringatan 1
  Peringatan2: "/assets/peringatan2.svg?v=15",  // Masukkan path untuk Peringatan 2
  Disqualification: "", // Masukkan path untuk Diskualifikasi
  Jatuhan: "",       // Masukkan path untuk Jatuhan
  Punch: "/assets/punch.svg?v=15",
  Kick: "/assets/kick.svg?v=15"
};

// Configuration for Custom Background/Theme Silhouettes - Users can upload custom images/PNG/SVGs directly to the root or assets folder and map them here.
export const CUSTOM_BACKGROUND_SILHOUETTES = {
  Stance: "/assets/pesilat2.png?v=15", // Masukkan path contoh: "/assets/stance.png" (kosongkan jika ingin memakai siluet asli bawaan)
  Kick: "/assets/pesilat1.png?v=15",   // Masukkan path contoh: "/assets/kick.png" (kosongkan jika ingin memakai siluet asli bawaan)
  CenterArt: "/assets/temadiscors.png?v=15" // Masukkan path contoh: "/assets/center.png" (kosongkan jika ingin memakai ornamen lencana asli bawaan)
};

// Persistent cache of failed image URLs to prevent infinite reloading and flickering in rapid React rendering updates.
const failedUrls = new Set<string>();

// Wrapper helper to support safe, unified custom images with silent automated error fallback to crisp inline vector SVGs if files are absent, empty, or 404.
interface HukumanIconProps extends React.SVGProps<SVGSVGElement> {
  customSrc?: string;
  fallbackSvg: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  alt: string;
}

export const HukumanIconWrapper: React.FC<HukumanIconProps> = ({
  customSrc,
  fallbackSvg,
  alt,
  className,
  ...props
}) => {
  const [hasError, setHasError] = React.useState(() => {
    return customSrc ? failedUrls.has(customSrc) : true;
  });

  React.useEffect(() => {
    if (customSrc) {
      setHasError(failedUrls.has(customSrc));
    }
  }, [customSrc]);

  if (!customSrc || hasError) {
    return <>{fallbackSvg({ className, ...props })}</>;
  }

  // Filter SVG-specific visual properties to prevent invalid DOM attribute warning on <img> elements
  const {
    stroke,
    strokeWidth,
    strokeLinecap,
    strokeLinejoin,
    fill,
    fillOpacity,
    strokeOpacity,
    viewBox,
    ...cleanProps
  } = props as any;

  return (
    <img
      src={customSrc}
      alt={alt}
      className={`${className || ''} object-contain mx-auto max-w-full max-h-full`}
      onError={() => {
        if (customSrc) {
          failedUrls.add(customSrc);
        }
        setHasError(true);
      }}
      referrerPolicy="no-referrer"
      {...cleanProps}
    />
  );
};

// Modern SVG Silhouettes for Pencak Silat

const OriginalSilatStance: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    {/* Minimalist modern martial artist silhouette - stance posture */}
    <path d="M50,15 A6,6 0 1,1 50,27 A6,6 0 1,1 50,15 Z" /> {/* Head */}
    <path d="M48,27 L52,27 L58,40 L68,42 L66,45 L58,45 L56,60 L72,78 L68,82 L50,68 L32,82 L28,78 L44,60 L42,45 L34,45 L32,42 L42,40 Z" /> {/* Body & limbs simplifed */}
    {/* Stance low guard vectors */}
    <path d="M30,35 Q35,42 42,45 M70,35 Q65,42 58,45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const SiluetSilatStance: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_BACKGROUND_SILHOUETTES.Stance}
    fallbackSvg={(fallbackProps) => <OriginalSilatStance {...fallbackProps} />}
    alt="Siluet Silat Stance"
    {...props}
  />
);

const OriginalSilatKick: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    {/* Minimalist modern silat high kick projection */}
    <circle cx="28" cy="30" r="5" /> {/* Head leaned back */}
    <path d="M 28 35 
             C 25 38, 22 45, 23 55 
             C 24 62, 28 70, 20 82 
             L 24 85 
             C 32 75, 34 68, 33 60 
             C 38 60, 48 55, 60 52 
             C 72 49, 85 45, 92 42 
             L 93 37 
             C 80 40, 68 45, 58 48 
             L 40 40 Z" /> {/* Core Torso & Kicking Leg */}
    <path d="M22,48 Q15,44 12,35 M24,44 Q18,48 16,55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /> {/* Arms defensively folded */}
  </svg>
);

export const SiluetSilatKick: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_BACKGROUND_SILHOUETTES.Kick}
    fallbackSvg={(fallbackProps) => <OriginalSilatKick {...fallbackProps} />}
    alt="Siluet Silat Kick"
    {...props}
  />
);

const OriginalBackgroundCenter: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    <path d="M50 20 L45 35 L30 40 L45 45 L50 60 L55 45 L70 40 L55 35 Z" />
    <circle cx="50" cy="15" r="5" />
    <path d="M20 80 L40 70 L50 75 L60 70 L80 80" stroke="currentColor" fill="none" strokeWidth="2" />
  </svg>
);

export const SiluetBackgroundCenter: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_BACKGROUND_SILHOUETTES.CenterArt}
    fallbackSvg={(fallbackProps) => <OriginalBackgroundCenter {...fallbackProps} />}
    alt="Siluet Background Center"
    {...props}
  />
);

// Hand signal icons:

// Original stunning high-fidelity inline SVGs and their component exposures with adaptive wrappers:

// a) BINAAN 1: Siluet tangan dengan 1 jari menunjuk ke samping (kanan)
const OriginalBinaan1: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Sleeve / Wrist */}
    <path d="M10,50 L30,50 M10,40 L10,60" strokeWidth="3" strokeOpacity="0.5" />
    {/* Hand body - fill with low opacity for modern premium look */}
    <path d="M30,38 C35,38 40,34 45,34 L85,34 C89,34 89,42 85,42 L50,42 C54,42 56,46 56,50 C56,54 53,58 48,58 M48,58 C51,58 53,62 53,66 C53,70 50,74 45,74 L30,74 C25,74 20,68 20,58 C20,48 25,38 30,38 Z" fill="currentColor" fillOpacity="0.15" />
    {/* Inner details / fingers division */}
    <path d="M45,42 L35,42" strokeWidth="3.5" />
    <path d="M42,50 L35,50" strokeWidth="3.5" />
    <path d="M40,58 L32,58" strokeWidth="3.5" />
    <path d="M38,66 L30,66" strokeWidth="3.5" />
    {/* Thumb curled in */}
    <path d="M30,38 C33,42 33,48 30,52" strokeWidth="4" />
  </svg>
);

export const Binaan1Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Binaan1}
    fallbackSvg={(fallbackProps) => <OriginalBinaan1 {...fallbackProps} />}
    alt="Binaan 1"
    {...props}
  />
);

// b) BINAAN 2: Siluet tangan dengan 2 jari menunjuk ke samping (kanan)
const OriginalBinaan2: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Sleeve / Wrist */}
    <path d="M10,50 L28,50 M10,40 L10,60" strokeWidth="3" strokeOpacity="0.5" />
    {/* Hand body with 2 fingers extended */}
    <path d="M28,34 C33,34 38,30 43,30 L83,30 C87,30 87,38 83,38 L48,38 M48,38 C52,38 54,40 54,44 L81,44 C85,44 85,52 81,52 L48,52 C51,54 53,58 53,62 M53,62 C53,66 50,70 45,70 L28,70 C23,70 18,64 18,54 C18,44 23,34 28,34 Z" fill="currentColor" fillOpacity="0.15" />
    {/* Inner finger lines */}
    <path d="M43,38 L32,38" strokeWidth="3.5" />
    <path d="M42,46 L32,46" strokeWidth="3.5" />
    <path d="M40,54 L30,54" strokeWidth="3.5" />
    <path d="M38,62 L28,62" strokeWidth="3.5" />
    {/* Thumb curled */}
    <path d="M28,34 C31,38 31,44 28,48" strokeWidth="4" />
  </svg>
);

export const Binaan2Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Binaan2}
    fallbackSvg={(fallbackProps) => <OriginalBinaan2 {...fallbackProps} />}
    alt="Binaan 2"
    {...props}
  />
);

// c) TEGURAN 1: Siluet tangan dengan 1 Jari menunjuk arah atas
const OriginalTeguran1: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Wrist / Sleeve */}
    <path d="M50,78 L50,92 M36,92 L64,92" strokeWidth="3.5" strokeOpacity="0.5" />
    {/* Hand Silhouette */}
    <path d="M35,78 L35,50 C35,46 38,44 42,44 C45,44 45,48 45,51 M42,44 C42,38 45,15 50,15 C55,15 55,38 55,51 M55,48 C55,44 58,42 62,42 C66,42 66,48 66,62 M62,56 C62,52 65,50 69,50 C73,50 73,56 73,70 C73,78 68,78 50,78 C35,78 35,78 35,78" fill="currentColor" fillOpacity="0.15" />
    {/* Inner finger separator lines */}
    <path d="M45,51 L45,78" strokeWidth="3.5" />
    <path d="M55,51 L55,78" strokeWidth="3.5" />
    <path d="M62,56 L62,78" strokeWidth="3.5" />
    {/* Curved Thumb in front */}
    <path d="M35,66 C40,66 43,70 41,74" strokeWidth="4.5" />
  </svg>
);

export const Teguran1Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Teguran1}
    fallbackSvg={(fallbackProps) => <OriginalTeguran1 {...fallbackProps} />}
    alt="Teguran 1"
    {...props}
  />
);

// d) TEGURAN 2: Siluet tangan dengan 2 jari menunjuk arah atas
const OriginalTeguran2: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Wrist / Sleeve */}
    <path d="M50,78 L50,92 M36,92 L64,92" strokeWidth="3.5" strokeOpacity="0.5" />
    {/* Hand Silhouette with index and middle fingers extended */}
    <path d="M35,78 L35,50 C35,46 38,44 42,44 M42,44 C42,38 45,15 49,15 C53,15 53,38 53,51 M50,44 C50,38 53,15 57,15 C61,15 61,38 61,51 M61,48 C61,44 64,42 68,42 C72,42 72,48 72,62 M68,54 C68,50 71,48 75,48 C79,48 79,54 79,72 C79,78 70,78 50,78 Z" fill="currentColor" fillOpacity="0.15" />
    {/* Inner finger lines */}
    <path d="M42,46 L42,78" strokeWidth="3.5" />
    <path d="M50,46 L50,78" strokeWidth="3.5" />
    <path d="M61,50 L61,78" strokeWidth="3.5" />
    <path d="M68,54 L68,78" strokeWidth="3.5" />
    {/* Curved Thumb in front */}
    <path d="M35,66 C40,66 43,70 41,74" strokeWidth="4.5" />
  </svg>
);

export const Teguran2Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Teguran2}
    fallbackSvg={(fallbackProps) => <OriginalTeguran2 {...fallbackProps} />}
    alt="Teguran 2"
    {...props}
  />
);

// e) PERINGATAN 1: Siluet tangan dengan 1 Jari ke atas dengan pose wasit
const OriginalPeringatan1: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    {/* Head */}
    <path d="M41,26 C36,26 33,29 33,34 C33,39 36,42 41,42 C46,42 49,39 49,34 C49,29 46,26 41,26 Z" />
    
    {/* Main clothes silhouette with raised arm (1 finger up) and held wrist */}
    <path d="M22,28 C22,24 23,8 26,8 C29,8 29,24 29,28 L34,42 C34,42 36,44 42,48 C48,46 51,46 53,49 L69,72 L56,74 L55,83 C55,85 54,87 52,87 L27,85 C26,85 25,83 25,81 L29,66 C29,66 23,55 19,45 C15,35 15,31 16,30 C17,29 20,33 22,38 Z M45,55 L52,57 C53,57 53,56 52,55 Z" />
    
    {/* Sash/Belt details around the waist */}
    <path d="M26,83 L53,85 C51,88 51,90 53,92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    
    {/* Badge/Rect on chest */}
    <rect x="44" y="58" width="6" height="3" rx="0.3" fill="currentColor" fillOpacity="0.4" />
    
    {/* Other hand holding competitor's wrist bottom right */}
    <path d="M74,82 C76,80 79,72 85,70 C88,68 90,70 88,74 L78,86 C76,88 74,86 74,82 Z" />
  </svg>
);

export const Peringatan1Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Peringatan1}
    fallbackSvg={(fallbackProps) => <OriginalPeringatan1 {...fallbackProps} />}
    alt="Peringatan 1"
    {...props}
  />
);

// f) PERINGATAN 2: Siluet tangan dengan 2 jari ke atas dengan pose wasit
const OriginalPeringatan2: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    {/* Head */}
    <path d="M41,26 C36,26 33,29 33,34 C33,39 36,42 41,42 C46,42 49,39 49,34 C49,29 46,26 41,26 Z" />
    
    {/* Main clothes silhouette with raised arm (2 fingers up) and held wrist */}
    <path d="M22,28 C22,24 23,8 25,8 C27,8 27,24 27,28 C27,24 28,6 30,6 C32,6 32,24 32,28 L36,42 C36,42 38,44 43,48 C49,46 52,46 54,49 L70,72 L57,74 L56,83 C56,85 55,87 53,87 L28,85 C27,85 26,83 26,81 L30,66 C30,66 24,55 20,45 C16,35 16,31 17,30 C18,29 21,33 23,38 Z M46,55 L53,57 C54,57 54,56 53,55 Z" />
    
    {/* Sash/Belt details around the waist */}
    <path d="M27,83 L54,85 C52,88 52,90 54,92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    
    {/* Badge/Rect on chest */}
    <rect x="45" y="58" width="6" height="3" rx="0.3" fill="currentColor" fillOpacity="0.4" />
    
    {/* Other hand holding competitor's wrist bottom right */}
    <path d="M75,82 C77,80 80,72 86,70 C89,68 91,70 89,74 L79,86 C77,88 75,86 75,82 Z" />
  </svg>
);

export const Peringatan2Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Peringatan2}
    fallbackSvg={(fallbackProps) => <OriginalPeringatan2 {...fallbackProps} />}
    alt="Peringatan 2"
    {...props}
  />
);

// g) DISKUALIFIKASI: Siluet dengan tulisan DISK
const OriginalDisqualification: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path d="M4.93 4.93l14.14 14.14" strokeWidth="2.5" />
    <rect x="7" y="10" width="10" height="4" rx="1" fill="currentColor" />
    <text x="8.5" y="13" fontSize="4.5" fontWeight="bold" fill="#000" stroke="none">DISK</text>
  </svg>
);

export const DisqualificationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Disqualification}
    fallbackSvg={(fallbackProps) => <OriginalDisqualification {...fallbackProps} />}
    alt="Disqualification"
    {...props}
  />
);

// h) JATUHAN: Siluet orang jatuh ato sweep
const OriginalJatuhan: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 12h-6l-5 5-4-1" />
    <circle cx="14" cy="7" r="2" fill="currentColor" />
    <path d="M12 9l-4 3" />
    <path d="M13 18l5 4" strokeWidth="2.5" />
    <text x="4" y="9" fontSize="6.5" fontWeight="black" fill="currentColor" stroke="none">+3</text>
  </svg>
);

export const JatuhanIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Jatuhan}
    fallbackSvg={(fallbackProps) => <OriginalJatuhan {...fallbackProps} />}
    alt="Jatuhan"
    {...props}
  />
);

const OriginalPunch: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M6 12h12M12 6v12" />
  </svg>
);

export const PunchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Punch}
    fallbackSvg={(fallbackProps) => <OriginalPunch {...fallbackProps} />}
    alt="Punch"
    {...props}
  />
);

const OriginalKick: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 8l8 8M16 8l-8 8" />
  </svg>
);

export const KickIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HukumanIconWrapper
    customSrc={CUSTOM_HUKUMAN_ICONS.Kick}
    fallbackSvg={(fallbackProps) => <OriginalKick {...fallbackProps} />}
    alt="Kick"
    {...props}
  />
);
