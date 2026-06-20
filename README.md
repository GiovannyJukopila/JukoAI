# Juko AI — Sitio web

Sitio corporativo premium de **Juko AI**: estudio de desarrollo de software, automatización e implementación de flujos con IA. Web, móvil, agentes y cloud.

## Stack

- **Next.js 16** (App Router, SSG) · **React 19** · **TypeScript**
- **Tailwind CSS v4** + sistema de diseño propio (tokens en `globals.css`)
- **Framer Motion** para las animaciones
- **i18n por URL** (`/es`, `/en`) — español por defecto, inglés como segundo idioma

## Estructura

```
src/
  app/[locale]/                 # layout raíz localizado (es | en)
    page.tsx                    # landing (hero, servicios, proyectos, proceso, estudio, contacto)
    servicios/                  # índice + [slug] detalle de servicio
    proyectos/                  # índice + [slug] caso de estudio
  components/                   # Nav, Footer, Hero, Marquee, ProjectsGrid, Reveal, Cursor, Ambient…
  lib/
    i18n.ts                     # diccionario ES/EN + helpers de locale
    content.ts                  # servicios y proyectos (datos bilingües)
  proxy.ts                      # redirige / → idioma detectado
public/projects/                # imágenes de los proyectos
```

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000  (redirige a /es o /en)
```

## Producción

```bash
npm run build
npm run start
```

El sitio es 100% estático (SSG): se puede desplegar en **Vercel** (recomendado), Netlify o cualquier hosting de Next.js.

## Formulario de contacto

El formulario (sección **Contacto** del home) envía el mensaje por email a los destinatarios
configurados, usando [Resend](https://resend.com).

1. Crea una cuenta y una API key en Resend.
2. Copia `.env.example` a `.env.local` y rellena `RESEND_API_KEY`.
3. Destinatarios por defecto: `jukopila.giovanny15@gmail.com` y `jukopila.yango@gmail.com`
   (configurables con `CONTACT_TO`).
4. Para producción, verifica tu dominio en Resend y usa `CONTACT_FROM=Juko AI <hola@juko.ai>`.

> Sin `RESEND_API_KEY` el formulario valida los campos pero mostrará un error al enviar.

## Despliegue en Vercel

1. Sube el proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repo. Vercel detecta Next.js automáticamente.
3. En **Settings → Environment Variables** añade:
   - `RESEND_API_KEY`
   - `CONTACT_TO` *(opcional)*
   - `CONTACT_FROM` *(opcional)*
4. **Deploy**. Cada push a `main` redepliega automáticamente.

Alternativa por CLI:

```bash
npm i -g vercel
vercel            # primer deploy (preview)
vercel --prod     # deploy a producción
```

## Editar contenido

- **Textos de UI** → `src/lib/i18n.ts`
- **Servicios** → `SERVICES` en `src/lib/content.ts`
- **Proyectos** → `PROJECTS` en `src/lib/content.ts` (imágenes en `public/projects/`)
- **Datos de contacto / redes** → `SOCIAL` en `src/lib/content.ts`
- **Paleta de color** → variables CSS en `src/app/globals.css` (`--indigo`, `--violet`, `--peri`, `--sky`)
