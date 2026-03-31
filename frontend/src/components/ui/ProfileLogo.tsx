type ProfileLogoProps = {
  name: string;
  initials: string;
  logoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export default function ProfileLogo({
  name,
  initials,
  logoUrl,
  className = "",
  fallbackClassName = "",
}: ProfileLogoProps) {
  if (logoUrl) {
    return <img src={logoUrl} alt={`${name} profile logo`} className={className} />;
  }

  return (
    <div className={fallbackClassName} aria-label={`${name} fallback logo`}>
      {initials}
    </div>
  );
}
