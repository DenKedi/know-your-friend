import type { LanguageCode } from "@/lib/i18n";

type Props = {
  code: LanguageCode;
  className?: string;
};

export function Flag({ code, className }: Props) {
  switch (code) {
    case "en":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className={className}>
          <clipPath id="uk-tl"><polygon points="0,0 30,15 0,15" /></clipPath>
          <clipPath id="uk-tr"><polygon points="60,0 30,15 60,15" /></clipPath>
          <clipPath id="uk-bl"><polygon points="0,15 30,15 0,30" /></clipPath>
          <clipPath id="uk-br"><polygon points="60,15 30,15 60,30" /></clipPath>
          <rect width="60" height="30" fill="#012169" />
          {/* white diagonals */}
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
          {/* red diagonals offset asymmetrically */}
          <g stroke="#C8102E" strokeWidth="2">
            <line x1="0" y1="0" x2="60" y2="30" clipPath="url(#uk-tl)" transform="translate(0,1)" />
            <line x1="0" y1="0" x2="60" y2="30" clipPath="url(#uk-br)" transform="translate(0,-1)" />
            <line x1="60" y1="0" x2="0" y2="30" clipPath="url(#uk-tr)" transform="translate(0,1)" />
            <line x1="60" y1="0" x2="0" y2="30" clipPath="url(#uk-bl)" transform="translate(0,-1)" />
          </g>
          {/* white cross */}
          <rect x="25" width="10" height="30" fill="#ffffff" />
          <rect y="10" width="60" height="10" fill="#ffffff" />
          {/* red cross */}
          <rect x="27" width="6" height="30" fill="#C8102E" />
          <rect y="12" width="60" height="6" fill="#C8102E" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className={className}>
          <rect width="60" height="10" y="0" fill="#000000" />
          <rect width="60" height="10" y="10" fill="#DD0000" />
          <rect width="60" height="10" y="20" fill="#FFCE00" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className={className}>
          <rect width="20" height="30" x="0" fill="#0055A4" />
          <rect width="20" height="30" x="20" fill="#FFFFFF" />
          <rect width="20" height="30" x="40" fill="#EF4135" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className={className}>
          <rect width="60" height="7.5" y="0" fill="#AA151B" />
          <rect width="60" height="15" y="7.5" fill="#F1BF00" />
          <rect width="60" height="7.5" y="22.5" fill="#AA151B" />
        </svg>
      );
    case "it":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className={className}>
          <rect width="20" height="30" x="0" fill="#009246" />
          <rect width="20" height="30" x="20" fill="#FFFFFF" />
          <rect width="20" height="30" x="40" fill="#CE2B37" />
        </svg>
      );
    case "ru":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className={className}>
          <rect width="60" height="10" y="0" fill="#FFFFFF" />
          <rect width="60" height="10" y="10" fill="#0039A6" />
          <rect width="60" height="10" y="20" fill="#D52B1E" />
        </svg>
      );
    default:
      return null;
  }
}
