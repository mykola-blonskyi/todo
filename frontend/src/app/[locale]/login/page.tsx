import { getAppearance } from '@features/preferences/server';
import { getLayoutViews } from '@/layouts/registry';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ locale }, { callbackUrl }, appearance] = await Promise.all([
    params,
    searchParams,
    getAppearance(),
  ]);
  const { LoginPage: View } = getLayoutViews(appearance.layout);

  return (
    <View locale={locale} appearance={appearance} callbackUrl={callbackUrl} />
  );
}
