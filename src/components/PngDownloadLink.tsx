import { useState, useEffect, useRef } from 'react';

interface Props {
  svgData: string;
  size: number;
  fileName: string;
}

export default function PngDownloadLink({ svgData, size, fileName }: Props) {
  const multiplier = size < 4000 ? 2 : 1;
  const aRef = useRef<HTMLAnchorElement>(null);
  const [pngReady, setPngReady] = useState(false);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (href && aRef.current) {
      aRef.current.click();
    }
  }, [href]);

  const doThis = () => {
    setPngReady(true);
    const canvas = document.createElement('canvas');
    canvas.width = multiplier * size;
    canvas.height = multiplier * size;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(multiplier, multiplier);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      setHref(canvas.toDataURL('image/png'));
    };
    img.src = `data:image/svg+xml,${svgData}`;
  };

  const dimensions = `(${multiplier * size}x${multiplier * size}px)`;

  return href ? (
    <a ref={aRef} href={href} download={`${fileName}.png`}>
      <span className="icon">&rsaquo;</span>{' '}
      <span className="download-text">
        <span className="hide-sm">Download as </span>PNG
      </span>
      <small className="hide-sm">{dimensions}</small>
    </a>
  ) : (
    <button onClick={doThis}>
      <span className="icon">&rsaquo;</span>{' '}
      <span className="download-text">
        <span className="hide-sm">{pngReady ? 'Generating...' : 'Generate'} </span>PNG
      </span>
      <small className="hide-sm">{dimensions}</small>
    </button>
  );
}
