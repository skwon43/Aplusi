const logoMarkSrc = "/brand/logo-mark.png";

function LogoSymbol({ className = "" }) {
  return (
    <img
      alt="A&I"
      className={`ai-logo-image ${className}`.trim()}
      src={logoMarkSrc}
    />
  );
}

function LogoBlock({ className = "", onClick }) {
  const classNames = `ai-logo-block ${className}`.trim();

  if (onClick) {
    return (
      <button
        aria-label="A&I 홈"
        className={classNames}
        onClick={onClick}
        type="button"
      >
        <LogoSymbol />
      </button>
    );
  }

  return (
    <a aria-label="A&I 홈" className={classNames} href="/">
      <LogoSymbol />
    </a>
  );
}

export default LogoBlock;
export { LogoBlock, LogoSymbol };
