# 🏀 Basquet · Score tracker

Aplicación web responsive y mobile-first para llevar el puntaje de los
partidos de básquet entre amigos. Reemplaza la planilla manual:
seleccionás los jugadores que vienen, armás los equipos, y vas
registrando los puntos en vivo con el reloj corriendo. Al final ves el
podio de goleadores y podés exportar todo a **Excel** y **PDF** para
compartir.

## ✨ Qué hace la app

1. **Selección de jugadores** sobre un listado fijo, con buscador por
   nombre.
2. **Armado de equipos** A y B (con nombres editables) y validación de
   que ambos tengan jugadores antes de empezar.
3. **Reloj automático**: al tocar "Empezar partido" arranca el reloj
   interno y cada jugada se sella con el minuto transcurrido (sin input
   manual).
4. **Marcador en vivo** estilo scoreboard, con botones grandes **+2** y
   **+3**. Al tocarlos se abre un selector de jugador que registra la
   jugada al instante (sin botón "Guardar").
5. **Listado de jugadas** con edición y borrado: cualquier cambio
   recalcula marcador y estadísticas en el momento.
6. **Estadísticas por jugador**, agrupadas por equipo: dobles, triples y
   total.
7. **Finalizar partido**: congela el reloj y muestra el podio de
   goleadores.
8. **Reset** que limpia jugadas/marcador/estado finalizado, pero mantiene
   los equipos cargados.
9. **Exportación**:
   - **Excel** (`.xlsx`) con tres hojas: Jugadas, Resumen por jugador y
     Resultado.
   - **PDF** prolijo con marcador final, ganador, podio, resumen y
     detalle de jugadas.

Todo el estado vive **en memoria del navegador** — no hay backend, ni
base de datos, ni almacenamiento persistente.

## 🧱 Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/) en modo `strict`
- [`xlsx`](https://www.npmjs.com/package/xlsx) para la exportación a
  Excel
- [`jspdf`](https://www.npmjs.com/package/jspdf) +
  [`jspdf-autotable`](https://www.npmjs.com/package/jspdf-autotable)
  para el PDF
- CSS plano (mobile-first, con la paleta naranja / negro / blanco
  típica del básquet)

## 🚀 Cómo correrlo localmente

> Requiere Node.js 18+ (recomendado 20).

```bash
npm install
npm run dev
```

El comando abre el dev server de Vite en
[http://localhost:5173](http://localhost:5173).

## 🏗️ Cómo hacer build

```bash
npm run build      # type-check + bundle de producción a /dist
npm run preview    # sirve /dist localmente para una verificación final
```

## ☁️ Cómo desplegar en Vercel desde GitHub

1. En Vercel: **New Project → Import Git Repository** y elegí este repo.
2. Cuando Vercel detecte el proyecto, dejá la configuración por defecto:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. **Deploy**. Vercel instala dependencias, corre el build y publica la
   URL.
4. Cada push al branch principal vuelve a desplegar automáticamente.

No hay variables de entorno ni backend que configurar.

## 📁 Estructura del proyecto

```
.
├── index.html                # Entry HTML de Vite
├── package.json              # Scripts y dependencias
├── tsconfig.json             # Config TS de la app
├── tsconfig.node.json        # Config TS para el archivo de Vite
├── vite.config.ts            # Config de Vite + plugin de React
├── public/
│   └── basket.svg            # Favicon de la pelota
└── src/
    ├── main.tsx              # Bootstrap React + Provider del estado
    ├── App.tsx               # Layout y ruteo entre las 4 pantallas
    ├── index.css             # Estilos globales (mobile-first)
    ├── types.ts              # Tipos compartidos (Play, GameState, etc.)
    ├── data/
    │   └── players.ts        # Listado fijo de los 44 jugadores
    ├── state/
    │   ├── GameContext.tsx   # React Context que expone state + dispatch
    │   └── gameReducer.ts    # Reducer tipado con todas las acciones
    ├── utils/
    │   ├── format.ts         # Formato de hora, fecha y reloj
    │   ├── stats.ts          # Cálculo de scores, stats y podio
    │   ├── text.ts           # Helper para búsqueda con tildes
    │   ├── exportExcel.ts    # Generación del .xlsx (xlsx)
    │   └── exportPdf.ts      # Generación del PDF (jspdf + autotable)
    └── components/
        ├── Header.tsx
        ├── PlayerSelection.tsx
        ├── TeamBuilder.tsx
        ├── GameScreen.tsx
        ├── Scoreboard.tsx
        ├── PlayerPickerModal.tsx
        ├── PlaysList.tsx
        ├── PlayerStats.tsx
        └── Podium.tsx
```

## 🛠️ Scripts disponibles

| Comando           | Qué hace                                    |
| ----------------- | ------------------------------------------- |
| `npm install`     | Instala dependencias                        |
| `npm run dev`     | Levanta el dev server con HMR               |
| `npm run build`   | Type-check + bundle de producción a `dist/` |
| `npm run preview` | Sirve la build localmente                   |

## 📌 Notas

- La app no persiste estado: si recargás la página, arranca de cero.
  Es a propósito para el flujo "abro la app, juego el partido, exporto".
- Los IDs y nombres del listado están definidos en
  `src/data/players.ts`. Si querés sumar o renombrar jugadores, editá
  ese archivo.
