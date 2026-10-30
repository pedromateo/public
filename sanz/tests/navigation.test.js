const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function readHtml(filename) {
  const filePath = path.join(ROOT_DIR, filename);
  return fs.readFileSync(filePath, 'utf8');
}

describe('Tests de Navegación - Menú y Enlaces Principales', () => {
  it('index.html debe contener el menú de navegación con los cinco apartados clave', () => {
    const html = readHtml('index.html');

    // Menú desktop
    assert.match(html, /<ul\s+class=[\"']wsite-menu-default[\"']>/i,
      'Debe contener la lista de navegación wsite-menu-default');

    // Secciones requeridas
    assert.match(html, /href=[\"']#historia[\"'][^>]*>\s*Nuestra historia\s*<\/a>/i,
      'Debe enlazar a la sección #historia');
    assert.match(html, /href=[\"']#dulces[\"'][^>]*>\s*Dulces y tartas\s*<\/a>/i,
      'Debe enlazar a la sección #dulces');
    assert.match(html, /href=[\"']#encargos[\"'][^>]*>\s*Encargos\s*<\/a>/i,
      'Debe enlazar a la sección #encargos');
    assert.match(html, /href=[\"']#donde[\"'][^>]*>\s*¿Dónde estamos\?\s*<\/a>/i,
      'Debe enlazar a la sección #donde');
    assert.match(html, /href=[\"']la-historia-del-bisabuelo-indalecio-sanz\.html[\"'][^>]*>\s*La historia del bisabuelo Indalecio Sanz\s*<\/a>/i,
      'Debe enlazar a la página monográfica del bisabuelo Indalecio');
  });

  it('las páginas interiores deben contener navegación cruzada hacia index.html', () => {
    const subpages = ['la-historia-del-bisabuelo-indalecio-sanz.html', 'nuevos_servicios.html'];

    for (const file of subpages) {
      const html = readHtml(file);
      assert.match(html, /index\.html#historia/i, `${file} debe enlazar de vuelta a index.html#historia`);
      assert.match(html, /index\.html#dulces/i, `${file} debe enlazar de vuelta a index.html#dulces`);
      assert.match(html, /index\.html#encargos/i, `${file} debe enlazar de vuelta a index.html#encargos`);
      assert.match(html, /index\.html#donde/i, `${file} debe enlazar de vuelta a index.html#donde`);
    }
  });

  it('el botón hamburguesa de navegación móvil debe estar presente', () => {
    const html = readHtml('index.html');
    assert.match(html, /<a\s+class=[\"']hamburger[\"']/i,
      'Debe existir el elemento del botón hamburguesa para la navegación responsive');
  });
});

describe('Tests de Navegación - Anclas Internas y Enlaces Relativos', () => {
  it('todas las secciones ancla (#) de index.html deben tener su elemento id correspondiente en el DOM', () => {
    const html = readHtml('index.html');
    const requiredSectionIds = ['historia', 'dulces', 'encargos', 'donde'];

    for (const secId of requiredSectionIds) {
      const idPattern = new RegExp(`id=[\"']${secId}[\"']`, 'i');
      assert.match(html, idPattern,
        `index.html debe contener un elemento con id="${secId}" para resolver el enlace ancla #${secId}`);
    }
  });

  it('todos los enlaces relativos .html deben apuntar a archivos existentes en disco', () => {
    const htmlFiles = [
      'index.html',
      'la-historia-del-bisabuelo-indalecio-sanz.html',
      'nuevos_servicios.html',
      'test.html'
    ];

    const brokenLinks = [];

    for (const file of htmlFiles) {
      const html = readHtml(file);
      const linkMatches = [...html.matchAll(/<a\s+[^>]*href=[\"']([^\"']+)[\"']/gi)];

      for (const m of linkMatches) {
        const rawHref = m[1].trim();

        // Ignorar externos, hashes puros, mailto, tel, javascript
        if (
          rawHref.startsWith('http://') ||
          rawHref.startsWith('https://') ||
          rawHref.startsWith('#') ||
          rawHref.startsWith('tel:') ||
          rawHref.startsWith('mailto:') ||
          rawHref.startsWith('javascript:')
        ) {
          continue;
        }

        const pathWithoutAnchor = rawHref.split('#')[0].split('?')[0];
        if (!pathWithoutAnchor) continue;

        const targetFile = path.resolve(ROOT_DIR, pathWithoutAnchor);
        if (!fs.existsSync(targetFile)) {
          brokenLinks.push({ file, link: rawHref, targetFile });
        }
      }
    }

    assert.equal(brokenLinks.length, 0,
      `Se encontraron enlaces HTML rotos:\n${JSON.stringify(brokenLinks, null, 2)}`);
  });
});

describe('Tests de Navegación - Enlaces de Contacto, Mapas y Redes Sociales', () => {
  it('el enlace de teléfono debe tener el formato tel: correcto', () => {
    const html = readHtml('index.html');
    assert.match(html, /href=[\"']tel:968402010[\"']/i,
      'Debe contener un enlace clickeable con protocolo tel:968402010 para llamadas móviles');
  });

  it('debe contener enlaces válidos a Google Maps e iframe embebido', () => {
    const html = readHtml('index.html');

    // Iframe embebido de Google Maps
    assert.match(html, /<iframe[^>]+src=[\"']https:\/\/www\.google\.com\/maps\/embed/i,
      'Debe contener el iframe interactivo de Google Maps embebido');

    // Enlace directo a la ficha de Google Maps
    assert.match(html, /google\.(?:com|es)\/maps/i,
      'Debe incluir enlaces para abrir la ruta en Google Maps');
  });

  it('debe contener enlaces oficiales a redes sociales con target="_blank"', () => {
    const html = readHtml('index.html');

    assert.match(html, /facebook\.com/i, 'Debe enlazar al perfil de Facebook');
    assert.match(html, /youtube\.com/i, 'Debe enlazar al canal de YouTube');

    const socialLinks = [...html.matchAll(/<a[^>]+class=[\"'][^\"']*wsite-social-item[^\"']*[\"'][^>]*>/gi)];
    for (const match of socialLinks) {
      assert.match(match[0], /target=[\"']_blank[\"']/i,
        'Los enlaces de redes sociales deben abrirse en pestaña nueva (target="_blank")');
    }
  });
});
