import { publicMetadata } from '@/lib/games/metadata';

export const metadata = publicMetadata(
  '/terms-of-service',
  'Terms of use | AI Merge Games',
  'Terms for using the local AI Merge Games playground.'
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
