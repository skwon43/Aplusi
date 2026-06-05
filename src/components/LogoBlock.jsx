const logoBlue = "#4EA3F7";

function LogoSymbol({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`logo-symbol-svg ${className}`.trim()}
      focusable="false"
      viewBox="0 0 64 64"
    >
      <circle cx="32" cy="8.5" r="5.5" fill={logoBlue} />
      <path
        d="M33.5 19.5C26 19.5 21 24.4 21 31c0 7 5.8 11.3 12.4 11.3 7.2 0 11.4-4.8 11.4-10.5 0-4.8-3.7-8.5-8.7-8.5-5.5 0-9.1 3.7-9.1 8.3 0 5.8 6.1 9.1 13.8 15.6"
        fill="none"
        stroke={logoBlue}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.4"
      />
      <path
        d="M31.2 42.5 20.5 57M32.8 42.5 43.5 57M25.5 50.3h13"
        fill="none"
        stroke={logoBlue}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.8"
      />
    </svg>
  );
}

export default function LogoBlock({ className = "", onClick, symbolOnly = false }) {
  const content = (
    <>
      <LogoSymbol />
      {!symbolOnly && <span className="logo-wordmark">A&amp;I</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label="A&I home"
        className={`logo-block ${className}`.trim()}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <span className={`logo-block ${className}`.trim()}>{content}</span>;
}

export { LogoSymbol };
