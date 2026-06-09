import { Helmet } from "react-helmet-async";

const SITE_NAME = "INOVAPRO3D";
const BASE_URL = "https://inovapro3d.com.br";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

interface Props {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
}

export function PageSEO({ title, description, path = "", image = DEFAULT_IMAGE, noindex = false }: Props) {
  const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <link rel="canonical" href={url} />
    </Helmet>
  );
}
