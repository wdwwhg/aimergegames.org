import { publicMetadata } from '@/lib/games/metadata';

export const metadata = publicMetadata(
  '/about',
  'About AI Merge Games | AI Merge Games',
  'An independent playground for original browser game mashups.'
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
