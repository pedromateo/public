const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_PAGES = [
  'index.html',
  'postrechino.html',
  'la-historia-del-bisabuelo-indalecio-sanz.html'
];

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf-8');
}

describe('Tests de Optimización SEO y Estándares de Rastreo', () => {
  it('robots.txt debe existir, permitir indexación y referenciar el sitemap oficial', () => {
    const robotsPath = path.join(ROOT_DIR, 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'robots.txt debe existir en la raíz');
    const content = fs.readFileSync(robotsPath, 'utf-8');

    assert.match(content, /User-agent:\s*\*/i, 'Debe definir directiva para todos los agentes');
    assert.match(content, /Allow:\s*\//i, 'Debe permitir el rastreo de la web');
    assert.match(content, /Disallow:\s*\/test\.html/i, 'Debe bloquear la indexación de test.html');
    assert.match(content, /Disallow:\s*\/backup\//i, 'Debe bloquear el directorio backup/');
    assert.match(content, /Sitemap:\s*https:\/\/pedromateo\.github\.io\/public\/sanz\/sitemap\.xml/i, 'Debe referenciar el sitemap absoluto oficial');
  });

  it('sitemap.xml debe existir y contener las URLs canónicas y recursos multimedia clave', () => {
    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml debe existir en la raíz');
    const content = fs.readFileSync(sitemapPath, 'utf-8');

    assert.match(content, /<urlset[^>]*>/, 'Debe contener etiqueta raíz urlset');
    for (const page of PUBLIC_PAGES) {
      const canonicalUrl = `https://pedromateo.github.io/public/sanz/${page}`;
      assert.ok(content.includes(canonicalUrl), `sitemap.xml debe incluir ${canonicalUrl}`);
    }
    assert.match(content, /<image:loc>/, 'Debe incluir metadatos de imágenes en el sitemap');
  });

  it('todas las páginas públicas deben declarar lang="es" estándar', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      assert.match(html, /<html\s+lang=[\"']es[\"']/i, `${file} debe tener atributo lang="es"`);
      assert.doesNotMatch(html, /lang=[\"']es_US[\"']/i, `${file} no debe tener código de idioma obsoleto es_US`);
    }
  });

  it('todas las páginas públicas deben tener meta description adecuada (entre 50 y 200 caracteres)', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      const match = html.match(/<meta\s+name=[\"']description[\"']\s+content=[\"']([^\"']+)[\"']/i);
      assert.ok(match, `${file} debe tener etiqueta meta description`);
      const desc = match[1].trim();
      assert.ok(desc.length >= 50 && desc.length <= 220,
        `${file} la meta description debe tener longitud óptima para SERP (actual: ${desc.length} chars)`);
    }
  });

  it('todas las páginas públicas deben incluir etiqueta canónica absoluta en producción', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      const expectedUrl = `https://pedromateo.github.io/public/sanz/${file}`;
      assert.match(html, new RegExp(`<link\\s+rel=[\"']canonical[\"']\\s+href=[\"']${expectedUrl.replace(/\//g, '\\/')}[\"']`, 'i'),
        `${file} debe contener link canonical con URL canónica absoluta`);
    }
  });

  it('todas las páginas públicas deben incluir geolocalización de Puerto Lumbreras (Murcia)', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      assert.match(html, /<meta\s+name=[\"']geo\.region[\"']\s+content=[\"']ES-MU[\"']/i, `${file} debe tener geo.region ES-MU`);
      assert.match(html, /<meta\s+name=[\"']geo\.placename[\"']\s+content=[\"']Puerto Lumbreras[\"']/i, `${file} debe tener geo.placename Puerto Lumbreras`);
    }
  });

  it('todas las páginas públicas deben incluir metadatos Open Graph completos', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      assert.match(html, /<meta\s+property=[\"']og:title[\"']/i, `${file} debe incluir og:title`);
      assert.match(html, /<meta\s+property=[\"']og:description[\"']/i, `${file} debe incluir og:description`);
      assert.match(html, /<meta\s+property=[\"']og:url[\"']/i, `${file} debe incluir og:url`);
      assert.match(html, /<meta\s+property=[\"']og:image[\"']/i, `${file} debe incluir og:image`);
      assert.match(html, /<meta\s+property=[\"']og:site_name[\"']/i, `${file} debe incluir og:site_name`);
      assert.match(html, /<meta\s+property=[\"']og:locale[\"']\s+content=[\"']es_ES[\"']/i, `${file} debe incluir og:locale es_ES`);
    }
  });

  it('todas las páginas públicas deben incluir Twitter Cards (summary_large_image)', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      assert.match(html, /<meta\s+name=[\"']twitter:card[\"']\s+content=[\"']summary_large_image[\"']/i, `${file} debe incluir twitter:card`);
      assert.match(html, /<meta\s+name=[\"']twitter:title[\"']/i, `${file} debe incluir twitter:title`);
      assert.match(html, /<meta\s+name=[\"']twitter:image[\"']/i, `${file} debe incluir twitter:image`);
    }
  });

  it('todas las páginas públicas deben incluir Schema.org JSON-LD estructurado válido', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      const scripts = [...html.matchAll(/<script\s+type=[\"']application\/ld\+json[\"']>([\s\S]*?)<\/script>/gi)];
      assert.ok(scripts.length > 0, `${file} debe contener al menos un bloque JSON-LD`);
      for (const s of scripts) {
        assert.doesNotThrow(() => {
          const parsed = JSON.parse(s[1]);
          assert.ok(parsed, 'JSON-LD debe ser objeto o array válido');
        }, `${file} debe tener JSON-LD sintácticamente válido`);
      }
    }
  });

  it('test.html debe contener directiva noindex para evitar canibalización SEO', () => {
    const html = readText('test.html');
    assert.match(html, /<meta\s+name=[\"']robots[\"']\s+content=[\"']noindex,\s*nofollow[\"']/i,
      'test.html debe estar marcado como noindex, nofollow');
  });

  it('todas las imágenes img deben contar con atributo alt no vacío', () => {
    for (const file of PUBLIC_PAGES) {
      const html = readText(file);
      // Ignorar bloques <script> para no evaluar templates JS embebidos
      const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      const imgTags = [...cleanHtml.matchAll(/<img\b([^>]*)>/gi)];
      assert.ok(imgTags.length > 0, `${file} debe contener imágenes`);
      for (const match of imgTags) {
        const attrs = match[1];
        assert.match(attrs, /\balt=[\"'][^\"']+[\"']/i,
          `${file} contiene una etiqueta <img> sin atributo alt descriptivo: <img${attrs}>`);
      }
    }
  });
});
