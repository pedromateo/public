const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function readHtml(filename) {
  const filePath = path.join(ROOT_DIR, filename);
  assert.ok(fs.existsSync(filePath), `El archivo requerido ${filename} debe existir en el proyecto.`);
  return fs.readFileSync(filePath, 'utf8');
}

describe('Tests de Contenido - Integridad Editorial y Estructura HTML', () => {
  const expectedHtmlFiles = [
    'index.html',
    'la-historia-del-bisabuelo-indalecio-sanz.html',
    'postrechino.html',
    'test.html'
  ];

  it('deben existir todos los archivos HTML principales del sitio', () => {
    for (const file of expectedHtmlFiles) {
      const fullPath = path.join(ROOT_DIR, file);
      assert.ok(fs.existsSync(fullPath), `Falta el archivo HTML: ${file}`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 500, `El archivo ${file} está anormalmente vacío o incompleto (tamaño: ${stat.size} bytes).`);
    }
  });

  it('todos los archivos HTML deben contener DOCTYPE, charset UTF-8, viewport y título', () => {
    for (const file of expectedHtmlFiles) {
      const html = readHtml(file);
      assert.match(html, /<!DOCTYPE\s+html>/i, `${file} debe declarar <!DOCTYPE html>`);
      assert.match(html, /<html\b/i, `${file} debe contener etiqueta <html>`);
      assert.match(html, /charset=utf-8/i, `${file} debe especificar codificación UTF-8`);
      assert.match(html, /name=[\"']viewport[\"']/i, `${file} debe incluir meta viewport responsive`);

      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      assert.ok(titleMatch, `${file} debe tener una etiqueta <title>`);
      assert.ok(titleMatch[1].trim().length > 0, `${file} debe tener un título no vacío`);
    }
  });

  it('index.html debe contener los textos de identidad, historia y patrimonio centenario', () => {
    const html = readHtml('index.html');

    // Nombre de marca
    assert.match(html, /Pasteler(?:í|&iacute;)a y Confiter(?:í|&iacute;)a Artesana Sanz/i,
      'Debe contener el nombre oficial de la marca');

    // Años de historia y generaciones
    assert.match(html, /120 a(?:ñ|&ntilde;)os de historia/i,
      'Debe mencionar los más de 120 años de historia');
    assert.match(html, /7 generaciones de confiteros/i,
      'Debe hacer referencia a las 7 generaciones familiares');

    // Nombres históricos
    assert.match(html, /Ezequiel/i, 'Debe mencionar a Ezequiel');
    assert.match(html, /Mar(?:í|&iacute;)a/i, 'Debe mencionar a María la confitera');
    assert.match(html, /Postrechino/i, 'Debe incluir el producto estrella Postrechino');

    // Ubicación y contacto
    assert.match(html, /Puerto Lumbreras/i, 'Debe indicar la localidad de Puerto Lumbreras');
    assert.match(html, /968\s*40\s*20\s*10/, 'Debe mostrar el teléfono de atención y pedidos');
    assert.match(html, /Mayor/i, 'Debe indicar la dirección en Calle Mayor');

    // Lema en la cabecera principal sin puntos
    assert.match(html, /La confiter(?:í|&iacute;)a artesana<\/span>\s*(?:<[^>]+>\s*)*La confiter(?:í|&iacute;)a de siempre<\/span>/i,
      'Debe contener el lema oficial "La confitería artesana" y "La confitería de siempre" sin puntos');

    // Contraste garantizado en el banner callout histórico
    assert.match(html, /sanz-callout-title[^>]*color:\s*#ffffff/i,
      'El título del callout debe tener color blanco explícito para garantizar contraste con el fondo magenta');
  });

  it('la página de historia del bisabuelo debe contener el texto del homenaje y obrador', () => {
    const html = readHtml('la-historia-del-bisabuelo-indalecio-sanz.html');

    assert.match(html, /Indalecio Sanz/i, 'Debe contener el nombre del bisabuelo Indalecio Sanz');
    assert.match(html, /Postrechino/i, 'Debe explicar la anatomía del Postrechino');
    assert.match(html, /obrador/i, 'Debe hablar del obrador artesanal');
    assert.match(html, /Calle Mayor/i, 'Debe situar el obrador en la calle Mayor');

    // No debe incluir fechas de publicación ni bloques innecesarios en la barra lateral
    assert.doesNotMatch(html, /class=[\"'][^\"']*date-text/i, 'No debe incluir fechas de publicación');
    assert.doesNotMatch(html, /class=[\"'][^\"']*blog-archive-list/i, 'No debe incluir la sección de Archivos');
    assert.doesNotMatch(html, /class=[\"'][^\"']*blog-category-list/i, 'No debe incluir la sección de Categorías');
    assert.doesNotMatch(html, /sidebar-obrador-box/i, 'No debe incluir la caja duplicada del obrador en la barra lateral');
  });

  it('postrechino.html debe ser la landing oficial del dulce estrella con todos sus bloques y Schema.org', () => {
    const html = readHtml('postrechino.html');

    // Título y branding oficial
    assert.match(html, /<title>.*?El Postrechino.*?Pasteler(?:í|&iacute;)a (?:y Confiter(?:í|&iacute;)a )?Sanz.*?<\/title>/i, 'Debe contener título oficial con Postrechino y Pastelería Sanz');

    // Llamadas a la acción principales
    assert.match(html, /https:\/\/wa\.me\/34621281600/i, 'Debe incluir enlace de pedido por WhatsApp');
    assert.match(html, /href=[\"']tel:968402010[\"']/i, 'Debe incluir teléfono para encargos');

    // 5 Sentidos
    assert.match(html, /Vista/i, 'Debe incluir sentido de la Vista');
    assert.match(html, /Olfato/i, 'Debe incluir sentido del Olfato');
    assert.match(html, /Tacto/i, 'Debe incluir sentido del Tacto');
    assert.match(html, /O(?:í|&iacute;)do/i, 'Debe incluir sentido del Oído');
    assert.match(html, /Gusto/i, 'Debe incluir sentido del Gusto');

    // 6 Capas de anatomía
    assert.match(html, /Base de Hojaldre/i, 'Debe incluir capa 1: base de hojaldre');
    assert.match(html, /Crema Pastelera/i, 'Debe incluir capa 2: crema pastelera');
    assert.match(html, /Merengue Italiano/i, 'Debe incluir capa 3: merengue italiano');
    assert.match(html, /Emborrizado/i, 'Debe incluir capa 4: emborrizado tostado');
    assert.match(html, /Tostado Tradicional a la Pala/i, 'Debe incluir capa 5: tostado a la pala');
    assert.match(html, /Corona de Fresa/i, 'Debe incluir capa 6: corona de fresa');

    // Km 0 e ingredientes nobles
    assert.match(html, /Km\s*0/i, 'Debe mencionar ingredientes Km 0');

    // Historia y doble denominación
    assert.match(html, /El Obispo/i, 'Debe mencionar la doble denominación El Obispo en Lorca');
    assert.match(html, /Calle Mayor/i, 'Debe ubicar la tradición en Calle Mayor');

    // Maridajes gourmet
    assert.match(html, /Helado Artesan[oa] de Turr(?:ó|&oacute;)n/i, 'Debe incluir maridaje con helado de turrón');
    assert.match(html, /Caf(?:é|&eacute;).*?Mocca/i, 'Debe incluir maridaje con café de especialidad mocca');
    assert.match(html, /Champagne/i, 'Debe incluir maridaje con champagne brut');

    // Microdatos Schema.org Product
    assert.match(html, /application\/ld\+json/i, 'Debe incluir JSON-LD');
    assert.match(html, /@type[\"']\s*:\s*[\"']Product[\"']/i, 'Debe contener Schema.org tipo Product');
    assert.match(html, /Postrechino/i, 'El producto debe nombrarse Postrechino en JSON-LD');
  });

  it('nuevos_servicios.html debe estar eliminada y no existir en el sitio', () => {
    const fullPath = path.join(ROOT_DIR, 'nuevos_servicios.html');
    assert.strictEqual(fs.existsSync(fullPath), false, 'nuevos_servicios.html no debe existir en el repositorio');
  });
});

describe('Tests de Contenido - Integridad de Recursos Multimedia y Dependencias', () => {
  it('el logotipo oficial debe existir en disco con peso válido', () => {
    const logoPath = path.join(ROOT_DIR, 'uploads/1/0/8/6/10868401/1410608938.png');
    assert.ok(fs.existsSync(logoPath), 'El archivo del logotipo 1410608938.png debe existir.');
    const stat = fs.statSync(logoPath);
    assert.ok(stat.size > 2000, `El logotipo debe tener un peso válido (tamaño: ${stat.size} bytes).`);
  });

  it('todas las imágenes referenciadas en los HTML locales deben existir en disco', () => {
    const htmlFiles = ['index.html', 'la-historia-del-bisabuelo-indalecio-sanz.html', 'postrechino.html'];
    const missingImages = [];

    for (const file of htmlFiles) {
      const html = readHtml(file);
      const imgMatches = [...html.matchAll(/<img[^>]+src=[\"']([^\"']+)[\"']/gi)];

      for (const match of imgMatches) {
        const rawSrc = match[1];
        if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('//') || rawSrc.startsWith('data:')) {
          continue;
        }

        const cleanSrc = rawSrc.split('?')[0].split('#')[0];
        const localPath = path.resolve(ROOT_DIR, cleanSrc);

        if (!fs.existsSync(localPath)) {
          missingImages.push({ file, src: rawSrc, resolved: cleanSrc });
        } else {
          const stat = fs.statSync(localPath);
          assert.ok(stat.size > 0, `La imagen ${cleanSrc} existe pero tiene 0 bytes.`);
        }
      }
    }

    assert.equal(missingImages.length, 0,
      `Se encontraron imágenes locales rotas o inexistentes:\n${JSON.stringify(missingImages, null, 2)}`);
  });

  it('los scripts JavaScript locales deben existir y tener contenido', () => {
    const expectedScripts = [
      'jquery-1.11.2.min.js',
      'files/theme/custom.js',
      'files/theme/plugins.js',
      'files/templateArtifacts.js'
    ];

    for (const relScript of expectedScripts) {
      const scriptPath = path.join(ROOT_DIR, relScript);
      assert.ok(fs.existsSync(scriptPath), `Falta el archivo script requerido: ${relScript}`);
      const stat = fs.statSync(scriptPath);
      // templateArtifacts can be small/stub, others must have content
      if (relScript.endsWith('templateArtifacts.js')) {
        assert.ok(stat.size >= 0);
      } else {
        assert.ok(stat.size > 1000, `El script ${relScript} parece truncado (${stat.size} bytes).`);
      }
    }
  });

  it('los estilos CSS y las fuentes tipográficas del tema deben existir', () => {
    const cssPath = path.join(ROOT_DIR, 'files/main_style.css');
    assert.ok(fs.existsSync(cssPath), 'Debe existir files/main_style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Verificar las URLs de fuentes locales en el CSS
    const fontMatches = [...cssContent.matchAll(/url\([\"']?(theme\/fonts\/[^\"')?#]+)[^\"')]*[\"']?\)/gi)];
    assert.ok(fontMatches.length > 0, 'files/main_style.css debe declarar fuentes del tema.');

    const missingFonts = [];
    for (const m of fontMatches) {
      const relFont = m[1];
      const fullFontPath = path.join(ROOT_DIR, 'files', relFont);
      if (!fs.existsSync(fullFontPath)) {
        missingFonts.push(relFont);
      }
    }

    assert.equal(missingFonts.length, 0,
      `Fuentes referenciadas en main_style.css faltantes:\n${missingFonts.join('\n')}`);
  });
});

describe('Tests de Limpieza e Independencia de Plataforma (Weebly / EditMySite)', () => {
  const htmlFiles = [
    'index.html',
    'la-historia-del-bisabuelo-indalecio-sanz.html',
    'postrechino.html',
    'test.html'
  ];

  it('ninguna página debe contener publicidad de cuenta gratuita de Weebly', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      assert.doesNotMatch(html, /Create a (?:<a[^>]*>)?free web site/i,
        `${file} no debe contener el pie publicitario de Weebly`);
    }
  });

  it('el pie de página debe contener la firma de autoría de Pastelería Sanz', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      assert.match(html, /class=[\"']footer[\"'][^>]*>.*?(?:Pasteler(?:í|&iacute;)a y Confiter(?:í|&iacute;)a Artesana Sanz|Confiter(?:í|&iacute;)a Sanz)/i,
        `${file} debe incluir el pie de página oficial de Confitería Sanz`);
    }
  });

  it('ninguna página debe contener scripts ni trackers de StatCounter para Weebly', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      assert.doesNotMatch(html, /StatCounter Code for Weebly/i,
        `${file} no debe contener trackers de StatCounter`);
      assert.doesNotMatch(html, /statcounter\.com/i,
        `${file} no debe incluir llamadas a statcounter.com`);
    }
  });

  it('ninguna página debe realizar llamadas a editmysite.com (recursos 100% locales)', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      assert.doesNotMatch(html, /editmysite\.com/i,
        `${file} no debe depender del CDN de editmysite.com`);
    }
  });

  it('todas las dependencias vendor locales deben existir en disco y no estar vacías', () => {
    const vendorFiles = [
      'files/vendor/sites.css',
      'files/vendor/fancybox.css',
      'files/vendor/social-icons.css',
      'files/vendor/montserrat.css',
      'files/vendor/stl.js',
      'files/vendor/main.js'
    ];

    for (const relVendor of vendorFiles) {
      const vendorPath = path.join(ROOT_DIR, relVendor);
      assert.ok(fs.existsSync(vendorPath), `Falta el archivo vendor localizado: ${relVendor}`);
      const stat = fs.statSync(vendorPath);
      assert.ok(stat.size > 500, `El archivo vendor ${relVendor} no tiene tamaño suficiente (${stat.size} bytes).`);
    }
  });
});

describe('Tests de Compatibilidad con GitHub Pages', () => {
  const htmlFiles = [
    'index.html',
    'la-historia-del-bisabuelo-indalecio-sanz.html',
    'postrechino.html',
    'test.html'
  ];

  it('debe existir el archivo .nojekyll en la raíz para evitar que Jekyll ignore directorios', () => {
    const nojekyllPath = path.join(ROOT_DIR, '.nojekyll');
    assert.ok(fs.existsSync(nojekyllPath), 'Debe existir .nojekyll en la raíz del proyecto.');
  });

  it('los enlaces y recursos locales no deben usar barras absolutas al inicio (/...) para ser compatibles con subdirectorios de GitHub Pages', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      // Validar src="/..." excepto protocolo "//"
      const slashSrcs = [...html.matchAll(/src=[\"'](\/[^\/\"'][^\"']*)[\"']/gi)];
      assert.equal(slashSrcs.length, 0,
        `${file} contiene rutas de recursos con barra absoluta (deben ser relativas para GitHub Pages):\n` +
        slashSrcs.map(m => m[1]).join('\n'));

      // Validar href="/..." excepto protocolo "//"
      const slashHrefs = [...html.matchAll(/href=[\"'](\/[^\/\"'][^\"']*)[\"']/gi)];
      assert.equal(slashHrefs.length, 0,
        `${file} contiene enlaces con barra absoluta (deben ser relativos para GitHub Pages):\n` +
        slashHrefs.map(m => m[1]).join('\n'));
    }
  });

  it('no deben existir llamadas externas a recursos activos vía http:// no seguro (prevención de Mixed Content en HTTPS)', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      const insecureActiveResources = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)=[\"']http:\/\/[^\"']+[\"']/gi)];
      assert.equal(insecureActiveResources.length, 0,
        `${file} contiene scripts o estilos HTTP no seguros que fallarían en GitHub Pages HTTPS:\n` +
        insecureActiveResources.map(m => m[0]).join('\n'));
    }
  });
});

describe('Tests de Vídeos de YouTube y Recursos Multimedia Embebidos', () => {
  it('los vídeos embebidos de YouTube deben usar HTTPS, dominio seguro y atributos requeridos', () => {
    const html = readHtml('index.html');
    const iframes = [...html.matchAll(/<iframe[^>]*youtube[^>]*>.*?<\/iframe>/gi)];

    assert.equal(iframes.length, 6, 'index.html debe contener exactamente 6 vídeos de YouTube embebidos');

    for (const match of iframes) {
      const tag = match[0];
      // HTTPS y no-cookie o youtube estándar seguro
      assert.match(tag, /src=[\"']https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//i,
        'El iframe de YouTube debe usar HTTPS y dominio embed válido');
      assert.doesNotMatch(tag, /src=[\"']http:\/\//i,
        'El iframe de YouTube no debe usar HTTP no seguro');
      assert.doesNotMatch(tag, /wmode=opaque/i,
        'El iframe de YouTube no debe incluir el parámetro obsoleto Flash wmode=opaque');
      assert.match(tag, /referrerpolicy=[\"']strict-origin-when-cross-origin[\"']/i,
        'Debe incluir referrerpolicy="strict-origin-when-cross-origin" para validación de YouTube');
      assert.match(tag, /allowfullscreen/i,
        'Debe incluir atributo allowfullscreen');
      assert.match(tag, /title=[\"'][^\"']+[\"']/i,
        'Debe incluir atributo title descriptivo');
    }
  });

  it('todas las páginas deben incluir la meta etiqueta referrer para autenticar reproductores y evitar error 153', () => {
    const htmlFiles = [
      'index.html',
      'la-historia-del-bisabuelo-indalecio-sanz.html',
      'postrechino.html',
      'test.html'
    ];
    for (const file of htmlFiles) {
      const html = readHtml(file);
      assert.match(html, /<meta\s+name=[\"']referrer[\"']\s+content=[\"']strict-origin-when-cross-origin[\"']/i,
        `${file} debe contener meta referrer para permitir la reproducción segura de vídeo`);
    }
  });

  it('deben existir las miniaturas locales para los 6 vídeos como soporte offline / file://', () => {
    const videoIds = ['xYcabxUmNBs', 'tvYBjVWUmIQ', 'tS27pHwHMno', 'B8flmEw1qC8', 'rSaoo7vJrL8', '8EMl2xQvq1s'];
    for (const vid of videoIds) {
      const thumbPath = path.join(ROOT_DIR, 'uploads/videos', `${vid}.jpg`);
      assert.ok(fs.existsSync(thumbPath), `Falta la miniatura local: uploads/videos/${vid}.jpg`);
      const stat = fs.statSync(thumbPath);
      assert.ok(stat.size > 5000, `La miniatura ${vid}.jpg tiene tamaño insuficiente (${stat.size} bytes).`);
    }
  });
});

describe('Tests de Favicon, Pie de Página Unificado y Organización de Capítulos', () => {
  const htmlFiles = [
    'index.html',
    'la-historia-del-bisabuelo-indalecio-sanz.html',
    'postrechino.html',
    'test.html'
  ];

  it('deben existir todos los archivos de favicon generados', () => {
    const faviconFiles = ['favicon.ico', 'favicon.png', 'favicon.jpeg', 'apple-touch-icon.png'];
    for (const fav of faviconFiles) {
      const p = path.join(ROOT_DIR, fav);
      assert.ok(fs.existsSync(p), `El favicon ${fav} debe existir en la raíz.`);
      assert.ok(fs.statSync(p).size > 100, `El favicon ${fav} no debe estar vacío.`);
    }
  });

  it('todas las páginas deben incluir los enlaces a favicon y apple-touch-icon en el head', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      assert.match(html, /<link[^>]+rel=[\"']icon[\"'][^>]+href=[\"']favicon\.png[\"']/i,
        `${file} debe enlazar favicon.png`);
      assert.match(html, /<link[^>]+rel=[\"']apple-touch-icon[\"'][^>]+href=[\"']apple-touch-icon\.png[\"']/i,
        `${file} debe enlazar apple-touch-icon.png`);
    }
  });

  it('todas las páginas deben contener el pie de página profesional unificado (.site-footer)', () => {
    for (const file of htmlFiles) {
      const html = readHtml(file);
      assert.match(html, /class=[\"'][^\"']*site-footer[^\"']*[\"']/i,
        `${file} debe contener el componente .site-footer unificado`);
      assert.match(html, /Pasteler(?:í|&iacute;)a\s+(?:y|&amp;|&)\s+Confiter(?:í|&iacute;)a\s+Sanz/i,
        `${file} debe contener la identidad oficial en el footer`);
      assert.match(html, /href=[\"']tel:968402010[\"']/i,
        `${file} debe incluir el teléfono clickeable 968 40 20 10`);
      assert.match(html, /<h4[^>]*class=[\"'][^\"']*site-footer-heading[^\"']*[\"'][^>]*>\s*Navegaci(?:ó|&oacute;)n\s*<\/h4>/i,
        `${file} debe incluir el encabezado "Navegación" en el footer`);
      assert.match(html, /<h4[^>]*class=[\"'][^\"']*site-footer-heading[^\"']*[\"'][^>]*>\s*Contacto\s*<\/h4>/i,
        `${file} debe incluir el encabezado "Contacto" en el footer`);
      assert.match(html, /Calle\s+Mayor/i,
        `${file} debe incluir la dirección del obrador`);
      assert.match(html, /Puerto\s+Lumbreras/i,
        `${file} debe mencionar la localidad`);
    }
  });

  it('la página del bisabuelo debe contener los capítulos 1 al 6 ordenados cronológicamente y enlazables', () => {
    const html = readHtml('la-historia-del-bisabuelo-indalecio-sanz.html');

    // Verificar que existen los anclas id="capitulo-1" a id="capitulo-6"
    for (let i = 1; i <= 6; i++) {
      assert.match(html, new RegExp(`id=[\"']capitulo-${i}[\"']`, 'i'),
        `Debe existir el ancla id="capitulo-${i}" para enlace directo`);
      assert.match(html, new RegExp(`href=[\"']#capitulo-${i}[\"']`, 'i'),
        `El índice debe enlazar a #capitulo-${i}`);
    }

    // Verificar orden secuencial en el DOM: 1, 2, 3, 4, 5, 6
    const pos1 = html.indexOf('id="capitulo-1"');
    const pos2 = html.indexOf('id="capitulo-2"');
    const pos3 = html.indexOf('id="capitulo-3"');
    const pos4 = html.indexOf('id="capitulo-4"');
    const pos5 = html.indexOf('id="capitulo-5"');
    const pos6 = html.indexOf('id="capitulo-6"');

    assert.ok(pos1 > 0 && pos2 > pos1 && pos3 > pos2 && pos4 > pos3 && pos5 > pos4 && pos6 > pos5,
      `Los capítulos deben estar ordenados cronológicamente de 1 a 6 (posiciones: ${pos1}, ${pos2}, ${pos3}, ${pos4}, ${pos5}, ${pos6})`);
  });
});
