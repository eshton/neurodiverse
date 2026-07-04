const PROVIDER_TYPE_PLACEHOLDERS: Record<string, string> = {
  'special-needs-school': '/covers/placeholder-special-needs-school.svg',
  'mainstream-integration': '/covers/placeholder-mainstream-integration.svg',
  kindergarten: '/covers/placeholder-kindergarten.svg',
};

export function placeholderFor(providerType: string | undefined): string | undefined {
  if (!providerType) return undefined;
  return PROVIDER_TYPE_PLACEHOLDERS[providerType];
}
