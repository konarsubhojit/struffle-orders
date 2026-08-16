import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kiyon Store Order Management',
    short_name: 'Kiyon Orders',
    description: 'Create and manage store orders, including during temporary network outages.',
    start_url: '/orders/create',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5568d3',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
