import { publicMetadata } from '@/lib/games/metadata';

export const metadata = publicMetadata(
  '/privacy-policy',
  'Privacy policy | AI Merge Games',
  'How accounts, game prompts and private works are handled.'
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
