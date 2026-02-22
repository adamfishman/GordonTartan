export function slugify(str: string): string {
  const a =
    'àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;';
  const b =
    'aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return str
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(p, (c) => b.charAt(a.indexOf(c)))
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export interface ThreadEntry {
  fill: string;
  size: number;
}

export function countPattern(threadcount: string, palette: string): ThreadEntry[] {
  const paletteColors: Record<string, string> = palette.split(' ').reduce((acc: Record<string, string>, curr) => {
    const el = curr.split('#');
    acc[el[0].trim()] = `#${el[1]}`;
    return acc;
  }, {});

  const array = threadcount.split(' ');
  let result: ThreadEntry[] = [];
  let total = 0;

  const colCountArray = array.map((el, index) => {
    const regex = /([a-zA-Z]+|\(.*?\))(\/?)(\d+)/gm;
    const m = regex.exec(el);
    if (m !== null) {
      total += index === 0 || index === array.length - 1 ? 1 * Number(m[3]) : 2 * Number(m[3]);
      return { fill: paletteColors[m[1]] || '#000000', size: 4 * Number(m[3]) };
    }
    return { fill: '#000000', size: 0 };
  });

  if (array[0].indexOf('/') > -1) {
    for (let i = 0; i < 2 * array.length - 2; i++) {
      const index = i < array.length - 1 ? i : 2 * array.length - 2 - i;
      result.push(colCountArray[index]);
    }
    if (total % 2) {
      const len = result.length;
      for (let i = 0; i < len; i++) {
        result.push(result[i]);
      }
    }
  } else {
    for (let i = 0; i < array.length; i++) {
      result.push(colCountArray[i]);
    }
    if (total % 2) {
      const len = array.length;
      for (let i = 0; i < len - 1; i++) {
        result.push(result[i]);
      }
    }
  }
  return result;
}

export function hexToHue(H: string): number {
  let r = 0, g = 0, b = 0;
  if (H.length === 4) {
    r = Number('0x' + H[1] + H[1]);
    g = Number('0x' + H[2] + H[2]);
    b = Number('0x' + H[3] + H[3]);
  } else if (H.length === 7) {
    r = Number('0x' + H[1] + H[2]);
    g = Number('0x' + H[3] + H[4]);
    b = Number('0x' + H[5] + H[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

export function sortPaletteColors(palette: string): string[] {
  return palette
    .split(' ')
    .map((el) => `#${el.split('#')[1]}`)
    .sort((a, b) => hexToHue(a) - hexToHue(b));
}

export interface SvgResult {
  svg: string;
  size: number;
}

export function buildSvgString(threadcount: string, palette: string): SvgResult {
  const tartanCount = countPattern(threadcount, palette);

  const cumulativeSizes: number[] = [];
  let sum = 0;
  for (const entry of tartanCount) {
    sum += entry.size;
    cumulativeSizes.push(sum);
  }

  const size = cumulativeSizes[cumulativeSizes.length - 1];

  const horizRects = tartanCount
    .map((el, index) => {
      const y = index === 0 ? 0 : cumulativeSizes[index - 1];
      return `<rect fill="${el.fill}" height="${el.size}" width="100%" x="0" y="${y}"/>`;
    })
    .join('');

  const vertRects = tartanCount
    .map((el, index) => {
      const x = index === 0 ? 0 : cumulativeSizes[index - 1];
      return `<rect fill="${el.fill}" height="100%" width="${el.size}" x="${x}" y="0"/>`;
    })
    .join('');

  const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" x="0" y="0" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"><polygon points="0,4 0,8 8,0 4,0" fill="#ffffff"/><polygon points="4,8 8,8 8,4" fill="#ffffff"/></pattern><mask id="grating" x="0" y="0" width="1" height="1"><rect x="0" y="0" width="100%" height="100%" fill="url(#pattern)"/></mask></defs><g id="horizStripes">${horizRects}</g><g id="vertStripes" mask="url(#grating)">${vertRects}</g></svg>`;

  return { svg, size };
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
