const envPrefix = 'INPUT_';

export const env = (name: string, fallback?: string): string => {
  name = envPrefix + name.toUpperCase();
  return name in process.env ? (process.env[name] as string) : fallback ?? '';
};
