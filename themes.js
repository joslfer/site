(() => {

  // Esta parte de la página web la ha hecho un modelo de IA. 


  // ───────── Configuración ─────────

  // true = se muestra siempre
  // false = solo del 29 al 31 de octubre
  const FORZAR = false;

  // ───────── Desapariciones aleatorias ─────────

  // Cada cuántos segundos (aleatorio entre min y max) empieza a desaparecer
  const DESAPARECE_CADA_MIN_S = 12;
  const DESAPARECE_CADA_MAX_S = 30;

  // Cuántos segundos (aleatorio entre min y max) permanece desaparecido
  const DESAPARECE_DURA_MIN_S = 3;
  const DESAPARECE_DURA_MAX_S = 9;

  // ───────── Aura (zona alrededor del fantasma) ─────────

  // Anchura máxima del aura en píxeles
  const TAMANO_AURA = 760;

  // Cuánto más ancha que alta es el aura (1 = redonda, 1.5 = bastante achatada)
  const ASPECTO_AURA = 1.5;

  // Cuánto se deforma el contorno:
  // 0 = elipse perfecta, 0.5 = bastante irregular, 0.8 = muy retorcido
  const IRREGULARIDAD = 0.6;

  // Balanceo lento de las formas: grados a cada lado y segundos por ciclo
  const BALANCEO = 14;
  const SEG_BALANCEO_OSCURIDAD = 37;
  const SEG_BALANCEO_NUBES = 29;

  // El contorno se expande y se encoge suavemente
  const RESPIRACION = true;

  // Resolución interna de las formas (más alto = más suave, más lento al cargar)
  const RESOLUCION_AURA = 240;

  // Oscuridad alrededor del fantasma
  const OSCURIDAD = true;
  const COLOR_OSCURIDAD = [2, 6, 20];
  const OSCURIDAD_CENTRO = 0.45;   // justo detrás del fantasma
  const OSCURIDAD_ANILLO = 0.8;    // zona más oscura, alrededor
  const POSICION_ANILLO = 30;      // % del radio donde está lo más oscuro

  // Nubes / niebla alrededor del fantasma
  const NUBES = true;
  const INTENSIDAD_NUBES = 0.8;
  const NUCLEO_NUBES = 35;         // % del radio donde las nubes empiezan a difuminarse

  // Estirado vertical del ruido de las nubes:
  // 1 = celdas cuadradas, 2 = vetas muy horizontales, <1 = más verticales
  const ESTIRADO_NUBES = 1.8;

  // Rayos dentro del aura
  const RELAMPAGOS = true;
  const RAYOS_MIN_MS = 2200;       // tiempo mínimo entre tormentas
  const RAYOS_MAX_MS = 7000;       // tiempo máximo entre tormentas
  const COLOR_RAYO = '#cfe0ff';    // núcleo del rayo
  const COLOR_BRILLO_RAYO = '#6f95ff'; // resplandor del rayo


  // ───────── Fantasma ─────────

  const ANCHO = 74;
  const ALTO = Math.round(ANCHO * 1.3);

  const VEL_DERIVA = 0.8;
  const VEL_EMBESTIDA = 16;
  const VEL_HUIDA = 22;

  const RADIO_HUIDA = 150;


  // ───────── Control de fecha ─────────

  const hoy = new Date();

  const mes = hoy.getMonth();
  const dia = hoy.getDate();

  const esHalloween =
    mes === 9 &&
    dia >= 29 &&
    dia <= 31;

  if (!FORZAR && !esHalloween) return;


  const reducir =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  // ───────── Ayudas matemáticas ─────────

  const sua = (t) => t * t * (3 - 2 * t);

  const acotar = (v, min, max) =>
    Math.max(min, Math.min(max, v));


  // ───────── Ruido de valor (fractal) ─────────

  function crearRuido(semilla, octavas, base) {

    let s = semilla >>> 0;

    const azar = () => {

      s =
        (Math.imul(s, 1664525) + 1013904223)
        >>> 0;

      return s / 4294967296;
    };


    const redes = [];

    for (let o = 0; o < octavas; o++) {

      const n = base * (1 << o);

      const datos =
        new Float32Array((n + 1) * (n + 1));

      for (let i = 0; i < datos.length; i++) {
        datos[i] = azar();
      }

      redes.push({ n, datos });
    }


    // x, y en [0, 1]  →  devuelve ~[0, 1]
    return (x, y) => {

      let suma = 0;
      let amp = 0.5;
      let total = 0;

      for (const red of redes) {

        const u = x * red.n;
        const v = y * red.n;

        const ix = Math.min(Math.floor(u), red.n - 1);
        const iy = Math.min(Math.floor(v), red.n - 1);

        const fx = sua(u - ix);
        const fy = sua(v - iy);

        const w = red.n + 1;

        const a = red.datos[iy * w + ix];
        const b = red.datos[iy * w + ix + 1];
        const c = red.datos[(iy + 1) * w + ix];
        const d = red.datos[(iy + 1) * w + ix + 1];

        suma +=
          (
            (a + (b - a) * fx) * (1 - fy) +
            (c + (d - c) * fx) * fy
          ) * amp;

        total += amp;

        amp *= 0.5;
      }

      return suma / total;
    };
  }


  // ───────── Forma irregular del aura ─────────
  // Genera una imagen cuadrada cuyo canal alfa tiene un contorno
  // deformado por ruido, con un perfil de intensidad radial.
  // El contorno base es una elipse más ancha que alta.

  function generarAura(semilla, tam, color, perfil) {

    const ruido = crearRuido(semilla, 5, 3);
    const fino = crearRuido(semilla + 101, 4, 6);

    const canvas =
      document.createElement('canvas');

    canvas.width = tam;
    canvas.height = tam;

    const ctx = canvas.getContext('2d');

    const imagen = ctx.createImageData(tam, tam);

    const datos = imagen.data;


    for (let py = 0; py < tam; py++) {

      const y = (py + 0.5) / tam;

      for (let px = 0; px < tam; px++) {

        const x = (px + 0.5) / tam;

        // Distancia elíptica: el eje vertical "cuenta" más
        const d =
          Math.hypot(
            (x - 0.5) * 2,
            (y - 0.5) * 2 * ASPECTO_AURA
          );

        if (d >= 1) continue;


        // Radio local: varía según la dirección
        const n = ruido(x, y);

        const nn = acotar((n - 0.3) / 0.4, 0, 1);

        const radioLocal =
          1 - IRREGULARIDAD * (1 - nn);

        const de = d / radioLocal;


        let a = perfil(de);

        // Textura fina: zonas más ralas y más densas
        a *= acotar(0.55 + 0.9 * fino(x, y), 0.3, 1);

        // Garantiza que nunca se corte en el borde de la imagen
        a *= 1 - sua(acotar((d - 0.85) / 0.15, 0, 1));


        const i = (py * tam + px) * 4;

        datos[i] = color[0];
        datos[i + 1] = color[1];
        datos[i + 2] = color[2];
        datos[i + 3] = acotar(a, 0, 1) * 255;
      }
    }


    ctx.putImageData(imagen, 0, 0);

    return canvas;
  }


  // Perfiles de intensidad según la distancia local (0 = centro, 1 = borde)

  function perfilOscuridad(de) {

    if (de >= 1) return 0;

    const p = POSICION_ANILLO / 100;

    if (de < p) {

      return (
        OSCURIDAD_CENTRO +
        (OSCURIDAD_ANILLO - OSCURIDAD_CENTRO) *
        sua(de / p)
      );
    }

    return OSCURIDAD_ANILLO * (1 - sua((de - p) / (1 - p)));
  }


  function perfilMascara(de) {

    const nucleo = NUCLEO_NUBES / 100;

    if (de >= 1) return 0;

    if (de <= nucleo) return 1;

    return 1 - sua((de - nucleo) / (1 - nucleo));
  }


  const urlOscuridad =
    OSCURIDAD
      ? generarAura(
          11,
          RESOLUCION_AURA,
          COLOR_OSCURIDAD,
          perfilOscuridad
        ).toDataURL('image/png')
      : '';


  const urlMascara =
    NUBES
      ? generarAura(
          37,
          RESOLUCION_AURA,
          [0, 0, 0],
          perfilMascara
        ).toDataURL('image/png')
      : '';


  // ───────── Generación de nubes ─────────

  function generarNubes(
    semilla,
    anchoPx,
    altoPx,
    nucleo,
    borde,
    alfaMax
  ) {

    let s = semilla >>> 0;

    const azar = () => {

      s =
        (Math.imul(s, 1664525) + 1013904223)
        >>> 0;

      return s / 4294967296;
    };


    const OCTAVAS = 5;
    const redes = [];


    for (let o = 0; o < OCTAVAS; o++) {

      // Más celdas en vertical que en horizontal
      // → las celdas quedan anchas y las vetas horizontales
      const cx = 3 * (1 << o);
      const cy = Math.max(1, Math.round(cx * ESTIRADO_NUBES));

      const datos =
        new Float32Array(cx * (cy + 1));

      for (let i = 0; i < datos.length; i++) {
        datos[i] = azar();
      }

      redes.push({ cx, cy, datos });
    }


    const fade = (t) =>
      t * t * (3 - 2 * t);


    const muestra = (red, x, y) => {

      const u = x * red.cx;
      const v = y * red.cy;

      const ix = Math.floor(u);
      const iy = Math.floor(v);

      const fx = fade(u - ix);
      const fy = fade(v - iy);

      const x0 = ix % red.cx;
      const x1 = (ix + 1) % red.cx;

      const y0 = Math.min(iy, red.cy);
      const y1 = Math.min(iy + 1, red.cy);

      const a = red.datos[y0 * red.cx + x0];
      const b = red.datos[y0 * red.cx + x1];
      const c = red.datos[y1 * red.cx + x0];
      const d = red.datos[y1 * red.cx + x1];

      return (
        (a + (b - a) * fx) * (1 - fy) +
        (c + (d - c) * fx) * fy
      );
    };


    const canvas =
      document.createElement('canvas');

    canvas.width = anchoPx;
    canvas.height = altoPx;

    const ctx = canvas.getContext('2d');

    const imagen =
      ctx.createImageData(anchoPx, altoPx);

    const px = imagen.data;


    for (let py = 0; py < altoPx; py++) {

      const y = py / altoPx;

      for (let pxx = 0; pxx < anchoPx; pxx++) {

        const x = pxx / anchoPx;


        // Ruido fractal

        let n = 0;
        let amplitud = 0.5;
        let total = 0;

        for (let o = 0; o < OCTAVAS; o++) {

          n += muestra(redes[o], x, y) * amplitud;

          total += amplitud;

          amplitud *= 0.5;
        }

        n /= total;

        // Densidad uniforme (no hay "arriba" ni "abajo")
        n += 0.01;


        // Densidad

        let dens =
          Math.min(1, Math.max(0, (n - 0.42) / 0.32));

        dens = dens * dens * (3 - 2 * dens);


        // Transición entre núcleo y borde

        let m =
          Math.min(1, Math.max(0, (dens - 0.1) / 0.8));

        m = m * m * (3 - 2 * m);


        const i = (py * anchoPx + pxx) * 4;

        px[i]     = borde[0] + (nucleo[0] - borde[0]) * m;
        px[i + 1] = borde[1] + (nucleo[1] - borde[1]) * m;
        px[i + 2] = borde[2] + (nucleo[2] - borde[2]) * m;

        px[i + 3] =
          Math.pow(dens, 0.85) *
          alfaMax *
          255;
      }
    }


    ctx.putImageData(imagen, 0, 0);

    return canvas;
  }


  // ───────── Capas de nubes ─────────

  function crearCapaNubes(
    clase,
    semilla,
    nucleo,
    borde,
    alfaMax,
    segundos
  ) {

    const base =
      generarNubes(semilla, 256, 256, nucleo, borde, alfaMax);

    const copia =
      document.createElement('canvas');

    copia.width = base.width;
    copia.height = base.height;

    copia.getContext('2d').drawImage(base, 0, 0);


    const capa =
      document.createElement('div');

    capa.className = `hw-capa ${clase}`;

    if (!reducir) {
      capa.style.animationDuration = `${segundos}s`;
    }

    capa.append(base, copia);

    return capa;
  }


  // ───────── Estilos ─────────

  const mitad = TAMANO_AURA / 2;

  const estilo =
    document.createElement('style');


  estilo.textContent = `

    /* ───────── Contenedor: ocupa toda la altura de la página ─────────
       Todo lo del fantasma vive aquí dentro, en coordenadas de página,
       así recorre la página entera (no solo el viewport) y se recorta
       en los bordes del documento sin crear scroll extra. */

    .hw-contenedor {

      position: absolute;

      top: 0;
      left: 0;

      width: 100%;
      height: 100%;

      overflow: hidden;

      z-index: 9997;

      pointer-events: none;
    }


    .hw-fantasma {

      position: absolute;

      top: 0;
      left: 0;

      z-index: 2;

      width: ${ANCHO}px;
      height: ${ALTO}px;

      pointer-events: none;

      will-change: transform, opacity;

      filter: drop-shadow(0 0 10px rgba(190, 195, 200, 0.55));
    }


    .hw-fantasma svg {

      display: block;

      width: 100%;
      height: 100%;

      overflow: visible;
    }


    /* ───────── Aura: sigue al fantasma ───────── */

    .hw-aura {

      position: absolute;

      top: 0;
      left: 0;

      width: ${TAMANO_AURA}px;
      height: ${TAMANO_AURA}px;

      z-index: 1;

      pointer-events: none;

      will-change: transform, opacity;
    }


    /* ───────── Oscuridad irregular ───────── */

    .hw-oscuridad {

      position: absolute;

      inset: 0;

      background-image: url(${urlOscuridad});
      background-size: 100% 100%;
      background-repeat: no-repeat;

      will-change: rotate, scale;

      animation:
        hw-balanceo ${SEG_BALANCEO_OSCURIDAD}s ease-in-out infinite alternate
        ${RESPIRACION ? `, hw-respira 11s ease-in-out infinite alternate` : ''};
    }


    /* ───────── Nubes: la máscara se balancea ───────── */

    .hw-nubes {

      position: absolute;

      inset: 0;

      opacity: ${INTENSIDAD_NUBES};

      -webkit-mask-image: url(${urlMascara});
      mask-image: url(${urlMascara});

      -webkit-mask-size: 100% 100%;
      mask-size: 100% 100%;

      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;

      will-change: rotate, scale;

      animation:
        hw-balanceo ${SEG_BALANCEO_NUBES}s ease-in-out infinite alternate
        ${RESPIRACION ? `, hw-respira 8s ease-in-out infinite alternate-reverse` : ''};
    }


    /* El contenido hace el balanceo contrario, así las vetas
       de las nubes siempre quedan horizontales */

    .hw-nubes-in {

      position: absolute;

      inset: 0;

      overflow: hidden;

      will-change: rotate;

      animation:
        hw-balanceo ${SEG_BALANCEO_NUBES}s ease-in-out infinite alternate-reverse;
    }


    .hw-capa {

      position: absolute;

      top: 0;
      left: 0;

      width: 200%;
      height: 100%;

      display: flex;

      will-change: transform;

      animation: hw-nubes-avanzan 20s linear infinite;
    }


    .hw-capa canvas {

      flex: none;

      display: block;

      width: 50%;
      height: 100%;
    }


    .hw-capa-contra {

      animation-direction: reverse;
    }


    /* ───────── Rayos ───────── */

    .hw-rayos {

      position: absolute;

      inset: 0;

      width: 100%;
      height: 100%;

      overflow: visible;

      filter:
        drop-shadow(0 0 5px ${COLOR_BRILLO_RAYO})
        drop-shadow(0 0 16px ${COLOR_BRILLO_RAYO});
    }


    .hw-relampago {

      position: absolute;

      inset: 0;

      opacity: 0;

      background:
        radial-gradient(
          ellipse 50% 35%
          at var(--hw-rx, 50%) var(--hw-ry, 50%),
          rgba(190, 210, 255, 0.55),
          rgba(190, 210, 255, 0) 70%
        );
    }


    ${reducir
      ? '.hw-capa, .hw-oscuridad, .hw-nubes, .hw-nubes-in { animation: none; }'
      : ''}


    @keyframes hw-nubes-avanzan {

      from { transform: translate3d(0, 0, 0); }

      to   { transform: translate3d(-50%, 0, 0); }
    }


    @keyframes hw-balanceo {

      from { rotate: -${BALANCEO}deg; }

      to   { rotate: ${BALANCEO}deg; }
    }


    @keyframes hw-respira {

      from { scale: 0.9; }

      to   { scale: 1.05; }
    }

  `;


  document.head.appendChild(estilo);


  // ───────── Contenedor ─────────

  const contenedor =
    document.createElement('div');

  contenedor.className = 'hw-contenedor';

  contenedor.setAttribute('aria-hidden', 'true');


  // Medidas de la página (en coordenadas de documento)

  let anchoPag = document.documentElement.clientWidth;
  let altoPag = window.innerHeight;


  function medirPagina() {

    // Se oculta un instante el contenedor para que no influya en la medida
    // (si no, la página nunca podría volver a encogerse)

    const visibilidadAntes = contenedor.style.display;

    contenedor.style.display = 'none';


    const doc = document.documentElement;
    const body = document.body;


    anchoPag = doc.clientWidth;

    altoPag =
      Math.max(
        doc.scrollHeight,
        body ? body.scrollHeight : 0,
        window.innerHeight
      );


    contenedor.style.display = visibilidadAntes;

    contenedor.style.height = altoPag + 'px';
  }


  // ───────── Fantasma ─────────

  const fantasma =
    document.createElement('div');

  fantasma.className = 'hw-fantasma';

  fantasma.setAttribute('aria-hidden', 'true');


  fantasma.innerHTML = `

    <svg
      viewBox="0 0 100 130"
      xmlns="http://www.w3.org/2000/svg"
    >

      <defs>

        <linearGradient
          id="hw-cuerpo"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >

          <stop
            offset="0"
            stop-color="#d5d8dc"
            stop-opacity="0.95"
          />

          <stop
            offset="0.55"
            stop-color="#aeb3b8"
            stop-opacity="0.88"
          />

          <stop
            offset="1"
            stop-color="#777d83"
            stop-opacity="0.6"
          />

        </linearGradient>


        <filter
          id="hw-bordes"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >

          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03 0.07"
            numOctaves="2"
            seed="4"
            result="ruido"
          />

          <feDisplacementMap
            in="SourceGraphic"
            in2="ruido"
            scale="5"
          />

        </filter>

      </defs>


      <path
        filter="url(#hw-bordes)"
        fill="url(#hw-cuerpo)"
        d="
          M50 5
          C28 5 14 22 14 46
          C14 64 10 78 8 94
          C7 104 6 112 9 120
          C13 126 17 116 21 109
          C24 105 27 113 31 121
          C34 127 39 119 42 112
          C45 107 49 115 53 124
          C56 129 60 120 64 111
          C67 106 71 113 75 120
          C78 125 83 117 86 110
          C89 104 92 100 91 92
          C89 78 86 64 86 46
          C86 22 72 5 50 5 Z
        "
      />


      <g
        fill="none"
        stroke="#666b70"
        stroke-opacity="0.35"
        stroke-width="1.3"
        stroke-linecap="round"
      >

        <path d="M29 72 C32 86 29 99 33 113" />

        <path d="M51 78 C52 92 49 102 53 118" />

        <path d="M71 68 C69 83 73 96 70 109" />

        <path d="M20 58 C23 66 22 74 24 82" />

      </g>


      <!-- Ojos -->

      <path
        fill="#070b16"
        d="
          M32 36
          C28 40 28 52 33 58
          C37 61 41 55 41 46
          C41 40 37 33 32 36 Z
        "
      />


      <path
        fill="#070b16"
        d="
          M60 38
          C56 44 57 56 62 60
          C67 62 70 54 69 46
          C68 40 64 34 60 38 Z
        "
      />

    </svg>

  `;


  // ───────── Aura (oscuridad + nubes + rayos) ─────────

  const NS_SVG = 'http://www.w3.org/2000/svg';

  let aura = null;
  let destello = null;
  let capaRayos = null;


  if (OSCURIDAD || NUBES) {

    aura =
      document.createElement('div');

    aura.className = 'hw-aura';

    aura.setAttribute('aria-hidden', 'true');


    if (OSCURIDAD) {

      const oscuridad =
        document.createElement('div');

      oscuridad.className = 'hw-oscuridad';

      aura.appendChild(oscuridad);
    }


    if (NUBES) {

      const nubes =
        document.createElement('div');

      nubes.className = 'hw-nubes';


      const dentro =
        document.createElement('div');

      dentro.className = 'hw-nubes-in';


      // Fondo: gris muy oscuro, lento
      dentro.appendChild(
        crearCapaNubes(
          'hw-capa-fondo',
          7,
          [12, 14, 17],
          [48, 50, 54],
          0.75,
          240
        )
      );


      // Frente: algo más claro, sentido contrario
      dentro.appendChild(
        crearCapaNubes(
          'hw-capa-contra',
          21,
          [18, 20, 23],
          [62, 64, 68],
          0.6,
          140
        )
      );


      if (RELAMPAGOS && !reducir) {

        destello =
          document.createElement('div');

        destello.className = 'hw-relampago';

        dentro.appendChild(destello);


        capaRayos =
          document.createElementNS(NS_SVG, 'svg');

        capaRayos.setAttribute('class', 'hw-rayos');

        capaRayos.setAttribute(
          'viewBox',
          `0 0 ${TAMANO_AURA} ${TAMANO_AURA}`
        );

        dentro.appendChild(capaRayos);
      }


      nubes.appendChild(dentro);

      aura.appendChild(nubes);
    }


    // Primero el aura (detrás), luego el fantasma (delante)
    contenedor.appendChild(aura);
  }


  contenedor.appendChild(fantasma);

  document.body.appendChild(contenedor);


  medirPagina();


  // ───────── Estado ─────────

  let activo = true;


  // Cursor (en coordenadas de página)

  let ratonX = anchoPag / 2;
  let ratonY = altoPag / 2;

  let ratonVisto = false;


  // Fantasma (en coordenadas de página)

  let gx = Math.random() * (anchoPag - ANCHO);
  let gy = Math.random() * (altoPag - ALTO);

  let vx = 0;
  let vy = 0;

  let destinoX = gx;
  let destinoY = gy;

  let inclinacion = 0;
  let temblor = 0;

  let opacidadActual = 0;


  // Fases:
  // quieto | deriva | embestida | huida | tele

  let fase = 'quieto';

  let finFase = 0;

  let teleInicio = 0;

  let teleHecho = false;
  let teleLejos = false;

  let proximoParpadeo = 0;
  let parpadeoHasta = 0;

  let cercaDesde = 0;

  let enfriamientoHuida = 0;

  let ultimo = 0;


  // Desapariciones

  let desapareceHasta = 0;
  let proximaDesaparicion = 0;
  let estabaOculto = false;


  // ───────── Utilidades ─────────

  function limitar(valor, min, max) {

    return Math.max(min, Math.min(max, valor));
  }


  function suave(dt, rapidez) {

    return 1 - Math.exp(-dt * rapidez);
  }


  function aleatorioEntre(min, max) {

    return min + Math.random() * (max - min);
  }


  function puntoAleatorio() {

    return {

      x: Math.random() * Math.max(1, anchoPag - ANCHO),

      y: Math.random() * Math.max(1, altoPag - ALTO)

    };
  }


  function nuevoDestino(buscarCursor) {

    let x;
    let y;


    if (buscarCursor && Math.random() < 0.3) {

      x =
        ratonX -
        ANCHO / 2 +
        (Math.random() - 0.5) * 200;

      y =
        ratonY -
        ALTO / 2 +
        (Math.random() - 0.5) * 200;

    } else {

      const p = puntoAleatorio();

      x = p.x;
      y = p.y;
    }


    destinoX = limitar(x, 0, anchoPag - ANCHO);

    destinoY = limitar(y, 0, altoPag - ALTO);
  }


  function destinoLejosDelCursor() {

    let mejor = puntoAleatorio();

    let mejorDist = -1;


    for (let i = 0; i < 12; i++) {

      const p = puntoAleatorio();

      const d =
        Math.hypot(
          p.x + ANCHO / 2 - ratonX,
          p.y + ALTO / 2 - ratonY
        );


      if (d > mejorDist) {

        mejorDist = d;
        mejor = p;
      }
    }


    destinoX = mejor.x;
    destinoY = mejor.y;
  }


  function iniciarTele(ahora, lejos) {

    fase = 'tele';

    teleInicio = ahora;

    finFase = ahora + 460;

    teleHecho = false;

    teleLejos = lejos;
  }


  function siguienteFase(ahora) {

    if (fase !== 'quieto') {

      fase = 'quieto';

      finFase =
        ahora +
        400 +
        Math.random() * 900;

      return;
    }


    const r = Math.random();


    if (reducir || r < 0.3) {

      fase = 'deriva';

      finFase =
        ahora +
        1800 +
        Math.random() * 1800;

      nuevoDestino(false);

    } else if (r < 0.72) {

      fase = 'embestida';

      finFase = ahora + 1800;

      nuevoDestino(true);

    } else {

      iniciarTele(ahora, false);
    }
  }


  // ───────── Huida ─────────

  function huir(ahora, cx, cy) {

    enfriamientoHuida = ahora + 350;

    cercaDesde = 0;


    if (reducir) {

      iniciarTele(ahora, true);

      return;
    }


    let ux = cx - ratonX;

    let uy = cy - ratonY;


    const largo = Math.hypot(ux, uy) || 1;


    ux /= largo;
    uy /= largo;


    // Desvío para evitar una línea perfecta

    const angulo = (Math.random() - 0.5) * 1.2;


    const rx =
      ux * Math.cos(angulo) -
      uy * Math.sin(angulo);

    const ry =
      ux * Math.sin(angulo) +
      uy * Math.cos(angulo);


    const distancia = 300 + Math.random() * 250;


    const tx =
      limitar(
        cx + rx * distancia - ANCHO / 2,
        0,
        anchoPag - ANCHO
      );


    const ty =
      limitar(
        cy + ry * distancia - ALTO / 2,
        0,
        altoPag - ALTO
      );


    const quedaLejos =
      Math.hypot(
        tx + ANCHO / 2 - ratonX,
        ty + ALTO / 2 - ratonY
      );


    if (quedaLejos < 280 || Math.random() < 0.2) {

      iniciarTele(ahora, true);

    } else {

      destinoX = tx;
      destinoY = ty;

      fase = 'huida';

      finFase = ahora + 1300;
    }
  }


  // ───────── Animación ─────────

  function fotograma(ahora) {

    if (!activo) return;


    const dt =
      Math.min(ahora - (ultimo || ahora), 50) / 16.67;


    ultimo = ahora;


    if (ahora > finFase) {

      siguienteFase(ahora);
    }


    // ── Desapariciones aleatorias ──

    if (ahora > proximaDesaparicion) {

      const duracion =
        aleatorioEntre(
          DESAPARECE_DURA_MIN_S,
          DESAPARECE_DURA_MAX_S
        ) * 1000;


      desapareceHasta = ahora + duracion;


      proximaDesaparicion =
        desapareceHasta +
        aleatorioEntre(
          DESAPARECE_CADA_MIN_S,
          DESAPARECE_CADA_MAX_S
        ) * 1000;
    }


    const oculto = ahora < desapareceHasta;


    // Al terminar la desaparición reaparece en otro sitio

    if (estabaOculto && !oculto) {

      const p = puntoAleatorio();

      gx = p.x;
      gy = p.y;

      vx = 0;
      vy = 0;

      destinoX = gx;
      destinoY = gy;

      fase = 'quieto';

      finFase = ahora + 600;
    }


    estabaOculto = oculto;


    // Mientras se desvanece o reaparece, el fundido es lento

    const enFundido =
      ahora < desapareceHasta + 1500;


    // ── Movimiento ──

    const dx = destinoX - gx;

    const dy = destinoY - gy;

    const dist = Math.hypot(dx, dy);


    let deseadoX = 0;
    let deseadoY = 0;

    let aceleracion = 0.12;


    if (fase === 'deriva' && dist > 2) {

      deseadoX = (dx / dist) * VEL_DERIVA;

      deseadoY = (dy / dist) * VEL_DERIVA;

      aceleracion = 0.05;


    } else if (fase === 'embestida' || fase === 'huida') {

      if (dist < 10) {

        finFase = 0;

      } else {

        const huyendo = fase === 'huida';


        const velocidad =
          Math.min(
            huyendo ? VEL_HUIDA : VEL_EMBESTIDA,
            1 + dist * 0.09
          );


        deseadoX = (dx / dist) * velocidad;

        deseadoY = (dy / dist) * velocidad;


        aceleracion = huyendo ? 0.22 : 0.14;
      }
    }


    const k = suave(dt, aceleracion);


    vx += (deseadoX - vx) * k;

    vy += (deseadoY - vy) * k;


    gx += vx * dt;

    gy += vy * dt;


    // ── Temblor ──

    const temblorObjetivo =
      fase === 'quieto' && !reducir ? 1 : 0;


    temblor += (temblorObjetivo - temblor) * suave(dt, 0.1);


    const jx =
      (
        Math.sin(ahora / 41) * 0.9 +
        Math.sin(ahora / 17) * 0.5
      ) * temblor;


    const jy =
      (
        Math.sin(ahora / 37 + 1) * 0.9 +
        Math.sin(ahora / 19) * 0.5
      ) * temblor;


    // ── Inclinación ──

    const inclinacionObjetivo =
      limitar(vx * 0.8, -14, 14);


    inclinacion +=
      (inclinacionObjetivo - inclinacion) * suave(dt, 0.15);


    // ── Opacidad ──

    let opacidadObjetivo =
      0.88 + 0.07 * Math.sin(ahora / 500);


    if (oculto) {

      opacidadObjetivo = 0;

    } else if (fase === 'tele') {

      const transcurrido = ahora - teleInicio;


      if (transcurrido < 200) {

        opacidadObjetivo = 0;

      } else if (!teleHecho) {

        if (teleLejos) {

          destinoLejosDelCursor();

        } else {

          nuevoDestino(true);
        }


        gx = destinoX;
        gy = destinoY;

        vx = 0;
        vy = 0;

        teleHecho = true;
      }

    } else if (!reducir) {

      // Parpadeo ocasional

      if (ahora > proximoParpadeo) {

        parpadeoHasta =
          ahora + 90 + Math.random() * 140;


        proximoParpadeo =
          ahora + 3000 + Math.random() * 5000;
      }


      if (ahora < parpadeoHasta) {

        opacidadObjetivo = 0.25;
      }
    }


    opacidadActual +=
      (opacidadObjetivo - opacidadActual) *
      suave(dt, enFundido ? 0.05 : 0.35);


    const px = gx + jx;
    const py = gy + jy;


    fantasma.style.transform =
      `translate3d(
        ${px.toFixed(2)}px,
        ${py.toFixed(2)}px,
        0
      )
      rotate(
        ${inclinacion.toFixed(2)}deg
      )`;


    fantasma.style.opacity = opacidadActual.toFixed(3);


    // ── Aura: centrada en el fantasma ──

    if (aura) {

      const ax = px + ANCHO / 2 - mitad;
      const ay = py + ALTO / 2 - mitad;


      aura.style.transform =
        `translate3d(
          ${ax.toFixed(2)}px,
          ${ay.toFixed(2)}px,
          0
        )`;


      // El aura se desvanece con el fantasma al teletransportarse
      // o al desaparecer (el parpadeo corto no la afecta)

      const opAura =
        fase === 'tele' || enFundido
          ? limitar(opacidadActual / 0.88, 0, 1)
          : 1;


      aura.style.opacity = opAura.toFixed(3);
    }


    requestAnimationFrame(fotograma);
  }


  // ───────── Activar / desactivar ─────────

  function activar(valor) {

    activo = valor;


    contenedor.style.display = valor ? '' : 'none';


    if (valor) {

      ultimo = 0;

      requestAnimationFrame(fotograma);
    }
  }


  // ───────── Eventos ─────────

  window.addEventListener(
    'pointermove',
    (e) => {

      ratonX = e.pageX;

      ratonY = e.pageY;

      ratonVisto = true;
    }
  );


  // Si el cursor sale de la ventana

  document.documentElement.addEventListener(
    'mouseleave',
    () => {

      ratonVisto = false;

      cercaDesde = 0;
    }
  );


  // Escape para activar/desactivar

  window.addEventListener(
    'keydown',
    (e) => {

      if (e.key === 'Escape') {

        activar(!activo);
      }
    }
  );


  // ───────── Resize / cambios de altura de la página ─────────

  function alCambiarTamano() {

    if (!activo) return;

    medirPagina();

    gx = limitar(gx, 0, anchoPag - ANCHO);

    gy = limitar(gy, 0, altoPag - ALTO);
  }


  window.addEventListener('resize', alCambiarTamano);

  window.addEventListener('load', alCambiarTamano);


  // Por si el contenido de la página crece o se encoge después

  setInterval(alCambiarTamano, 2000);


  // ───────── Rayos ─────────

  // Camino zigzagueante entre dos puntos (desplazamiento del punto medio)

  function puntosRayo(x1, y1, x2, y2, desp) {

    let pts = [[x1, y1], [x2, y2]];


    for (let it = 0; it < 6; it++) {

      const nuevo = [pts[0]];


      for (let i = 0; i < pts.length - 1; i++) {

        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];

        const dx = bx - ax;
        const dy = by - ay;

        const largo = Math.hypot(dx, dy) || 1;

        const off = (Math.random() - 0.5) * desp;

        nuevo.push([
          (ax + bx) / 2 - (dy / largo) * off,
          (ay + by) / 2 + (dx / largo) * off
        ]);

        nuevo.push([bx, by]);
      }


      pts = nuevo;

      desp *= 0.55;
    }


    return pts;
  }


  function trazo(pts) {

    return (
      'M' +
      pts
        .map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1))
        .join(' L')
    );
  }


  function crearTrazo(d, ancho, color, opacidad) {

    const p =
      document.createElementNS(NS_SVG, 'path');

    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', ancho);
    p.setAttribute('stroke-opacity', opacidad);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');

    return p;
  }


  function dibujarRayo() {

    if (!capaRayos) return;


    const c = TAMANO_AURA / 2;

    // Centro del rayo, cerca del fantasma
    const cx = c + (Math.random() - 0.5) * 200;
    const cy = c + (Math.random() - 0.5) * 120;


    // Sobre todo horizontal o diagonal; a veces en cualquier dirección
    let ang;

    if (Math.random() < 0.7) {

      ang =
        (Math.random() < 0.5 ? 0 : Math.PI) +
        (Math.random() - 0.5) * 1.1;

    } else {

      ang = Math.random() * Math.PI * 2;
    }


    const largo = 280 + Math.random() * 260;

    const ux = Math.cos(ang);
    const uy = Math.sin(ang);


    const x1 = cx - ux * largo / 2;
    const y1 = cy - uy * largo / 2;

    const x2 = cx + ux * largo / 2;
    const y2 = cy + uy * largo / 2;


    const grupo =
      document.createElementNS(NS_SVG, 'g');

    grupo.style.opacity = '0';


    const principal =
      puntosRayo(x1, y1, x2, y2, largo * 0.32);

    const d = trazo(principal);


    grupo.appendChild(crearTrazo(d, 6, COLOR_BRILLO_RAYO, 0.35));
    grupo.appendChild(crearTrazo(d, 2.2, COLOR_RAYO, 1));


    // Ramificaciones
    const ramas = 1 + Math.floor(Math.random() * 3);

    for (let r = 0; r < ramas; r++) {

      const idx =
        Math.floor(
          principal.length * (0.2 + Math.random() * 0.6)
        );

      const [bx, by] = principal[idx];

      const angRama =
        ang +
        (Math.random() < 0.5 ? -1 : 1) *
        (0.4 + Math.random() * 0.7);

      const largoRama = 80 + Math.random() * 120;

      const rama =
        puntosRayo(
          bx,
          by,
          bx + Math.cos(angRama) * largoRama,
          by + Math.sin(angRama) * largoRama,
          largoRama * 0.35
        );

      const dr = trazo(rama);

      grupo.appendChild(crearTrazo(dr, 3.5, COLOR_BRILLO_RAYO, 0.3));
      grupo.appendChild(crearTrazo(dr, 1.2, COLOR_RAYO, 0.9));
    }


    capaRayos.appendChild(grupo);


    const anim =
      grupo.animate(
        [
          { opacity: 0 },
          { opacity: 1, offset: 0.05 },
          { opacity: 0.25, offset: 0.16 },
          { opacity: 1, offset: 0.26 },
          { opacity: 0.1, offset: 0.42 },
          { opacity: 0.75, offset: 0.52 },
          { opacity: 0 }
        ],
        {
          duration: 380 + Math.random() * 320,
          easing: 'ease-out'
        }
      );

    anim.onfinish = () => grupo.remove();


    // Destello de luz en la zona del rayo
    if (destello) {

      destello.style.setProperty(
        '--hw-rx',
        (cx / TAMANO_AURA * 100).toFixed(1) + '%'
      );

      destello.style.setProperty(
        '--hw-ry',
        (cy / TAMANO_AURA * 100).toFixed(1) + '%'
      );

      destello.animate(
        [
          { opacity: 0 },
          { opacity: 0.9, offset: 0.08 },
          { opacity: 0.15, offset: 0.22 },
          { opacity: 0.6, offset: 0.34 },
          { opacity: 0 }
        ],
        {
          duration: 600 + Math.random() * 300,
          easing: 'ease-out'
        }
      );
    }
  }


  // Una tormenta = 1 a 3 rayos seguidos

  function lanzarRelampago() {

    if (!capaRayos) return;


    const n =
      1 +
      (Math.random() < 0.45 ? 1 : 0) +
      (Math.random() < 0.2 ? 1 : 0);


    for (let i = 0; i < n; i++) {

      setTimeout(
        dibujarRayo,
        i * (90 + Math.random() * 160)
      );
    }


    // El fantasma titila con el relámpago

    parpadeoHasta = performance.now() + 250;
  }


  function programarRelampago() {

    if (reducir || !RELAMPAGOS || !capaRayos) {

      return;
    }


    setTimeout(
      () => {

        if (activo) {

          lanzarRelampago();
        }


        programarRelampago();

      },

      RAYOS_MIN_MS +
      Math.random() * (RAYOS_MAX_MS - RAYOS_MIN_MS)
    );
  }


  // ───────── Arranque ─────────

  finFase = performance.now() + 600;


  proximoParpadeo = performance.now() + 4000;


  proximaDesaparicion =
    performance.now() +
    aleatorioEntre(
      DESAPARECE_CADA_MIN_S,
      DESAPARECE_CADA_MAX_S
    ) * 1000;


  activar(true);

  programarRelampago();

})();