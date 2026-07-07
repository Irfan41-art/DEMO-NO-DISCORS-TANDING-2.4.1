/**
 * Resolves static asset paths dynamically at runtime.
 * This ensures that assets load correctly on local environments, production servers,
 * and subdirectory-hosted environments like GitHub Pages (with or without a trailing slash).
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';

  // If already an absolute URL or base64, return as-is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  // Clean leading slash if any to standardize
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  try {
    const pathname = window.location.pathname; // e.g. "/repository-name/index.html" or "/repository-name" or "/"
    const hostname = window.location.hostname;

    // Detect if we are on GitHub Pages or standard subdirectory hosting
    if (hostname.endsWith('github.io')) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        // The first segment of the path is usually the repository name
        const repoName = segments[0];
        
        // If the first segment looks like a file (e.g. index.html), ignore it
        if (!repoName.includes('.')) {
          return `/${repoName}/${cleanPath}`;
        }
      }
    }
  } catch (e) {
    console.warn('[getAssetUrl] Failed to detect base path:', e);
  }

  // Fallback to relative path
  return `./${cleanPath}`;
}
