(() => {

  // ───────── Configuración ─────────

  // true = se muestra siempre
  // false = solo el 31 de octubre
  const FORZAR = false;

  // 'vineta'   = pantalla oscura azulada, más por los laterales
  // 'linterna' = oscuridad total con un círculo de luz alrededor del cursor
  // 'ninguna'  = sin oscuridad ni nubes
  const MODO_OSCURIDAD = 'vineta';

  // ───────── Oscuridad ─────────

  const COLOR_OSCURIDAD = '2, 6, 20';
  const OSCURIDAD_LATERAL = 0.9;
  const ANCHO_LATERAL = 0.42;
  const OSCURIDAD_ESQUINAS = 0.65;
  const OSCURIDAD_GENERAL = 0.20;

  // ───────── Nubes / niebla ─────────

  const NUBES = true;

  const INTENSIDAD_NUBES = 0.45;
  const ALTURA_NUBES = 0.38;

  const LUNA = true;

  // Niebla en la parte inferior
  const NUBES_ABAJO = true;
  const INTENSIDAD_NUBES_ABAJO = 0.35;
  const ALTURA_NUBES_ABAJO = 0.25;

  // Relámpagos
  const RELAMPAGOS = true;


  // ───────── Fantasma ─────────

  const ANCHO = 74;
  const ALTO = Math.round(ANCHO * 1.3);

  const VEL_DERIVA = 0.8;
  const VEL_EMBESTIDA = 16;
  const VEL_HUIDA = 22;

  const RADIO_HUIDA = 150;

  const RADIO_LUZ = 140;
  const SUAVIZADO_LUZ = 0.22;


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


  // ───────── Viñeta ─────────

  function sombraLateral(direccion) {

    const pasos = 14;
    const paradas = [];

    for (let i = 0; i <= pasos; i++) {

      const t = i / pasos;

      const alfa =
        OSCURIDAD_LATERAL *
        Math.pow(1 - t, 2.4);

      paradas.push(
        `rgba(${COLOR_OSCURIDAD},${alfa.toFixed(3)}) ${(t * ANCHO_LATERAL * 100).toFixed(1)}%`
      );

    }

    return `linear-gradient(${direccion}, ${paradas.join(', ')})`;
  }


  function sombraEsquinas() {

    const pasos = 12;

    const paradas = [
      `rgba(${COLOR_OSCURIDAD},0) 0%`,
      `rgba(${COLOR_OSCURIDAD},0) 50%`
    ];

    for (let i = 1; i <= pasos; i++) {

      const t = i / pasos;

      const alfa =
        OSCURIDAD_ESQUINAS *
        Math.pow(t, 2);

      paradas.push(
        `rgba(${COLOR_OSCURIDAD},${alfa.toFixed(3)}) ${(50 + 50 * t).toFixed(1)}%`
      );

    }

    return `radial-gradient(ellipse farthest-corner at 50% 50%, ${paradas.join(', ')})`;
  }


  const fondoOscuridad =
    MODO_OSCURIDAD === 'linterna'

      ? `radial-gradient(
          circle var(--hw-r, ${RADIO_LUZ}px)
          at var(--hw-x, 50%) var(--hw-y, 50%),
          rgba(${COLOR_OSCURIDAD}, 0) 0%,
          rgba(${COLOR_OSCURIDAD}, 0) 35%,
          rgba(${COLOR_OSCURIDAD}, 0.6) 60%,
          rgba(${COLOR_OSCURIDAD}, 0.985) 100%
        )`

      : `${sombraLateral('90deg')},
         ${sombraLateral('270deg')},
         ${sombraEsquinas()}`;


  const colorVelo =
    MODO_OSCURIDAD === 'vineta'
      ? `rgba(${COLOR_OSCURIDAD}, ${OSCURIDAD_GENERAL})`
      : 'transparent';


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

      const cx = 3 * (1 << o);
      const cy = 2 * (1 << o);

      const datos =
        new Float32Array(cx * (cy + 1));

      for (
        let i = 0;
        i < datos.length;
        i++
      ) {
        datos[i] = azar();
      }

      redes.push({
        cx,
        cy,
        datos
      });
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

      const a =
        red.datos[y0 * red.cx + x0];

      const b =
        red.datos[y0 * red.cx + x1];

      const c =
        red.datos[y1 * red.cx + x0];

      const d =
        red.datos[y1 * red.cx + x1];

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
      ctx.createImageData(
        anchoPx,
        altoPx
      );

    const px = imagen.data;


    for (let py = 0; py < altoPx; py++) {

      const y = py / altoPx;

      for (
        let pxx = 0;
        pxx < anchoPx;
        pxx++
      ) {

        const x = pxx / anchoPx;


        // Ruido fractal

        let n = 0;
        let amplitud = 0.5;
        let total = 0;

        for (let o = 0; o < OCTAVAS; o++) {

          n +=
            muestra(redes[o], x, y) *
            amplitud;

          total += amplitud;

          amplitud *= 0.5;
        }

        n /= total;

        // Las nubes siguen siendo más densas arriba
        n += (1 - y) * 0.14 - 0.06;


        // Densidad

        let dens =
          Math.min(
            1,
            Math.max(
              0,
              (n - 0.42) / 0.32
            )
          );

        dens =
          dens *
          dens *
          (3 - 2 * dens);


        // Transición entre núcleo y borde

        let m =
          Math.min(
            1,
            Math.max(
              0,
              (dens - 0.1) / 0.8
            )
          );

        m =
          m *
          m *
          (3 - 2 * m);


        const i =
          (py * anchoPx + pxx) * 4;


        px[i] =
          borde[0] +
          (nucleo[0] - borde[0]) * m;

        px[i + 1] =
          borde[1] +
          (nucleo[1] - borde[1]) * m;

        px[i + 2] =
          borde[2] +
          (nucleo[2] - borde[2]) * m;


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
      generarNubes(
        semilla,
        448,
        176,
        nucleo,
        borde,
        alfaMax
      );


    const copia =
      document.createElement('canvas');

    copia.width = base.width;
    copia.height = base.height;

    copia
      .getContext('2d')
      .drawImage(base, 0, 0);


    const capa =
      document.createElement('div');

    capa.className =
      `hw-capa ${clase}`;


    if (!reducir) {

      capa.style.animationDuration =
        `${segundos}s`;
    }


    capa.append(
      base,
      copia
    );


    return capa;
  }


  // ───────── Relámpagos ─────────

  const destellos = [];


  function crearDestello() {

    const destello =
      document.createElement('div');

    destello.className =
      'hw-relampago';

    destellos.push(destello);

    return destello;
  }


  // ───────── Estilos ─────────

  const estilo =
    document.createElement('style');


  estilo.textContent = `

    .hw-fantasma {

      position: fixed;

      top: 0;
      left: 0;

      z-index: 9998;

      width: ${ANCHO}px;
      height: ${ALTO}px;

      pointer-events: none;

      will-change:
        transform,
        opacity;

      filter:
        drop-shadow(
          0 0 10px
          rgba(190, 195, 200, 0.55)
        );
    }


    .hw-fantasma svg {

      display: block;

      width: 100%;
      height: 100%;

      overflow: visible;
    }


    .hw-oscuridad {

      position: fixed;

      inset: 0;

      z-index: 9999;

      pointer-events: none;

      background-color:
        ${colorVelo};

      background-image:
        ${fondoOscuridad};
    }


    /* ───────── Nubes superiores ───────── */

    .hw-nubes {

      position: fixed;

      top: 0;
      left: 0;

      width: 100%;

      height:
        ${ALTURA_NUBES * 100}vh;

      z-index: 10000;

      pointer-events: none;

      overflow: hidden;

      opacity:
        ${INTENSIDAD_NUBES};

      -webkit-mask-image:
        linear-gradient(
          to bottom,
          #000 0%,
          #000 30%,
          transparent 100%
        );

      mask-image:
        linear-gradient(
          to bottom,
          #000 0%,
          #000 30%,
          transparent 100%
        );
    }


    /* Luna muy tenue */

    .hw-luna {

      position: absolute;

      inset: 0;

      background:
        radial-gradient(
          ellipse 45% 75% at 76% 0%,
          rgba(175, 178, 180, 0.16),
          rgba(175, 178, 180, 0) 70%
        );
    }


    .hw-capa {

      position: absolute;

      top: 0;
      left: 0;

      width: 200%;
      height: 100%;

      display: flex;

      will-change:
        transform;

      animation:
        hw-nubes-avanzan
        200s
        linear
        infinite;
    }


    .hw-capa canvas {

      flex: none;

      display: block;

      width: 50%;
      height: 100%;
    }


    .hw-capa-fondo {

      height: 110%;

      top: -6%;
    }


    /* ───────── Nubes inferiores ───────── */

    .hw-nubes-abajo {

      position: fixed;

      bottom: 0;
      left: 0;

      width: 100%;

      height:
        ${ALTURA_NUBES_ABAJO * 100}vh;

      z-index: 10000;

      pointer-events: none;

      overflow: hidden;

      opacity:
        ${INTENSIDAD_NUBES_ABAJO};

      -webkit-mask-image:
        linear-gradient(
          to top,
          #000 0%,
          #000 30%,
          transparent 100%
        );

      mask-image:
        linear-gradient(
          to top,
          #000 0%,
          #000 30%,
          transparent 100%
        );
    }


    .hw-nubes-abajo .hw-capa {

      animation-direction:
        reverse;
    }


    .hw-nubes-abajo .hw-capa canvas {

      transform:
        scaleY(-1);
    }


    /* ───────── Relámpago ───────── */

    .hw-relampago {

      position: absolute;

      inset: 0;

      opacity: 0;

      background:
        radial-gradient(
          ellipse 40% 80%
          at
          var(--hw-rx, 50%)
          var(--hw-ry, 15%),

          rgba(
            220,
            225,
            225,
            0.8
          ),

          rgba(
            220,
            225,
            225,
            0
          ) 70%
        );
    }


    .hw-nubes-abajo
    .hw-relampago {

      --hw-ry: 85%;
    }


    ${reducir
      ? '.hw-capa { animation: none; }'
      : ''}


    @keyframes hw-nubes-avanzan {

      from {
        transform:
          translate3d(
            0,
            0,
            0
          );
      }

      to {
        transform:
          translate3d(
            -50%,
            0,
            0
          );
      }
    }

  `;


  document.head.appendChild(estilo);


  // ───────── Fantasma ─────────

  const fantasma =
    document.createElement('div');

  fantasma.className =
    'hw-fantasma';

  fantasma.setAttribute(
    'aria-hidden',
    'true'
  );


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

        <path
          d="M29 72 C32 86 29 99 33 113"
        />

        <path
          d="M51 78 C52 92 49 102 53 118"
        />

        <path
          d="M71 68 C69 83 73 96 70 109"
        />

        <path
          d="M20 58 C23 66 22 74 24 82"
        />

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


  document.body.appendChild(fantasma);


  // ───────── Capas ─────────

  let oscuridad = null;
  let nubes = null;
  let nubesAbajo = null;


  if (MODO_OSCURIDAD !== 'ninguna') {

    oscuridad =
      document.createElement('div');

    oscuridad.className =
      'hw-oscuridad';

    oscuridad.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.appendChild(
      oscuridad
    );


    // ───────── Nubes arriba ─────────

    if (NUBES) {

      nubes =
        document.createElement('div');

      nubes.className =
        'hw-nubes';

      nubes.setAttribute(
        'aria-hidden',
        'true'
      );


      if (LUNA) {

        const luna =
          document.createElement('div');

        luna.className =
          'hw-luna';

        nubes.appendChild(luna);
      }


      // Fondo: gris muy sutil
      nubes.appendChild(
        crearCapaNubes(
          'hw-capa-fondo',
          7,
          [12, 14, 17],
          [48, 50, 54],
          0.55,
          240
        )
      );


      // Frente: gris reducido
      nubes.appendChild(
        crearCapaNubes(
          'hw-capa-frente',
          21,
          [18, 20, 23],
          [62, 64, 68],
          0.45,
          140
        )
      );


      if (
        RELAMPAGOS &&
        !reducir
      ) {
        nubes.appendChild(
          crearDestello()
        );
      }


      document.body.appendChild(
        nubes
      );
    }


    // ───────── Nubes abajo ─────────

    if (NUBES_ABAJO) {

      nubesAbajo =
        document.createElement('div');

      nubesAbajo.className =
        'hw-nubes-abajo';

      nubesAbajo.setAttribute(
        'aria-hidden',
        'true'
      );


      // Niebla inferior gris y sutil

      nubesAbajo.appendChild(
        crearCapaNubes(
          'hw-capa-fondo',
          33,
          [11, 13, 16],
          [45, 48, 52],
          0.50,
          300
        )
      );


      nubesAbajo.appendChild(
        crearCapaNubes(
          'hw-capa-frente',
          47,
          [17, 19, 22],
          [59, 62, 66],
          0.40,
          170
        )
      );


      if (
        RELAMPAGOS &&
        !reducir
      ) {
        nubesAbajo.appendChild(
          crearDestello()
        );
      }


      document.body.appendChild(
        nubesAbajo
      );
    }

  }


  // ───────── Estado ─────────

  let activo = true;


  // Cursor

  let ratonX =
    window.innerWidth / 2;

  let ratonY =
    window.innerHeight / 2;

  let ratonVisto = false;

  let luzX = ratonX;
  let luzY = ratonY;


  // Fantasma

  let gx =
    Math.random() *
    (window.innerWidth - ANCHO);

  let gy =
    Math.random() *
    (window.innerHeight - ALTO);

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


  // ───────── Utilidades ─────────

  function limitar(
    valor,
    min,
    max
  ) {

    return Math.max(
      min,
      Math.min(max, valor)
    );
  }


  function suave(
    dt,
    rapidez
  ) {

    return (
      1 -
      Math.exp(
        -dt * rapidez
      )
    );
  }


  function puntoAleatorio() {

    return {

      x:
        Math.random() *
        (window.innerWidth - ANCHO),

      y:
        Math.random() *
        (window.innerHeight - ALTO)

    };
  }


  function nuevoDestino(
    buscarCursor
  ) {

    let x;
    let y;


    if (
      buscarCursor &&
      Math.random() < 0.3
    ) {

      x =
        ratonX -
        ANCHO / 2 +
        (Math.random() - 0.5) *
        200;

      y =
        ratonY -
        ALTO / 2 +
        (Math.random() - 0.5) *
        200;

    } else {

      const p =
        puntoAleatorio();

      x = p.x;
      y = p.y;
    }


    destinoX =
      limitar(
        x,
        0,
        window.innerWidth - ANCHO
      );

    destinoY =
      limitar(
        y,
        0,
        window.innerHeight - ALTO
      );
  }


  function destinoLejosDelCursor() {

    let mejor =
      puntoAleatorio();

    let mejorDist = -1;


    for (
      let i = 0;
      i < 12;
      i++
    ) {

      const p =
        puntoAleatorio();

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


  function iniciarTele(
    ahora,
    lejos
  ) {

    fase = 'tele';

    teleInicio = ahora;

    finFase =
      ahora + 460;

    teleHecho = false;

    teleLejos = lejos;
  }


  function siguienteFase(
    ahora
  ) {

    if (fase !== 'quieto') {

      fase = 'quieto';

      finFase =
        ahora +
        400 +
        Math.random() * 900;

      return;
    }


    const r =
      Math.random();


    if (
      reducir ||
      r < 0.3
    ) {

      fase = 'deriva';

      finFase =
        ahora +
        1800 +
        Math.random() * 1800;

      nuevoDestino(false);

    } else if (
      r < 0.72
    ) {

      fase = 'embestida';

      finFase =
        ahora + 1800;

      nuevoDestino(true);

    } else {

      iniciarTele(
        ahora,
        false
      );
    }
  }


  // ───────── Huida ─────────

  function huir(
    ahora,
    cx,
    cy
  ) {

    enfriamientoHuida =
      ahora + 350;

    cercaDesde = 0;


    if (reducir) {

      iniciarTele(
        ahora,
        true
      );

      return;
    }


    let ux =
      cx - ratonX;

    let uy =
      cy - ratonY;


    const largo =
      Math.hypot(
        ux,
        uy
      ) || 1;


    ux /= largo;
    uy /= largo;


    // Desvío para evitar una línea perfecta

    const angulo =
      (Math.random() - 0.5) *
      1.2;


    const rx =
      ux * Math.cos(angulo) -
      uy * Math.sin(angulo);

    const ry =
      ux * Math.sin(angulo) +
      uy * Math.cos(angulo);


    const distancia =
      300 +
      Math.random() * 250;


    const tx =
      limitar(
        cx +
        rx * distancia -
        ANCHO / 2,

        0,

        window.innerWidth - ANCHO
      );


    const ty =
      limitar(
        cy +
        ry * distancia -
        ALTO / 2,

        0,

        window.innerHeight - ALTO
      );


    const quedaLejos =
      Math.hypot(
        tx +
        ANCHO / 2 -
        ratonX,

        ty +
        ALTO / 2 -
        ratonY
      );


    if (
      quedaLejos < 280 ||
      Math.random() < 0.2
    ) {

      iniciarTele(
        ahora,
        true
      );

    } else {

      destinoX = tx;
      destinoY = ty;

      fase = 'huida';

      finFase =
        ahora + 1300;
    }
  }


  // ───────── Animación ─────────

  function fotograma(
    ahora
  ) {

    if (!activo) return;


    const dt =
      Math.min(
        ahora -
        (ultimo || ahora),
        50
      ) / 16.67;


    ultimo = ahora;


    if (
      ahora >
      finFase
    ) {

      siguienteFase(
        ahora
      );
    }


    // ── Movimiento ──

    const dx =
      destinoX - gx;

    const dy =
      destinoY - gy;

    const dist =
      Math.hypot(
        dx,
        dy
      );


    let deseadoX = 0;
    let deseadoY = 0;

    let aceleracion = 0.12;


    if (
      fase === 'deriva' &&
      dist > 2
    ) {

      deseadoX =
        (dx / dist) *
        VEL_DERIVA;

      deseadoY =
        (dy / dist) *
        VEL_DERIVA;

      aceleracion = 0.05;


    } else if (
      fase === 'embestida' ||
      fase === 'huida'
    ) {

      if (dist < 10) {

        finFase = 0;

      } else {

        const huyendo =
          fase === 'huida';


        const velocidad =
          Math.min(
            huyendo
              ? VEL_HUIDA
              : VEL_EMBESTIDA,

            1 +
            dist * 0.09
          );


        deseadoX =
          (dx / dist) *
          velocidad;

        deseadoY =
          (dy / dist) *
          velocidad;


        aceleracion =
          huyendo
            ? 0.22
            : 0.14;
      }
    }


    const k =
      suave(
        dt,
        aceleracion
      );


    vx +=
      (deseadoX - vx) * k;

    vy +=
      (deseadoY - vy) * k;


    gx +=
      vx * dt;

    gy +=
      vy * dt;


    // ── Temblor ──

    const temblorObjetivo =
      fase === 'quieto' &&
      !reducir
        ? 1
        : 0;


    temblor +=
      (temblorObjetivo -
        temblor) *
      suave(dt, 0.1);


    const jx =
      (
        Math.sin(ahora / 41) *
        0.9 +

        Math.sin(ahora / 17) *
        0.5
      ) *
      temblor;


    const jy =
      (
        Math.sin(
          ahora / 37 + 1
        ) *
        0.9 +

        Math.sin(
          ahora / 19
        ) *
        0.5
      ) *
      temblor;


    // ── Inclinación ──

    const inclinacionObjetivo =
      limitar(
        vx * 0.8,
        -14,
        14
      );


    inclinacion +=
      (
        inclinacionObjetivo -
        inclinacion
      ) *
      suave(dt, 0.15);


    // ── Opacidad ──

    let opacidadObjetivo =
      0.88 +
      0.07 *
      Math.sin(
        ahora / 500
      );


    if (
      fase === 'tele'
    ) {

      const transcurrido =
        ahora -
        teleInicio;


      if (
        transcurrido < 200
      ) {

        opacidadObjetivo = 0;

      } else if (
        !teleHecho
      ) {

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

      if (
        ahora >
        proximoParpadeo
      ) {

        parpadeoHasta =
          ahora +
          90 +
          Math.random() *
          140;


        proximoParpadeo =
          ahora +
          3000 +
          Math.random() *
          5000;
      }


      if (
        ahora <
        parpadeoHasta
      ) {

        opacidadObjetivo =
          0.25;
      }
    }


    opacidadActual +=
      (
        opacidadObjetivo -
        opacidadActual
      ) *
      suave(dt, 0.35);


    fantasma.style.transform =
      `translate3d(
        ${(gx + jx).toFixed(2)}px,
        ${(gy + jy).toFixed(2)}px,
        0
      )
      rotate(
        ${inclinacion.toFixed(2)}deg
      )`;


    fantasma.style.opacity =
      opacidadActual.toFixed(3);


    // ── Modo linterna ──

    if (
      oscuridad &&
      MODO_OSCURIDAD === 'linterna'
    ) {

      luzX +=
        (
          ratonX - luzX
        ) *
        SUAVIZADO_LUZ;


      luzY +=
        (
          ratonY - luzY
        ) *
        SUAVIZADO_LUZ;


      const parpadeoLuz =
        reducir
          ? 0
          : Math.sin(
              ahora / 140
            ) * 3 +
            Math.sin(
              ahora / 53
            ) * 2;


      oscuridad.style.setProperty(
        '--hw-x',
        luzX + 'px'
      );


      oscuridad.style.setProperty(
        '--hw-y',
        luzY + 'px'
      );


      oscuridad.style.setProperty(
        '--hw-r',
        RADIO_LUZ +
        parpadeoLuz +
        'px'
      );
    }


    requestAnimationFrame(
      fotograma
    );
  }


  // ───────── Activar / desactivar ─────────

  function activar(
    valor
  ) {

    activo = valor;


    const visibilidad =
      valor
        ? ''
        : 'none';


    fantasma.style.display =
      visibilidad;


    if (oscuridad) {

      oscuridad.style.display =
        visibilidad;
    }


    if (nubes) {

      nubes.style.display =
        visibilidad;
    }


    if (nubesAbajo) {

      nubesAbajo.style.display =
        visibilidad;
    }


    if (valor) {

      ultimo = 0;

      requestAnimationFrame(
        fotograma
      );
    }
  }


  // ───────── Eventos ─────────

  window.addEventListener(
    'pointermove',
    (e) => {

      ratonX =
        e.clientX;

      ratonY =
        e.clientY;

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

      if (
        e.key === 'Escape'
      ) {

        activar(!activo);
      }
    }
  );


  // ───────── Resize ─────────

  window.addEventListener(
    'resize',
    () => {

      gx =
        limitar(
          gx,
          0,
          window.innerWidth - ANCHO
        );


      gy =
        limitar(
          gy,
          0,
          window.innerHeight - ALTO
        );
    }
  );


  // ───────── Relámpagos ─────────

  function lanzarRelampago() {

    if (!destellos.length) return;


    const destello =
      destellos[
        Math.floor(
          Math.random() *
          destellos.length
        )
      ];


    destello.style.setProperty(
      '--hw-rx',
      (
        10 +
        Math.random() * 80
      ) + '%'
    );


    destello.animate(

      [
        {
          opacity: 0
        },

        {
          opacity: 0.9,
          offset: 0.08
        },

        {
          opacity: 0.15,
          offset: 0.22
        },

        {
          opacity: 0.7,
          offset: 0.34
        },

        {
          opacity: 0
        }
      ],

      {
        duration:
          700 +
          Math.random() * 400,

        easing:
          'ease-out'
      }
    );


    // El fantasma titila
    // con el relámpago

    parpadeoHasta =
      performance.now() +
      250;
  }


  function programarRelampago() {

    if (
      reducir ||
      !RELAMPAGOS ||
      !destellos.length
    ) {

      return;
    }


    setTimeout(
      () => {

        if (activo) {

          lanzarRelampago();
        }


        programarRelampago();

      },

      9000 +
      Math.random() * 18000
    );
  }


  // ───────── Arranque ─────────

  finFase =
    performance.now() +
    600;


  proximoParpadeo =
    performance.now() +
    4000;


  activar(true);

  programarRelampago();

})();