import { useState } from "react";

const logoMarkSrc = "/brand/logo-mark.svg";

function LogoSymbol({ className = "", onError }) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className={`logo-mark ${className}`.trim()}
      onError={onError}
      src={logoMarkSrc}
    />
  );
}

function LogoBlock({ className = "", compact = false, onClick, symbolOnly = false }) {
  const [markFailed, setMarkFailed] = useState(false);
  const showWordmark = !compact && !symbolOnly;
  const showFallbackWordmark = showWordmark || markFailed;
  const content = (
    <>
      {!markFailed && <LogoSymbol onError={() => setMarkFailed(true)} />}
      {showFallbackWordmark && <span className="logo-wordmark">A&amp;I</span>}
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

export default LogoBlock;
export { LogoBlock, LogoSymbol };
