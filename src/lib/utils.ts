/** Joins class names, skipping the empty ones (the shadcn `cn`, without tailwind-merge). */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
