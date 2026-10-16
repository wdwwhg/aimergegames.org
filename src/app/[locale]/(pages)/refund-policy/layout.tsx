import { publicMetadata } from '@/lib/games/metadata';

export const metadata = publicMetadata(
  '/refund-policy',
  'Credits and refunds | AI Merge Games',
  'Generation usage, failed-generation credit restoration and purchase availability.'
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
